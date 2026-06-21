import { useState, useRef, useEffect, useCallback } from 'react';
import axios from 'axios';
import {
  Plus, Upload, RefreshCw, CheckCircle, XCircle, AlertTriangle,
  Clock, Database, FileSpreadsheet, ChevronDown, Loader,
  TrendingUp, TrendingDown, Minus, Info
} from 'lucide-react';
const API = import.meta.env.VITE_API_URL || 'http://localhost:8000';
// ─── Form field config ────────────────────────────────────────────────────────
const EVENT_TYPES   = ['unplanned', 'planned'];
const EVENT_CAUSES  = [
  'vehicle_breakdown','accident','pot_holes','construction','water_logging',
  'tree_fall','road_conditions','congestion','public_event','procession',
  'vip_movement','protest','debris','others'
];
const PRIORITIES    = ['High', 'Low'];
const CORRIDORS     = [
  'Non-corridor','Mysore Road','Bellary Road 1','Bellary Road 2','Tumkur Road',
  'Hosur Road','ORR North 1','ORR East 1','Old Madras Road','Magadi Road',
  'West of Chord Road','ORR West 1','Old Airport Road'
];

const EMPTY_ROW = {
  event_type: 'unplanned', latitude: '', longitude: '', event_cause: 'vehicle_breakdown',
  requires_road_closure: false, start_datetime: '', corridor: 'Non-corridor',
  priority: 'High', police_station: '', junction: '', peak_hour: false,
  estimated_manpower: '', barricade_required: false, barricade_quantity: 0,
};

// ─── Shared styles ────────────────────────────────────────────────────────────
const S = {
  card: {
    background: 'rgba(15,23,42,0.75)',
    border: '1px solid rgba(51,65,85,0.6)',
    borderRadius: 14, padding: '22px 24px',
  },
  label: { fontSize: 11, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 5, display: 'block' },
  input: {
    width: '100%', background: 'rgba(15,23,42,0.8)',
    border: '1px solid rgba(51,65,85,0.7)', borderRadius: 7,
    color: '#e2e8f0', padding: '8px 10px', fontSize: 13,
    outline: 'none', boxSizing: 'border-box',
    transition: 'border-color 0.2s',
  },
  select: {
    width: '100%', background: 'rgba(15,23,42,0.9)',
    border: '1px solid rgba(51,65,85,0.7)', borderRadius: 7,
    color: '#e2e8f0', padding: '8px 10px', fontSize: 13,
    outline: 'none', boxSizing: 'border-box', cursor: 'pointer',
  },
  btn: (color = '#3b82f6', ghost = false) => ({
    display: 'flex', alignItems: 'center', gap: 7,
    padding: '9px 18px', borderRadius: 8, border: ghost ? `1px solid ${color}55` : 'none',
    background: ghost ? `${color}15` : color,
    color: ghost ? color : '#fff',
    fontSize: 13, fontWeight: 600, cursor: 'pointer',
    transition: 'all 0.2s', whiteSpace: 'nowrap',
  }),
  sectionTitle: { fontSize: 14, fontWeight: 700, color: '#93c5fd', marginBottom: 16 },
};

// ─── Inline checkbox ──────────────────────────────────────────────────────────
function Toggle({ label, checked, onChange }) {
  return (
    <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' }}>
      <div
        onClick={() => onChange(!checked)}
        style={{
          width: 38, height: 20, borderRadius: 10, position: 'relative',
          background: checked ? '#3b82f6' : 'rgba(51,65,85,0.8)',
          border: `1px solid ${checked ? '#60a5fa' : 'rgba(71,85,105,0.8)'}`,
          transition: 'all 0.2s', flexShrink: 0,
        }}
      >
        <div style={{
          position: 'absolute', top: 2, left: checked ? 18 : 2,
          width: 14, height: 14, borderRadius: '50%',
          background: checked ? '#fff' : '#64748b',
          transition: 'left 0.2s',
        }} />
      </div>
      <span style={{ fontSize: 13, color: '#94a3b8' }}>{label}</span>
    </label>
  );
}

