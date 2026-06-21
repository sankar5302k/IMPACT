import { useState } from 'react';

const InputForm = ({ onSubmit, loading }) => {
  const [formData, setFormData] = useState({
    event_type: 'unplanned',
    lat: 12.9716,
    long: 77.5946,
    event_cause: 'accident',
    requires_road_closure: true,
    start_datetime: new Date().toISOString().slice(0, 16),
    corridor: 'Hosur Road',
    priority: 'high',
    police_station: 'Madiwala',
    junction: 'Silk Board',
    peak_hour: true,
  });

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    const submitData = {
      ...formData,
      lat: parseFloat(formData.lat),
      long: parseFloat(formData.long),
      start_datetime: new Date(formData.start_datetime).toISOString()
    };
    onSubmit(submitData);
  };

  return (
    <form className="form-group" onSubmit={handleSubmit}>
      <div className="form-group">
        <label>Event Type</label>
        <select className="form-select" name="event_type" value={formData.event_type} onChange={handleChange}>
          <option value="unplanned">Unplanned</option>
          <option value="planned">Planned</option>
        </select>
      </div>

      <div className="form-group">
        <label>Event Cause</label>
        <select className="form-select" name="event_cause" value={formData.event_cause} onChange={handleChange}>
          <option value="accident">Accident</option>
          <option value="vip_movement">VIP Movement</option>
          <option value="construction">Construction</option>
          <option value="water_logging">Water Logging</option>
          <option value="public_event">Public Event</option>
        </select>
      </div>

      <div className="form-group">
        <label>Latitude</label>
        <input type="number" step="any" className="form-input" name="lat" value={formData.lat} onChange={handleChange} required />
      </div>

      <div className="form-group">
        <label>Longitude</label>
        <input type="number" step="any" className="form-input" name="long" value={formData.long} onChange={handleChange} required />
      </div>

      <div className="form-group">
        <label>Start Date & Time</label>
        <input type="datetime-local" className="form-input" name="start_datetime" value={formData.start_datetime} onChange={handleChange} required />
      </div>

      <div className="form-group">
        <label>Corridor (if any)</label>
        <input type="text" className="form-input" name="corridor" value={formData.corridor} onChange={handleChange} />
      </div>

      <div className="form-group">
        <label>Junction</label>
        <input type="text" className="form-input" name="junction" value={formData.junction} onChange={handleChange} />
      </div>
      
      <div className="form-group">
        <label>Police Station</label>
        <input type="text" className="form-input" name="police_station" value={formData.police_station} onChange={handleChange} />
      </div>

      <div className="form-group checkbox-group" style={{marginTop: 10}}>
        <input type="checkbox" name="requires_road_closure" checked={formData.requires_road_closure} onChange={handleChange} />
        <label style={{marginTop: 3}}>Requires Road Closure</label>
      </div>

      <div className="form-group checkbox-group">
        <input type="checkbox" name="peak_hour" checked={formData.peak_hour} onChange={handleChange} />
        <label style={{marginTop: 3}}>Peak Hour Incident</label>
      </div>

      <button type="submit" className="submit-btn" disabled={loading}>
        {loading ? 'Analyzing Impact...' : 'Generate Action Plan'}
      </button>
    </form>
  );
};

export default InputForm;
