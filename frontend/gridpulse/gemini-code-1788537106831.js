import React, { useState, useEffect, useMemo } from 'react';
import {
  LineChart, Line, AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer,
  ReferenceLine, ReferenceArea
} from 'recharts';
import {
  Zap, Activity, ShieldAlert, Thermometer, Sun, Wind, Droplets,
  AlertTriangle, CheckCircle2, ChevronRight, Play, RefreshCw,
  Compass, BarChart3, Bell, Layers, Cpu, ArrowUpRight, Filter
} from 'lucide-react';

// --- BASE DATASETS ---
const BASE_FORECAST = [
  { time: '08:00', actual: 6900, predicted: 6880, ciLow: 6750, ciHigh: 7010, temp: 34, humidity: 65, solar: 180 },
  { time: '10:00', actual: 7250, predicted: 7280, ciLow: 7120, ciHigh: 7440, temp: 37, humidity: 58, solar: 380 },
  { time: '12:00', actual: 7620, predicted: 7600, ciLow: 7420, ciHigh: 7780, temp: 39, humidity: 54, solar: 490 },
  { time: '14:00', actual: 8050, predicted: 8080, ciLow: 7890, ciHigh: 8270, temp: 41, humidity: 48, solar: 450 },
  { time: '16:00', actual: null, predicted: 8420, ciLow: 8210, ciHigh: 8630, temp: 42, humidity: 46, solar: 320 },
  { time: '16:30', actual: null, predicted: 8460, ciLow: 8240, ciHigh: 8680, temp: 42.5, humidity: 45, solar: 240 },
  { time: '18:00', actual: null, predicted: 8180, ciLow: 7960, ciHigh: 8400, temp: 40, humidity: 49, solar: 90 },
  { time: '20:00', actual: null, predicted: 7700, ciLow: 7500, ciHigh: 7900, temp: 37, humidity: 55, solar: 0 },
  { time: '22:00', actual: null, predicted: 7200, ciLow: 7020, ciHigh: 7380, temp: 35, humidity: 62, solar: 0 },
];

const DEMO_FORECAST = [
  { time: '08:00', actual: 6900, predicted: 6880, ciLow: 6750, ciHigh: 7010, temp: 35, humidity: 65, solar: 180 },
  { time: '10:00', actual: 7250, predicted: 7320, ciLow: 7150, ciHigh: 7490, temp: 38, humidity: 56, solar: 390 },
  { time: '12:00', actual: 7620, predicted: 7850, ciLow: 7650, ciHigh: 8050, temp: 41, humidity: 50, solar: 510 },
  { time: '14:00', actual: 8050, predicted: 8350, ciLow: 8120, ciHigh: 8580, temp: 43, humidity: 44, solar: 470 },
  { time: '16:00', actual: null, predicted: 8810, ciLow: 8590, ciHigh: 9030, temp: 44.5, humidity: 42, solar: 310 },
  { time: '16:30', actual: null, predicted: 8890, ciLow: 8650, ciHigh: 9130, temp: 44, humidity: 42, solar: 220 },
  { time: '18:00', actual: null, predicted: 8550, ciLow: 8310, ciHigh: 8790, temp: 42, humidity: 45, solar: 80 },
  { time: '20:00', actual: null, predicted: 8050, ciLow: 7830, ciHigh: 8270, temp: 39, humidity: 51, solar: 0 },
  { time: '22:00', actual: null, predicted: 7500, ciLow: 7300, ciHigh: 7700, temp: 37, humidity: 59, solar: 0 },
];

const INITIAL_ZONES = [
  { id: 'south', name: 'South Delhi (BRPL)', current: 1840, predicted: 2060, capacity: 2150, risk: 'HIGH', x: 52, y: 72, feederCount: 42 },
  { id: 'central', name: 'Central Delhi (BYPL)', current: 1420, predicted: 1590, capacity: 1700, risk: 'MODERATE', x: 50, y: 48, feederCount: 28 },
  { id: 'north', name: 'North Delhi (TPDDL)', current: 1680, predicted: 1780, capacity: 2000, risk: 'STABLE', x: 44, y: 28, feederCount: 36 },
  { id: 'west', name: 'West Delhi (BRPL)', current: 1540, predicted: 1640, capacity: 1850, risk: 'STABLE', x: 26, y: 50, feederCount: 34 },
  { id: 'east', name: 'East Delhi (BYPL)', current: 1362, predicted: 1390, capacity: 1500, risk: 'STABLE', x: 74, y: 45, feederCount: 26 },
];

