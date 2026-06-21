import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
  PieChart, Pie, Cell, AreaChart, Area, RadarChart, Radar,
  PolarGrid, PolarAngleAxis, PolarRadiusAxis
} from 'recharts';
import {
  LayoutDashboard, Car, Users, Shield, BarChart2, X,
  Radio, AlertTriangle, TrendingUp, Layers, MapPin,
  Activity, Clock, Zap, AlertOctagon, CheckCircle,
  XCircle, ArrowUpRight, Cpu, Navigation, BookOpen, Database
} from 'lucide-react';
import AddDataPage from './AddDataPage';

// ─── Dataset (pre-computed from Cleaned_with_manpower_and_barricades.xlsx) ───
const DATA = {
  totalIncidents: 8147,
  eventTypes: [
    { name: 'Unplanned', value: 7700, fill: '#ef4444' },
    { name: 'Planned',   value: 447,  fill: '#3b82f6' },
  ],
  eventCauses: [
    { cause: 'Vehicle Breakdown', count: 4895 },
    { cause: 'Others',            count: 638  },
    { cause: 'Pot Holes',         count: 537  },
    { cause: 'Construction',      count: 469  },
    { cause: 'Water Logging',     count: 458  },
    { cause: 'Accident',          count: 364  },
    { cause: 'Tree Fall',         count: 284  },
    { cause: 'Road Conditions',   count: 170  },
    { cause: 'Congestion',        count: 135  },
    { cause: 'Public Event',      count: 73   },
    { cause: 'Procession',        count: 72   },
    { cause: 'VIP Movement',      count: 20   },
    { cause: 'Protest',           count: 14   },
    { cause: 'Debris',            count: 13   },
  ],
  priority: [
    { name: 'High Priority', value: 5014, fill: '#ef4444' },
    { name: 'Low Priority',  value: 3131, fill: '#22c55e' },
  ],
  corridors: [
    { corridor: 'Non-corridor',   count: 3114 },
    { corridor: 'Mysore Road',    count: 743  },
    { corridor: 'Bellary Road 1', count: 608  },
    { corridor: 'Tumkur Road',    count: 457  },
    { corridor: 'Bellary Road 2', count: 379  },
    { corridor: 'Hosur Road',     count: 298  },
    { corridor: 'ORR North 1',    count: 272  },
    { corridor: 'Old Madras Road',count: 262  },
    { corridor: 'Magadi Road',    count: 245  },
    { corridor: 'ORR East 1',     count: 244  },
  ],
  eiiBuckets: [
    { range: 'Low (0–20)',      count: 4261, fill: '#22c55e' },
    { range: 'Medium (20–40)',  count: 3403, fill: '#f59e0b' },
    { range: 'High (40–60)',    count: 418,  fill: '#f97316' },
    { range: 'Critical (60+)', count: 65,   fill: '#ef4444' },
  ],
  highEiiAreas: [
    { area: 'Old Airport Rd',  avgEII: 73.54 },
    { area: 'Old Madras Rd',   avgEII: 67.98 },
    { area: 'ORR West 1',      avgEII: 62.56 },
    { area: 'Hosur Road',      avgEII: 60.62 },
    { area: 'Mysore Road',     avgEII: 59.44 },
    { area: 'ORR North 1',     avgEII: 59.03 },
    { area: 'W. Chord Road',   avgEII: 58.99 },
    { area: 'Tumkur Road',     avgEII: 58.45 },
    { area: 'Non-corridor',    avgEII: 57.88 },
    { area: 'ORR East 1',      avgEII: 57.56 },
  ],
  manpowerByCause: [
    { cause: 'VIP Movement',   manpower: 24.6 },
    { cause: 'Public Event',   manpower: 23.2 },
    { cause: 'Protest',        manpower: 20.9 },
    { cause: 'Construction',   manpower: 19.1 },
    { cause: 'Tree Fall',      manpower: 17.4 },
    { cause: 'Procession',     manpower: 16.3 },
    { cause: 'Water Logging',  manpower: 16.1 },
    { cause: 'Others',         manpower: 15.5 },
    { cause: 'Road Conditions',manpower: 14.4 },
    { cause: 'V. Breakdown',   manpower: 12.9 },
    { cause: 'Accident',       manpower: 11.0 },
    { cause: 'Pot Holes',      manpower: 10.4 },
    { cause: 'Congestion',     manpower: 9.3  },
  ],
  barricadeByCorridors: [
    { corridor: 'Non-corridor',  qty: 8692 },
    { corridor: 'Mysore Road',   qty: 4377 },
    { corridor: 'Bellary Rd 1',  qty: 2773 },
    { corridor: 'Tumkur Road',   qty: 2366 },
    { corridor: 'Bellary Rd 2',  qty: 2196 },
    { corridor: 'Hosur Road',    qty: 1852 },
    { corridor: 'Old Madras Rd', qty: 1616 },
    { corridor: 'ORR North 1',   qty: 1533 },
    { corridor: 'ORR East 1',    qty: 1407 },
    { corridor: 'W. Chord Road', qty: 1088 },
  ],
  barricadeRequired: [
    { name: 'Required',     value: 4191, fill: '#f97316' },
    { name: 'Not Required', value: 3956, fill: '#64748b' },
  ],
  monthly: [
    { month: 'Jan', incidents: 1462 },
    { month: 'Feb', incidents: 1357 },
    { month: 'Mar', incidents: 1955 },
    { month: 'Apr', incidents: 628  },
    { month: 'Nov', incidents: 978  },
    { month: 'Dec', incidents: 1767 },
  ],
  hourly: [
    { hour: '00', count: 420 }, { hour: '01', count: 384 }, { hour: '02', count: 391 },
    { hour: '03', count: 373 }, { hour: '04', count: 558 }, { hour: '05', count: 661 },
    { hour: '06', count: 661 }, { hour: '07', count: 482 }, { hour: '08', count: 330 },
    { hour: '09', count: 160 }, { hour: '10', count: 68  }, { hour: '11', count: 69  },
    { hour: '12', count: 77  }, { hour: '13', count: 33  }, { hour: '14', count: 15  },
    { hour: '15', count: 9   }, { hour: '16', count: 9   }, { hour: '17', count: 39  },
    { hour: '18', count: 234 }, { hour: '19', count: 584 }, { hour: '20', count: 683 },
    { hour: '21', count: 817 }, { hour: '22', count: 587 }, { hour: '23', count: 503 },
  ],
  roadClosure: [
    { name: 'Road Closed', value: 1823, fill: '#ef4444' },
    { name: 'No Closure',  value: 6324, fill: '#22c55e' },
  ],
  peakHour: [
    { name: 'Peak Hour', value: 3244, fill: '#f59e0b' },
    { name: 'Off-Peak',  value: 4903, fill: '#3b82f6' },
  ],
};

