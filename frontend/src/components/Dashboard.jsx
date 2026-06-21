const Gauge = ({ value, max, color, title, label, subtitle }) => {
  const radius = 33;
  const circumference = 2 * Math.PI * radius;
  const percentage = Math.min(Math.max(value / max, 0), 1);
  const strokeOffset = circumference - percentage * circumference;

  return (
    <div className="metric-gauge-wrapper">
      <div className="metric-gauge-chart">
        <svg viewBox="0 0 80 80">
          {/* Background Ring */}
          <circle
            cx="40"
            cy="40"
            r={radius}
            fill="none"
            stroke="rgba(255, 255, 255, 0.05)"
            strokeWidth="6"
          />
          {/* Progress Ring with Glow */}
          <circle
            cx="40"
            cy="40"
            r={radius}
            fill="none"
            stroke={color}
            strokeWidth="6"
            strokeDasharray={circumference}
            strokeDashoffset={strokeOffset}
            strokeLinecap="round"
            transform="rotate(-90 40 40)"
            style={{ 
              transition: 'stroke-dashoffset 1.5s cubic-bezier(0.4, 0, 0.2, 1)'
            }}
          />
          {/* Numeric Value */}
          <text
            x="40"
            y="46"
            textAnchor="middle"
            fill="#fff"
            fontSize="16"
            fontWeight="800"
          >
            {value}
          </text>
        </svg>
      </div>
      <div className="metric-gauge-info">
        <div className="metric-title">{title}</div>
        <div className="metric-subtitle" style={{ color: color, fontWeight: 600 }}>{label}</div>
        <div className="metric-subtext">{subtitle}</div>
      </div>
    </div>
  );
};

const DonutChart = ({ data, total, valueKey, labelKey, colors }) => {
  const radius = 30;
  const strokeWidth = 8;
  const circumference = 2 * Math.PI * radius;
  
  let cumulative = 0;
  const computedTotal = total || data.reduce((sum, item) => sum + (item[valueKey] || 0), 0);
  
  if (computedTotal === 0) return <div className="chart-empty-state">No data available</div>;

  return (
    <div className="donut-chart-wrapper">
      <svg width="120" height="120" viewBox="0 0 100 100">
        {data.map((item, idx) => {
          const val = item[valueKey] || 0;
          const percentage = val / computedTotal;
          const strokeLength = percentage * circumference;
          const strokeOffset = -cumulative * circumference;
          
          cumulative += percentage;
          const color = colors[idx % colors.length];
          
          return (
            <circle
              key={idx}
              cx="50"
              cy="50"
              r={radius}
              fill="none"
              stroke={color}
              strokeWidth={strokeWidth}
              strokeDasharray={`${strokeLength} ${circumference}`}
              strokeDashoffset={strokeOffset}
              transform="rotate(-90 50 50)"
              style={{ transition: 'stroke-dashoffset 0.8s ease-in-out' }}
            />
          );
        })}
        <circle cx="50" cy="50" r={radius - strokeWidth/2} fill="rgba(0,0,0,0.3)" />
        <text x="50" y="47" textAnchor="middle" fill="var(--text-secondary)" fontSize="7" fontWeight="bold">TOTAL</text>
        <text x="50" y="60" textAnchor="middle" fill="#fff" fontSize="13" fontWeight="900">{computedTotal}</text>
      </svg>
      <div className="donut-legend">
        {data.map((item, idx) => {
          const color = colors[idx % colors.length];
          return (
            <div key={idx} className="legend-item">
              <span className="legend-dot" style={{ backgroundColor: color }}></span>
              <span className="legend-label" title={`${item[labelKey]} (${item[valueKey]})`}>
                {item[labelKey]}: <strong>{item[valueKey]}</strong>
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
};



const PALETTE = ['#2563eb', '#3b82f6', '#d97706', '#dc2626', '#7c3aed', '#059669', '#ea580c', '#1d4ed8'];

const Dashboard = ({ prediction }) => {
  if (!prediction) {
    return (
      <div className="glass-panel" style={{ padding: 24, textAlign: 'center', color: 'var(--text-secondary)' }}>
        <h2>Awaiting Scenario Data</h2>
        <p>Enter incident details and generate an action plan to see predictions.</p>
      </div>
    );
  }

  const { eii, estimated_manpower, barricade_required, barricade_quantity } = prediction;

  const getEiiLabel = (score) => {
    if (score >= 70) return 'Critical Severity';
    if (score >= 40) return 'High Severity';
    return 'Moderate Severity';
  };

  const getEiiColor = (score) => {
    if (score >= 70) return 'var(--danger)';
    if (score >= 40) return 'var(--warning)';
    return 'var(--success)';
  };

  const mapData = prediction?.map_data;
  const barricades = mapData?.barricades || [];
  const policeDeployments = mapData?.police_deployments || [];

  return (
    <div className="glass-panel" style={{ padding: 24 }}>
      <div className="metrics-grid">
        <div className="glass-panel metric-card gauge-card">
          <Gauge
            value={Math.round(eii)}
            max={100}
            color={getEiiColor(eii)}
            title="Event Impact Index"
            label={getEiiLabel(eii)}
            subtitle="Formula Severity Score"
          />
        </div>

        <div className="glass-panel metric-card gauge-card">
          <Gauge
            value={estimated_manpower}
            max={60}
            color="var(--accent)"
            title="Required Manpower"
            label="Personnel Needed"
            subtitle="Police Officers"
          />
        </div>

        <div className="glass-panel metric-card gauge-card">
          <Gauge
            value={barricade_required ? barricade_quantity : 0}
            max={15}
            color={barricade_required ? 'var(--warning)' : 'var(--success)'}
            title="Barricades Needed"
            label={barricade_required ? 'Barricades Deployed' : 'Not Required'}
            subtitle="Traffic Barricades"
          />
        </div>
      </div>

      {/* Allocation Breakdown Charts */}
      <div className="charts-grid">
        {/* Police Allocation Donut Chart */}
        <div className="chart-card">
          <div className="chart-title">
            <span>Personnel Allocation Share</span>
            <span className="chart-subtitle">{estimated_manpower} Officers Total</span>
          </div>
          {policeDeployments.length > 0 ? (
            <DonutChart
              data={policeDeployments}
              total={estimated_manpower}
              valueKey="officers"
              labelKey="name"
              colors={PALETTE}
            />
          ) : (
            <div className="chart-empty-state">No officers deployed in this plan</div>
          )}
        </div>

        {/* Barricade Allocation Donut Chart */}
        <div className="chart-card">
          <div className="chart-title">
            <span>Barricade Distribution Share</span>
            <span className="chart-subtitle">{(barricade_required ? barricade_quantity : 0)} Barricades Total</span>
          </div>
          {barricades.length > 0 ? (
            <DonutChart
              data={barricades}
              total={barricade_required ? barricade_quantity : 0}
              valueKey="count"
              labelKey="name"
              colors={PALETTE}
            />
          ) : (
            <div className="chart-empty-state">No barricades deployed in this plan</div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
