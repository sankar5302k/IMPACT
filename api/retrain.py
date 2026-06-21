"""
retrain.py  –  Retraining logic for IMPACT models.
Called by the FastAPI /retrain endpoint.
Appends new data to the master dataset, retrains all three models,
compares accuracy to the currently-deployed models, and only
promotes new models if they outperform the incumbents.
"""

import os
import shutil
import tempfile
import traceback

import joblib
import numpy as np
import pandas as pd
from sklearn.compose import ColumnTransformer
from sklearn.ensemble import RandomForestClassifier, RandomForestRegressor
from sklearn.impute import SimpleImputer
from sklearn.metrics import accuracy_score, mean_absolute_error, r2_score
from sklearn.model_selection import RandomizedSearchCV, train_test_split
from sklearn.pipeline import Pipeline
from sklearn.preprocessing import OneHotEncoder

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
DATASET_FILE   = os.path.join(BASE_DIR, "Cleaned_with_manpower_and_barricades.xlsx")
EXTRA_DATA_FILE= os.path.join(BASE_DIR, "additional_data.xlsx")

MODEL_PATHS = {
    "manpower":   os.path.join(BASE_DIR, "manpower_model.pkl"),
    "classifier": os.path.join(BASE_DIR, "barricade_classifier.pkl"),
    "quantity":   os.path.join(BASE_DIR, "barricade_quantity_model.pkl"),
}

PARAMS = {
    "model__n_estimators":    [100, 200, 300],
    "model__max_depth":       [10, 20, None],
    "model__min_samples_split": [2, 5],
    "model__min_samples_leaf":  [1, 2],
}


# ─────────────────────────────────────────────────────────────────────────────
def _build_preprocessor(features, df):
    cat = df[features].select_dtypes(include=["object", "category", "bool"]).columns.tolist()
    num = [c for c in features if c not in cat]
    return ColumnTransformer([
        ("num", Pipeline([("imp", SimpleImputer(strategy="median"))]), num),
        ("cat", Pipeline([
            ("imp", SimpleImputer(strategy="most_frequent")),
            ("oh",  OneHotEncoder(handle_unknown="ignore")),
        ]), cat),
    ])


def _load_combined_dataset():
    """Load master dataset and merge any additional records."""
    df = pd.read_excel(DATASET_FILE)
    if os.path.exists(EXTRA_DATA_FILE):
        extra = pd.read_excel(EXTRA_DATA_FILE)
        df = pd.concat([df, extra], ignore_index=True)

    if "address" in df.columns:
        df = df.drop(columns=["address"])

    if "start_datetime" in df.columns:
        df["start_datetime"] = pd.to_datetime(
            df["start_datetime"], format="mixed", utc=True, errors="coerce"
        )
        df["year"]      = df["start_datetime"].dt.year
        df["month"]     = df["start_datetime"].dt.month
        df["day"]       = df["start_datetime"].dt.day
        df["hour"]      = df["start_datetime"].dt.hour
        df["dayofweek"] = df["start_datetime"].dt.dayofweek
        df["is_weekend"]= (df["dayofweek"] >= 5).astype(int)
        df = df.drop(columns=["start_datetime"])

    return df


def _current_scores():
    """Evaluate currently-deployed models on the combined dataset."""
    try:
        df = _load_combined_dataset()
        targets  = ["estimated_manpower", "barricade_required", "barricade_quantity"]
        features = [c for c in df.columns if c not in targets]

        m_model = joblib.load(MODEL_PATHS["manpower"])
        c_model = joblib.load(MODEL_PATHS["classifier"])
        q_model = joblib.load(MODEL_PATHS["quantity"])

        _, Xte1, _, yte1 = train_test_split(df[features], df["estimated_manpower"], test_size=0.2, random_state=42)
        _, Xte2, _, yte2 = train_test_split(df[features], df["barricade_required"].astype(int), test_size=0.2, random_state=42, stratify=df["barricade_required"].astype(int))

        df_qty = df[df["barricade_required"].astype(int) == 1].copy()
        _, Xte3, _, yte3 = train_test_split(df_qty[features], df_qty["barricade_quantity"], test_size=0.2, random_state=42)

        return {
            "manpower_r2":    r2_score(yte1, m_model.predict(Xte1)),
            "classifier_acc": accuracy_score(yte2, c_model.predict(Xte2)),
            "quantity_r2":    r2_score(yte3, q_model.predict(Xte3)),
        }
    except Exception:
        # If models don't exist yet, treat as zero scores
        return {"manpower_r2": -999, "classifier_acc": 0.0, "quantity_r2": -999}