const COLORS = ['#3b82f6','#ef4444','#22c55e','#f59e0b','#8b5cf6','#06b6d4','#f97316','#ec4899','#10b981','#6366f1'];

// ─── Custom Tooltip ───────────────────────────────────────────────────────────
const CustomTooltip = ({ active, payload, label }) => {
  if (active && payload && payload.length) {
    return (
      <div style={{
        background: 'rgba(15,23,42,0.97)',
        border: '1px solid rgba(59,130,246,0.35)',
        borderRadius: 8,
        padding: '8px 14px',
        fontSize: 13,
        color: '#e2e8f0',
        boxShadow: '0 4px 20px rgba(0,0,0,0.4)'
      }}>
        <p style={{ marginBottom: 4, fontWeight: 600, color: '#93c5fd' }}>{label}</p>
        {payload.map((p, i) => (
          <p key={i} style={{ color: p.color || '#e2e8f0', margin: '2px 0' }}>
            {p.name}: <strong>{typeof p.value === 'number' ? p.value.toLocaleString() : p.value}</strong>
          </p>
        ))}
      </div>
    );
  }
  return null;
};

// ─── Stat Card ───────────────────────────────────────────────────────────────
const StatCard = ({ label, value, sub, color, Icon }) => (
  <div style={{
    background: 'rgba(15,23,42,0.75)',
    border: `1px solid ${color}30`,
    borderRadius: 12,
    padding: '18px 20px',
    flex: 1,
    minWidth: 155,
    position: 'relative',
    overflow: 'hidden'
  }}>
    <div style={{
      position: 'absolute', top: 12, right: 14,
      color, opacity: 0.15
    }}>
      <Icon size={36} strokeWidth={1.5} />
    </div>
    <div style={{ display: 'flex', alignItems: 'center', gap: 7, marginBottom: 8 }}>
      <Icon size={14} color={color} strokeWidth={2} />
      <span style={{ fontSize: 11, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.06em' }}>{label}</span>
    </div>
    <div style={{ fontSize: 26, fontWeight: 700, color, marginBottom: 2 }}>{value}</div>
    {sub && <div style={{ fontSize: 11, color: '#64748b' }}>{sub}</div>}
    <div style={{ position: 'absolute', bottom: 0, left: 0, height: 2, width: '100%', background: `linear-gradient(90deg, ${color}, transparent)` }} />
  </div>
);

// ─── Section Title ────────────────────────────────────────────────────────────
const SectionTitle = ({ title, subtitle, Icon }) => (
  <div style={{ marginBottom: 22, display: 'flex', alignItems: 'flex-start', gap: 12 }}>
    <div style={{
      padding: 10, borderRadius: 10,
      background: 'rgba(59,130,246,0.15)',
      border: '1px solid rgba(59,130,246,0.25)',
      color: '#60a5fa', flexShrink: 0, marginTop: 2
    }}>
      <Icon size={20} strokeWidth={1.8} />
    </div>
    <div>
      <h2 style={{ margin: 0, fontSize: 20, fontWeight: 700, color: '#e2e8f0' }}>{title}</h2>
      {subtitle && <p style={{ margin: '4px 0 0', fontSize: 13, color: '#64748b' }}>{subtitle}</p>}
    </div>
  </div>
);

// ─── Chart Card ──────────────────────────────────────────────────────────────
const ChartCard = ({ title, children, span = 1 }) => (
  <div style={{
    background: 'rgba(15,23,42,0.7)',
    border: '1px solid rgba(51,65,85,0.6)',
    borderRadius: 14,
    padding: '20px 20px 12px',
    gridColumn: span === 2 ? 'span 2' : 'span 1',
  }}>
    <div style={{ fontSize: 13, fontWeight: 600, color: '#93c5fd', marginBottom: 16, letterSpacing: '0.03em' }}>
      {title}
    </div>
    {children}
  </div>
);

// ─── Pages ───────────────────────────────────────────────────────────────────
function OverviewPage({ data }) {
  return (
    <div>
      <SectionTitle Icon={LayoutDashboard} title="Overview" subtitle="Summary of all traffic incidents across Bengaluru" />
      <div style={{ display: 'flex', gap: 14, flexWrap: 'wrap', marginBottom: 24 }}>
        <StatCard Icon={Activity}      label="Total Incidents"    value={data.totalIncidents.toLocaleString()}        sub="Across all corridors"            color="#3b82f6" />
        <StatCard Icon={AlertTriangle} label="Unplanned Events"   value={data.unplannedCount.toLocaleString()}        sub={`${data.unplannedPercent}% of all incidents`}          color="#ef4444" />
        <StatCard Icon={Zap}           label="High Priority"      value={data.highPriorityCount.toLocaleString()}      sub={`${data.highPriorityPercent}% require urgent action`}     color="#f97316" />
        <StatCard Icon={Layers}        label="Need Barricades"    value={data.needBarricadeCount.toLocaleString()}    sub={`${data.needBarricadePercent}% of incidents`}              color="#f59e0b" />
        <StatCard Icon={Users}         label="Avg Manpower"       value={data.avgManpower.toFixed(1)}                 sub="Personnel per incident"          color="#22c55e" />
        <StatCard Icon={TrendingUp}    label="Avg EII Score"      value={data.avgEii.toFixed(2)}                      sub="Event Impact Index"              color="#8b5cf6" />
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 16 }}>
        <ChartCard title="Event Type Distribution">
          <ResponsiveContainer width="100%" height={260}>
            <PieChart>
              <Pie data={data.eventTypes} cx="50%" cy="50%" outerRadius={90} dataKey="value"
                label={({ name, value }) => `${name}: ${value.toLocaleString()}`}>
                {data.eventTypes.map((e, i) => <Cell key={i} fill={e.fill} />)}
              </Pie>
              <Tooltip content={<CustomTooltip />} />
            </PieChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard title="Priority Breakdown">
          <ResponsiveContainer width="100%" height={260}>
            <PieChart>
              <Pie data={data.priority} cx="50%" cy="50%" innerRadius={55} outerRadius={90} dataKey="value"
                label={({ name, value }) => `${name}: ${value.toLocaleString()}`}>
                {data.priority.map((e, i) => <Cell key={i} fill={e.fill} />)}
              </Pie>
              <Tooltip content={<CustomTooltip />} />
            </PieChart>
          </ResponsiveContainer>
        </ChartCard>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
        <ChartCard title="Road Closure Events">
          <ResponsiveContainer width="100%" height={220}>
            <PieChart>
              <Pie data={data.roadClosure} cx="50%" cy="50%" outerRadius={80} dataKey="value"
                label={({ name, value }) => `${name}: ${value.toLocaleString()}`}>
                {data.roadClosure.map((e, i) => <Cell key={i} fill={e.fill} />)}
              </Pie>
              <Tooltip content={<CustomTooltip />} />
            </PieChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard title="Peak Hour vs Off-Peak">
          <ResponsiveContainer width="100%" height={220}>
            <PieChart>
              <Pie data={data.peakHour} cx="50%" cy="50%" outerRadius={80} dataKey="value"
                label={({ name, value }) => `${name}: ${value.toLocaleString()}`}>
                {data.peakHour.map((e, i) => <Cell key={i} fill={e.fill} />)}
              </Pie>
              <Tooltip content={<CustomTooltip />} />
            </PieChart>
          </ResponsiveContainer>
        </ChartCard>
      </div>
    </div>
  );
}