// ─── Score badge ──────────────────────────────────────────────────────────────
function ScoreDiff({ label, oldVal, newVal, higherBetter = true }) {
  const diff = newVal - oldVal;
  const improved = higherBetter ? diff > 0 : diff < 0;
  const unchanged = Math.abs(diff) < 0.0001;
  const Icon = unchanged ? Minus : improved ? TrendingUp : TrendingDown;
  const color = unchanged ? '#64748b' : improved ? '#22c55e' : '#ef4444';
  return (
    <div style={{
      background: 'rgba(15,23,42,0.6)', border: `1px solid ${color}30`,
      borderRadius: 10, padding: '12px 16px',
    }}>
      <div style={{ fontSize: 11, color: '#64748b', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.06em' }}>{label}</div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <span style={{ fontSize: 18, fontWeight: 700, color }}>{typeof newVal === 'number' ? newVal.toFixed(4) : 'N/A'}</span>
        <div style={{ display: 'flex', alignItems: 'center', gap: 4, color, fontSize: 12 }}>
          <Icon size={14} />
          {!unchanged && <span>{diff > 0 ? '+' : ''}{diff.toFixed(4)}</span>}
        </div>
      </div>
      <div style={{ fontSize: 11, color: '#475569', marginTop: 4 }}>Previous: {typeof oldVal === 'number' ? oldVal.toFixed(4) : 'N/A'}</div>
      {!unchanged && (
        <div style={{
          marginTop: 6, fontSize: 11, fontWeight: 600,
          color: improved ? '#22c55e' : '#ef4444'
        }}>
          {improved ? 'Model PROMOTED' : 'Old model kept'}
        </div>
      )}
    </div>
  );
}

// ─── Manual entry form ────────────────────────────────────────────────────────
function ManualEntryForm({ onSuccess }) {
  const [form, setForm] = useState({ ...EMPTY_ROW });
  const [submitting, setSubmitting] = useState(false);
  const [msg, setMsg] = useState(null);

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const handleSubmit = async () => {
    if (!form.latitude || !form.longitude || !form.start_datetime || !form.police_station || !form.estimated_manpower) {
      setMsg({ type: 'error', text: 'Please fill in all required fields.' });
      return;
    }
    setSubmitting(true);
    setMsg(null);
    try {
      const payload = {
        ...form,
        latitude: parseFloat(form.latitude),
        longitude: parseFloat(form.longitude),
        estimated_manpower: parseInt(form.estimated_manpower),
        barricade_quantity: parseInt(form.barricade_quantity) || 0,
      };
      const res = await axios.post(`${API}/add-data`, [payload]);
      setMsg({ type: 'success', text: res.data.message });
      setForm({ ...EMPTY_ROW });
      onSuccess?.();
    } catch (e) {
      setMsg({ type: 'error', text: e.response?.data?.error || e.message });
    }
    setSubmitting(false);
  };

  const Field = ({ label, children }) => (
    <div>
      <label style={S.label}>{label}</label>
      {children}
    </div>
  );

  return (
    <div style={S.card}>
      <div style={S.sectionTitle}>Enter Incident Record</div>

      <div className="form-fields-grid">
        <Field label="Event Type *">
          <select style={S.select} value={form.event_type} onChange={e => set('event_type', e.target.value)}>
            {EVENT_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
          </select>
        </Field>
        <Field label="Event Cause *">
          <select style={S.select} value={form.event_cause} onChange={e => set('event_cause', e.target.value)}>
            {EVENT_CAUSES.map(c => <option key={c} value={c}>{c.replace(/_/g,' ')}</option>)}
          </select>
        </Field>
        <Field label="Priority *">
          <select style={S.select} value={form.priority} onChange={e => set('priority', e.target.value)}>
            {PRIORITIES.map(p => <option key={p} value={p}>{p}</option>)}
          </select>
        </Field>

        <Field label="Latitude *">
          <input style={S.input} type="number" step="0.0001" placeholder="e.g. 12.9716"
            value={form.latitude} onChange={e => set('latitude', e.target.value)} />
        </Field>
        <Field label="Longitude *">
          <input style={S.input} type="number" step="0.0001" placeholder="e.g. 77.5946"
            value={form.longitude} onChange={e => set('longitude', e.target.value)} />
        </Field>
        <Field label="Start Date/Time *">
          <input style={S.input} type="datetime-local"
            value={form.start_datetime} onChange={e => set('start_datetime', e.target.value)} />
        </Field>

        <Field label="Corridor *">
          <select style={S.select} value={form.corridor} onChange={e => set('corridor', e.target.value)}>
            {CORRIDORS.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
        </Field>
        <Field label="Police Station *">
          <input style={S.input} placeholder="e.g. Indiranagar"
            value={form.police_station} onChange={e => set('police_station', e.target.value)} />
        </Field>
        <Field label="Junction">
          <input style={S.input} placeholder="e.g. Signal Junction"
            value={form.junction} onChange={e => set('junction', e.target.value)} />
        </Field>

        <Field label="Est. Manpower *">
          <input style={S.input} type="number" min="1" placeholder="e.g. 10"
            value={form.estimated_manpower} onChange={e => set('estimated_manpower', e.target.value)} />
        </Field>
        <Field label="Barricade Quantity">
          <input style={S.input} type="number" min="0" placeholder="0"
            value={form.barricade_quantity} onChange={e => set('barricade_quantity', e.target.value)}
            disabled={!form.barricade_required} />
        </Field>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12, paddingTop: 20 }}>
          <Toggle label="Road Closure Required" checked={form.requires_road_closure} onChange={v => set('requires_road_closure', v)} />
          <Toggle label="Peak Hour" checked={form.peak_hour} onChange={v => set('peak_hour', v)} />
          <Toggle label="Barricade Required" checked={form.barricade_required} onChange={v => set('barricade_required', v)} />
        </div>
      </div>

      {msg && (
        <div style={{
          display: 'flex', alignItems: 'center', gap: 8, padding: '10px 14px',
          borderRadius: 8, marginBottom: 14, fontSize: 13,
          background: msg.type === 'success' ? 'rgba(34,197,94,0.12)' : 'rgba(239,68,68,0.12)',
          border: `1px solid ${msg.type === 'success' ? 'rgba(34,197,94,0.3)' : 'rgba(239,68,68,0.3)'}`,
          color: msg.type === 'success' ? '#4ade80' : '#f87171',
        }}>
          {msg.type === 'success' ? <CheckCircle size={15} /> : <XCircle size={15} />}
          {msg.text}
        </div>
      )}

      <button style={S.btn('#3b82f6')} onClick={handleSubmit} disabled={submitting}>
        {submitting ? <Loader size={14} className="spin" /> : <Plus size={14} />}
        {submitting ? 'Saving…' : 'Add Record'}
      </button>
    </div>
  );
}

// ─── Excel Import ─────────────────────────────────────────────────────────────
function ExcelImport({ onSuccess }) {
  const [dragging, setDragging] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [msg, setMsg] = useState(null);
  const fileRef = useRef();

  const upload = async (file) => {
    if (!file) return;
    if (!file.name.match(/\.(xlsx|xls|csv)$/i)) {
      setMsg({ type: 'error', text: 'Only .xlsx, .xls or .csv files are accepted.' });
      return;
    }
    setUploading(true);
    setMsg(null);
    const fd = new FormData();
    fd.append('file', file);
    try {
      const res = await axios.post(`${API}/upload-excel`, fd, { headers: { 'Content-Type': 'multipart/form-data' } });
      setMsg({ type: 'success', text: res.data.message });
      onSuccess?.();
    } catch (e) {
      setMsg({ type: 'error', text: e.response?.data?.error || e.message });
    }
    setUploading(false);
  };

  const onDrop = (e) => {
    e.preventDefault(); setDragging(false);
    upload(e.dataTransfer.files[0]);
  };

  return (
    <div style={S.card}>
      <div style={S.sectionTitle}>Import Excel / CSV Dataset</div>
      <div
        onDragOver={e => { e.preventDefault(); setDragging(true); }}
        onDragLeave={() => setDragging(false)}
        onDrop={onDrop}
        onClick={() => fileRef.current?.click()}
        style={{
          border: `2px dashed ${dragging ? '#60a5fa' : 'rgba(71,85,105,0.7)'}`,
          borderRadius: 12, padding: '36px 24px', textAlign: 'center',
          cursor: 'pointer', transition: 'all 0.2s',
          background: dragging ? 'rgba(59,130,246,0.07)' : 'rgba(15,23,42,0.4)',
        }}
      >
        <FileSpreadsheet size={40} style={{ color: '#60a5fa', marginBottom: 12 }} />
        <div style={{ color: '#94a3b8', fontSize: 14, marginBottom: 6 }}>
          Drag & drop an Excel or CSV file here
        </div>
        <div style={{ color: '#475569', fontSize: 12 }}>
          or click to browse — Supported: .xlsx, .xls, .csv
        </div>
        <input ref={fileRef} type="file" accept=".xlsx,.xls,.csv" style={{ display: 'none' }}
          onChange={e => upload(e.target.files[0])} />
      </div>

      <div style={{
        marginTop: 14, padding: '10px 14px', borderRadius: 8, fontSize: 12,
        background: 'rgba(59,130,246,0.08)', border: '1px solid rgba(59,130,246,0.2)',
        color: '#60a5fa', display: 'flex', alignItems: 'flex-start', gap: 8
      }}>
        <Info size={14} style={{ marginTop: 1, flexShrink: 0 }} />
        <span>
          The file should contain the same columns as the master dataset:
          <strong> event_type, latitude, longitude, event_cause, requires_road_closure, start_datetime, corridor, priority, police_station, junction, peak_hour, EII, estimated_manpower, barricade_required, barricade_quantity</strong>
        </span>
      </div>

      {uploading && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 14, color: '#60a5fa', fontSize: 13 }}>
          <Loader size={14} />Uploading and merging file…
        </div>
      )}

      {msg && (
        <div style={{
          display: 'flex', alignItems: 'flex-start', gap: 8, padding: '10px 14px',
          borderRadius: 8, marginTop: 14, fontSize: 13,
          background: msg.type === 'success' ? 'rgba(34,197,94,0.12)' : 'rgba(239,68,68,0.12)',
          border: `1px solid ${msg.type === 'success' ? 'rgba(34,197,94,0.3)' : 'rgba(239,68,68,0.3)'}`,
          color: msg.type === 'success' ? '#4ade80' : '#f87171',
        }}>
          {msg.type === 'success' ? <CheckCircle size={15} style={{ marginTop: 1 }} /> : <XCircle size={15} style={{ marginTop: 1 }} />}
          {msg.text}
        </div>
      )}
    </div>
  );
}

