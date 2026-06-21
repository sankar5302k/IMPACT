import { useEffect } from 'react';
import { MapContainer, TileLayer, CircleMarker, Popup, useMap } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';

// Component to dynamically fit map bounds to include incident and all deployment points
const MapBounds = ({ currentEvent, points }) => {
  const map = useMap();
  useEffect(() => {
    if (!currentEvent) return;
    const coords = [[currentEvent.lat, currentEvent.lon], ...points.map(p => [p.lat, p.lon])];
    if (coords.length > 1) {
      map.fitBounds(coords, { padding: [50, 50], maxZoom: 15, animate: true });
    } else {
      map.setView([currentEvent.lat, currentEvent.lon], 14, { animate: true });
    }
  }, [currentEvent, points, map]);
  return null;
};

const MapVisualization = ({ historicalData, currentEvent, mapData }) => {
  const defaultCenter = [12.9716, 77.5946]; // Bangalore center

  // Filter valid coordinate points for markers and bounds calculation
  const barricadesList = mapData?.barricades?.filter(pt => pt && typeof pt.lat === 'number' && typeof pt.lon === 'number') || [];
  const policeDeploymentsList = mapData?.police_deployments?.filter(pt => pt && typeof pt.lat === 'number' && typeof pt.lon === 'number') || [];
  const allPoints = [...barricadesList, ...policeDeploymentsList];

  return (
    <div className="glass-panel map-wrapper">
      <MapContainer 
        center={defaultCenter} 
        zoom={12} 
        style={{ height: '100%', width: '100%', background: '#1a1d2d' }}
      >
        <TileLayer
          url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>'
        />

        {currentEvent && <MapBounds currentEvent={currentEvent} points={allPoints} />}



        {/* Render Barricade Locations */}
        {barricadesList.map((pt, idx) => (
          <CircleMarker
            key={`barricade-${idx}`}
            center={[pt.lat, pt.lon]}
            radius={8}
            pathOptions={{ 
              color: '#d97706', 
              fillColor: '#d97706', 
              fillOpacity: 0.8,
              weight: 2
            }}
          >
            <Popup>
              <div style={{ color: '#000', fontSize: '0.9rem' }}>
                <strong style={{ color: '#ff7700' }}>🚧 Police Barricade Point</strong><br/>
                <strong>Location:</strong> {pt.name}<br/>
                <strong>Quantity:</strong> {pt.count} barricades
              </div>
            </Popup>
          </CircleMarker>
        ))}

        {/* Render Police Deployment Locations */}
        {policeDeploymentsList.map((pt, idx) => (
          <CircleMarker
            key={`police-${idx}`}
            center={[pt.lat, pt.lon]}
            radius={8}
            pathOptions={{ 
              color: '#2563eb', 
              fillColor: '#2563eb', 
              fillOpacity: 0.8,
              weight: 2
            }}
          >
            <Popup>
              <div style={{ color: '#000', fontSize: '0.9rem' }}>
                <strong style={{ color: '#0088ff' }}>👮 Traffic Police Post</strong><br/>
                <strong>Location:</strong> {pt.name}<br/>
                <strong>Officers:</strong> {pt.officers} personnel<br/>
                <strong>Responsibility:</strong> {pt.responsibility}
              </div>
            </Popup>
          </CircleMarker>
        ))}

        {/* Render Current Active Incident */}
        {currentEvent && (
          <CircleMarker
            center={[currentEvent.lat, currentEvent.lon]}
            radius={11}
            pathOptions={{ 
              color: '#fff', 
              fillColor: '#dc2626', 
              fillOpacity: 1,
              weight: 3
            }}
          >
            <Popup>
              <div style={{ color: '#000' }}>
                <strong>Current Incident Focus</strong>
              </div>
            </Popup>
          </CircleMarker>
        )}
      </MapContainer>
    </div>
  );
};

export default MapVisualization;
