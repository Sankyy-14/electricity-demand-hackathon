import React, { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import {
  Activity,
  AlertTriangle,
  ArrowDown,
  ArrowRight,
  ArrowUpRight,
  CheckCircle2,
  ChevronRight,
  Cpu,
  Droplets,
  Gauge,
  Menu,
  RotateCcw,
  Thermometer,
  Wind,
  X,
  Zap,
} from "lucide-react";
import {
  Area,
  AreaChart,
  CartesianGrid,
  Line,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import Lenis from "lenis";
import "lenis/dist/lenis.css";

gsap.registerPlugin(ScrollTrigger);

/* =========================================================
   GRIDPULSE â€” COMPLETE HACKATHON UI
   Includes all explicitly requested problem-statement features:
   - hero/live demand + grid status
   - forecast + confidence band + peak marker + capacity + NOW
   - forecast horizon controls
   - AI Grid Insight + Why this prediction
   - compact operational metrics
   - Peak Risk gauge
   - DISCOM / area load map + inspector
   - weather â†’ demand correlation
   - model performance (accuracy / MAE / RMSE / confidence)
   - operational alerts + filters
   - heatwave demo mode
   - polished HydraDB-style scroll choreography
   ========================================================= */

const BASE_SERIES = [
  { time: "08:00", actual: 6900, predicted: 6890, temp: 34.0, confidence: 3.2 },
  { time: "10:00", actual: 7250, predicted: 7270, temp: 37.0, confidence: 3.1 },
  { time: "12:00", actual: 7620, predicted: 7610, temp: 39.0, confidence: 3.3 },
  { time: "14:00", actual: 8050, predicted: 8080, temp: 41.2, confidence: 3.8 },
  { time: "16:30", actual: null, predicted: 8460, temp: 42.5, confidence: 4.3 },
  { time: "18:00", actual: null, predicted: 8180, temp: 40.0, confidence: 4.0 },
  { time: "20:00", actual: null, predicted: 7700, temp: 37.0, confidence: 3.7 },
  { time: "22:00", actual: null, predicted: 7200, temp: 35.0, confidence: 3.5 },
];

const ZONES = [
  {
    id: "north",
    name: "North Delhi",
    discom: "TPDDL",
    current: 1680,
    predicted: 1780,
    capacity: 2000,
    feeders: 36,
    temp: 40.2,
    risk: "STABLE",
    x: 50,
    y: 16,
    action: "Maintain normal feeder reserve.",
  },
  {
    id: "west",
    name: "West Delhi",
    discom: "BRPL",
    current: 1540,
    predicted: 1640,
    capacity: 1850,
    feeders: 34,
    temp: 41.0,
    risk: "STABLE",
    x: 23,
    y: 48,
    action: "Monitor evening HVAC ramp.",
  },
  {
    id: "central",
    name: "Central Delhi",
    discom: "BYPL",
    current: 1420,
    predicted: 1590,
    capacity: 1700,
    feeders: 28,
    temp: 42.0,
    risk: "HIGH",
    x: 50,
    y: 48,
    action: "Pre-position auxiliary cooling and feeder headroom.",
  },
  {
    id: "east",
    name: "East Delhi",
    discom: "BYPL",
    current: 1362,
    predicted: 1390,
    capacity: 1500,
    feeders: 26,
    temp: 40.7,
    risk: "MODERATE",
    x: 77,
    y: 45,
    action: "Keep standby capacity above 80 MW.",
  },
  {
    id: "south",
    name: "South Delhi",
    discom: "BRPL",
    current: 1840,
    predicted: 2060,
    capacity: 2150,
    feeders: 42,
    temp: 42.4,
    risk: "HIGH",
    x: 50,
    y: 81,
    action: "Pre-position additional feeder capacity 15:30â€“18:00.",
  },
];

const WEATHER = [
  { label: "Temperature", value: 41.2, unit: "Â°C", delta: "+2.4Â°C", tone: "orange", strength: 100 },
  { label: "Humidity", value: 58, unit: "%", delta: "+6%", tone: "blue", strength: 42 },
  { label: "Solar generation", value: 420, unit: "MW", delta: "âˆ’36 MW", tone: "yellow", strength: 28 },
  { label: "Wind", value: 12, unit: "km/h", delta: "âˆ’2 km/h", tone: "green", strength: 20 },
];

const ALERTS = [
  {
    id: 1,
    type: "CRITICAL",
    time: "14:31:12",
    area: "South Delhi / BRPL-S2",
    issue: "Feeder approaching 94% capacity",
    detail: "Projected thermal utilization 98.2% during peak HVAC demand.",
    impact: "+340 MW overload risk",
    action: "Pre-position feeder capacity",
    status: "ACTIVE",
  },
  {
    id: 2,
    type: "WARNING",
    time: "14:15:00",
    area: "Northern regional intertie",
    issue: "Frequency deviation detected",
    detail: "49.88 Hz during projected evening HVAC surge.",
    impact: "Reserve draw expected",
    action: "Stage 400 MW reserve",
    status: "MONITORING",
  },
  {
    id: 3,
    type: "ADVISORY",
    time: "13:58:42",
    area: "Delhi weather layer",
    issue: "Temperature anomaly detected",
    detail: "Heat index is 3.1Â°C above the recent summer profile.",
    impact: "+2.8% demand sensitivity",
    action: "Raise forecast confidence watch",
    status: "OPEN",
  },
  {
    id: 4,
    type: "RESOLVED",
    time: "12:42:09",
    area: "North Delhi / TPDDL",
    issue: "Overload risk cleared",
    detail: "Demand returned below the feeder watch threshold.",
    impact: "âˆ’95 MW stress",
    action: "Return reserve to scheduled pool",
    status: "RESOLVED",
  },
];

const FEATURES = [
  { name: "Temperature / Heat Index", value: 62, tone: "orange" },
  { name: "Historical pattern", value: 24, tone: "purple" },
  { name: "Humidity", value: 8, tone: "blue" },
  { name: "Solar generation", value: 6, tone: "yellow" },
];

const HORIZONS = ["Next 6h", "Next 12h", "Next 24h", "Next 7 Days"];

function Reveal({ children, className = "", delay = 0 }) {
  const ref = useRef(null);
  const [shown, setShown] = useState(false);

  useEffect(() => {
    const node = ref.current;
    if (!node) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setShown(true);
          observer.disconnect();
        }
      },
      { threshold: 0.18 }
    );
    observer.observe(node);
    return () => observer.disconnect();
  }, []);

  return (
    <div
      ref={ref}
      className={`reveal ${shown ? "reveal-visible" : ""} ${className}`}
      style={{ transitionDelay: `${delay}ms` }}
    >
      {children}
    </div>
  );
}

function CustomTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null;
  const datum = payload[0]?.payload;
  return (
    <div className="chart-tooltip">
      <div className="tooltip-head">
        <strong>{label}</strong>
        <span>{datum?.temp?.toFixed?.(1) ?? "â€”"}Â°C</span>
      </div>
      <div className="tooltip-line">
        <span>Predicted</span>
        <b>{datum.predicted?.toLocaleString()} MW</b>
      </div>
      <div className="tooltip-line">
        <span>Actual</span>
        <b>{datum.actual == null ? "â€”" : `${datum.actual.toLocaleString()} MW`}</b>
      </div>
      <div className="tooltip-line">
        <span>Confidence</span>
        <b>Â±{datum.confidence?.toFixed?.(1)}%</b>
      </div>
    </div>
  );
}

function NetworkMap({ zones, selectedId, onSelect, demo }) {
  const selected = zones.find((z) => z.id === selectedId) || zones[2];
  return (
    <div className="network-map-large">
      <div className="map-grid" />
      <svg viewBox="0 0 100 100" className="network-svg" aria-hidden="true">
        <line x1="50" y1="16" x2="50" y2="48" />
        <line x1="23" y1="48" x2="50" y2="48" />
        <line x1="50" y1="48" x2="77" y2="45" />
        <line x1="50" y1="48" x2="50" y2="81" />
        <circle className="flow flow-a" cx="50" cy="30" r="0.65" />
        <circle className="flow flow-b" cx="35" cy="48" r="0.65" />
        <circle className="flow flow-c" cx="64" cy="47" r="0.65" />
        <circle className="flow flow-d" cx="50" cy="63" r="0.65" />
      </svg>

      <div className="map-caption">
        <span className="live-dot" /> LIVE TELEMETRY / DELHI
      </div>

      {zones.map((zone) => {
        const riskClass = zone.risk.toLowerCase();
        return (
          <button
            key={zone.id}
            className={`map-node ${selected.id === zone.id ? "selected" : ""} ${riskClass}`}
            style={{ left: `${zone.x}%`, top: `${zone.y}%` }}
            onClick={() => onSelect(zone.id)}
            title={`${zone.name} â€” ${zone.predicted} MW projected`}
          >
            <span className="node-ring" />
            <span className="node-core" />
            <span className="node-label">{zone.name.split(" ")[0].toUpperCase()}</span>
          </button>
        );
      })}

      {demo && (
        <div className="map-demo-alert">
          <AlertTriangle size={14} /> SOUTHERN NETWORK UNDER STRESS
        </div>
      )}
    </div>
  );
}

function Metric({ label, value, unit, trend, tone = "neutral" }) {
  return (
    <div className="metric-line">
      <span className="metric-label">{label}</span>
      <div className="metric-value-row">
        <strong>{value}</strong>
        {unit && <small>{unit}</small>}
        {trend && <em className={tone}>{trend}</em>}
      </div>
    </div>
  );
}