// ─── Retrain Panel ────────────────────────────────────────────────────────────
function RetrainPanel({ liveData, extraStats }) {
  const [status, setStatus] = useState(null);
  const [polling, setPolling] = useState(false);
  const pollRef = useRef(null);

  const totalIncidents = liveData?.totalIncidents ?? 8147;
  const additionalRows = extraStats?.rows ?? 0;
  const masterRows = totalIncidents - additionalRows;

  const fetchStatus = useCallback(async () => {
    try {
      const res = await axios.get(`${API}/retrain-status`);
      setStatus(res.data);
      if (!res.data.running) {
        clearInterval(pollRef.current);
        setPolling(false);
      }
    } catch {}
  }, []);

  useEffect(() => {
    fetchStatus();
    return () => clearInterval(pollRef.current);
  }, [fetchStatus]);

  const startRetrain = async () => {
    try {
      await axios.post(`${API}/retrain`);
      setPolling(true);
      pollRef.current = setInterval(fetchStatus, 4000);
      fetchStatus();
    } catch (e) {
      alert(e.response?.data?.message || e.message);
    }
  };

  const result = status?.last_result;
  const running = status?.running;

  return (
    <div style={S.card}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
        <div style={S.sectionTitle}>Model Retraining</div>
        <button
          style={S.btn(running ? '#64748b' : '#8b5cf6')}
          onClick={startRetrain}
          disabled={running}
        >
          {running ? <Loader size={14} /> : <RefreshCw size={14} />}
          {running ? 'Retraining…' : 'Retrain Now'}
        </button>
      </div>

      {/* Dataset stats */}
      <div style={{ display: 'flex', gap: 12, marginBottom: 20, flexWrap: 'wrap' }}>
        <div style={{
          flex: 1, minWidth: 160, background: 'rgba(15,23,42,0.6)', borderRadius: 10,
          border: '1px solid rgba(51,65,85,0.5)', padding: '14px 16px'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 7, marginBottom: 6, color: '#94a3b8', fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
            <Database size={12} />Master Dataset
          </div>
          <div style={{ fontSize: 22, fontWeight: 700, color: '#60a5fa' }}>{masterRows.toLocaleString()}</div>
          <div style={{ fontSize: 11, color: '#64748b' }}>rows · 16 columns</div>
        </div>
        <div style={{
          flex: 1, minWidth: 160, background: 'rgba(15,23,42,0.6)', borderRadius: 10,
          border: `1px solid ${extraStats?.rows > 0 ? 'rgba(139,92,246,0.35)' : 'rgba(51,65,85,0.5)'}`,
          padding: '14px 16px'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 7, marginBottom: 6, color: '#94a3b8', fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
            <Plus size={12} />Additional Data
          </div>
          <div style={{ fontSize: 22, fontWeight: 700, color: extraStats?.rows > 0 ? '#a78bfa' : '#475569' }}>
            {additionalRows.toLocaleString()}
          </div>
          <div style={{ fontSize: 11, color: '#64748b' }}>new rows added</div>
        </div>
        <div style={{
          flex: 1, minWidth: 160, background: 'rgba(15,23,42,0.6)', borderRadius: 10,
          border: '1px solid rgba(51,65,85,0.5)', padding: '14px 16px'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 7, marginBottom: 6, color: '#94a3b8', fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
            <Database size={12} />Total for Training
          </div>
          <div style={{ fontSize: 22, fontWeight: 700, color: '#22c55e' }}>
            {totalIncidents.toLocaleString()}
          </div>
          <div style={{ fontSize: 11, color: '#64748b' }}>rows combined</div>
        </div>
      </div>

      {/* Running indicator */}
      {running && (
        <div style={{
          display: 'flex', alignItems: 'center', gap: 10, padding: '14px 16px',
          borderRadius: 10, marginBottom: 16,
          background: 'rgba(139,92,246,0.1)', border: '1px solid rgba(139,92,246,0.3)',
          color: '#a78bfa', fontSize: 13
        }}>
          <Loader size={16} />
          <div>
            <div style={{ fontWeight: 600 }}>Retraining in progress…</div>
            <div style={{ fontSize: 11, color: '#7c3aed', marginTop: 2 }}>
              Training 3 models with hyperparameter search. This may take several minutes.
            </div>
          </div>
        </div>
      )}

      {/* Last result */}
      {result && !result.error && (
        <div>
          {/* Quality gate status banner */}
          {result.data_rejected ? (
            <div style={{
              marginBottom: 16, padding: '14px 16px', borderRadius: 10,
              background: 'rgba(239,68,68,0.12)', border: '1px solid rgba(239,68,68,0.4)',
              color: '#f87171',
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontWeight: 700, fontSize: 14, marginBottom: 6 }}>
                <XCircle size={17} />
                Quality Gate FAILED — Data Rejected & Rolled Back
              </div>
              <div style={{ fontSize: 13, lineHeight: 1.6, color: '#fca5a5' }}>
                {result.message}
              </div>
              <div style={{
                marginTop: 10, padding: '8px 12px', borderRadius: 8,
                background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.2)',
                fontSize: 12, color: '#f87171', display: 'flex', alignItems: 'center', gap: 6
              }}>
                <AlertTriangle size={13} />
                Classifier accuracy <strong>{result.new_scores?.classifier_acc?.toFixed(4)}</strong> is below the
                required threshold of <strong>{result.threshold}</strong>.
                The additional dataset has been automatically rolled back.
                All 3 existing models remain unchanged.
              </div>
            </div>
          ) : (
            <div style={{
              marginBottom: 14, padding: '12px 16px', borderRadius: 10,
              background: result.promoted?.length > 0 ? 'rgba(34,197,94,0.1)' : 'rgba(251,191,36,0.1)',
              border: `1px solid ${result.promoted?.length > 0 ? 'rgba(34,197,94,0.3)' : 'rgba(251,191,36,0.3)'}`,
              color: result.promoted?.length > 0 ? '#4ade80' : '#fbbf24',
              fontSize: 13,
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontWeight: 600, marginBottom: 4 }}>
                <CheckCircle size={16} />
                Quality Gate PASSED — Classifier accuracy ≥ {result.threshold}
              </div>
              <div style={{ fontSize: 12, opacity: 0.85 }}>{result.message}</div>
            </div>
          )}

          {/* Score comparison grid */}
          <div className="scores-grid">
            <ScoreDiff
              label={`Classifier Accuracy (threshold: ${result.threshold ?? 0.93})`}
              oldVal={result.old_scores?.classifier_acc}
              newVal={result.new_scores?.classifier_acc}
              higherBetter={true}
            />
            <ScoreDiff
              label="Manpower Model (R²)"
              oldVal={result.old_scores?.manpower_r2}
              newVal={result.new_scores?.manpower_r2}
              higherBetter={true}
            />
            <ScoreDiff
              label="Quantity Model (R²)"
              oldVal={result.old_scores?.quantity_r2}
              newVal={result.new_scores?.quantity_r2}
              higherBetter={true}
            />
          </div>
        </div>
      )}

      {result?.error && (
        <div style={{
          padding: '12px 16px', borderRadius: 10,
          background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)',
          color: '#f87171', fontSize: 13
        }}>
          <div style={{ fontWeight: 600, marginBottom: 6, display: 'flex', alignItems: 'center', gap: 7 }}>
            <XCircle size={15} />Retrain failed
          </div>
          <div style={{ fontFamily: 'monospace', fontSize: 11, color: '#ef4444' }}>{result.error}</div>
        </div>
      )}

      {!result && !running && (
        <div style={{
          textAlign: 'center', padding: '30px 20px', color: '#475569', fontSize: 13
        }}>
          <Clock size={32} style={{ margin: '0 auto 12px', display: 'block', opacity: 0.4 }} />
          No retrain has been run yet. Add data above and click "Retrain Now" to begin.
        </div>
      )}
    </div>
  );
}

// ─── Main AddDataPage ─────────────────────────────────────────────────────────
export default function AddDataPage({ liveData, onDataAdded }) {
  const [extraStats, setExtraStats] = useState(null);
  const [tab, setTab] = useState('manual'); // 'manual' | 'import'

  const refreshStats = useCallback(async () => {
    try {
      const res = await axios.get(`${API}/extra-data-stats`);
      setExtraStats(res.data);
    } catch {}
  }, []);

  useEffect(() => { refreshStats(); }, [refreshStats]);

  const TabBtn = ({ id, Icon, label }) => (
    <button
      onClick={() => setTab(id)}
      style={{
        display: 'flex', alignItems: 'center', gap: 8,
        padding: '9px 18px', borderRadius: 8, border: 'none',
        background: tab === id ? 'rgba(59,130,246,0.2)' : 'transparent',
        color: tab === id ? '#93c5fd' : '#64748b',
        borderBottom: tab === id ? '2px solid #3b82f6' : '2px solid transparent',
        fontSize: 13, fontWeight: 600, cursor: 'pointer', transition: 'all 0.15s'
      }}
    >
      <Icon size={15} strokeWidth={2} />{label}
    </button>
  );

  return (
    <div>
      {/* Page header */}
      <div style={{ marginBottom: 22 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 6 }}>
          <div style={{
            padding: 10, borderRadius: 10,
            background: 'rgba(59,130,246,0.15)',
            border: '1px solid rgba(59,130,246,0.25)',
            color: '#60a5fa',
          }}>
            <Database size={20} strokeWidth={1.8} />
          </div>
          <div>
            <h2 style={{ margin: 0, fontSize: 20, fontWeight: 700, color: '#e2e8f0' }}>Add Data & Retrain</h2>
            <p style={{ margin: '4px 0 0', fontSize: 13, color: '#64748b' }}>
              Submit new incident records or import an Excel file, then retrain the prediction models
            </p>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div style={{
        display: 'flex', gap: 4, marginBottom: 20,
        borderBottom: '1px solid rgba(51,65,85,0.5)', paddingBottom: 0
      }}>
        <TabBtn id="manual" Icon={Plus} label="Manual Entry" />
        <TabBtn id="import" Icon={Upload} label="Import Excel / CSV" />
      </div>

      {/* Tab content */}
      <div style={{ marginBottom: 24 }}>
        {tab === 'manual' && <ManualEntryForm onSuccess={() => { refreshStats(); onDataAdded?.(); }} />}
        {tab === 'import' && <ExcelImport onSuccess={() => { refreshStats(); onDataAdded?.(); }} />}
      </div>

      {/* Retrain section — always visible */}
      <RetrainPanel liveData={liveData} extraStats={extraStats} />

      {/* Spinner style */}
      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
        .spin { animation: spin 0.8s linear infinite; }
      `}</style>
    </div>
  );
}