function IncidentTypesPage({ data }) {
  return (
    <div>
      <SectionTitle Icon={Car} title="Incident Types & Causes" subtitle="Breakdown of what is causing traffic disruptions" />

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
        <ChartCard title="Incidents by Cause" span={2}>
          <ResponsiveContainer width="100%" height={340}>
            <BarChart data={data.eventCauses} layout="vertical" margin={{ left: 20, right: 30 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(51,65,85,0.4)" />
              <XAxis type="number" tick={{ fill: '#94a3b8', fontSize: 11 }} />
              <YAxis dataKey="cause" type="category" width={130} tick={{ fill: '#94a3b8', fontSize: 11 }} />
              <Tooltip content={<CustomTooltip />} />
              <Bar dataKey="count" name="Incidents" radius={[0, 4, 4, 0]}>
                {data.eventCauses.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard title="Incidents by Corridor (Top 10)">
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={data.corridors} layout="vertical" margin={{ left: 20, right: 30 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(51,65,85,0.4)" />
              <XAxis type="number" tick={{ fill: '#94a3b8', fontSize: 11 }} />
              <YAxis dataKey="corridor" type="category" width={110} tick={{ fill: '#94a3b8', fontSize: 11 }} />
              <Tooltip content={<CustomTooltip />} />
              <Bar dataKey="count" name="Incidents" fill="#3b82f6" radius={[0, 4, 4, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard title="Monthly Incident Trend">
          <ResponsiveContainer width="100%" height={300}>
            <AreaChart data={data.monthly}>
              <defs>
                <linearGradient id="colorMonthly" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%"  stopColor="#3b82f6" stopOpacity={0.4} />
                  <stop offset="95%" stopColor="#3b82f6" stopOpacity={0.0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(51,65,85,0.4)" />
              <XAxis dataKey="month" tick={{ fill: '#94a3b8', fontSize: 11 }} />
              <YAxis tick={{ fill: '#94a3b8', fontSize: 11 }} />
              <Tooltip content={<CustomTooltip />} />
              <Area type="monotone" dataKey="incidents" name="Incidents" stroke="#3b82f6" fill="url(#colorMonthly)" strokeWidth={2} />
            </AreaChart>
          </ResponsiveContainer>
        </ChartCard>
      </div>
    </div>
  );
}

function ManpowerPage({ data }) {
  return (
    <div>
      <SectionTitle Icon={Users} title="Manpower & Deployment" subtitle="Personnel requirements across incident types and corridors" />

      <div style={{ display: 'flex', gap: 14, flexWrap: 'wrap', marginBottom: 24 }}>
        <StatCard Icon={Users}        label="Total Deployed"    value={`~${data.totalDeployed.toLocaleString()}`}   sub="Estimated across all incidents"  color="#22c55e" />
        <StatCard Icon={Activity}     label="Avg per Incident"  value={data.avgManpower.toFixed(1)}        sub="Officers per event"              color="#3b82f6" />
        <StatCard Icon={ArrowUpRight} label="Max Deployed"      value={data.maxManpower.toString()}          sub="Maximum personnel deployed"            color="#f97316" />
        <StatCard Icon={CheckCircle}  label="Min Deployed"      value={data.minManpower.toString()}           sub="Minimum personnel deployed"               color="#64748b" />
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
        <ChartCard title="Avg Manpower Required by Incident Type" span={2}>
          <ResponsiveContainer width="100%" height={320}>
            <BarChart data={data.manpowerByCause} margin={{ left: 10, right: 20 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(51,65,85,0.4)" />
              <XAxis dataKey="cause" tick={{ fill: '#94a3b8', fontSize: 10 }} angle={-30} textAnchor="end" height={60} />
              <YAxis tick={{ fill: '#94a3b8', fontSize: 11 }}
                label={{ value: 'Officers', angle: -90, position: 'insideLeft', fill: '#64748b', fontSize: 11 }} />
              <Tooltip content={<CustomTooltip />} />
              <Bar dataKey="manpower" name="Avg Manpower" radius={[4, 4, 0, 0]}>
                {data.manpowerByCause.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard title="Hourly Incident Distribution (Police Deployment Guide)">
          <ResponsiveContainer width="100%" height={280}>
            <AreaChart data={data.hourly}>
              <defs>
                <linearGradient id="colorHourly" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%"  stopColor="#22c55e" stopOpacity={0.5} />
                  <stop offset="95%" stopColor="#22c55e" stopOpacity={0.0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(51,65,85,0.4)" />
              <XAxis dataKey="hour" tick={{ fill: '#94a3b8', fontSize: 10 }}
                label={{ value: 'Hour of Day', position: 'insideBottom', offset: -2, fill: '#64748b', fontSize: 11 }} />
              <YAxis tick={{ fill: '#94a3b8', fontSize: 11 }} />
              <Tooltip content={<CustomTooltip />} />
              <Area type="monotone" dataKey="count" name="Incidents" stroke="#22c55e" fill="url(#colorHourly)" strokeWidth={2} />
            </AreaChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard title="Priority Breakdown (Deployment Urgency)">
          <ResponsiveContainer width="100%" height={280}>
            <PieChart>
              <Pie data={data.priority} cx="50%" cy="50%" innerRadius={65} outerRadius={100} dataKey="value"
                label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(1)}%`}>
                {data.priority.map((e, i) => <Cell key={i} fill={e.fill} />)}
              </Pie>
              <Tooltip content={<CustomTooltip />} />
              <Legend />
            </PieChart>
          </ResponsiveContainer>
        </ChartCard>
      </div>
    </div>
  );
}

function BarricadePage({ data }) {
  return (
    <div>
      <SectionTitle Icon={Shield} title="Barricade Analysis" subtitle="Barricade deployment requirements across corridors and causes" />

      <div style={{ display: 'flex', gap: 14, flexWrap: 'wrap', marginBottom: 24 }}>
        <StatCard Icon={Layers}      label="Total Barricades"       value={`~${data.totalBarricades.toLocaleString()}`}    sub="Across all corridors"       color="#f97316" />
        <StatCard Icon={AlertOctagon}label="Incidents w/ Barricades" value={data.needBarricadeCount.toLocaleString()}    sub={`${data.needBarricadePercent}% of all incidents`}     color="#f59e0b" />
        <StatCard Icon={CheckCircle} label="No Barricade Needed"     value={data.noBarricadeCount.toLocaleString()}    sub={`${data.noBarricadePercent}% of all incidents`}     color="#64748b" />
        <StatCard Icon={MapPin}      label="Top Corridor"            value={data.topCorridorName} sub={`${data.topCorridorQty.toLocaleString()} barricades total`}    color="#ef4444" />
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
        <ChartCard title="Barricade Quantity by Corridor" span={2}>
          <ResponsiveContainer width="100%" height={320}>
            <BarChart data={data.barricadeByCorridors} margin={{ left: 10, right: 20 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(51,65,85,0.4)" />
              <XAxis dataKey="corridor" tick={{ fill: '#94a3b8', fontSize: 10 }} angle={-25} textAnchor="end" height={55} />
              <YAxis tick={{ fill: '#94a3b8', fontSize: 11 }}
                label={{ value: 'Barricades', angle: -90, position: 'insideLeft', fill: '#64748b', fontSize: 11 }} />
              <Tooltip content={<CustomTooltip />} />
              <Bar dataKey="qty" name="Barricades" radius={[4, 4, 0, 0]}>
                {data.barricadeByCorridors.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard title="Barricade Requirement Split">
          <ResponsiveContainer width="100%" height={280}>
            <PieChart>
              <Pie data={data.barricadeRequired} cx="50%" cy="50%" outerRadius={100} dataKey="value"
                label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(1)}%`}>
                {data.barricadeRequired.map((e, i) => <Cell key={i} fill={e.fill} />)}
              </Pie>
              <Tooltip content={<CustomTooltip />} />
              <Legend />
            </PieChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard title="Road Closure Events (Barricade Critical)">
          <ResponsiveContainer width="100%" height={280}>
            <PieChart>
              <Pie data={data.roadClosure} cx="50%" cy="50%" innerRadius={65} outerRadius={100} dataKey="value"
                label={({ name, value }) => `${name}: ${value.toLocaleString()}`}>
                {data.roadClosure.map((e, i) => <Cell key={i} fill={e.fill} />)}
              </Pie>
              <Tooltip content={<CustomTooltip />} />
              <Legend />
            </PieChart>
          </ResponsiveContainer>
        </ChartCard>
      </div>
    </div>
  );
}

function EIIPage({ data }) {
  return (
    <div>
      <SectionTitle Icon={BarChart2} title="EII — Event Impact Index" subtitle="Severity scoring across Bengaluru corridors" />

      <div style={{ display: 'flex', gap: 14, flexWrap: 'wrap', marginBottom: 24 }}>
        <StatCard Icon={TrendingUp}   label="Avg EII Score"         value={data.avgEii.toFixed(2)}  sub="City-wide average"           color="#8b5cf6" />
        <StatCard Icon={AlertOctagon} label="Max EII"               value={data.maxEii.toFixed(1)}   sub="Most severe recorded"        color="#ef4444" />
        <StatCard Icon={AlertTriangle}label="Critical (60+)"        value={data.criticalEii.toLocaleString()}     sub="Highest impact events"       color="#f97316" />
        <StatCard Icon={Zap}          label="High EII (40–60)"      value={data.highEii.toLocaleString()}    sub="Severe disruption events"    color="#f59e0b" />
        <StatCard Icon={Activity}     label="Median EII"            value={data.medianEii.toFixed(2)}  sub="50th percentile"             color="#22c55e" />
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
        <ChartCard title="EII Severity Distribution">
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={data.eiiBuckets}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(51,65,85,0.4)" />
              <XAxis dataKey="range" tick={{ fill: '#94a3b8', fontSize: 11 }} />
              <YAxis tick={{ fill: '#94a3b8', fontSize: 11 }} />
              <Tooltip content={<CustomTooltip />} />
              <Bar dataKey="count" name="Incidents" radius={[4, 4, 0, 0]}>
                {data.eiiBuckets.map((e, i) => <Cell key={i} fill={e.fill} />)}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard title="High EII Areas (Avg EII > 50)">
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={data.highEiiAreas} layout="vertical" margin={{ left: 10, right: 30 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(51,65,85,0.4)" />
              <XAxis type="number" domain={[40, 80]} tick={{ fill: '#94a3b8', fontSize: 11 }} />
              <YAxis dataKey="area" type="category" width={115} tick={{ fill: '#94a3b8', fontSize: 11 }} />
              <Tooltip content={<CustomTooltip />} />
              <Bar dataKey="avgEII" name="Avg EII Score" radius={[0, 4, 4, 0]}>
                {data.highEiiAreas.map((_, i) => <Cell key={i} fill={`hsl(${15 + i * 12}, 85%, 55%)`} />)}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard title="EII Category Distribution">
          <ResponsiveContainer width="100%" height={280}>
            <PieChart>
              <Pie data={data.eiiBuckets} cx="50%" cy="50%" outerRadius={95} dataKey="count" nameKey="range"
                label={({ range, count }) => `${range}: ${count}`}>
                {data.eiiBuckets.map((e, i) => <Cell key={i} fill={e.fill} />)}
              </Pie>
              <Tooltip content={<CustomTooltip />} />
              <Legend />
            </PieChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard title="EII Risk Radar by Corridor">
          <ResponsiveContainer width="100%" height={280}>
            <RadarChart data={data.highEiiAreas.slice(0, 8)}>
              <PolarGrid stroke="rgba(51,65,85,0.5)" />
              <PolarAngleAxis dataKey="area" tick={{ fill: '#94a3b8', fontSize: 10 }} />
              <PolarRadiusAxis angle={90} domain={[0, 80]} tick={{ fill: '#64748b', fontSize: 9 }} />
              <Radar name="Avg EII" dataKey="avgEII" stroke="#8b5cf6" fill="#8b5cf6" fillOpacity={0.3} />
              <Tooltip content={<CustomTooltip />} />
            </RadarChart>
          </ResponsiveContainer>
        </ChartCard>
      </div>
    </div>
  );
}

// ─── Sidebar nav items ────────────────────────────────────────────────────────
const NAV_ITEMS = [
  { id: 'overview',   label: 'Overview',       Icon: LayoutDashboard },
  { id: 'incidents',  label: 'Incident Types', Icon: Car             },
  { id: 'manpower',   label: 'Manpower',       Icon: Users           },
  { id: 'barricades', label: 'Barricades',     Icon: Shield          },
  { id: 'eii',        label: 'EII Analysis',   Icon: BarChart2       },
  { id: 'adddata',    label: 'Add Data',        Icon: Database        },
];

// ─── Map Backend to Dashboard Data structure ───────────────────────────────────
const mapBackendToData = (apiData) => {
  const eventTypes = Object.entries(apiData.event_types || {}).map(([name, value]) => ({
    name: name.charAt(0).toUpperCase() + name.slice(1),
    value,
    fill: name.toLowerCase() === 'unplanned' ? '#ef4444' : '#3b82f6'
  }));

  const eventCauses = Object.entries(apiData.event_causes || {}).map(([cause, count]) => ({
    cause: cause.split('_').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' '),
    count
  }));

  const priority = Object.entries(apiData.priority || {}).map(([name, value]) => ({
    name: name === 'High' ? 'High Priority' : 'Low Priority',
    value,
    fill: name === 'High' ? '#ef4444' : '#22c55e'
  }));

  const corridors = Object.entries(apiData.corridors || {}).map(([corridor, count]) => ({
    corridor,
    count
  }));

  const eiiBuckets = Object.entries(apiData.eii_buckets || {}).map(([range, count]) => ({
    range: range.replace('-', '–'),
    count,
    fill: range.includes('Low') ? '#22c55e' : (range.includes('Medium') ? '#f59e0b' : (range.includes('High') ? '#f97316' : '#ef4444'))
  }));

  const highEiiAreas = Object.entries(apiData.high_eii_areas || {}).map(([area, avgEII]) => ({
    area,
    avgEII
  }));

  const manpowerByCause = Object.entries(apiData.manpower_by_cause || {}).map(([cause, manpower]) => ({
    cause: cause.split('_').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' '),
    manpower
  }));

  const barricadeByCorridors = Object.entries(apiData.barricade_by_corridor || {}).map(([corridor, qty]) => ({
    corridor,
    qty
  }));

  const barricadeRequired = Object.entries(apiData.barricade_required || {}).map(([name, value]) => ({
    name: name === 'True' || name === 'true' || name === '1' ? 'Required' : 'Not Required',
    value,
    fill: name === 'True' || name === 'true' || name === '1' ? '#f97316' : '#64748b'
  }));

  const monthly = Object.entries(apiData.monthly || {}).map(([month, incidents]) => ({
    month,
    incidents
  }));

  const hourly = Object.entries(apiData.hourly || {}).map(([hour, count]) => ({
    hour,
    count
  }));

  const roadClosure = Object.entries(apiData.requires_road_closure || {}).map(([name, value]) => ({
    name: name === 'True' || name === 'true' || name === '1' ? 'Road Closed' : 'No Closure',
    value,
    fill: name === 'True' || name === 'true' || name === '1' ? '#ef4444' : '#22c55e'
  }));

  const peakHour = Object.entries(apiData.peak_hour || {}).map(([name, value]) => ({
    name: name === 'True' || name === 'true' || name === '1' ? 'Peak Hour' : 'Off-Peak',
    value,
    fill: name === 'True' || name === 'true' || name === '1' ? '#f59e0b' : '#3b82f6'
  }));

  const totalIncidents = apiData.total_incidents || 0;
  const unplannedCount = apiData.event_types?.['Unplanned'] || apiData.event_types?.['unplanned'] || 0;
  const unplannedPercent = totalIncidents > 0 ? ((unplannedCount / totalIncidents) * 100).toFixed(1) : "0.0";
  
  const highPriorityCount = apiData.priority?.['High'] || apiData.priority?.['high'] || 0;
  const highPriorityPercent = totalIncidents > 0 ? ((highPriorityCount / totalIncidents) * 100).toFixed(1) : "0.0";

  const needBarricadeCount = apiData.barricade_required?.['True'] || apiData.barricade_required?.['true'] || apiData.barricade_required?.['1'] || 0;
  const needBarricadePercent = totalIncidents > 0 ? ((needBarricadeCount / totalIncidents) * 100).toFixed(1) : "0.0";
  const noBarricadeCount = totalIncidents - needBarricadeCount;
  const noBarricadePercent = totalIncidents > 0 ? ((noBarricadeCount / totalIncidents) * 100).toFixed(1) : "0.0";

  const avgManpower = apiData.manpower_stats?.mean || 0;
  const totalDeployed = Math.round(totalIncidents * avgManpower);
  const maxManpower = apiData.manpower_stats?.max || 0;
  const minManpower = apiData.manpower_stats?.min || 0;

  const totalBarricades = Object.values(apiData.barricade_by_corridor || {}).reduce((a, b) => a + b, 0);
  const topCorridorObj = Object.entries(apiData.barricade_by_corridor || {}).sort((a, b) => b[1] - a[1])[0];
  const topCorridorName = topCorridorObj ? topCorridorObj[0] : 'None';
  const topCorridorQty = topCorridorObj ? topCorridorObj[1] : 0;

  const avgEii = apiData.eii_stats?.mean || 0;
  const maxEii = apiData.eii_stats?.max || 0;
  const medianEii = apiData.eii_stats?.median || 0;
  const criticalEii = apiData.eii_buckets?.['Critical (60+)'] || apiData.eii_buckets?.['Critical (60+)'] || 0;
  const highEii = apiData.eii_buckets?.['High (40-60)'] || apiData.eii_buckets?.['High (40-60)'] || 0;

  return {
    totalIncidents,
    unplannedCount,
    unplannedPercent,
    highPriorityCount,
    highPriorityPercent,
    needBarricadeCount,
    needBarricadePercent,
    noBarricadeCount,
    noBarricadePercent,
    
    avgManpower,
    totalDeployed,
    maxManpower,
    minManpower,

    totalBarricades,
    topCorridorName,
    topCorridorQty,

    avgEii,
    maxEii,
    medianEii,
    criticalEii,
    highEii,

    eventTypes,
    eventCauses,
    priority,
    corridors,
    eiiBuckets,
    highEiiAreas,
    manpowerByCause,
    barricadeByCorridors,
    barricadeRequired,
    monthly,
    hourly,
    roadClosure,
    peakHour
  };
};

// ─── Main Dashboard ───────────────────────────────────────────────────────────
export default function AnalyticsDashboard({ onClose }) {
  const navigate = useNavigate();
  const handleClose = () => { if (onClose) onClose(); else navigate('/'); };
  const [activePage, setActivePage] = useState('overview');
  const [loading, setLoading] = useState(true);

  // State for live dashboard data, initialized with formatted static DATA
  const [liveData, setLiveData] = useState(() => {
    const totalIncidents = DATA.totalIncidents;
    const unplannedCount = 7700;
    const unplannedPercent = "94.5";
    const highPriorityCount = 5014;
    const highPriorityPercent = "61.5";
    const needBarricadeCount = 4191;
    const needBarricadePercent = "51.4";
    const noBarricadeCount = 3956;
    const noBarricadePercent = "48.6";
    const avgManpower = 13.7;
    const totalDeployed = 111600;
    const maxManpower = 60;
    const minManpower = 4;
    const totalBarricades = 33100;
    const topCorridorName = "Non-corridor";
    const topCorridorQty = 8692;
    const avgEii = 19.97;
    const maxEii = 84.0;
    const medianEii = 15.44;
    const criticalEii = 65;
    const highEii = 418;

    return {
      totalIncidents,
      unplannedCount,
      unplannedPercent,
      highPriorityCount,
      highPriorityPercent,
      needBarricadeCount,
      needBarricadePercent,
      noBarricadeCount,
      noBarricadePercent,
      avgManpower,
      totalDeployed,
      maxManpower,
      minManpower,
      totalBarricades,
      topCorridorName,
      topCorridorQty,
      avgEii,
      maxEii,
      medianEii,
      criticalEii,
      highEii,
      eventTypes: DATA.eventTypes,
      eventCauses: DATA.eventCauses,
      priority: DATA.priority,
      corridors: DATA.corridors,
      eiiBuckets: DATA.eiiBuckets,
      highEiiAreas: DATA.highEiiAreas,
      manpowerByCause: DATA.manpowerByCause,
      barricadeByCorridors: DATA.barricadeByCorridors,
      barricadeRequired: DATA.barricadeRequired,
      monthly: DATA.monthly,
      hourly: DATA.hourly,
      roadClosure: DATA.roadClosure,
      peakHour: DATA.peakHour
    };
  });

  const fetchStats = () => {
    const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:8000';
    axios.get(`${apiUrl}/analytics-stats`)
      .then(res => {
        if (res.data && !res.data.error) {
          const mapped = mapBackendToData(res.data);
          setLiveData(mapped);
        }
        setLoading(false);
      })
      .catch(err => {
        console.error('Error fetching live analytics stats:', err);
        setLoading(false);
      });
  };

  useEffect(() => {
    fetchStats();
  }, []);

  const pages = {
    overview:   <OverviewPage data={liveData} />,
    incidents:  <IncidentTypesPage data={liveData} />,
    manpower:   <ManpowerPage data={liveData} />,
    barricades: <BarricadePage data={liveData} />,
    eii:        <EIIPage data={liveData} />,
    adddata:    <AddDataPage liveData={liveData} onDataAdded={fetchStats} />,
  };

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 1000,
      background: 'rgba(2,8,23,0.98)',
      display: 'flex', flexDirection: 'column',
      fontFamily: "'Inter', sans-serif"
    }}>
      {/* Top bar */}
      <div style={{
        background: 'rgba(15,23,42,0.95)',
        borderBottom: '1px solid rgba(51,65,85,0.6)',
        padding: '0 24px',
        height: 56,
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        backdropFilter: 'blur(8px)',
        flexShrink: 0
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{
            padding: 8, borderRadius: 8,
            background: 'rgba(59,130,246,0.15)',
            border: '1px solid rgba(59,130,246,0.3)',
            color: '#60a5fa'
          }}>
            <Radio size={18} strokeWidth={1.8} />
          </div>
          <div>
            <div style={{ fontWeight: 700, fontSize: 15, color: '#e2e8f0', lineHeight: 1.2 }}>
              IMPACT Analytics Dashboard
            </div>
            <div style={{ fontSize: 11, color: '#475569' }}>
              Bengaluru Traffic Incident Dataset — {liveData.totalIncidents.toLocaleString()} Records {loading ? '(Loading...)' : '(Live)'}
            </div>
          </div>
        </div>

        <button
          onClick={handleClose}
          style={{
            display: 'flex', alignItems: 'center', gap: 6,
            background: 'rgba(239,68,68,0.12)', border: '1px solid rgba(239,68,68,0.35)',
            color: '#f87171', borderRadius: 8, padding: '6px 14px',
            cursor: 'pointer', fontSize: 13, fontWeight: 600,
            transition: 'all 0.2s'
          }}
          onMouseEnter={e => e.currentTarget.style.background = 'rgba(239,68,68,0.25)'}
          onMouseLeave={e => e.currentTarget.style.background = 'rgba(239,68,68,0.12)'}
        >
          <X size={14} strokeWidth={2.5} />
          Back to Home
        </button>
      </div>

      <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>
        {/* Sidebar */}
        <div style={{
          width: 210, minWidth: 210,
          background: 'rgba(15,23,42,0.85)',
          borderRight: '1px solid rgba(51,65,85,0.6)',
          padding: '20px 12px',
          display: 'flex', flexDirection: 'column', gap: 3
        }}>
          <div style={{
            fontSize: 10, color: '#475569',
            textTransform: 'uppercase', letterSpacing: '0.12em',
            marginBottom: 10, paddingLeft: 10
          }}>
            Navigation
          </div>

          {NAV_ITEMS.map(({ id, label, Icon }) => {
            const active = activePage === id;
            const divider = id === 'adddata' ? (
              <div key="divider" style={{ margin: '8px 0 4px', borderTop: '1px solid rgba(51,65,85,0.5)', paddingTop: 8 }}>
                <div style={{ fontSize: 10, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.12em', paddingLeft: 10, marginBottom: 2 }}>
                  Operations
                </div>
              </div>
            ) : null;
            return (
              <div key={id}>
                {divider}
                <button
                  onClick={() => setActivePage(id)}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 10,
                    padding: '9px 12px', borderRadius: 8, border: 'none',
                    cursor: 'pointer', textAlign: 'left', width: '100%',
                    fontSize: 13, fontWeight: active ? 600 : 400,
                    background: active ? (id === 'adddata' ? 'rgba(139,92,246,0.18)' : 'rgba(59,130,246,0.18)') : 'transparent',
                    color: active ? (id === 'adddata' ? '#c4b5fd' : '#93c5fd') : '#94a3b8',
                    borderLeft: active ? `3px solid ${id === 'adddata' ? '#8b5cf6' : '#3b82f6'}` : '3px solid transparent',
                    transition: 'all 0.15s'
                  }}
                  onMouseEnter={e => { if (!active) e.currentTarget.style.background = 'rgba(51,65,85,0.35)' }}
                  onMouseLeave={e => { if (!active) e.currentTarget.style.background = 'transparent' }}
                >
                  <Icon size={16} strokeWidth={active ? 2.2 : 1.8} />
                  {label}
                </button>
              </div>
            );
          })}

          {/* Dataset info card */}
          <div style={{
            marginTop: 'auto', padding: '12px 10px', borderRadius: 8,
            background: 'rgba(15,23,42,0.6)',
            border: '1px solid rgba(51,65,85,0.4)',
            fontSize: 11, color: '#475569'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: '#64748b', fontWeight: 600, marginBottom: 8 }}>
              <BookOpen size={12} strokeWidth={2} />
              Dataset Info
            </div>
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: 5, marginBottom: 4 }}>
              <Cpu size={11} style={{ marginTop: 1, flexShrink: 0 }} />
              <span>Cleaned_with_manpower_and_barricades.xlsx</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
              <Navigation size={11} />
              <span>{liveData.totalIncidents.toLocaleString()} rows × 16 columns</span>
            </div>
          </div>
        </div>

        {/* Main content */}
        <div style={{
          flex: 1, overflowY: 'auto', padding: '28px 32px',
          scrollbarWidth: 'thin',
          scrollbarColor: 'rgba(51,65,85,0.6) transparent'
        }}>
          {pages[activePage]}
        </div>
      </div>
    </div>
  );
}