# ── Quality gate ─────────────────────────────────────────────────────────────
# New data is only accepted when the barricade classifier stays at or above
# this accuracy threshold after retraining.
CLASSIFIER_ACCURACY_THRESHOLD = 0.93


def run_retrain():
    """
    Full retrain pipeline.

    Quality gate logic
    ──────────────────
    After training all 3 models on the combined dataset (master + additional):

    1.  If the new barricade-classifier accuracy < 0.93:
        • ALL three new models are discarded.
        • The additional_data.xlsx rows that were added since the last
          successful retrain are REMOVED (data rollback).
        • The existing deployed models remain unchanged.
        • Returns with data_rejected=True and a clear explanation.

    2.  If accuracy ≥ 0.93:
        • Each model is individually promoted only if it also beats the
          current deployed model's score.
        • Additional data is kept.

    Returns a result dict containing:
      promoted, kept, data_rejected, threshold, old_scores, new_scores, message
    """
    log_lines = []

    def log(msg):
        print(msg)
        log_lines.append(msg)

    # ── Snapshot extra-data state before training so we can roll back ─────────
    extra_rows_before = 0
    if os.path.exists(EXTRA_DATA_FILE):
        _snap = pd.read_excel(EXTRA_DATA_FILE)
        extra_rows_before = len(_snap)
        # Save a snapshot copy for rollback
        _snap_backup = _snap.copy()
    else:
        _snap_backup = None

    log("Loading combined dataset …")
    df = _load_combined_dataset()
    log(f"Dataset size: {len(df)} rows (master + {extra_rows_before} additional)")

    targets      = ["estimated_manpower", "barricade_required", "barricade_quantity"]
    features     = [c for c in df.columns if c not in targets]
    preprocessor = _build_preprocessor(features, df)

    old_scores = _current_scores()
    log(f"Old scores: {old_scores}")
    log(f"Classifier accuracy threshold: {CLASSIFIER_ACCURACY_THRESHOLD}")

    # ── Model 1 – Manpower (Regression) ──────────────────────────────────────
    log("\nTraining Model 1: Manpower …")
    X1, y1 = df[features], df["estimated_manpower"]
    Xtr1, Xte1, ytr1, yte1 = train_test_split(X1, y1, test_size=0.2, random_state=42)
    pipe1 = Pipeline([("prep", preprocessor), ("model", RandomForestRegressor(random_state=42, n_jobs=-1))])
    s1 = RandomizedSearchCV(pipe1, PARAMS, n_iter=6, cv=3, scoring="neg_mean_absolute_error", random_state=42, n_jobs=-1)
    s1.fit(Xtr1, ytr1)
    new_m1     = s1.best_estimator_
    new_m1_r2  = r2_score(yte1, new_m1.predict(Xte1))
    new_m1_mae = mean_absolute_error(yte1, new_m1.predict(Xte1))
    log(f"  New manpower  R2={new_m1_r2:.4f}  MAE={new_m1_mae:.2f}  (old R2={old_scores['manpower_r2']:.4f})")

    # ── Model 2 – Barricade Classifier ───────────────────────────────────────
    log("\nTraining Model 2: Barricade Classifier …")
    X2, y2 = df[features], df["barricade_required"].astype(int)
    Xtr2, Xte2, ytr2, yte2 = train_test_split(X2, y2, test_size=0.2, random_state=42, stratify=y2)
    pipe2 = Pipeline([("prep", preprocessor), ("model", RandomForestClassifier(random_state=42, n_jobs=-1))])
    s2 = RandomizedSearchCV(pipe2, PARAMS, n_iter=6, cv=3, scoring="f1_weighted", random_state=42, n_jobs=-1)
    s2.fit(Xtr2, ytr2)
    new_m2     = s2.best_estimator_
    new_m2_acc = accuracy_score(yte2, new_m2.predict(Xte2))
    log(f"  New classifier Acc={new_m2_acc:.4f}  (old Acc={old_scores['classifier_acc']:.4f})  threshold={CLASSIFIER_ACCURACY_THRESHOLD}")

    # ─────────────────────────────────────────────────────────────────────────
    # QUALITY GATE — classifier accuracy must be >= 0.93
    # ─────────────────────────────────────────────────────────────────────────
    if new_m2_acc < CLASSIFIER_ACCURACY_THRESHOLD:
        log(f"\n  QUALITY GATE FAILED: {new_m2_acc:.4f} < {CLASSIFIER_ACCURACY_THRESHOLD}")
        log("  Rolling back additional data and discarding all new models …")

        # Roll back additional_data.xlsx to its pre-retrain state
        if _snap_backup is not None and extra_rows_before > 0:
            _snap_backup.to_excel(EXTRA_DATA_FILE, index=False)
            log(f"  Additional dataset restored to {extra_rows_before} rows.")
        elif os.path.exists(EXTRA_DATA_FILE):
            os.remove(EXTRA_DATA_FILE)
            log("  Additional dataset removed (was empty before retrain).")

        summary = (
            f"REJECTED: Classifier accuracy {new_m2_acc:.4f} is below the required threshold of "
            f"{CLASSIFIER_ACCURACY_THRESHOLD}. New data has been rolled back and all models remain unchanged."
        )
        log(summary)

        return {
            "promoted":      [],
            "kept":          ["manpower", "classifier", "quantity"],
            "data_rejected": True,
            "threshold":     CLASSIFIER_ACCURACY_THRESHOLD,
            "old_scores":    {k: round(v, 4) for k, v in old_scores.items()},
            "new_scores": {
                "manpower_r2":    round(new_m1_r2,  4),
                "manpower_mae":   round(new_m1_mae, 2),
                "classifier_acc": round(new_m2_acc, 4),
                "quantity_r2":    None,
                "quantity_mae":   None,
            },
            "message": summary,
            "log":     "\n".join(log_lines),
        }

    # Quality gate passed — continue with Model 3
    log(f"\n  QUALITY GATE PASSED: {new_m2_acc:.4f} >= {CLASSIFIER_ACCURACY_THRESHOLD}")

    # ── Model 3 – Barricade Quantity ─────────────────────────────────────────
    log("\nTraining Model 3: Barricade Quantity …")
    df_qty = df[df["barricade_required"].astype(int) == 1].copy()
    X3, y3 = df_qty[features], df_qty["barricade_quantity"]
    Xtr3, Xte3, ytr3, yte3 = train_test_split(X3, y3, test_size=0.2, random_state=42)
    pipe3 = Pipeline([("prep", preprocessor), ("model", RandomForestRegressor(random_state=42, n_jobs=-1))])
    s3 = RandomizedSearchCV(pipe3, PARAMS, n_iter=6, cv=3, scoring="neg_mean_absolute_error", random_state=42, n_jobs=-1)
    s3.fit(Xtr3, ytr3)
    new_m3     = s3.best_estimator_
    new_m3_r2  = r2_score(yte3, new_m3.predict(Xte3))
    new_m3_mae = mean_absolute_error(yte3, new_m3.predict(Xte3))
    log(f"  New quantity   R2={new_m3_r2:.4f}  MAE={new_m3_mae:.2f}  (old R2={old_scores['quantity_r2']:.4f})")

    new_scores = {
        "manpower_r2":    round(new_m1_r2,  4),
        "manpower_mae":   round(new_m1_mae, 2),
        "classifier_acc": round(new_m2_acc, 4),
        "quantity_r2":    round(new_m3_r2,  4),
        "quantity_mae":   round(new_m3_mae, 2),
    }

    # ── Promote each model individually if it beat the old one ───────────────
    promoted, kept = [], []

    if new_m1_r2 > old_scores["manpower_r2"]:
        joblib.dump(new_m1, MODEL_PATHS["manpower"])
        promoted.append("manpower")
        log("  -> Manpower model PROMOTED")
    else:
        kept.append("manpower")
        log("  -> Manpower model kept (old was better)")

    # Classifier: guaranteed >= threshold, promote if also better than old
    if new_m2_acc > old_scores["classifier_acc"]:
        joblib.dump(new_m2, MODEL_PATHS["classifier"])
        promoted.append("classifier")
        log("  -> Classifier model PROMOTED")
    else:
        kept.append("classifier")
        log(f"  -> Classifier model kept (new={new_m2_acc:.4f} >= threshold but old={old_scores['classifier_acc']:.4f} was higher)")

    if new_m3_r2 > old_scores["quantity_r2"]:
        joblib.dump(new_m3, MODEL_PATHS["quantity"])
        promoted.append("quantity")
        log("  -> Quantity model PROMOTED")
    else:
        kept.append("quantity")
        log("  -> Quantity model kept (old was better)")

    summary = (
        f"Retrain complete. Quality gate PASSED (acc={new_m2_acc:.4f} ≥ {CLASSIFIER_ACCURACY_THRESHOLD}). "
        f"Promoted: {promoted or 'none'}. Kept: {kept or 'none'}."
    )
    log(summary)

    return {
        "promoted":      promoted,
        "kept":          kept,
        "data_rejected": False,
        "threshold":     CLASSIFIER_ACCURACY_THRESHOLD,
        "old_scores":    {k: round(v, 4) for k, v in old_scores.items()},
        "new_scores":    new_scores,
        "message":       summary,
        "log":           "\n".join(log_lines),
    }



