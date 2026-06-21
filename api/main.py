# Trigger reload to pick up diversion.py updates
from fastapi import FastAPI, UploadFile, File, BackgroundTasks
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from pydantic import BaseModel
from typing import Optional, List
import pandas as pd
import joblib
from datetime import datetime
import os
import sys
import threading

from diversion import generate_police_diversion_plan
from retrain import append_rows_to_extra, append_excel_to_extra, get_extra_stats, run_retrain

app = FastAPI(title="Bangalore Traffic Police API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Load models
base_path = os.path.dirname(os.path.abspath(__file__))
manpower_model = joblib.load(os.path.join(base_path, 'manpower_model.pkl'))
classifier_model = joblib.load(os.path.join(base_path, 'barricade_classifier.pkl'))
quantity_model = joblib.load(os.path.join(base_path, 'barricade_quantity_model.pkl'))

class EventInput(BaseModel):
    event_type: str
    lat: float
    long: float
    event_cause: str
    requires_road_closure: bool
    start_datetime: str
    corridor: str
    priority: str
    police_station: str
    junction: str
    peak_hour: bool

def calculate_eii(data: EventInput) -> float:
    # EF mapping
    ef_map = {
        'vip_movement': 0.80, 'public_event': 0.452, 'protest': 0.428,
        'tree_fall': 0.364, 'procession': 0.263, 'construction': 0.251,
        'debris': 0.153, 'road_conditions': 0.123, 'others': 0.086,
        'water_logging': 0.085, 'vehicle_breakdown': 0.042, 'congestion': 0.037,
        'accident': 0.027, 'pot_holes': 0.024, 'fog / low visibility': 0.004,
        'test_demo': 0.002
    }
    
    ef = ef_map.get(data.event_cause.lower(), 0.086)
    rcf = 1 if data.requires_road_closure else 0
    
    # Peak hour: 07:00-10:00 or 17:00-20:00
    try:
        dt = datetime.fromisoformat(data.start_datetime.replace('Z', '+00:00'))
        hour = dt.hour
        phf = 1 if (7 <= hour <= 10) or (17 <= hour <= 20) else 0
    except:
        phf = 0

    cf = 1 if data.corridor.lower() != 'null' and data.corridor.strip() != '' else 0.2
    jf = 1 if data.junction.lower() != 'null' and data.junction.strip() != '' else 0.2

    eii = 100 * (0.40 * ef + 0.25 * rcf + 0.15 * phf + 0.10 * cf + 0.10 * jf)
    return eii

@app.post("/predict")
def predict_traffic_event(data: EventInput):
    eii = calculate_eii(data)
    
    # Parse datetime
    dt = datetime.fromisoformat(data.start_datetime.replace('Z', '+00:00'))
    
    # Prepare DataFrame for ML models
    input_dict = {
        'event_type': [data.event_type],
        'latitude': [data.lat],
        'longitude': [data.long],
        'event_cause': [data.event_cause],
        'requires_road_closure': [int(data.requires_road_closure)],
        'corridor': [data.corridor],
        'priority': [data.priority],
        'police_station': [data.police_station],
        'junction': [data.junction],
        'peak_hour': [int(data.peak_hour)],
        'EII': [eii],
        'year': [dt.year],
        'month': [dt.month],
        'day': [dt.day],
        'hour': [dt.hour],
        'dayofweek': [dt.weekday()],
        'is_weekend': [1 if dt.weekday() >= 5 else 0]
    }
    
    df = pd.DataFrame(input_dict)
    
    # Ensure all string cols are string type
    str_cols = ['event_type', 'event_cause', 'corridor', 'priority', 'police_station', 'junction']
    df[str_cols] = df[str_cols].astype(str)
    
    manpower = float(manpower_model.predict(df)[0])
    required = bool(classifier_model.predict(df)[0])
    quantity = 0
    if required:
        quantity = float(quantity_model.predict(df)[0])

    # Generate AI Diversion Plan
    plan_result = generate_police_diversion_plan(
        lat=data.lat,
        lon=data.long,
        incident=data.event_cause,
        manpower=int(manpower),
        barricades=int(quantity)
    )

    return {
        "eii": round(eii, 2),
        "estimated_manpower": round(manpower),
        "barricade_required": required,
        "barricade_quantity": round(quantity) if required else 0,
        "diversion_plan": plan_result.get("text") if isinstance(plan_result, dict) else plan_result,
        "map_data": plan_result.get("map_data") if isinstance(plan_result, dict) else {"barricades": [], "police_deployments": []}
    }

@app.get("/historical-data")
def get_historical_data():
    file_path = os.path.join(base_path, 'Cleaned_with_manpower_and_barricades.xlsx')
    try:
        df = pd.read_excel(file_path)
        extra_path = os.path.join(base_path, 'additional_data.xlsx')
        if os.path.exists(extra_path):
            extra = pd.read_excel(extra_path)
            df = pd.concat([df, extra], ignore_index=True)
        df = df.tail(500)
        data = df[['latitude', 'longitude', 'event_type', 'EII']].to_dict(orient='records')
        return {"data": data}
    except Exception as e:
        return {"error": str(e)}


@app.get("/analytics-stats")
def get_analytics_stats():
    """Compute live analytics stats from master + additional dataset combined."""
    try:
        master_path = os.path.join(base_path, 'Cleaned_with_manpower_and_barricades.xlsx')
        extra_path  = os.path.join(base_path, 'additional_data.xlsx')

        df = pd.read_excel(master_path)
        extra_rows = 0
        if os.path.exists(extra_path):
            extra = pd.read_excel(extra_path)
            extra_rows = len(extra)
            df = pd.concat([df, extra], ignore_index=True)

        # Datetime features
        df['start_datetime'] = pd.to_datetime(
            df['start_datetime'].astype(str), format='mixed', utc=True, errors='coerce'
        )
        df['month'] = df['start_datetime'].dt.month
        df['hour']  = df['start_datetime'].dt.hour

        # ── helpers ───────────────────────────────────────────────────────────
        def vc(series):
            return series.value_counts().to_dict()

        def top(series, n=10):
            return series.value_counts().head(n).to_dict()

        # ── EII buckets ───────────────────────────────────────────────────────
        bins   = [0, 20, 40, 60, 200]
        labels = ['Low (0-20)', 'Medium (20-40)', 'High (40-60)', 'Critical (60+)']
        df['eii_range'] = pd.cut(df['EII'], bins=bins, labels=labels)
        eii_buckets = df['eii_range'].value_counts().to_dict()

        # ── High EII corridors (mean EII > 50) ────────────────────────────────
        high_eii = (
            df[df['EII'] > 50]
            .groupby('corridor')['EII']
            .mean()
            .sort_values(ascending=False)
            .head(10)
            .round(2)
            .to_dict()
        )

        # ── Manpower by cause ─────────────────────────────────────────────────
        manpower_by_cause = (
            df.groupby('event_cause')['estimated_manpower']
            .mean()
            .round(1)
            .sort_values(ascending=False)
            .to_dict()
        )

        # ── Barricade qty by corridor ─────────────────────────────────────────
        barricade_by_corridor = (
            df.groupby('corridor')['barricade_quantity']
            .sum()
            .sort_values(ascending=False)
            .head(10)
            .to_dict()
        )

        # ── Monthly counts ────────────────────────────────────────────────────
        month_map = {1:'Jan',2:'Feb',3:'Mar',4:'Apr',5:'May',6:'Jun',
                     7:'Jul',8:'Aug',9:'Sep',10:'Oct',11:'Nov',12:'Dec'}
        monthly = {
            month_map.get(int(k), str(k)): int(v)
            for k, v in df['month'].value_counts().sort_index().items()
            if not pd.isna(k)
        }

        # ── Hourly counts ─────────────────────────────────────────────────────
        hourly = {
            str(int(k)).zfill(2): int(v)
            for k, v in df['hour'].value_counts().sort_index().items()
            if not pd.isna(k)
        }

        return {
            "total_incidents":       int(len(df)),
            "extra_rows":            extra_rows,
            "event_types":           {str(k): int(v) for k, v in vc(df['event_type']).items()},
            "event_causes":          {str(k): int(v) for k, v in top(df['event_cause']).items()},
            "priority":              {str(k): int(v) for k, v in vc(df['priority']).items()},
            "corridors":             {str(k): int(v) for k, v in top(df['corridor']).items()},
            "eii_buckets":           {str(k): int(v) for k, v in eii_buckets.items()},
            "high_eii_areas":        {str(k): float(v) for k, v in high_eii.items()},
            "manpower_by_cause":     {str(k): float(v) for k, v in manpower_by_cause.items()},
            "barricade_by_corridor": {str(k): int(v) for k, v in barricade_by_corridor.items()},
            "barricade_required":    {str(k): int(v) for k, v in vc(df['barricade_required']).items()},
            "requires_road_closure": {str(k): int(v) for k, v in vc(df['requires_road_closure']).items()},
            "peak_hour":             {str(k): int(v) for k, v in vc(df['peak_hour']).items()},
            "monthly":               monthly,
            "hourly":                hourly,
            "eii_stats": {
                "mean":   round(float(df['EII'].mean()), 2),
                "median": round(float(df['EII'].median()), 2),
                "max":    round(float(df['EII'].max()), 2),
                "min":    round(float(df['EII'].min()), 2),
            },
            "manpower_stats": {
                "mean": round(float(df['estimated_manpower'].mean()), 1),
                "max":  int(df['estimated_manpower'].max()),
                "min":  int(df['estimated_manpower'].min()),
            },
        }
    except Exception as e:
        import traceback
        return JSONResponse(status_code=500, content={"error": str(e), "detail": traceback.format_exc()})

# ─── Retrain state (simple in-process tracker) ───────────────────────────────
_retrain_status = {"running": False, "last_result": None}
_retrain_lock   = threading.Lock()


class NewDataRow(BaseModel):
    event_type: str
    latitude: float
    longitude: float
    event_cause: str
    requires_road_closure: bool
    start_datetime: str
    corridor: str
    priority: str
    police_station: str
    junction: Optional[str] = ""
    peak_hour: bool
    EII: Optional[float] = None
    estimated_manpower: int
    barricade_required: bool
    barricade_quantity: int


@app.post("/add-data")
def add_data(rows: List[NewDataRow]):
    """Accept one or more manually entered incident rows and append to additional_data.xlsx."""
    try:
        dicts = [r.model_dump() for r in rows]
        total = append_rows_to_extra(dicts)
        return {"success": True, "message": f"Added {len(dicts)} row(s). Additional dataset now has {total} rows."}
    except Exception as e:
        return JSONResponse(status_code=500, content={"success": False, "error": str(e)})


@app.post("/upload-excel")
async def upload_excel(file: UploadFile = File(...)):
    """Upload an Excel (.xlsx) or CSV file to merge into additional_data.xlsx."""
    try:
        content = await file.read()
        total = append_excel_to_extra(content, file.filename)
        return {"success": True, "message": f"Imported '{file.filename}'. Additional dataset now has {total} rows."}
    except Exception as e:
        return JSONResponse(status_code=500, content={"success": False, "error": str(e)})


@app.get("/extra-data-stats")
def extra_data_stats():
    """Return info about the additional dataset."""
    return get_extra_stats()


def _do_retrain():
    with _retrain_lock:
        _retrain_status["running"] = True
    try:
        result = run_retrain()
        # Reload promoted models into the running server
        if "manpower" in result.get("promoted", []):
            globals()["manpower_model"] = joblib.load(os.path.join(base_path, "manpower_model.pkl"))
        if "classifier" in result.get("promoted", []):
            globals()["classifier_model"] = joblib.load(os.path.join(base_path, "barricade_classifier.pkl"))
        if "quantity" in result.get("promoted", []):
            globals()["quantity_model"] = joblib.load(os.path.join(base_path, "barricade_quantity_model.pkl"))
        # If quality gate passed, merge additional data into master Excel
        if not result.get("data_rejected", True):
            extra_path  = os.path.join(base_path, "additional_data.xlsx")
            master_path = os.path.join(base_path, "Cleaned_with_manpower_and_barricades.xlsx")
            if os.path.exists(extra_path):
                master = pd.read_excel(master_path)
                extra  = pd.read_excel(extra_path)
                merged = pd.concat([master, extra], ignore_index=True)
                merged.to_excel(master_path, index=False)
                os.remove(extra_path)  # clear staging file after merge
                result["merged_rows"] = len(extra)
                result["master_total"] = len(merged)
        with _retrain_lock:
            _retrain_status["last_result"] = result
    except Exception as e:
        import traceback
        with _retrain_lock:
            _retrain_status["last_result"] = {"error": str(e), "traceback": traceback.format_exc()}
    finally:
        with _retrain_lock:
            _retrain_status["running"] = False


@app.post("/retrain")
def trigger_retrain(background_tasks: BackgroundTasks):
    """Start a background retrain job. Returns immediately."""
    with _retrain_lock:
        if _retrain_status["running"]:
            return {"success": False, "message": "Retrain already in progress."}
    background_tasks.add_task(_do_retrain)
    return {"success": True, "message": "Retraining started in background. Poll /retrain-status for updates."}


@app.get("/retrain-status")
def retrain_status():
    """Poll this endpoint to check retrain progress and last result."""
    with _retrain_lock:
        return {
            "running": _retrain_status["running"],
            "last_result": _retrain_status["last_result"],
        }


if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