export default function App() {
  const root = useRef(null);
  const hero = useRef(null);
  const forecast = useRef(null);
  const intelligence = useRef(null);
  const network = useRef(null);
  const weather = useRef(null);
  const analytics = useRef(null);
  const response = useRef(null);

  const [boot, setBoot] = useState(true);
  const [menuOpen, setMenuOpen] = useState(false);
  const [demo, setDemo] = useState(false);
  const [showWhy, setShowWhy] = useState(false);
  const [horizon, setHorizon] = useState("Next 24h");
  const [selectedZone, setSelectedZone] = useState("central");
  const [alertFilter, setAlertFilter] = useState("ALL");
  const [updated, setUpdated] = useState("14:32:08");

  useEffect(() => {
    const timer = setTimeout(() => setBoot(false), 1000);
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    const tick = setInterval(() => {
      const now = new Date();
      setUpdated(now.toTimeString().slice(0, 8));
    }, 1000);
    return () => clearInterval(tick);
  }, []);

  useEffect(() => {
    const lenis = new Lenis({
      duration: 0.62,
      smoothWheel: true,
      syncTouch: false,
      wheelMultiplier: 1.2,
      touchMultiplier: 1.2,
    });

    const onLenis = () => ScrollTrigger.update();
    const raf = (time) => lenis.raf(time * 1000);

    lenis.on("scroll", onLenis);
    gsap.ticker.add(raf);
    gsap.ticker.lagSmoothing(0);

    return () => {
      lenis.off("scroll", onLenis);
      gsap.ticker.remove(raf);
      lenis.destroy();
    };
  }, []);

  useLayoutEffect(() => {
    if (boot) return undefined;
    const ctx = gsap.context(() => {
      const intro = gsap.timeline();
      intro.fromTo(
        ".hero-intro",
        { y: 45, opacity: 0, clipPath: "inset(100% 0 0 0)" },
        { y: 0, opacity: 1, clipPath: "inset(0% 0 0 0)", duration: 1.1, stagger: 0.08, ease: "power4.out" }
      );

      const heroTl = gsap.timeline({
        scrollTrigger: {
          trigger: hero.current,
          start: "top top",
          end: "+=1050",
          scrub: 0.55,
          pin: true,
          anticipatePin: 1,
          invalidateOnRefresh: true,
          onLeaveBack: () => {
            gsap.set(".hero-title", { clearProps: "transform,opacity" });
            gsap.set(".hero-copy-block,.hero-actions-block", { clearProps: "transform,opacity" });
          },
        },
      });

      heroTl
        .fromTo(".hero-title", { y: 0, scale: 1, opacity: 1 }, { yPercent: -35, scale: 0.78, opacity: 0.48, ease: "none" }, 0)
        .to(".hero-copy-block", { y: -100, opacity: 0, ease: "none" }, 0.08)
        .to(".hero-actions-block", { y: -80, opacity: 0, ease: "none" }, 0.1)
        .to(".hero-chart-shell", { y: -20, scale: 1.05, ease: "none" }, 0)
        .to(".hero-halo", { scale: 1.8, opacity: 0, ease: "none" }, 0);

      const forecastTl = gsap.timeline({
        scrollTrigger: {
          trigger: forecast.current,
          start: "top top",
          end: "+=1250",
          scrub: 0.58,
          pin: true,
          invalidateOnRefresh: true,
        },
      });

      forecastTl
        .fromTo(".forecast-kicker", { y: 70, opacity: 0 }, { y: 0, opacity: 1 }, 0)
        .fromTo(".forecast-title", { y: 120, opacity: 0 }, { y: 0, opacity: 1 }, 0)
        .fromTo(".forecast-main-number", { scale: 0.78, opacity: 0 }, { scale: 1, opacity: 1 }, 0.18)
        .fromTo(".forecast-chart-shell", { xPercent: 105, opacity: 0 }, { xPercent: 0, opacity: 1 }, 0.18)
        .to(".forecast-title", { xPercent: -22, yPercent: -72, scale: 0.64 }, 0.58)
        .to(".forecast-main-number", { xPercent: 18, yPercent: 35, scale: 0.78, opacity: 0.12 }, 0.76)
        .to(".forecast-chart-shell", { scale: 1.05, yPercent: -5 }, 0.58)
        .fromTo(".forecast-end-copy", { y: 50, opacity: 0 }, { y: 0, opacity: 1 }, 0.78);

      const intelligenceTl = gsap.timeline({
        scrollTrigger: {
          trigger: intelligence.current,
          start: "top top",
          end: "+=900",
          scrub: 0.55,
          pin: true,
          invalidateOnRefresh: true,
        },
      });

      intelligenceTl
        .fromTo(".intel-word", { yPercent: 110, opacity: 0 }, { yPercent: 0, opacity: 1, stagger: 0.08 }, 0)
        .fromTo(".intel-model", { xPercent: -25, opacity: 0 }, { xPercent: 0, opacity: 1 }, 0.22)
        .fromTo(".intel-features", { xPercent: 25, opacity: 0 }, { xPercent: 0, opacity: 1 }, 0.28)
        .to(".intel-headline", { yPercent: -35, scale: 0.78 }, 0.65);

      const networkTl = gsap.timeline({
        scrollTrigger: {
          trigger: network.current,
          start: "top top",
          end: "+=1150",
          scrub: 0.58,
          pin: true,
          invalidateOnRefresh: true,
        },
      });

      networkTl
        .fromTo(".network-copy", { x: -100, opacity: 0 }, { x: 0, opacity: 1 }, 0)
        .fromTo(".network-map-large", { scale: 0.72, opacity: 0, rotateX: 14 }, { scale: 1, opacity: 1, rotateX: 0 }, 0.12)
        .fromTo(".map-node", { scale: 0, opacity: 0 }, { scale: 1, opacity: 1, stagger: 0.08 }, 0.26)
        .fromTo(".zone-inspector", { xPercent: 75, opacity: 0 }, { xPercent: 0, opacity: 1 }, 0.54)
        .to(".network-copy", { xPercent: -16, yPercent: -35, scale: 0.78 }, 0.58)
        .to(".network-map-large", { scale: 1.08, xPercent: -4 }, 0.58);

      const weatherTl = gsap.timeline({
        scrollTrigger: {
          trigger: weather.current,
          start: "top 72%",
          end: "bottom 35%",
          scrub: 0.5,
        },
      });

      weatherTl
        .fromTo(".weather-copy", { x: -50, opacity: 0 }, { x: 0, opacity: 1 }, 0)
        .fromTo(".weather-visual", { x: 50, opacity: 0 }, { x: 0, opacity: 1 }, 0.08)
        .fromTo(".weather-factor", { y: 40, opacity: 0 }, { y: 0, opacity: 1, stagger: 0.08 }, 0.18);

      const analyticsTl = gsap.timeline({
        scrollTrigger: {
          trigger: analytics.current,
          start: "top 72%",
          end: "bottom 38%",
          scrub: 0.5,
        },
      });

      analyticsTl
        .fromTo(".analytics-title", { y: 60, opacity: 0 }, { y: 0, opacity: 1 }, 0)
        .fromTo(".analytics-metric", { y: 45, opacity: 0 }, { y: 0, opacity: 1, stagger: 0.08 }, 0.1)
        .fromTo(".confidence-panel", { x: 50, opacity: 0 }, { x: 0, opacity: 1 }, 0.18);

      gsap.fromTo(
        ".alert-row",
        { y: 60, opacity: 0 },
        {
          y: 0,
          opacity: 1,
          duration: 0.85,
          stagger: 0.11,
          ease: "power4.out",
          scrollTrigger: {
            trigger: response.current,
            start: "top 72%",
          },
        }
      );

      ScrollTrigger.refresh();
    }, root);

    return () => ctx.revert();
  }, [boot]);

  const chartData = useMemo(() => {
    const multiplier = demo ? 1.052 : 1;
    return BASE_SERIES.map((d) => {
      const predicted = Math.round(d.predicted * multiplier);
      const spread = predicted * ((d.confidence || 3.5) / 100);
      return {
        ...d,
        predicted,
        upper: Math.round(predicted + spread),
        lower: Math.round(predicted - spread),
        temp: demo ? d.temp + 1.2 : d.temp,
      };
    });
  }, [demo]);

    const [liveForecast, setLiveForecast] = useState(null);
  useEffect(() => {
    fetch("http://localhost:5000/api/forecast")
      .then((res) => res.json())
      .then((data) => setLiveForecast(data))
      .catch((err) => console.error("Live forecast fetch failed:", err));
  }, []);
  const currentDemand = liveForecast ? liveForecast["1 hour"].current_demand_kw : (demo ? 8190 : 7842);
  const predictedPeak = liveForecast ? liveForecast["24 hours"].predicted_demand_kw : (demo ? 8850 : 8460);
  const gridCapacity = 9200;
  const buffer = gridCapacity - predictedPeak;
  const utilization = (predictedPeak / gridCapacity) * 100;
  const risk = demo ? "CRITICAL" : utilization >= 95 ? "CRITICAL" : utilization >= 90 ? "HIGH" : utilization >= 82 ? "MODERATE" : "LOW";

  const zones = useMemo(() => {
    return ZONES.map((zone) => {
      if (!demo) return zone;
      if (zone.id === "south") {
        return { ...zone, predicted: 2190, current: 1980, risk: "CRITICAL", temp: 45.0, action: "Transfer 340 MW and pre-position additional feeder capacity." };
      }
      if (zone.id === "central") {
        return { ...zone, predicted: 1690, current: 1510, risk: "HIGH", temp: 44.2 };
      }
      return { ...zone, predicted: Math.round(zone.predicted * 1.04), current: Math.round(zone.current * 1.04), temp: zone.temp + 1.8 };
    });
  }, [demo]);

  const selected = zones.find((z) => z.id === selectedZone) || zones[2];
  const filteredAlerts = alertFilter === "ALL" ? ALERTS : ALERTS.filter((a) => a.type === alertFilter);

  const insightText = demo
    ? "Extreme temperature is driving abnormal demand growth. Peak load may reach 8,850 MW around 16:40, reducing the grid buffer to 350 MW."
    : "Temperature is expected to reach 42Â°C at 16:00. The model predicts demand will rise to approximately 8,460 MW during the peak window.";

  const recommendedAction = demo
    ? "Prepare additional feeder capacity in South Delhi and stage 340 MW of regional transfer headroom."
    : "Pre-position additional feeder capacity in South and Central Delhi between 15:30â€“18:00.";

  if (boot) {
    return (
      <div className="boot-screen">
        <div className="boot-grid" />
        <div className="boot-center">
          <div className="boot-logo"><Zap size={28} /></div>
          <strong>Grid<span>Pulse</span></strong>
          <div className="boot-progress"><div /></div>
          <small>INITIALIZING GRID INTELLIGENCE</small>
        </div>
      </div>
    );
  }

  return (
    <div ref={root} className={`site ${demo ? "demo-mode" : ""}`}>
      <style>{CSS}</style>

      <header className="nav">
        <a href="#overview" className="brand">
          <span className="brand-mark"><Zap size={15} /></span>
          <span>Grid<span>Pulse</span></span>
        </a>

        <nav className="nav-links">
          <a href="#forecast">Forecast</a>
          <a href="#intelligence">Intelligence</a>
          <a href="#network">Grid Map</a>
          <a href="#analytics">Analytics</a>
          <a href="#alerts">Alerts</a>
        </nav>

        <div className="nav-actions">
          <button className={`demo-button ${demo ? "active" : ""}`} onClick={() => setDemo((v) => !v)}>
            {demo ? <RotateCcw size={13} /> : <Zap size={13} />}
            {demo ? "Reset demo" : "Demo mode"}
          </button>
          <span className="nav-live"><i /> LIVE</span>
          <span className="nav-time">{updated} IST</span>
          <button className="menu-button" onClick={() => setMenuOpen((v) => !v)}>
            {menuOpen ? <X size={18} /> : <Menu size={18} />}
          </button>
        </div>
      </header>

      <div className={`mobile-menu ${menuOpen ? "open" : ""}`}>
        {["forecast", "intelligence", "network", "analytics", "alerts"].map((item) => (
          <a href={`#${item}`} key={item} onClick={() => setMenuOpen(false)}>{item}</a>
        ))}
      </div>

      <main>
        {/* ================================================= HERO */}
        <section ref={hero} id="overview" className="hero-section">
          <div className="hero-halo" />
          <div className="hero-grid" />
          <div className="hero-inner container">
            <div className="hero-status hero-intro"><span className="live-dot" /> DELHI GRID â€” LIVE INTELLIGENCE</div>

            <h1 className="hero-title hero-intro">
              Predict the grid
              <span>before it breaks.</span>
            </h1>

            <div className="hero-copy-block hero-intro">
              <p>
                GridPulse combines historical load, weather, renewable contribution and model intelligence
                into one continuous view of what the grid is about to do.
              </p>
            </div>

            <div className="hero-actions-block hero-intro">
              <a className="button-primary" href="#forecast">Explore forecast <ArrowDown size={14} /></a>
              <a className="button-link" href="#network">Where is the pressure? <ArrowRight size={14} /></a>
            </div>

            <div className="hero-chart-shell hero-intro">
              <div className="hero-metrics">
                <Metric label="CURRENT DEMAND" value={currentDemand.toLocaleString()} unit="kW" trend="+4.8% vs yesterday" tone="positive" />
                <Metric label="PREDICTED PEAK" value={predictedPeak.toLocaleString()} unit="kW" trend="16:30 IST" tone="purple" />
                <Metric label="GRID CAPACITY" value="9,200" unit="MW" trend={`${buffer.toLocaleString()} MW buffer`} tone={demo ? "critical" : "positive"} />
                <Metric label="GRID STATUS" value={risk} trend={demo ? "heatwave scenario" : "nominal conditions"} tone={demo ? "critical" : "positive"} />
              </div>
              <div className="hero-chart">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={chartData} margin={{ top: 30, right: 5, left: -30, bottom: 0 }}>
                    <defs>
                      <linearGradient id="heroForecastFill" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#9b8cff" stopOpacity="0.25" />
                        <stop offset="100%" stopColor="#9b8cff" stopOpacity="0" />
                      </linearGradient>
                    </defs>
                    <CartesianGrid stroke="rgba(255,255,255,.05)" strokeDasharray="2 8" vertical={false} />
                    <XAxis dataKey="time" axisLine={false} tickLine={false} tick={{ fill: "rgba(255,255,255,.24)", fontSize: 9 }} />
                    <YAxis domain={[6000, 9500]} axisLine={false} tickLine={false} tick={{ fill: "rgba(255,255,255,.18)", fontSize: 9 }} />
                    <ReferenceLine y={9200} stroke="#ff647c" strokeDasharray="4 6" strokeOpacity=".45" />
                    <Area type="monotone" dataKey="actual" stroke="#fff" strokeWidth={2.2} fill="none" dot={false} isAnimationActive animationDuration={1200} />
                    <Area type="monotone" dataKey="predicted" stroke="#9b8cff" strokeWidth={2.8} fill="url(#heroForecastFill)" dot={false} isAnimationActive animationDuration={1500} />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>
          <div className="scroll-cue"><span>SCROLL TO EXPLORE</span><ArrowDown size={13} /></div>
        </section>

        {/* ================================================ FORECAST */}
        <section ref={forecast} id="forecast" className="forecast-stage">
          <div className="container forecast-inner">
            <div className="forecast-kicker kicker">01 / FORECAST</div>
            <h2 className="forecast-title display-title">
              Demand doesn't<br /><span>wait for you.</span>
            </h2>

            <div className="forecast-main-number">
              <small>PROJECTED PEAK</small>
              <strong>{predictedPeak.toLocaleString()} <em>MW</em></strong>
              <span>{demo ? "+13.4%" : "+7.8%"} ABOVE BASELINE</span>
            </div>

            <div className="forecast-chart-shell panel">
              <div className="forecast-chart-top">
                <div>
                  <span>DEMAND FORECAST</span>
                  <small>AI prediction based on historical load + weather</small>
                </div>
                <div className="forecast-legend">
                  <span><i className="white" /> Actual</span>
                  <span><i className="purple" /> Predicted</span>
                  <span><i className="band" /> Confidence</span>
                  <span><i className="red" /> Capacity</span>
                </div>
              </div>

              <div className="horizon-controls">
                {HORIZONS.map((item) => (
                  <button key={item} className={horizon === item ? "selected" : ""} onClick={() => setHorizon(item)}>
                    {item}
                  </button>
                ))}
              </div>

              <div className="big-chart">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={chartData} margin={{ top: 24, right: 18, left: -25, bottom: 0 }}>
                    <defs>
                      <linearGradient id="confidenceFill" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#9b8cff" stopOpacity="0.12" />
                        <stop offset="100%" stopColor="#9b8cff" stopOpacity="0" />
                      </linearGradient>
                      <linearGradient id="predictionFill" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#9b8cff" stopOpacity="0.28" />
                        <stop offset="100%" stopColor="#9b8cff" stopOpacity="0" />
                      </linearGradient>
                    </defs>
                    <CartesianGrid stroke="rgba(255,255,255,.05)" strokeDasharray="2 8" vertical={false} />
                    <XAxis dataKey="time" axisLine={false} tickLine={false} tick={{ fill: "rgba(255,255,255,.3)", fontSize: 10 }} />
                    <YAxis domain={[6000, 9500]} axisLine={false} tickLine={false} tick={{ fill: "rgba(255,255,255,.22)", fontSize: 10 }} />
                    <ReferenceLine x="16:30" stroke="#f2a65a" strokeDasharray="4 6" label={{ value: "PEAK", fill: "#f2a65a", fontSize: 9, position: "top" }} />
                    <ReferenceLine y={9200} stroke="#ff647c" strokeDasharray="4 7" strokeOpacity=".55" label={{ value: "GRID CAPACITY 9,200 MW", fill: "#ff647c", fontSize: 9, position: "insideTopRight" }} />
                    <Area type="monotone" dataKey="upper" stroke="none" fill="url(#confidenceFill)" baseValue="dataMin" stackId="confidence" isAnimationActive={false} />
                    <Area type="monotone" dataKey="lower" stroke="none" fill="#050608" stackId="confidence" isAnimationActive={false} />
                    <Area type="monotone" dataKey="predicted" stroke="#9b8cff" strokeWidth={3} fill="url(#predictionFill)" dot={false} isAnimationActive={false} />
                    <Line type="monotone" dataKey="actual" stroke="#fff" strokeWidth={2.4} dot={false} isAnimationActive={false} />
                    <Tooltip content={<CustomTooltip />} />
                  </AreaChart>
                </ResponsiveContainer>
              </div>

              <div className="forecast-chart-foot">
                <span>HORIZON: {horizon.toUpperCase()}</span>
                <span>NOW / 14:32 IST</span>
                <span>PEAK WINDOW / 16:00â€“17:30</span>
              </div>
            </div>

            <div className="forecast-end-copy">
              <small>THE NEXT DECISION</small>
              <strong>{buffer.toLocaleString()} MW buffer remaining.</strong>
            </div>
          </div>
        </section>

        {/* ============================================= INTELLIGENCE */}
        <section ref={intelligence} id="intelligence" className="intelligence-stage">
          <div className="container intelligence-inner">
            <div className="kicker">02 / AI GRID INSIGHT</div>
            <h2 className="intel-headline display-title">
              <span className="intel-word">Not</span>{" "}
              <span className="intel-word">just</span>{" "}
              <span className="intel-word">a</span>{" "}
              <span className="intel-word faded">forecast.</span><br />
              <span className="intel-word">An</span>{" "}
              <span className="intel-word faded">explanation.</span>
            </h2>

            <div className="intel-grid">
              <div className="intel-model panel parallax-soft">
                <div className="model-top">
                  <div className="icon-box"><Cpu size={18} /></div>
                  <div><span>MODEL</span><strong>LIGHTGBM</strong></div>
                  <div className="model-accuracy">97.7%<small>accuracy</small></div>
                </div>

                <div className="insight-alert">
                  <span><AlertTriangle size={14} /> HIGH DEMAND WINDOW</span>
                  <p>{insightText}</p>
                </div>

                <div className="recommended-action">
                  <span>RECOMMENDED ACTION</span>
                  <strong>{recommendedAction}</strong>
                </div>

                <button className="why-button" onClick={() => setShowWhy((v) => !v)}>
                  {showWhy ? "Hide contributing factors" : "Why this prediction?"}
                  <ChevronRight size={14} className={showWhy ? "rotate" : ""} />
                </button>

                {showWhy && (
                  <div className="why-panel">
                    {FEATURES.map((feature) => (
                      <div key={feature.name} className="why-row">
                        <div><span>{feature.name}</span><b>{feature.value}%</b></div>
                        <div className={`why-track ${feature.tone}`}><i style={{ width: `${feature.value}%` }} /></div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="intel-features panel">
                <div className="intel-feature-header"><span>CONTRIBUTING SIGNALS</span><span>WEIGHT</span></div>
                {FEATURES.map((f, i) => (
                  <div className="feature-row" key={f.name}>
                    <div className="feature-meta">
                      <span>0{i + 1}</span>
                      <strong>{f.name}</strong>
                      <em>{f.value}%</em>
                    </div>
                    <div className={`feature-track ${f.tone}`}><i style={{ width: `${f.value}%` }} /></div>
                  </div>
                ))}
                <div className="intel-footer-note">
                  Temperature remains the strongest near-term demand driver for Delhi summer peaks.
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ================================================ PEAK RISK */}
        <section className="risk-stage">
          <div className="container risk-layout">
            <Reveal className="risk-copy">
              <div className="kicker">03 / PEAK RISK</div>
              <h2 className="display-title">Know the limit<br /><span>before you reach it.</span></h2>
              <p className="story-copy">
                GridPulse continuously compares predicted demand against usable grid capacity and flags the decision window before reserves disappear.
              </p>
            </Reveal>

            <Reveal className="risk-panel panel" delay={120}>
              <div className="risk-top">
                <div>
                  <span>PEAK RISK</span>
                  <strong className={risk.toLowerCase()}>{risk}</strong>
                </div>
                <div className="risk-percent">{utilization.toFixed(1)}%</div>
              </div>

              <div className="risk-gauge">
                <div className="gauge-safe" />
                <div className="gauge-watch" />
                <div className="gauge-critical" />
                <div className="gauge-marker" style={{ left: `${Math.min(utilization, 100)}%` }} />
              </div>

              <div className="risk-scale"><span>SAFE</span><span>WATCH</span><span>CRITICAL</span></div>

              <div className="risk-stats">
                <div><span>Predicted peak</span><strong>{predictedPeak.toLocaleString()} MW</strong></div>
                <div><span>Capacity</span><strong>9,200 MW</strong></div>
                <div><span>Buffer</span><strong>{buffer.toLocaleString()} MW</strong></div>
              </div>

              <div className="peak-window"><span>PEAK WINDOW</span><strong>{demo ? "16:00â€“17:30" : "16:00â€“17:30 IST"}</strong></div>
            </Reveal>
          </div>
        </section>

        {/* =============================================== GRID MAP */}
        <section ref={network} id="network" className="network-stage">
          <div className="container network-inner">
            <div className="network-copy">
              <div className="kicker">04 / GRID MAP</div>
              <h2 className="display-title">Where is<br /><span>the pressure?</span></h2>
              <p className="story-copy">Area and feeder intelligence turns one city-wide forecast into local action.</p>
            </div>

            <NetworkMap zones={zones} selectedId={selectedZone} onSelect={setSelectedZone} demo={demo} />

            <div className="zone-inspector panel">
              <span className="inspector-kicker">SELECTED AREA</span>
              <h3>{selected.name}</h3>
              <div className={`zone-risk ${selected.risk.toLowerCase()}`}>{selected.risk}</div>

              <div className="zone-load"><strong>{selected.predicted.toLocaleString()}</strong><small> MW predicted</small></div>

              <div className="zone-util-bar"><i style={{ width: `${Math.min((selected.predicted / selected.capacity) * 100, 100)}%` }} /></div>
              <div className="zone-util-meta"><span>CAPACITY UTILIZATION</span><strong>{((selected.predicted / selected.capacity) * 100).toFixed(1)}%</strong></div>

              <div className="zone-details-grid">
                <div><span>CURRENT LOAD</span><strong>{selected.current.toLocaleString()} MW</strong></div>
                <div><span>CAPACITY</span><strong>{selected.capacity.toLocaleString()} MW</strong></div>
                <div><span>FEEDERS</span><strong>{selected.feeders}</strong></div>
                <div><span>TEMPERATURE</span><strong>{selected.temp.toFixed(1)}Â°C</strong></div>
              </div>

              <div className="zone-action"><span>RECOMMENDED ACTION</span><strong>{selected.action}</strong></div>
            </div>
          </div>
        </section>

        {/* ============================================= WEATHER DEMAND */}
        <section ref={weather} className="weather-stage">
          <div className="container weather-inner">
            <div className="weather-copy">
              <div className="kicker">05 / WEATHER â†’ DEMAND</div>
              <h2 className="display-title">What is driving<br /><span>demand?</span></h2>
              <p className="story-copy">Weather signals are fed directly into the forecast. Temperature dominates today's projected load curve.</p>

              <div className="correlation-line">
                <div><span>LOW TEMP</span><i /></div>
                <strong>HIGHER TEMPERATURE</strong>
                <ArrowRight size={18} />
                <strong>HIGHER DEMAND</strong>
                <div><span>PEAK DEMAND</span><i /></div>
              </div>
            </div>

            <div className="weather-visual">
              <div className="temperature-focus panel">
                <div className="temperature-label"><Thermometer size={16} /> TEMPERATURE</div>
                <strong>{demo ? "43.0" : "41.2"}<small>Â°C</small></strong>
                <span>â†‘ +2.4Â°C vs recent profile</span>
                <div className="temp-wave"><i /><i /><i /><i /><i /><i /><i /><i /></div>
              </div>

              <div className="weather-grid">
                {WEATHER.slice(1).map((item) => (
                  <div key={item.label} className="weather-factor panel">
                    <span>{item.label}</span>
                    <strong>{item.value}<small>{item.unit}</small></strong>
                    <em>{item.delta}</em>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* ============================================== ANALYTICS */}
        <section ref={analytics} id="analytics" className="analytics-stage">
          <div className="container">
            <div className="analytics-title-row">
              <div>
                <div className="kicker">06 / MODEL PERFORMANCE</div>
                <h2 className="display-title analytics-title">Built to be<br /><span>measurable.</span></h2>
              </div>
              <p className="story-copy">The forecasting layer stays transparent: accuracy, error, confidence and actual-vs-predicted behavior are visible alongside the decision.</p>
            </div>

            <div className="analytics-grid">
              <div className="analytics-metric panel"><span>R² SCORE</span><strong>97.7%</strong><em>validation score</em></div>
              <div className="analytics-metric panel"><span>MAE</span><strong>116.6</strong><em>kW mean absolute error</em></div>
              <div className="analytics-metric panel"><span>RMSE</span><strong>201.4</strong><em>kW root mean square error</em></div>

              <div className="confidence-panel panel">
                <div className="confidence-top"><span>IMPROVEMENT VS BASELINE</span><strong>43.4%</strong></div>
                <div className="confidence-bar"><i style={{ width: "43.4%" }} /></div>
                <p>The model reduces mean absolute error by 43.4% compared to a naive persistence baseline, measured on held-out test data.</p>
              </div>

              <div className="validation-chart panel">
                <div className="validation-head"><span>ACTUAL vs PREDICTED</span><small>Recent validation window</small></div>
                <div className="validation-chart-inner">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={BASE_SERIES.slice(0, 6)} margin={{ top: 15, right: 10, left: -28, bottom: 0 }}>
                      <CartesianGrid stroke="rgba(255,255,255,.05)" strokeDasharray="2 8" vertical={false} />
                      <XAxis dataKey="time" axisLine={false} tickLine={false} tick={{ fill: "rgba(255,255,255,.24)", fontSize: 9 }} />
                      <YAxis domain={[6500, 8500]} axisLine={false} tickLine={false} tick={{ fill: "rgba(255,255,255,.18)", fontSize: 9 }} />
                      <Area type="monotone" dataKey="actual" stroke="#fff" strokeWidth={2} fill="none" dot={false} />
                      <Line type="monotone" dataKey="predicted" stroke="#9b8cff" strokeWidth={2} dot={false} />
                      <Tooltip content={<CustomTooltip />} />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ================================================= ALERTS */}
        <section ref={response} id="alerts" className="response-stage">
          <div className="container">
            <div className="response-header">
              <div>
                <div className="kicker">07 / ALERT CENTER</div>
                <h2 className="display-title response-title">From prediction<br /><span>to action.</span></h2>
              </div>
              <p className="story-copy">Every alert carries an area, issue, predicted impact, recommended action and status â€” designed for an operator, not a chat box.</p>
            </div>

            <div className="alert-filters">
              {["ALL", "CRITICAL", "WARNING", "ADVISORY", "RESOLVED"].map((filter) => (
                <button key={filter} className={alertFilter === filter ? "selected" : ""} onClick={() => setAlertFilter(filter)}>
                  {filter}
                </button>
              ))}
              <span className="alert-mode-label">{demo ? "HEATWAVE SIMULATION ACTIVE" : "NOMINAL CONDITIONS"}</span>
            </div>

            <div className="alerts-list">
              {filteredAlerts.map((alert, index) => (
                <div className={`alert-row ${alert.type.toLowerCase()}`} key={alert.id}>
                  <span className="alert-number">0{index + 1}</span>
                  <span className="alert-badge">{alert.type}</span>
                  <div className="alert-main">
                    <span>{alert.time} IST Â· {alert.area}</span>
                    <strong>{alert.issue}</strong>
                    <p>{alert.detail}</p>
                  </div>
                  <div className="alert-impact">
                    <span>IMPACT</span>
                    <strong>{alert.impact}</strong>
                  </div>
                  <div className="alert-action">
                    <span>DIRECTIVE</span>
                    <strong>{alert.action}</strong>
                  </div>
                  <div className="alert-status"><CheckCircle2 size={15} /> {alert.status}</div>
                  <ChevronRight size={18} className="alert-arrow" />
                </div>
              ))}
            </div>

            <div className="dispatch-directive panel">
              <div className="directive-icon"><Zap size={18} /></div>
              <div>
                <span>RECOMMENDED DISPATCH</span>
                <strong>{demo ? "Transfer 340 MW toward available regional headroom and protect South Delhi feeders." : "Pre-position 120 MW feeder headroom before the 16:00â€“17:30 peak window."}</strong>
              </div>
              <button>EXECUTE PLAN <ArrowUpRight size={14} /></button>
            </div>
          </div>
        </section>

        {/* ================================================ FOOTER */}
        <footer className="footer">
          <div className="container footer-inner">
            <div>
              <div className="brand footer-brand"><span className="brand-mark"><Zap size={15} /></span>Grid<span>Pulse</span></div>
              <p>Predict demand. Prevent overload.</p>
            </div>
            <div className="footer-status"><span className="live-dot" /> SYSTEM OPERATIONAL / DELHI SLDC</div>
          </div>
        </footer>
      </main>
    </div>
  );
}

const CSS = `
@import url('https://fonts.googleapis.com/css2?family=DM+Mono:wght@400;500&family=Inter:wght@400;500;600&display=swap');

:root{
  --bg:#050608;
  --bg2:#08090d;
  --text:#f4f4f2;
  --muted:rgba(244,244,242,.46);
  --faint:rgba(244,244,242,.21);
  --line:rgba(255,255,255,.08);
  --purple:#9b8cff;
  --orange:#f2a65a;
  --red:#ff647c;
  --green:#57d69a;
  --blue:#6aa9ff;
  --yellow:#f2cd63;
}

*{box-sizing:border-box}
html{scroll-behavior:auto;background:var(--bg)}
body{margin:0;background:var(--bg);color:var(--text);font-family:Inter,sans-serif}
a{color:inherit;text-decoration:none}
button{font:inherit;cursor:pointer}
.site{overflow:hidden;background:var(--bg)}
.container{width:min(1260px,calc(100% - 48px));margin:0 auto}

.nav{position:fixed;z-index:100;top:0;left:0;right:0;height:72px;padding:0 30px;display:flex;align-items:center;justify-content:space-between;background:rgba(5,6,8,.72);backdrop-filter:blur(22px);border-bottom:1px solid rgba(255,255,255,.055)}
.brand{display:flex;align-items:center;gap:9px;font-size:16px;font-weight:600;letter-spacing:-.045em}.brand>span:last-child>span{color:var(--purple)}
.brand-mark{width:30px;height:30px;border-radius:8px;display:grid;place-items:center;color:#07080a;background:linear-gradient(135deg,#f2a65a,#9b8cff);box-shadow:0 0 22px rgba(155,140,255,.2)}
.nav-links{display:flex;gap:29px;margin-left:auto;margin-right:35px}.nav-links a{font-size:11px;color:rgba(255,255,255,.46);transition:color .2s}.nav-links a:hover{color:#fff}
.nav-actions{display:flex;align-items:center;gap:15px}.nav-live{font:8px 'DM Mono',monospace;color:rgba(255,255,255,.35);display:flex;align-items:center;gap:6px}.nav-time{font:8px 'DM Mono',monospace;color:rgba(255,255,255,.22)}
.live-dot{width:6px;height:6px;border-radius:50%;display:inline-block;background:var(--green);box-shadow:0 0 12px rgba(87,214,154,.7)}
.demo-button{display:flex;align-items:center;gap:7px;padding:8px 11px;border-radius:999px;border:1px solid rgba(255,255,255,.08);background:rgba(255,255,255,.025);color:rgba(255,255,255,.45);font:9px 'DM Mono',monospace;transition:.25s}.demo-button:hover,.demo-button.active{border-color:rgba(255,100,124,.35);color:var(--red);background:rgba(255,100,124,.06)}
.menu-button{display:none;border:0;background:none;color:#fff}
.mobile-menu{display:none}

.boot-screen{height:100vh;display:grid;place-items:center;position:relative;overflow:hidden;background:#050608}.boot-grid{position:absolute;inset:-100px;background-image:linear-gradient(rgba(155,140,255,.06) 1px,transparent 1px),linear-gradient(90deg,rgba(155,140,255,.06) 1px,transparent 1px);background-size:50px 50px;transform:perspective(500px) rotateX(60deg) scale(2);animation:bootGrid 5s linear infinite}@keyframes bootGrid{to{background-position:0 50px}}
.boot-center{text-align:center;z-index:2}.boot-logo{width:62px;height:62px;margin:0 auto 18px;display:grid;place-items:center;border-radius:15px;color:#050608;background:linear-gradient(135deg,#f2a65a,#9b8cff)}.boot-center>strong{font-size:28px;letter-spacing:-.06em}.boot-center>strong span{color:var(--purple)}.boot-center small{font:8px 'DM Mono',monospace;color:rgba(255,255,255,.28);letter-spacing:.13em}.boot-progress{width:190px;height:2px;background:rgba(255,255,255,.07);margin:16px auto 12px;overflow:hidden}.boot-progress>div{height:100%;background:var(--purple);animation:bootBar 1s ease forwards}@keyframes bootBar{from{transform:scaleX(0);transform-origin:left}to{transform:scaleX(1);transform-origin:left}}

.kicker{font:9px 'DM Mono',monospace;color:rgba(255,255,255,.28);letter-spacing:.14em}.display-title{font-size:clamp(62px,8vw,112px);line-height:.88;letter-spacing:-.075em;font-weight:500;margin:0}.display-title span{color:rgba(255,255,255,.29)}.story-copy{max-width:450px;color:var(--muted);font-size:14px;line-height:1.8}.panel{border:1px solid var(--line);background:rgba(255,255,255,.018)}
.reveal{opacity:0;transform:translateY(34px);transition:opacity .85s cubic-bezier(.22,1,.36,1),transform .85s cubic-bezier(.22,1,.36,1)}.reveal-visible{opacity:1;transform:translateY(0)}

/* HERO */
.hero-section{min-height:100vh;height:100vh;position:relative;overflow:hidden;padding-top:125px;background:radial-gradient(circle at 75% 35%,rgba(155,140,255,.08),transparent 30rem),#050608}.hero-grid{position:absolute;inset:-10%;background:linear-gradient(rgba(155,140,255,.03) 1px,transparent 1px),linear-gradient(90deg,rgba(155,140,255,.03) 1px,transparent 1px);background-size:75px 75px;transform:perspective(800px) rotateX(64deg) scale(1.55);transform-origin:center bottom}.hero-halo{position:absolute;width:650px;height:650px;top:11%;right:0;border-radius:50%;background:radial-gradient(circle,rgba(155,140,255,.09),transparent 67%);filter:blur(12px)}.hero-inner{position:relative;z-index:2}.hero-status{display:flex;align-items:center;gap:8px;margin-bottom:27px;font:9px 'DM Mono',monospace;letter-spacing:.12em;color:rgba(255,255,255,.36)}.hero-title{font-size:clamp(68px,10.2vw,148px);line-height:.84;letter-spacing:-.09em;font-weight:500;margin:0;max-width:1050px}.hero-title span{display:block;color:rgba(255,255,255,.27)}.hero-copy-block p{max-width:580px;margin:37px 0 0;color:var(--muted);font-size:15px;line-height:1.85}.hero-actions-block{display:flex;align-items:center;gap:28px;margin-top:30px}.button-primary{display:flex;align-items:center;gap:9px;padding:13px 17px;border-radius:999px;background:#fff;color:#08090b;font-size:11px;font-weight:600}.button-link{display:flex;align-items:center;gap:7px;color:rgba(255,255,255,.4);font-size:11px}.button-link:hover{color:#fff}
.hero-chart-shell{margin-top:80px;border-top:1px solid var(--line);padding-top:21px}.hero-metrics{display:grid;grid-template-columns:repeat(4,1fr);gap:40px}.metric-line{display:flex;flex-direction:column;gap:8px}.metric-label{font:8px 'DM Mono',monospace;color:rgba(255,255,255,.25);letter-spacing:.11em}.metric-value-row{display:flex;align-items:baseline;gap:7px}.metric-value-row strong{font:24px 'DM Mono',monospace;letter-spacing:-.06em}.metric-value-row small{font:9px 'DM Mono',monospace;color:rgba(255,255,255,.25)}.metric-value-row em{font:8px 'DM Mono',monospace;font-style:normal}.metric-value-row em.positive{color:var(--green)}.metric-value-row em.purple{color:var(--purple)}.metric-value-row em.critical{color:var(--red)}
.hero-chart{height:210px;margin-top:12px}.scroll-cue{position:absolute;bottom:28px;left:50%;transform:translateX(-50%);display:flex;flex-direction:column;align-items:center;gap:8px;color:rgba(255,255,255,.25);font:7px 'DM Mono',monospace;letter-spacing:.14em}

/* FORECAST */
.forecast-stage{height:100vh;min-height:780px;position:relative;overflow:hidden;background:#08090d}.forecast-inner{height:100%;position:relative;padding-top:135px}.forecast-kicker{position:relative}.forecast-title{position:absolute;left:0;top:185px;z-index:5}.forecast-main-number{position:absolute;left:0;bottom:92px;z-index:4}.forecast-main-number small{display:block;font:8px 'DM Mono',monospace;color:rgba(255,255,255,.25);letter-spacing:.13em}.forecast-main-number strong{display:block;font:60px 'DM Mono',monospace;letter-spacing:-.09em;margin-top:10px}.forecast-main-number strong em{font-style:normal;font-size:12px;color:rgba(255,255,255,.25)}.forecast-main-number span{font:8px 'DM Mono',monospace;color:var(--purple);display:block;margin-top:8px}.forecast-chart-shell{position:absolute;left:22%;right:0;top:21%;height:64%;padding:24px}.forecast-chart-top{display:flex;justify-content:space-between;align-items:flex-start}.forecast-chart-top span,.forecast-chart-top small{display:block}.forecast-chart-top span{font:8px 'DM Mono',monospace;color:rgba(255,255,255,.33);letter-spacing:.1em}.forecast-chart-top small{font-size:10px;color:rgba(255,255,255,.26);margin-top:6px}.forecast-legend{display:flex;gap:15px}.forecast-legend span{display:flex;align-items:center;gap:6px;font:8px 'DM Mono',monospace;color:rgba(255,255,255,.28);letter-spacing:0}.forecast-legend i{width:11px;height:2px;display:block}.forecast-legend .white{background:#fff}.forecast-legend .purple{background:var(--purple)}.forecast-legend .band{background:rgba(155,140,255,.25)}.forecast-legend .red{background:var(--red)}.horizon-controls{display:flex;gap:6px;margin-top:16px}.horizon-controls button{padding:7px 10px;border:1px solid rgba(255,255,255,.07);background:rgba(255,255,255,.018);color:rgba(255,255,255,.3);font:8px 'DM Mono',monospace}.horizon-controls button.selected{color:#fff;border-color:rgba(155,140,255,.4);background:rgba(155,140,255,.08)}.big-chart{height:calc(100% - 105px);margin-top:10px}.forecast-chart-foot{display:flex;justify-content:space-between;color:rgba(255,255,255,.2);font:7px 'DM Mono',monospace}.forecast-end-copy{position:absolute;right:0;bottom:53px;text-align:right}.forecast-end-copy small,.forecast-end-copy strong{display:block}.forecast-end-copy small{font:8px 'DM Mono',monospace;color:rgba(255,255,255,.2)}.forecast-end-copy strong{font:16px 'DM Mono',monospace;font-weight:400;margin-top:5px;color:rgba(255,255,255,.7)}.chart-tooltip{min-width:185px;border:1px solid rgba(155,140,255,.25);background:rgba(9,10,14,.96);backdrop-filter:blur(14px);padding:11px 12px;font:10px 'DM Mono',monospace;box-shadow:0 15px 50px rgba(0,0,0,.4)}.tooltip-head{display:flex;justify-content:space-between;border-bottom:1px solid var(--line);padding-bottom:7px;margin-bottom:7px}.tooltip-head span{color:var(--orange)}.tooltip-line{display:flex;justify-content:space-between;gap:15px;padding:2px 0}.tooltip-line span{color:rgba(255,255,255,.38)}

/* INTELLIGENCE */
.intelligence-stage{height:100vh;min-height:760px;position:relative;overflow:hidden;background:radial-gradient(circle at 50% 55%,rgba(155,140,255,.06),transparent 34rem),#07080c}.intelligence-inner{height:100%;padding-top:135px}.intel-headline{margin-top:35px}.intel-word{display:inline-block}.intel-grid{display:grid;grid-template-columns:.9fr 1.1fr;gap:24px;position:absolute;left:max(24px,calc((100vw - 1260px)/2));right:max(24px,calc((100vw - 1260px)/2));bottom:65px}.intel-model,.intel-features{padding:25px;min-height:310px}.model-top{display:flex;align-items:center;gap:12px}.icon-box{width:40px;height:40px;display:grid;place-items:center;border:1px solid rgba(155,140,255,.25);color:var(--purple);background:rgba(155,140,255,.06)}.model-top span,.model-top strong{display:block;font:8px 'DM Mono',monospace}.model-top span{color:rgba(255,255,255,.22);margin-bottom:4px}.model-top strong{color:rgba(255,255,255,.65)}.model-accuracy{margin-left:auto;font:20px 'DM Mono',monospace;color:var(--green);text-align:right}.model-accuracy small{display:block;font:7px 'DM Mono',monospace;color:rgba(255,255,255,.22);margin-top:3px}.insight-alert{margin-top:32px}.insight-alert>span{display:flex;align-items:center;gap:7px;font:8px 'DM Mono',monospace;color:var(--orange);letter-spacing:.08em}.insight-alert p{font-size:14px;line-height:1.7;color:rgba(255,255,255,.64);max-width:530px}.recommended-action{border-top:1px solid var(--line);padding-top:17px;margin-top:19px}.recommended-action span,.recommended-action strong{display:block}.recommended-action span{font:8px 'DM Mono',monospace;color:rgba(255,255,255,.22);letter-spacing:.1em}.recommended-action strong{font-size:12px;line-height:1.6;font-weight:500;margin-top:7px}.why-button{margin-top:19px;border:0;background:none;color:var(--purple);padding:0;display:flex;align-items:center;gap:6px;font:9px 'DM Mono',monospace}.rotate{transform:rotate(90deg)}.why-panel{margin-top:15px;padding-top:13px;border-top:1px solid var(--line);display:grid;gap:9px}.why-row>div:first-child{display:flex;justify-content:space-between;font:8px 'DM Mono',monospace;color:rgba(255,255,255,.42)}.why-row b{color:#fff;font-weight:400}.why-track,.feature-track{height:3px;margin-top:7px;background:rgba(255,255,255,.06);overflow:hidden}.why-track i,.feature-track i{display:block;height:100%;background:var(--purple)}.why-track.orange i,.feature-track.orange i{background:var(--orange)}.why-track.blue i,.feature-track.blue i{background:var(--blue)}.why-track.yellow i,.feature-track.yellow i{background:var(--yellow)}.intel-feature-header{display:flex;justify-content:space-between;padding-bottom:15px;border-bottom:1px solid var(--line);font:8px 'DM Mono',monospace;color:rgba(255,255,255,.24)}.feature-row{padding:17px 0;border-bottom:1px solid var(--line)}.feature-meta{display:grid;grid-template-columns:32px 1fr auto;align-items:center;gap:9px;font:9px 'DM Mono',monospace}.feature-meta>span{color:rgba(255,255,255,.18)}.feature-meta strong{font-weight:400;color:rgba(255,255,255,.62)}.feature-meta em{font-style:normal;color:var(--purple)}.intel-footer-note{font-size:10px;line-height:1.7;color:rgba(255,255,255,.26);margin-top:17px}

/* RISK */
.risk-stage{min-height:82vh;padding:150px 0;background:#050608}.risk-layout{display:grid;grid-template-columns:1fr .75fr;align-items:center;gap:100px}.risk-copy .story-copy{margin-top:30px}.risk-panel{padding:30px}.risk-top{display:flex;justify-content:space-between;align-items:flex-start}.risk-top span{display:block;font:8px 'DM Mono',monospace;color:rgba(255,255,255,.25);letter-spacing:.11em}.risk-top strong{display:block;font:16px 'DM Mono',monospace;margin-top:8px}.risk-top strong.low,.risk-top strong.moderate{color:var(--green)}.risk-top strong.high{color:var(--orange)}.risk-top strong.critical{color:var(--red)}.risk-percent{font:54px 'DM Mono',monospace;letter-spacing:-.08em}.risk-gauge{height:8px;display:flex;margin-top:55px;position:relative;overflow:visible}.gauge-safe{width:70%;background:rgba(87,214,154,.42)}.gauge-watch{width:18%;background:rgba(242,205,99,.48)}.gauge-critical{width:12%;background:rgba(255,100,124,.45)}.gauge-marker{position:absolute;top:-5px;width:2px;height:18px;background:#fff;box-shadow:0 0 12px rgba(255,255,255,.65);transform:translateX(-50%)}.risk-scale{display:flex;justify-content:space-between;margin-top:10px;font:7px 'DM Mono',monospace;color:rgba(255,255,255,.23)}.risk-stats{display:grid;grid-template-columns:repeat(3,1fr);gap:15px;border-top:1px solid var(--line);padding-top:18px;margin-top:34px}.risk-stats span,.risk-stats strong{display:block}.risk-stats span{font:7px 'DM Mono',monospace;color:rgba(255,255,255,.23)}.risk-stats strong{font:11px 'DM Mono',monospace;font-weight:400;margin-top:6px;color:rgba(255,255,255,.65)}.peak-window{border-top:1px solid var(--line);margin-top:28px;padding-top:18px}.peak-window span,.peak-window strong{display:block}.peak-window span{font:7px 'DM Mono',monospace;color:rgba(255,255,255,.23)}.peak-window strong{font:12px 'DM Mono',monospace;font-weight:400;margin-top:6px}

/* NETWORK */
.network-stage{height:100vh;min-height:780px;position:relative;overflow:hidden;background:#050608}.network-inner{height:100%;position:relative;padding-top:125px}.network-copy{position:absolute;left:0;top:145px;z-index:6}.network-copy .story-copy{margin-top:25px}.network-map-large{position:absolute;left:22%;top:15%;width:59%;height:69%;border:1px solid var(--line);overflow:hidden;transform-style:preserve-3d;background:radial-gradient(circle at center,rgba(155,140,255,.08),transparent 28rem)}.map-grid{position:absolute;inset:0;background:linear-gradient(rgba(255,255,255,.025) 1px,transparent 1px),linear-gradient(90deg,rgba(255,255,255,.025) 1px,transparent 1px);background-size:52px 52px}.network-svg{position:absolute;inset:8%;width:84%;height:84%;overflow:visible}.network-svg line{stroke:rgba(155,140,255,.27);stroke-width:.18;stroke-dasharray:1 1.3}.flow{fill:var(--purple);filter:drop-shadow(0 0 3px var(--purple))}.flow-a{animation:flowV 2.7s linear infinite}.flow-b{animation:flowH 2.6s linear infinite}.flow-c{animation:flowH 2.5s linear infinite reverse}.flow-d{animation:flowV 2.9s linear infinite reverse}@keyframes flowV{from{transform:translateY(0)}to{transform:translateY(25px)}}@keyframes flowH{from{transform:translateX(-15px)}to{transform:translateX(15px)}}.map-caption{position:absolute;left:18px;top:17px;color:rgba(255,255,255,.26);font:7px 'DM Mono',monospace;display:flex;align-items:center;gap:7px}.map-node{position:absolute;transform:translate(-50%,-50%);border:0;background:none;color:white;display:flex;flex-direction:column;align-items:center;gap:7px;z-index:4}.node-core{width:13px;height:13px;border-radius:50%;background:#07080b;border:2px solid var(--purple);box-shadow:0 0 22px rgba(155,140,255,.6);position:relative}.node-ring{position:absolute;width:38px;height:38px;border-radius:50%;border:1px solid rgba(155,140,255,.22);animation:nodePulse 2.1s infinite}@keyframes nodePulse{0%,100%{transform:scale(.7);opacity:.8}50%{transform:scale(1.35);opacity:0}}.node-label{font:7px 'DM Mono',monospace;color:rgba(255,255,255,.34);letter-spacing:.1em}.map-node.selected .node-core{background:var(--purple);border-color:#fff}.map-node.high .node-core{border-color:var(--orange);box-shadow:0 0 25px rgba(242,166,90,.5)}.map-node.critical .node-core{border-color:var(--red);box-shadow:0 0 25px rgba(255,100,124,.6)}.map-node.moderate .node-core{border-color:var(--yellow)}.map-node.critical .node-label{color:var(--red)}.map-demo-alert{position:absolute;bottom:17px;left:18px;display:flex;align-items:center;gap:7px;color:var(--red);font:7px 'DM Mono',monospace}.zone-inspector{position:absolute;right:0;top:22%;width:29%;min-height:450px;padding:27px;z-index:7}.inspector-kicker{font:7px 'DM Mono',monospace;color:rgba(255,255,255,.24);letter-spacing:.12em}.zone-inspector h3{font-size:31px;letter-spacing:-.055em;font-weight:500;margin:11px 0}.zone-risk{display:inline-flex;padding:5px 8px;border:1px solid rgba(242,205,99,.25);font:7px 'DM Mono',monospace;color:var(--yellow)}.zone-risk.stable{color:var(--green);border-color:rgba(87,214,154,.25)}.zone-risk.high{color:var(--orange);border-color:rgba(242,166,90,.25)}.zone-risk.critical{color:var(--red);border-color:rgba(255,100,124,.25)}.zone-load{margin-top:43px}.zone-load strong{display:block;font:45px 'DM Mono',monospace;letter-spacing:-.08em}.zone-load small{font:8px 'DM Mono',monospace;color:rgba(255,255,255,.25)}.zone-util-bar{height:4px;background:rgba(255,255,255,.06);margin-top:20px}.zone-util-bar i{height:100%;display:block;background:linear-gradient(90deg,var(--purple),var(--red));transition:width .45s}.zone-util-meta{display:flex;justify-content:space-between;margin-top:8px;font:7px 'DM Mono',monospace;color:rgba(255,255,255,.22)}.zone-util-meta strong{font-weight:400;color:rgba(255,255,255,.6)}.zone-details-grid{display:grid;grid-template-columns:1fr 1fr;gap:16px;border-top:1px solid var(--line);padding-top:18px;margin-top:35px}.zone-details-grid span,.zone-details-grid strong{display:block;font:7px 'DM Mono',monospace}.zone-details-grid span{color:rgba(255,255,255,.2);margin-bottom:5px}.zone-details-grid strong{font-weight:400;color:rgba(255,255,255,.62)}.zone-action{border-top:1px solid var(--line);padding-top:18px;margin-top:24px}.zone-action span,.zone-action strong{display:block}.zone-action span{font:7px 'DM Mono',monospace;color:rgba(255,255,255,.22)}.zone-action strong{font-size:10px;font-weight:500;line-height:1.6;margin-top:6px;color:rgba(255,255,255,.68)}

/* WEATHER */
.weather-stage{min-height:95vh;padding:150px 0;background:#08090d}.weather-inner{display:grid;grid-template-columns:1fr .9fr;gap:100px;align-items:center}.weather-copy .story-copy{margin-top:30px}.correlation-line{margin-top:55px;display:flex;align-items:center;gap:12px;flex-wrap:wrap;color:rgba(255,255,255,.6);font:8px 'DM Mono',monospace}.correlation-line>div{display:flex;flex-direction:column;gap:5px}.correlation-line i{height:2px;width:75px;background:linear-gradient(90deg,rgba(155,140,255,.15),var(--orange))}.correlation-line strong{font-weight:400;color:rgba(255,255,255,.7)}.weather-visual{display:grid;gap:16px}.temperature-focus{padding:30px;background:radial-gradient(circle at 78% 22%,rgba(242,166,90,.12),transparent 13rem),rgba(255,255,255,.018)}.temperature-label{display:flex;align-items:center;gap:7px;font:8px 'DM Mono',monospace;color:rgba(255,255,255,.28);letter-spacing:.1em}.temperature-focus>strong{display:block;font:78px 'DM Mono',monospace;letter-spacing:-.09em;margin-top:22px}.temperature-focus>strong small{font-size:15px;color:rgba(255,255,255,.25)}.temperature-focus>span{font:8px 'DM Mono',monospace;color:var(--orange)}.temp-wave{height:55px;display:flex;align-items:flex-end;gap:6px;margin-top:22px}.temp-wave i{display:block;flex:1;background:linear-gradient(to top,rgba(242,166,90,.06),rgba(242,166,90,.45));animation:heatWave 1.4s ease-in-out infinite alternate}.temp-wave i:nth-child(2){height:46%}.temp-wave i:nth-child(3){height:62%}.temp-wave i:nth-child(4){height:80%}.temp-wave i:nth-child(5){height:100%}.temp-wave i:nth-child(6){height:74%}.temp-wave i:nth-child(7){height:88%}.temp-wave i:nth-child(8){height:64%}.temp-wave i:nth-child(1){height:35%}@keyframes heatWave{from{transform:scaleY(.85);opacity:.5}to{transform:scaleY(1);opacity:1}}.weather-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:12px}.weather-factor{padding:18px}.weather-factor span{font:7px 'DM Mono',monospace;color:rgba(255,255,255,.25);display:block}.weather-factor strong{display:block;font:23px 'DM Mono',monospace;letter-spacing:-.06em;margin-top:9px}.weather-factor strong small{font-size:8px;color:rgba(255,255,255,.25)}.weather-factor em{display:block;font:7px 'DM Mono',monospace;color:var(--green);font-style:normal;margin-top:6px}

/* ANALYTICS */
.analytics-stage{min-height:95vh;padding:150px 0;background:#050608}.analytics-title-row{display:grid;grid-template-columns:1fr .65fr;gap:70px;align-items:end}.analytics-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:14px;margin-top:75px}.analytics-metric{padding:24px;min-height:145px}.analytics-metric span{display:block;font:8px 'DM Mono',monospace;color:rgba(255,255,255,.24);letter-spacing:.1em}.analytics-metric strong{display:block;font:48px 'DM Mono',monospace;letter-spacing:-.08em;margin-top:17px}.analytics-metric em{font:7px 'DM Mono',monospace;color:rgba(255,255,255,.24);font-style:normal}.confidence-panel{padding:24px;grid-column:span 2}.confidence-top{display:flex;justify-content:space-between;font:9px 'DM Mono',monospace;color:rgba(255,255,255,.28)}.confidence-top strong{font-weight:400;color:var(--green)}.confidence-bar{height:5px;background:rgba(255,255,255,.06);margin-top:20px}.confidence-bar i{display:block;height:100%;background:linear-gradient(90deg,var(--purple),var(--green))}.confidence-panel p{font-size:11px;line-height:1.7;color:var(--muted);max-width:580px}.validation-chart{padding:22px;grid-column:span 3}.validation-head{display:flex;justify-content:space-between}.validation-head span{font:8px 'DM Mono',monospace;color:rgba(255,255,255,.28)}.validation-head small{font-size:9px;color:rgba(255,255,255,.2)}.validation-chart-inner{height:270px;margin-top:10px}

/* ALERTS */
.response-stage{min-height:100vh;padding:150px 0;background:#050608}.response-header{display:grid;grid-template-columns:1fr .65fr;gap:80px;align-items:end}.response-header .story-copy{margin-bottom:7px}.alert-filters{display:flex;align-items:center;gap:6px;margin-top:75px}.alert-filters button{padding:7px 10px;border:1px solid rgba(255,255,255,.07);background:rgba(255,255,255,.018);color:rgba(255,255,255,.31);font:8px 'DM Mono',monospace}.alert-filters button.selected{border-color:rgba(155,140,255,.4);background:rgba(155,140,255,.08);color:#fff}.alert-mode-label{margin-left:auto;font:7px 'DM Mono',monospace;color:rgba(255,255,255,.2)}.alerts-list{border-top:1px solid var(--line);margin-top:15px}.alert-row{min-height:130px;display:grid;grid-template-columns:35px 80px 1.2fr .36fr .45fr 15px;gap:15px;align-items:center;border-bottom:1px solid var(--line);transition:background .25s,padding .3s}.alert-row:hover{background:rgba(255,255,255,.018);padding:0 15px}.alert-number{font:8px 'DM Mono',monospace;color:rgba(255,255,255,.16)}.alert-badge{font:8px 'DM Mono',monospace;letter-spacing:.1em}.alert-row.critical .alert-badge{color:var(--red)}.alert-row.warning .alert-badge{color:var(--orange)}.alert-row.advisory .alert-badge{color:var(--yellow)}.alert-row.resolved .alert-badge{color:var(--green)}.alert-main span,.alert-main strong,.alert-main p{display:block}.alert-main span{font:7px 'DM Mono',monospace;color:rgba(255,255,255,.22)}.alert-main strong{font-size:13px;font-weight:500;margin-top:7px}.alert-main p{font-size:10px;color:rgba(255,255,255,.33);margin:6px 0 0;line-height:1.5}.alert-impact span,.alert-impact strong,.alert-action span,.alert-action strong{display:block}.alert-impact span,.alert-action span{font:7px 'DM Mono',monospace;color:rgba(255,255,255,.2);margin-bottom:6px}.alert-impact strong,.alert-action strong{font:9px 'DM Mono',monospace;font-weight:400;color:rgba(255,255,255,.55)}.alert-status{display:flex;align-items:center;gap:6px;font:7px 'DM Mono',monospace;color:rgba(255,255,255,.28)}.alert-arrow{color:rgba(255,255,255,.2)}.dispatch-directive{display:flex;align-items:center;gap:16px;padding:22px;margin-top:45px}.directive-icon{width:42px;height:42px;display:grid;place-items:center;border:1px solid rgba(155,140,255,.25);color:var(--purple)}.dispatch-directive span,.dispatch-directive strong{display:block}.dispatch-directive span{font:7px 'DM Mono',monospace;color:var(--purple);letter-spacing:.1em}.dispatch-directive strong{font-size:12px;font-weight:500;margin-top:7px;line-height:1.6}.dispatch-directive button{margin-left:auto;border:0;background:#fff;color:#08090b;padding:11px 13px;font:8px 'DM Mono',monospace;display:flex;align-items:center;gap:7px}

.footer{padding:70px 0 30px;border-top:1px solid var(--line);background:#030405}.footer-inner{display:flex;align-items:flex-start;justify-content:space-between}.footer-brand{font-size:19px}.footer-inner p{color:rgba(255,255,255,.27);font-size:11px;line-height:1.7}.footer-status{display:flex;align-items:center;gap:7px;font:7px 'DM Mono',monospace;color:rgba(255,255,255,.24)}

.demo-mode .hero-halo{background:radial-gradient(circle,rgba(255,100,124,.10),transparent 67%)}
.demo-mode .risk-panel{border-color:rgba(255,100,124,.2)}

@media(max-width:1000px){
  .nav{padding:0 18px}.nav-links,.nav-time{display:none}.menu-button{display:block}.nav-actions{gap:10px}.mobile-menu{display:flex;position:fixed;z-index:95;top:72px;left:0;right:0;flex-direction:column;background:rgba(5,6,8,.97);backdrop-filter:blur(20px);padding:12px;transform:translateY(-120%);transition:transform .35s;border-bottom:1px solid var(--line)}.mobile-menu.open{transform:translateY(0)}.mobile-menu a{padding:15px;border-bottom:1px solid rgba(255,255,255,.05);font-size:17px}
  .container{width:min(100% - 30px,1260px)}.hero-section,.forecast-stage,.intelligence-stage,.network-stage{min-height:760px}.hero-title{font-size:clamp(56px,14vw,100px)}.hero-metrics{grid-template-columns:repeat(2,1fr);gap:20px}.hero-chart{height:180px}.forecast-chart-shell{left:8%;top:28%;height:52%}.forecast-title{top:165px}.forecast-main-number{bottom:65px}.intel-grid{position:absolute;left:15px;right:15px;grid-template-columns:1fr;bottom:25px}.intel-model,.intel-features{min-height:0}.intel-model{padding:20px}.risk-layout,.weather-inner,.analytics-title-row,.response-header{grid-template-columns:1fr;gap:45px}.network-map-large{left:4%;width:92%;height:52%;top:27%}.network-copy{top:125px}.zone-inspector{left:4%;right:4%;width:auto;top:auto;bottom:16px;min-height:210px;padding:20px}.weather-grid{grid-template-columns:repeat(3,1fr)}.analytics-grid{grid-template-columns:1fr 1fr}.confidence-panel{grid-column:span 2}.validation-chart{grid-column:span 2}.alert-row{grid-template-columns:26px 65px 1fr 20px}.alert-impact,.alert-action,.alert-status{display:none}.alert-mode-label{display:none}.dispatch-directive{flex-wrap:wrap}.dispatch-directive button{margin-left:58px}
}

@media(max-width:650px){
  .hero-actions-block{flex-wrap:wrap}.hero-chart-shell{margin-top:55px}.hero-metrics{grid-template-columns:1fr 1fr}.metric-value-row strong{font-size:18px}.display-title{font-size:56px}.forecast-inner{padding-top:120px}.forecast-title{top:155px}.forecast-chart-shell{left:0;right:0;top:30%;height:50%;padding:15px}.forecast-legend{display:none}.forecast-main-number{bottom:26px}.forecast-main-number strong{font-size:44px}.forecast-end-copy{bottom:18px}.intel-grid{bottom:10px}.intel-headline{margin-top:25px;font-size:55px}.risk-stage,.weather-stage,.analytics-stage,.response-stage{padding:120px 0}.risk-percent{font-size:45px}.risk-stats{grid-template-columns:1fr}.weather-grid{grid-template-columns:1fr}.temperature-focus>strong{font-size:65px}.analytics-grid{grid-template-columns:1fr}.confidence-panel,.validation-chart{grid-column:span 1}.validation-chart-inner{height:220px}.alert-filters{flex-wrap:wrap}.footer-inner{flex-direction:column;gap:20px}.nav{height:66px}.mobile-menu{top:66px}
}

@media(prefers-reduced-motion:reduce){*,*:before,*:after{scroll-behavior:auto!important;animation:none!important;transition:none!important}.reveal{opacity:1;transform:none}}
`;