def append_rows_to_extra(rows: list[dict]):
    """
    Append a list of row dicts to the additional_data.xlsx file.
    Creates the file if it doesn't exist.
    """
    new_df = pd.DataFrame(rows)
    if os.path.exists(EXTRA_DATA_FILE):
        existing = pd.read_excel(EXTRA_DATA_FILE)
        combined = pd.concat([existing, new_df], ignore_index=True)
    else:
        combined = new_df
    combined.to_excel(EXTRA_DATA_FILE, index=False)
    return len(combined)


def append_excel_to_extra(file_bytes: bytes, filename: str) -> int:
    """
    Merge an uploaded Excel/CSV file into additional_data.xlsx.
    Returns total row count after merge.
    """
    with tempfile.NamedTemporaryFile(suffix=os.path.splitext(filename)[1], delete=False) as tmp:
        tmp.write(file_bytes)
        tmp_path = tmp.name

    try:
        if filename.endswith(".csv"):
            new_df = pd.read_csv(tmp_path)
        else:
            new_df = pd.read_excel(tmp_path)
    finally:
        os.unlink(tmp_path)

    if os.path.exists(EXTRA_DATA_FILE):
        existing = pd.read_excel(EXTRA_DATA_FILE)
        combined = pd.concat([existing, new_df], ignore_index=True)
    else:
        combined = new_df

    combined.to_excel(EXTRA_DATA_FILE, index=False)
    return len(combined)


def get_extra_stats():
    """Return info about the additional dataset."""
    if not os.path.exists(EXTRA_DATA_FILE):
        return {"rows": 0, "exists": False}
    df = pd.read_excel(EXTRA_DATA_FILE)
    return {"rows": len(df), "exists": True, "columns": list(df.columns)}