export default function GridPulseDashboard() {
  const [activeTab, setActiveTab] = useState('Overview');
  const [demoMode, setDemoMode] = useState(false);
  const [selectedZone, setSelectedZone] = useState(INITIAL_ZONES[0]);
  const [showXAI, setShowXAI] = useState(false);
  const [timeRange, setTimeRange] = useState('24h');
  const [alertFilter, setAlertFilter] = useState('ALL');

  // Dynamic values driven by scenario toggle
  const currentDemand = demoMode ? 8190 : 7842;
  const gridCapacity = 9200;
  const predictedPeak = demoMode ? 8890 : 8460;
  const capacityBuffer = gridCapacity - predictedPeak;
  const peakRiskPct = demoMode ? 96.6 : 91.9;
  const temperature = demoMode ? 44.5 : 41.2;
  const currentForecastData = demoMode ? DEMO_FORECAST : BASE_FORECAST;

  const zones = useMemo(() => {
    if (!demoMode) return INITIAL_ZONES;
    return INITIAL_ZONES.map(z => {
      if (z.id === 'south') return { ...z, predicted: 2190, risk: 'CRITICAL' };
      if (z.id === 'central') return { ...z, predicted: 1680, risk: 'HIGH' };
      return z;
    });
  }, [demoMode]);

  useEffect(() => {
    const matched = zones.find(z => z.id === selectedZone.id);
    if (matched) setSelectedZone(matched);
  }, [zones, selectedZone.id]);

  const alerts = useMemo(() => {
    if (demoMode) {
      return [
        { id: 1, type: 'CRITICAL', area: 'South Delhi Feeder 11kV-S4', time: '14:31:12', msg: 'Feeder threshold reached 98.2% thermal limit', impact: '+340 MW overload risk', action: 'Initiate load shedding / redirect to Badarpur substation', status: 'ACTIVE' },
        { id: 2, type: 'CRITICAL', area: 'Central Delhi', time: '14:28:05', msg: 'Rate-of-rise anomaly detected (+12 MW/min)', impact: 'Transformer overheating', action: 'Step up auxiliary cooling banks', status: 'ACTIVE' },
        { id: 3, type: 'WARNING', area: 'Grid Frequency (NR-Grid)', time: '14:15:00', msg: 'Frequency dipped to 49.88 Hz under peak HVAC surge', impact: 'Inter-regional drawal penalties', action: 'Dispatch gas peakers (Bawana CCGT)', status: 'MONITORING' },
        { id: 4, type: 'ADVISORY', area: 'Ambient Thermal Anomaly', time: '13:50:20', msg: 'Open-Meteo API: Wet-bulb index exceeded safe limit', impact: 'HVAC efficiency degradation -8%', action: 'Recalibrate model elasticities', status: 'ACKNOWLEDGED' }
      ];
    }
    return [
      { id: 1, type: 'CRITICAL', area: 'South Delhi BRPL-S2', time: '14:12:00', msg: 'South Delhi feeder approaching 94% rated capacity', impact: 'Overcurrent trip risk', action: 'Arm automated demand-response circuit', status: 'ACTIVE' },
      { id: 2, type: 'WARNING', area: 'Apex Grid Peak', time: '13:45:00', msg: 'Peak demand anticipated at 16:30 (8,460 MW)', impact: 'Operating reserves drop to 8.0%', action: 'Schedule secondary standby reserves', status: 'STANDBY' },
      { id: 3, type: 'ADVISORY', area: 'Safdarjung Weather Station', time: '13:00:10', msg: 'Surface temperature spiked +2.4°C over forecast', impact: '+120 MW HVAC base pull', action: 'Refresh 15-minute rolling model', status: 'ACKNOWLEDGED' },
      { id: 4, type: 'RESOLVED', area: 'North Delhi Substation 7', time: '11:22:45', msg: 'Feeder load stabilized below 82% threshold', impact: 'None', action: 'Restored nominal intertie', status: 'RESOLVED' }
    ];
  }, [demoMode]);

  return (
    <div className="min-h-screen bg-[#06090e] text-slate-100 font-sans antialiased selection:bg-cyan-500 selection:text-black">
      {/* BACKGROUND TEXTURE */}
      <div className="fixed inset-0 bg-[radial-gradient(ellipse_80%_80%_at_50%_-20%,rgba(14,116,144,0.15),rgba(255,255,255,0))] pointer-events-none" />
      <div className="fixed inset-0 bg-[linear-gradient(to_right,#1f29370a_1px,transparent_1px),linear-gradient(to_bottom,#1f29370a_1px,transparent_1px)] bg-[size:4rem_4rem] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_50%,#000_70%,transparent_100%)] pointer-events-none" />

      {/* TOP COMMAND BAR */}
      <header className="relative z-10 border-b border-slate-800/80 bg-[#080d14]/90 backdrop-blur-md px-6 py-3">
        <div className="max-w-[1720px] mx-auto flex items-center justify-between">
          <div className="flex items-center gap-6">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded bg-gradient-to-tr from-cyan-600 to-blue-500 flex items-center justify-center shadow-[0_0_15px_rgba(6,182,212,0.45)]">
                <Zap className="w-5 h-5 text-white fill-white" />
              </div>
              <div>
                <span className="font-bold text-lg tracking-wider text-white">GRID<span className="text-cyan-400">PULSE</span></span>
                <span className="text-[10px] block font-mono text-slate-400 -mt-1 tracking-widest uppercase">Delhi SLDC / DISCOM Node</span>
              </div>
            </div>

            <nav className="hidden md:flex items-center gap-1 ml-6 bg-slate-900/60 p-1 rounded-lg border border-slate-800/80">
              {['Overview', 'Forecast', 'Grid Map', 'Alerts'].map(tab => (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  className={`px-3.5 py-1.5 rounded-md text-xs font-medium transition-all ${
                    activeTab === tab
                      ? 'bg-cyan-500/15 text-cyan-300 border border-cyan-500/30 shadow-sm'
                      : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/40'
                  }`}
                >
                  {tab}
                </button>
              ))}
            </nav>
          </div>

          <div className="flex items-center gap-4">
            {/* HACKATHON DEMO SWITCH */}
            <button
              onClick={() => setDemoMode(!demoMode)}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-md text-xs font-mono font-semibold transition-all border ${
                demoMode
                  ? 'bg-red-500/20 text-red-300 border-red-500/60 shadow-[0_0_14px_rgba(239,68,68,0.4)] animate-pulse'
                  : 'bg-slate-800/60 text-slate-300 border-slate-700 hover:border-cyan-500/50'
              }`}
            >
              <Play className={`w-3.5 h-3.5 ${demoMode ? 'fill-red-400 text-red-400' : 'text-slate-400'}`} />
              DEMO SIMULATOR: {demoMode ? 'HEATWAVE SPIKE (ACTIVE)' : 'NOMINAL BASELINE'}
            </button>

            <div className="h-4 w-[1px] bg-slate-800 hidden sm:block" />

            <div className="flex items-center gap-2 bg-slate-900/70 border border-slate-800 px-2.5 py-1 rounded">
              <span className="relative flex h-2 w-2">
                <span className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${demoMode ? 'bg-red-400' : 'bg-emerald-400'}`} />
                <span className={`relative inline-flex rounded-full h-2 w-2 ${demoMode ? 'bg-red-500' : 'bg-emerald-500'}`} />
              </span>
              <span className="text-[11px] font-mono tracking-tight text-slate-300">LIVE SYNC 14:32:08</span>
            </div>
          </div>
        </div>
      </header>

      {/* SUB-HEADER INTELLIGENCE STRIP */}
      <div className="relative z-10 border-b border-slate-800/60 bg-[#090f18]/60 px-6 py-2.5">
        <div className="max-w-[1720px] mx-auto flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <span className="text-[11px] font-mono uppercase tracking-wider text-slate-400">Domain Feed:</span>
            <span className="text-xs font-semibold text-slate-200">Delhi State Load Despatch Centre (SLDC)</span>
            <span className="text-slate-600">•</span>
            <span className="text-xs text-slate-400">Peak Summer 2026 Grid Operations</span>
          </div>
          <div className="flex items-center gap-6 text-xs font-mono">
            <div className="flex items-center gap-2">
              <span className="text-slate-400">GRID FREQ:</span>
              <span className={`font-semibold ${demoMode ? 'text-amber-400' : 'text-emerald-400'}`}>
                {demoMode ? '49.88 Hz' : '50.02 Hz'}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-slate-400">BASE DRAWAL:</span>
              <span className="text-slate-200 font-semibold">{currentDemand.toLocaleString()} MW</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-slate-400">RENEWABLE NET:</span>
              <span className="text-amber-400 font-semibold">+420 MW Solar</span>
            </div>
          </div>
        </div>
      </div>

      <main className="relative z-10 max-w-[1720px] mx-auto p-6 space-y-6">
        {/* HERO SITUATION BANNER */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
          {/* PRIMARY METRIC CARD */}
          <div className="lg:col-span-4 bg-[#0a1019]/90 border border-slate-800 rounded-xl p-5 relative overflow-hidden backdrop-blur-sm">
            <div className="absolute -right-8 -top-8 w-32 h-32 bg-cyan-500/10 rounded-full blur-2xl pointer-events-none" />
            <div className="flex justify-between items-start">
              <div>
                <span className="text-[11px] font-mono uppercase tracking-widest text-slate-400">CURRENT DELHI DEMAND</span>
                <div className="flex items-baseline gap-3 mt-1.5">
                  <span className="text-4xl sm:text-5xl font-extrabold tracking-tight font-mono text-white">
                    {currentDemand.toLocaleString()}
                  </span>
                  <span className="text-lg font-mono text-cyan-400 font-bold">MW</span>
                </div>
              </div>
              <div className="flex flex-col items-end">
                <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded text-xs font-mono font-bold tracking-wider ${
                  demoMode
                    ? 'bg-red-500/20 text-red-300 border border-red-500/40'
                    : 'bg-emerald-500/15 text-emerald-300 border border-emerald-500/30'
                }`}>
                  <span className={`w-1.5 h-1.5 rounded-full ${demoMode ? 'bg-red-400' : 'bg-emerald-400'}`} />
                  {demoMode ? 'CRITICAL RISK' : 'GRID STABLE'}
                </span>
                <span className="text-[11px] font-mono text-slate-400 mt-1">
                  Utilization: <span className="text-slate-200 font-semibold">{((currentDemand / gridCapacity) * 100).toFixed(1)}%</span>
                </span>
              </div>
            </div>

            <div className="mt-4 pt-3 border-t border-slate-800/80 flex justify-between text-xs font-mono">
              <span className="text-slate-400">
                vs yesterday: <span className="text-cyan-400 font-semibold">{demoMode ? '+9.2%' : '+4.8%'}</span>
              </span>
              <span className="text-slate-400">
                Peak forecast: <span className="text-amber-400 font-semibold">{predictedPeak.toLocaleString()} MW @ 16:30</span>
              </span>
            </div>
          </div>

          {/* HIGH IMPACT KPI STRIP */}
          <div className="lg:col-span-8 grid grid-cols-2 sm:grid-cols-5 gap-3">
            {[
              { label: 'PREDICTED PEAK', val: `${predictedPeak.toLocaleString()} MW`, sub: '16:30 IST', alert: demoMode },
              { label: 'GRID CAPACITY', val: `${gridCapacity.toLocaleString()} MW`, sub: 'Nominal Limit' },
              { label: 'CAPACITY BUFFER', val: `${capacityBuffer} MW`, sub: demoMode ? 'Threshold < 400MW' : 'Adequate', alert: demoMode },
              { label: 'AMBIENT TEMP', val: `${temperature}°C`, sub: demoMode ? '+4.1°C thermal bump' : '+2.4°C vs normal', highlight: true },
              { label: 'AI ACCURACY (MAE)', val: '96.4%', sub: '142 MW residual' },
            ].map((kpi, idx) => (
              <div key={idx} className={`bg-[#0a1019]/70 border rounded-xl p-3.5 flex flex-col justify-between ${
                kpi.alert ? 'border-red-500/50 bg-red-950/10' : 'border-slate-800/90'
              }`}>
                <span className="text-[10px] font-mono uppercase tracking-wider text-slate-400">{kpi.label}</span>
                <div className="my-1.5">
                  <span className={`text-xl sm:text-2xl font-mono font-bold ${
                    kpi.alert ? 'text-red-400' : kpi.highlight ? 'text-amber-300' : 'text-slate-100'
                  }`}>
                    {kpi.val}
                  </span>
                </div>
                <span className="text-[10px] font-mono text-slate-500 truncate">{kpi.sub}</span>
              </div>
            ))}
          </div>
        </div>

        {/* CORE OPERATIONAL SECTION: FORECAST + AI REASONING */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* CENTERPIECE TIME-SERIES VISUALIZER */}
          <div className="lg:col-span-8 bg-[#0a1019]/90 border border-slate-800 rounded-xl p-5 flex flex-col">
            <div className="flex flex-wrap items-center justify-between gap-4 mb-4">
              <div>
                <div className="flex items-center gap-2">
                  <Activity className="w-4 h-4 text-cyan-400" />
                  <h3 className="font-semibold text-sm tracking-wide text-white uppercase font-mono">
                    Time-Series Demand Prediction Curve
                  </h3>
                </div>
                <p className="text-xs text-slate-400 mt-0.5">Rolling autoregressive forecast with Open-Meteo temperature & solar features</p>
              </div>

              <div className="flex items-center gap-2">
                <div className="flex bg-slate-900/80 p-0.5 rounded border border-slate-800 text-[11px] font-mono">
                  {['6h', '12h', '24h', '7d'].map(hz => (
                    <button
                      key={hz}
                      onClick={() => setTimeRange(hz)}
                      className={`px-2.5 py-1 rounded ${timeRange === hz ? 'bg-cyan-500/20 text-cyan-300 font-bold' : 'text-slate-400 hover:text-slate-200'}`}
                    >
                      {hz}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* CHART VIEWPORT */}
            <div className="h-[340px] w-full mt-2">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={currentForecastData} margin={{ top: 15, right: 20, left: -10, bottom: 0 }}>
                  <defs>
                    <linearGradient id="predictedGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#06b6d4" stopOpacity={0.35} />
                      <stop offset="95%" stopColor="#06b6d4" stopOpacity={0.0} />
                    </linearGradient>
                    <linearGradient id="confidenceBand" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#38bdf8" stopOpacity={0.12} />
                      <stop offset="100%" stopColor="#38bdf8" stopOpacity={0.02} />
                    </linearGradient>
                  </defs>
                  <XAxis dataKey="time" stroke="#475569" tick={{ fill: '#94a3b8', fontSize: 11, fontFamily: 'monospace' }} />
                  <YAxis domain={[6200, 9500]} stroke="#475569" tick={{ fill: '#94a3b8', fontSize: 11, fontFamily: 'monospace' }} />
                  <Tooltip
                    content={({ active, payload, label }) => {
                      if (active && payload && payload.length) {
                        const data = payload[0].payload;
                        return (
                          <div className="bg-[#080e18] border border-slate-700 p-3 rounded shadow-xl font-mono text-xs z-50">
                            <div className="font-bold text-slate-200 mb-1.5 border-b border-slate-800 pb-1 flex justify-between">
                              <span>WINDOW: {label} IST</span>
                              <span className="text-cyan-400 font-semibold">{data.temp}°C</span>
                            </div>
                            <div className="space-y-1">
                              <p className="text-slate-300 flex justify-between gap-4">
                                <span>Actual Drawal:</span>
                                <span className="font-bold text-white">{data.actual ? `${data.actual} MW` : 'Pending'}</span>
                              </p>
                              <p className="text-cyan-300 flex justify-between gap-4">
                                <span>AI Forecast:</span>
                                <span className="font-bold">{data.predicted} MW</span>
                              </p>
                              <p className="text-slate-400 flex justify-between gap-4">
                                <span>95% CI Interval:</span>
                                <span>{data.ciLow} - {data.ciHigh} MW</span>
                              </p>
                              <p className="text-amber-300 flex justify-between gap-4">
                                <span>Solar Offset:</span>
                                <span>{data.solar} MW</span>
                              </p>
                            </div>
                          </div>
                        );
                      }
                      return null;
                    }}
                  />

                  {/* GRID SAFE CAPACITY REFERENCE */}
                  <ReferenceLine
                    y={gridCapacity}
                    stroke="#ef4444"
                    strokeDasharray="4 4"
                    label={{ value: 'GRID SAFETY CAP (9,200 MW)', fill: '#f87171', fontSize: 10, position: 'insideTopRight', fontFamily: 'monospace' }}
                  />

                  {/* PEAK WINDOW BAND */}
                  <ReferenceArea x1="16:00" x2="16:30" fill="#f59e0b" fillOpacity={0.07} />

                  {/* UNCERTAINTY BAND */}
                  <Area type="monotone" dataKey="ciHigh" stroke="transparent" fill="url(#confidenceBand)" />
                  <Area type="monotone" dataKey="ciLow" stroke="transparent" fill="transparent" />

                  {/* PREDICTED DEMAND LINE */}
                  <Area
                    type="monotone"
                    dataKey="predicted"
                    stroke="#06b6d4"
                    strokeWidth={2.5}
                    fill="url(#predictedGrad)"
                    dot={{ r: 3, fill: '#06b6d4' }}
                    activeDot={{ r: 5, stroke: '#fff', strokeWidth: 2 }}
                  />

                  {/* ACTUAL LOAD RECORDED */}
                  <Line
                    type="monotone"
                    dataKey="actual"
                    stroke="#f8fafc"
                    strokeWidth={2}
                    dot={{ r: 3, fill: '#fff' }}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>

            {/* LEGEND STRIP */}
            <div className="flex flex-wrap items-center justify-between pt-3 border-t border-slate-800/80 text-xs font-mono text-slate-400 mt-2">
              <div className="flex items-center gap-5">
                <span className="flex items-center gap-1.5">
                  <span className="w-3 h-0.5 bg-white inline-block" /> Actual Load (Telemetry)
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="w-3 h-0.5 bg-cyan-400 inline-block" /> AI Predicted Load
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="w-3 h-2 bg-cyan-500/20 border border-cyan-400/40 inline-block" /> 95% Confidence Band
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="w-3 h-0.5 border-t border-red-500 border-dashed inline-block" /> Capacity Cap
                </span>
              </div>
              <span className="text-[11px] text-slate-500">POSOCO/SLDC Historical + Open-Meteo Integration</span>
            </div>
          </div>

          {/* AI GRID INTELLIGENCE & EXPLAINABILITY PANEL */}
          <div className="lg:col-span-4 space-y-4 flex flex-col">
            <div className={`bg-[#0a1019]/90 border rounded-xl p-5 flex-1 flex flex-col justify-between ${
              demoMode ? 'border-amber-500/50 shadow-[0_0_20px_rgba(245,158,11,0.15)]' : 'border-slate-800'
            }`}>
              <div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Cpu className="w-4 h-4 text-cyan-400" />
                    <span className="text-xs font-mono font-bold uppercase text-slate-300 tracking-wider">AI Grid Diagnostic</span>
                  </div>
                  <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-cyan-950 text-cyan-400 border border-cyan-800">
                    XGBoost + LightGBM Ensemble
                  </span>
                </div>

                <div className="mt-4 bg-slate-900/80 border border-slate-800 rounded-lg p-3.5">
                  <div className="flex items-center gap-2 text-amber-400 text-xs font-mono font-bold uppercase">
                    <AlertTriangle className="w-4 h-4 text-amber-400" />
                    {demoMode ? 'CRITICAL THERMAL STRAIN INCOMING' : 'HIGH DEMAND WINDOW DETECTED'}
                  </div>
                  <p className="text-xs text-slate-300 mt-2 leading-relaxed">
                    {demoMode ? (
                      <>
                        Ambient heat dome pushing temperatures to <strong className="text-white">44.5°C</strong> at 16:00. Projected demand spike of <strong className="text-red-400">+13.4%</strong> threatens feeder trip points with peak load cresting at <strong className="text-red-400">8,890 MW</strong>.
                      </>
                    ) : (
                      <>
                        Temperature expected to hit <strong className="text-white">42°C</strong> at 16:00. Model predicts base load rise of <strong className="text-cyan-300">~8.7%</strong>, peaking at <strong className="text-cyan-300">8,460 MW</strong> during commercial-residential shift.
                      </>
                    )}
                  </p>
                </div>

                <div className="mt-4">
                  <span className="text-[10px] font-mono uppercase text-slate-400 tracking-wider block mb-1">
                    AUTOMATED OPERATIONAL DIRECTIVE
                  </span>
                  <div className="text-xs bg-cyan-950/20 border border-cyan-800/40 p-3 rounded-lg text-cyan-200 leading-relaxed font-mono">
                    {demoMode ? (
                      <span className="text-amber-300">
                        ⚡ URGENT: Dispatch 400 MW Pragati CCGT spinning reserve; pre-curtail industrial feeders in South Delhi (Okhla Zone) to avoid 11kV bus trip.
                      </span>
                    ) : (
                      <span>
                        → Pre-position 250 MW additional feeder capacity across South & Central Delhi interties between 15:30–18:00 IST.
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {/* XAI CONTRIBUTION EXPANDER */}
              <div className="mt-5 pt-4 border-t border-slate-800/80">
                <button
                  onClick={() => setShowXAI(!showXAI)}
                  className="w-full flex items-center justify-between text-xs font-mono text-cyan-400 hover:text-cyan-300 py-1"
                >
                  <span>{showXAI ? 'Hide Feature Attribution' : 'Why this prediction? (SHAP Analysis)'}</span>
                  <ChevronRight className={`w-3.5 h-3.5 transition-transform ${showXAI ? 'rotate-90' : ''}`} />
                </button>

                {showXAI && (
                  <div className="mt-3 space-y-2.5 font-mono text-[11px] bg-slate-950/60 p-3 rounded border border-slate-800">
                    <div>
                      <div className="flex justify-between text-slate-300 mb-1">
                        <span>Temperature Correlation (HVAC Load)</span>
                        <span className="text-cyan-400">62%</span>
                      </div>
                      <div className="w-full bg-slate-800 h-1.5 rounded-full overflow-hidden">
                        <div className="bg-cyan-500 h-full rounded-full" style={{ width: '62%' }} />
                      </div>
                    </div>
                    <div>
                      <div className="flex justify-between text-slate-300 mb-1">
                        <span>Historical 7-Day Autoregressive</span>
                        <span className="text-cyan-400">24%</span>
                      </div>
                      <div className="w-full bg-slate-800 h-1.5 rounded-full overflow-hidden">
                        <div className="bg-cyan-500/80 h-full rounded-full" style={{ width: '24%' }} />
                      </div>
                    </div>
                    <div>
                      <div className="flex justify-between text-slate-300 mb-1">
                        <span>Relative Humidity (Heat Index)</span>
                        <span className="text-cyan-400">8%</span>
                      </div>
                      <div className="w-full bg-slate-800 h-1.5 rounded-full overflow-hidden">
                        <div className="bg-cyan-500/60 h-full rounded-full" style={{ width: '8%' }} />
                      </div>
                    </div>
                    <div>
                      <div className="flex justify-between text-slate-300 mb-1">
                        <span>Rooftop Solar Duck-Curve Netting</span>
                        <span className="text-amber-400">6%</span>
                      </div>
                      <div className="w-full bg-slate-800 h-1.5 rounded-full overflow-hidden">
                        <div className="bg-amber-400 h-full rounded-full" style={{ width: '6%' }} />
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* GEOGRAPHIC GRID + DISCOM LOAD BALANCING + WEATHER STRIP */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* SCHEMATIC DELHI GRID MAP */}
          <div className="lg:col-span-7 bg-[#0a1019]/90 border border-slate-800 rounded-xl p-5">
            <div className="flex justify-between items-center mb-4">
              <div>
                <h3 className="font-semibold text-sm tracking-wide text-white uppercase font-mono flex items-center gap-2">
                  <Compass className="w-4 h-4 text-cyan-400" />
                  Spatial DISCOM Load Distribution & Feeder Risks
                </h3>
                <p className="text-xs text-slate-400">Topology layout of Delhi major distribution zones</p>
              </div>
              <span className="text-[11px] font-mono text-slate-400">Click node for inspection</span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
              {/* INTERACTIVE STYLIZED MAP MATRIX */}
              <div className="md:col-span-7 relative h-72 bg-slate-950/80 border border-slate-800/80 rounded-lg p-4 overflow-hidden flex items-center justify-center">
                {/* Visual Intertie Bus Lines */}
                <svg className="absolute inset-0 w-full h-full pointer-events-none opacity-40">
                  <line x1="44%" y1="28%" x2="50%" y2="48%" stroke="#0284c7" strokeWidth="2" strokeDasharray="3 3" />
                  <line x1="50%" y1="48%" x2="52%" y2="72%" stroke="#0284c7" strokeWidth="2" strokeDasharray="3 3" />
                  <line x1="26%" y1="50%" x2="50%" y2="48%" stroke="#0284c7" strokeWidth="2" strokeDasharray="3 3" />
                  <line x1="50%" y1="48%" x2="74%" y2="45%" stroke="#0284c7" strokeWidth="2" strokeDasharray="3 3" />
                  <circle cx="50%" cy="48%" r="6" fill="#06b6d4" />
                </svg>

                {zones.map((zone) => {
                  const isSelected = selectedZone.id === zone.id;
                  const isCritical = zone.risk === 'CRITICAL';
                  const isHigh = zone.risk === 'HIGH';

                  return (
                    <div
                      key={zone.id}
                      onClick={() => setSelectedZone(zone)}
                      style={{ top: `${zone.y}%`, left: `${zone.x}%` }}
                      className="absolute -translate-x-1/2 -translate-y-1/2 cursor-pointer group"
                    >
                      <div className="relative">
                        {(isCritical || isHigh) && (
                          <div className={`absolute -inset-2 rounded-full animate-ping opacity-60 ${
                            isCritical ? 'bg-red-500' : 'bg-amber-500'
                          }`} />
                        )}
                        <div className={`px-3 py-1.5 rounded border text-[11px] font-mono font-bold shadow-lg transition-all ${
                          isSelected
                            ? 'bg-cyan-500 text-black border-white ring-2 ring-cyan-400'
                            : isCritical
                            ? 'bg-red-950/90 text-red-200 border-red-500'
                            : isHigh
                            ? 'bg-amber-950/90 text-amber-200 border-amber-500'
                            : 'bg-slate-900/90 text-slate-300 border-slate-700 group-hover:border-cyan-400'
                        }`}>
                          <div className="flex items-center gap-1.5 whitespace-nowrap">
                            <span className={`w-1.5 h-1.5 rounded-full ${
                              isCritical ? 'bg-red-400' : isHigh ? 'bg-amber-400' : 'bg-emerald-400'
                            }`} />
                            {zone.name.split(' ')[0]}
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* SELECTED ZONE DEEP DIVE */}
              <div className="md:col-span-5 bg-slate-900/60 border border-slate-800/80 rounded-lg p-3.5 flex flex-col justify-between font-mono text-xs">
                <div>
                  <div className="flex justify-between items-start border-b border-slate-800 pb-2">
                    <div>
                      <span className="text-slate-400 text-[10px] uppercase">INSPECTING REGION</span>
                      <p className="font-bold text-slate-100 text-sm">{selectedZone.name}</p>
                    </div>
                    <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                      selectedZone.risk === 'CRITICAL' ? 'bg-red-500/20 text-red-400 border border-red-500/40' :
                      selectedZone.risk === 'HIGH' ? 'bg-amber-500/20 text-amber-400 border border-amber-500/40' :
                      'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40'
                    }`}>
                      {selectedZone.risk}
                    </span>
                  </div>

                  <div className="mt-3 space-y-2 text-[11px]">
                    <div className="flex justify-between">
                      <span className="text-slate-400">Current Load:</span>
                      <span className="text-white font-bold">{selectedZone.current} MW</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-400">Forecasted Peak:</span>
                      <span className="text-cyan-400 font-bold">{selectedZone.predicted} MW</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-400">Zone Rated Limit:</span>
                      <span className="text-slate-300">{selectedZone.capacity} MW</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-400">Active 11kV Feeders:</span>
                      <span className="text-slate-300">{selectedZone.feederCount} Lines</span>
                    </div>
                  </div>

                  {/* MINI CAPACITY BAR */}
                  <div className="mt-3 pt-2 border-t border-slate-800">
                    <div className="flex justify-between text-[10px] mb-1">
                      <span className="text-slate-400">Capacity Stress</span>
                      <span className="text-slate-200">{((selectedZone.predicted / selectedZone.capacity) * 100).toFixed(1)}%</span>
                    </div>
                    <div className="w-full bg-slate-800 h-2 rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all duration-500 ${
                          (selectedZone.predicted / selectedZone.capacity) > 0.95 ? 'bg-red-500' :
                          (selectedZone.predicted / selectedZone.capacity) > 0.88 ? 'bg-amber-400' : 'bg-emerald-500'
                        }`}
                        style={{ width: `${Math.min(100, (selectedZone.predicted / selectedZone.capacity) * 100)}%` }}
                      />
                    </div>
                  </div>
                </div>

                <div className="mt-3 pt-2 text-[10px] text-slate-400 border-t border-slate-800 flex items-center justify-between">
                  <span>DISCOM SCADA telemetry synced</span>
                  <ArrowUpRight className="w-3.5 h-3.5 text-cyan-400" />
                </div>
              </div>
            </div>
          </div>

          {/* WEATHER EXOGENOUS VARIABLES & CAPACITY GAUGE */}
          <div className="lg:col-span-5 space-y-4">
            {/* PEAK RISK GAUGE */}
            <div className="bg-[#0a1019]/90 border border-slate-800 rounded-xl p-5">
              <div className="flex justify-between items-center mb-2">
                <span className="text-xs font-mono font-bold uppercase text-slate-300">GRID CAPACITY ALLOCATION BUFFER</span>
                <span className="text-xs font-mono text-cyan-400">{peakRiskPct}% Committed</span>
              </div>

              {/* THREE-STAGE SEGMENT GAUGE */}
              <div className="w-full h-3 bg-slate-800 rounded-full overflow-hidden flex gap-1 p-0.5">
                <div className="h-full bg-emerald-500 rounded-l" style={{ width: '70%' }} />
                <div className="h-full bg-amber-500" style={{ width: '18%' }} />
                <div className={`h-full rounded-r transition-all duration-500 ${demoMode ? 'bg-red-500 animate-pulse' : 'bg-slate-700'}`} style={{ width: '12%' }} />
              </div>

              <div className="flex justify-between text-[10px] font-mono text-slate-400 mt-2">
                <span>0 MW</span>
                <span>SAFE ZONE (&lt;7,500)</span>
                <span>WATCH (8,200)</span>
                <span className="text-red-400">LIMIT (9,200)</span>
              </div>

              <div className="mt-3 p-2.5 rounded bg-slate-900/60 border border-slate-800 flex justify-between items-center text-xs font-mono">
                <span className="text-slate-400">Peak Congestion Horizon:</span>
                <span className="text-amber-300 font-bold">16:00 – 17:30 IST</span>
              </div>
            </div>

            {/* OPEN-METEO ENVIRONMENTAL CORRELATION PANEL */}
            <div className="bg-[#0a1019]/90 border border-slate-800 rounded-xl p-5">
              <div className="flex justify-between items-center mb-3">
                <span className="text-xs font-mono font-bold uppercase text-slate-300 flex items-center gap-1.5">
                  <Thermometer className="w-4 h-4 text-cyan-400" />
                  Atmospheric Regressors (Open-Meteo)
                </span>
                <span className="text-[10px] font-mono text-cyan-400">Delhi-NCR Grid Latitude</span>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                <div className="bg-slate-900/80 p-2.5 rounded border border-slate-800 text-center">
                  <span className="text-[10px] font-mono text-slate-400 block">TEMP</span>
                  <span className="text-lg font-mono font-bold text-amber-300">{temperature}°C</span>
                  <span className="text-[9px] font-mono text-red-400 block mt-0.5">↑ High Impact</span>
                </div>
                <div className="bg-slate-900/80 p-2.5 rounded border border-slate-800 text-center">
                  <span className="text-[10px] font-mono text-slate-400 block">HUMIDITY</span>
                  <span className="text-lg font-mono font-bold text-slate-200">54%</span>
                  <span className="text-[9px] font-mono text-slate-500 block mt-0.5">Heat Index +3°C</span>
                </div>
                <div className="bg-slate-900/80 p-2.5 rounded border border-slate-800 text-center">
                  <span className="text-[10px] font-mono text-slate-400 block">ROOFTOP SOLAR</span>
                  <span className="text-lg font-mono font-bold text-yellow-400">420 MW</span>
                  <span className="text-[9px] font-mono text-slate-400 block mt-0.5">Peak Insolation</span>
                </div>
                <div className="bg-slate-900/80 p-2.5 rounded border border-slate-800 text-center">
                  <span className="text-[10px] font-mono text-slate-400 block">WIND SPEED</span>
                  <span className="text-lg font-mono font-bold text-slate-200">12 km/h</span>
                  <span className="text-[9px] font-mono text-slate-500 block mt-0.5">Turbine: Low</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* INCIDENT DISPATCH & REAL-TIME EVENT LOGS */}
        <div className="bg-[#0a1019]/90 border border-slate-800 rounded-xl p-5">
          <div className="flex flex-wrap items-center justify-between gap-4 mb-4">
            <div className="flex items-center gap-2">
              <Bell className="w-4 h-4 text-cyan-400" />
              <h3 className="font-semibold text-sm tracking-wide text-white uppercase font-mono">
                Actionable Grid Incidents & SCADA Warnings
              </h3>
            </div>

            <div className="flex items-center gap-2">
              <Filter className="w-3.5 h-3.5 text-slate-500" />
              <div className="flex gap-1 text-[10px] font-mono">
                {['ALL', 'CRITICAL', 'WARNING'].map(f => (
                  <button
                    key={f}
                    onClick={() => setAlertFilter(f)}
                    className={`px-2 py-0.5 rounded ${
                      alertFilter === f ? 'bg-slate-700 text-white font-bold' : 'text-slate-400 hover:bg-slate-800'
                    }`}
                  >
                    {f}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left font-mono text-xs">
              <thead className="bg-slate-900/80 text-slate-400 border-b border-slate-800 text-[10px] uppercase">
                <tr>
                  <th className="py-2.5 px-3">Severity</th>
                  <th className="py-2.5 px-3">Timestamp</th>
                  <th className="py-2.5 px-3">Substation / Target</th>
                  <th className="py-2.5 px-3">Operational Diagnostic</th>
                  <th className="py-2.5 px-3">Model Projected Impact</th>
                  <th className="py-2.5 px-3">Automated Advisory Action</th>
                  <th className="py-2.5 px-3 text-right">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 text-slate-300">
                {alerts
                  .filter(a => alertFilter === 'ALL' || a.type === alertFilter)
                  .map(a => (
                    <tr key={a.id} className="hover:bg-slate-800/30 transition-colors">
                      <td className="py-2.5 px-3 whitespace-nowrap">
                        <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-[10px] font-bold ${
                          a.type === 'CRITICAL' ? 'bg-red-500/20 text-red-400 border border-red-500/40' :
                          a.type === 'WARNING' ? 'bg-amber-500/20 text-amber-400 border border-amber-500/40' :
                          a.type === 'RESOLVED' ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40' :
                          'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40'
                        }`}>
                          {a.type}
                        </span>
                      </td>
                      <td className="py-2.5 px-3 text-slate-400 whitespace-nowrap">{a.time}</td>
                      <td className="py-2.5 px-3 font-semibold text-white whitespace-nowrap">{a.area}</td>
                      <td className="py-2.5 px-3 max-w-xs truncate">{a.msg}</td>
                      <td className="py-2.5 px-3 text-cyan-300 whitespace-nowrap">{a.impact}</td>
                      <td className="py-2.5 px-3 text-amber-300 max-w-sm truncate">{a.action}</td>
                      <td className="py-2.5 px-3 text-right">
                        <span className="text-[10px] text-slate-400">{a.status}</span>
                      </td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
        </div>
      </main>

      {/* FOOTER */}
      <footer className="border-t border-slate-800/80 bg-[#080d14] px-6 py-4 mt-12 text-center text-xs font-mono text-slate-500">
        <p>GRIDPULSE AI Engine v2.4 • SLDC Operational Dispatch Support System • Developed for Clean Energy & Resilient Delhi Grid Hackathon</p>
      </footer>
    </div>
  );
}