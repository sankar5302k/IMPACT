import { useState, useEffect } from 'react'
import { Routes, Route, useNavigate } from 'react-router-dom'
import { BarChart2 } from 'lucide-react'
import axios from 'axios'
import InputForm from './components/InputForm'
import Dashboard from './components/Dashboard'
import DiversionPlan from './components/DiversionPlan'
import MapVisualization from './components/MapVisualization'
import AnalyticsDashboard from './components/AnalyticsDashboard'

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

// ─── Main prediction page ─────────────────────────────────────────────────────
function MainPage() {
  const navigate = useNavigate()
  const [historicalData, setHistoricalData] = useState([])
  const [prediction, setPrediction] = useState(null)
  const [loading, setLoading] = useState(false)
  const [currentEvent, setCurrentEvent] = useState(null)

  useEffect(() => {
    axios.get(`${API_URL}/historical-data`)
      .then(res => setHistoricalData(res.data.data))
      .catch(err => console.error('Error fetching map data:', err))
  }, [])

  const handlePredict = async (formData) => {
    setLoading(true)
    setCurrentEvent({ lat: formData.lat, lon: formData.long })
    try {
      const res = await axios.post(`${API_URL}/predict`, formData)
      setPrediction(res.data)
    } catch (err) {
      console.error('Prediction failed:', err)
      alert('Failed to get prediction from backend.')
    }
    setLoading(false)
  }

  return (
    <div className="app-container">
      <div className="glass-panel form-container">
        {/* Logo */}
        <div style={{ marginBottom: '16px', display: 'flex', justifyContent: 'center', width: '100%' }}>
          <img
            src="/logo.jpg"
            alt="IMPACT: Intelligent Mobility Prediction and Control Technology"
            style={{ width: '100%', height: 'auto', borderRadius: '10px', display: 'block' }}
          />
        </div>

        {/* Analytics Dashboard button */}
        <button
          id="analytics-dashboard-btn"
          onClick={() => navigate('/analytics')}
          style={{
            width: '100%',
            marginBottom: '16px',
            padding: '10px 16px',
            background: 'linear-gradient(135deg, rgba(139,92,246,0.25), rgba(59,130,246,0.25))',
            border: '1px solid rgba(139,92,246,0.5)',
            borderRadius: '8px',
            color: '#c4b5fd',
            fontSize: '13px',
            fontWeight: '600',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '8px',
            transition: 'all 0.2s',
            letterSpacing: '0.03em',
          }}
          onMouseEnter={e => {
            e.currentTarget.style.background = 'linear-gradient(135deg, rgba(139,92,246,0.4), rgba(59,130,246,0.4))'
            e.currentTarget.style.borderColor = 'rgba(139,92,246,0.8)'
          }}
          onMouseLeave={e => {
            e.currentTarget.style.background = 'linear-gradient(135deg, rgba(139,92,246,0.25), rgba(59,130,246,0.25))'
            e.currentTarget.style.borderColor = 'rgba(139,92,246,0.5)'
          }}
        >
          <BarChart2 size={15} strokeWidth={2} />
          Analytics Dashboard
        </button>

        <InputForm onSubmit={handlePredict} loading={loading} />
      </div>

      <div className="main-content">
        <Dashboard prediction={prediction} />
        <div className="bottom-panels">
          <MapVisualization
            historicalData={historicalData}
            currentEvent={currentEvent}
            mapData={prediction?.map_data}
          />
          <DiversionPlan plan={prediction?.diversion_plan} />
        </div>
      </div>
    </div>
  )
}

// ─── Root with routes ─────────────────────────────────────────────────────────
export default function App() {
  return (
    <Routes>
      <Route path="/" element={<MainPage />} />
      <Route path="/analytics/*" element={<AnalyticsDashboard />} />
    </Routes>
  )
}
