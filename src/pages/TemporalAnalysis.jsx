import { useState, useCallback, useContext, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import Layout from "../components/Layout";
import { ThemeContext } from "../context/ThemeContext";

// ─────────────────────────────────────────────────────────────
// PLOTLY — lazy loaded
// Install: npm install react-plotly.js plotly.js-dist-min
// ─────────────────────────────────────────────────────────────
let Plot = null;
try { Plot = (await import("react-plotly.js")).default; } catch (_) {}

// ─────────────────────────────────────────────────────────────
// CONFIG — backend-compatible
// Replace with: GET /api/variables  GET /api/locations/presets
// ─────────────────────────────────────────────────────────────
const VARIABLES = [
  { id: "temperature",   label: "Surface Temp",   unit: "°C",     icon: "🌡", color: "#D4870A" },
  { id: "precipitation", label: "Precipitation",  unit: "mm/day", icon: "🌧", color: "#5B8FA8" },
  { id: "wind_speed",    label: "Wind Speed",     unit: "m/s",    icon: "💨", color: "#7D9B6B" },
  { id: "humidity",      label: "Rel. Humidity",  unit: "%",      icon: "💧", color: "#9B6B9B" },
];

const ANALYSIS_MODES = [
  { id: "raw",     label: "Raw Signal"   },
  { id: "anomaly", label: "Anomaly"      },
  { id: "trend",   label: "Trend + Raw" },
  { id: "rolling", label: "10-yr Rolling"},
];

const PRESET_LOCATIONS = [
  { label: "New Delhi",   lat: 28.6,  lon: 77.2,  color: "#D4870A" },
  { label: "Amazon",      lat: -3.4,  lon: -62.2, color: "#7D9B6B" },
  { label: "Arctic",      lat: 78.2,  lon: 15.6,  color: "#5B8FA8" },
  { label: "Sahara",      lat: 23.4,  lon: 12.0,  color: "#C0524A" },
  { label: "Antarctica",  lat: -75.0, lon: 0.0,   color: "#9B6B9B" },
];

const YEAR_MIN = 1950;
const YEAR_MAX = 2024;

// ─────────────────────────────────────────────────────────────
// MOCK DATA — replace with GET /api/timeseries?variable=&lat=&lon=&yearMin=&yearMax=
// ─────────────────────────────────────────────────────────────
const generateSeries = (variableId, lat, lon, yearMin, yearMax) => {
  const years  = [];
  const values = [];
  const baseMap = { temperature: 14.5 + lat * 0.2, precipitation: 3.2, wind_speed: 6.5, humidity: 65 };
  let val = baseMap[variableId] ?? 10;
  const trend = variableId === "temperature" ? 0.019 : variableId === "precipitation" ? -0.005 : 0.003;

  for (let y = yearMin; y <= yearMax; y++) {
    val += trend + (Math.random() - 0.48) * 0.18;
    years.push(y);
    values.push(parseFloat((val + Math.sin(y * 0.25) * 0.55 + (lon / 180) * 0.3).toFixed(3)));
  }

  // Compute 10-yr rolling mean
  const rolling = values.map((_, i) => {
    const window = values.slice(Math.max(0, i - 4), i + 5);
    return parseFloat((window.reduce((a, b) => a + b, 0) / window.length).toFixed(3));
  });

  // Baseline mean (1981–2010)
  const baselineYears = years.filter(y => y >= 1981 && y <= 2010);
  const baselineVals  = values.filter((_, i) => years[i] >= 1981 && years[i] <= 2010);
  const baselineMean  = baselineVals.length
    ? parseFloat((baselineVals.reduce((a, b) => a + b, 0) / baselineVals.length).toFixed(3))
    : values[0];

  const anomaly = values.map(v => parseFloat((v - baselineMean).toFixed(3)));

  // Linear trend line
  const n  = values.length;
  const sx = years.reduce((a, b) => a + b, 0);
  const sy = values.reduce((a, b) => a + b, 0);
  const sxy = years.reduce((a, y, i) => a + y * values[i], 0);
  const sx2 = years.reduce((a, y) => a + y * y, 0);
  const slope = (n * sxy - sx * sy) / (n * sx2 - sx * sx);
  const intercept = (sy - slope * sx) / n;
  const trendLine = years.map(y => parseFloat((slope * y + intercept).toFixed(3)));

  return {
    years, values, rolling, anomaly, trendLine,
    stats: {
      mean:      parseFloat((values.reduce((a,b) => a+b,0)/values.length).toFixed(3)),
      min:       parseFloat(Math.min(...values).toFixed(3)),
      max:       parseFloat(Math.max(...values).toFixed(3)),
      trend:     parseFloat((slope * 10).toFixed(4)), // per decade
      baselineMean,
      lastValue: values[values.length - 1],
    }
  };
};

// ─────────────────────────────────────────────────────────────
// SMALL COMPONENTS
// ─────────────────────────────────────────────────────────────
const ModeChip = ({ label, active, onClick }) => (
  <button onClick={onClick} style={{
    padding: "5px 12px", borderRadius: 20,
    border: `1px solid ${active ? "rgba(212,135,10,0.45)" : "var(--border-default)"}`,
    background: active ? "var(--accent-amber-soft)" : "var(--bg-input)",
    color: active ? "var(--accent-amber)" : "var(--text-tertiary)",
    fontSize: 11.5, fontWeight: active ? 500 : 400,
    cursor: "pointer", fontFamily: "'DM Sans', sans-serif",
    transition: "all 0.15s ease", whiteSpace: "nowrap",
  }}>
    {label}
  </button>
);

const StatPill = ({ label, value, unit, color }) => (
  <div style={{
    padding: "12px 16px",
    background: "var(--bg-surface)",
    border: "1px solid var(--border-subtle)",
    borderRadius: "var(--radius-md)",
    borderLeft: `3px solid ${color}`,
  }}>
    <p style={{ fontSize: 10, fontWeight: 500, letterSpacing: "0.08em", textTransform: "uppercase", color: "var(--text-tertiary)", margin: "0 0 5px" }}>
      {label}
    </p>
    <div style={{ display: "flex", alignItems: "baseline", gap: 4 }}>
      <span style={{ fontFamily: "'Playfair Display', serif", fontSize: 18, fontWeight: 700, color: "var(--text-primary)" }}>
        {value}
      </span>
      <span style={{ fontSize: 11, color, fontWeight: 500 }}>{unit}</span>
    </div>
  </div>
);

// ─────────────────────────────────────────────────────────────
// LOCATION PIN ROW
// ─────────────────────────────────────────────────────────────
const LocationPin = ({ pin, index, onRemove, isActive, onClick }) => (
  <motion.div
    initial={{ opacity: 0, x: -10 }}
    animate={{ opacity: 1, x: 0 }}
    exit={{ opacity: 0, x: -10 }}
    transition={{ duration: 0.2 }}
    onClick={onClick}
    style={{
      display: "flex", alignItems: "center", gap: 10,
      padding: "9px 12px",
      borderRadius: "var(--radius-md)",
      border: `1px solid ${isActive ? pin.color + "55" : "var(--border-subtle)"}`,
      background: isActive ? pin.color + "11" : "var(--bg-input)",
      cursor: "pointer", transition: "all 0.18s ease",
    }}
  >
    <span style={{ width: 8, height: 8, borderRadius: "50%", background: pin.color, flexShrink: 0, boxShadow: `0 0 5px ${pin.color}66` }} />
    <div style={{ flex: 1, minWidth: 0 }}>
      <p style={{ fontSize: 12, fontWeight: 500, color: "var(--text-primary)", margin: 0, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
        {pin.label || `Pin ${index + 1}`}
      </p>
      <p style={{ fontSize: 10.5, color: "var(--text-tertiary)", margin: 0 }}>
        {pin.lat}°N · {pin.lon}°E
      </p>
    </div>
    <button
      onClick={(e) => { e.stopPropagation(); onRemove(); }}
      style={{
        width: 20, height: 20, borderRadius: 6,
        border: "1px solid var(--border-subtle)",
        background: "transparent",
        color: "var(--text-tertiary)",
        cursor: "pointer", fontSize: 11,
        display: "flex", alignItems: "center", justifyContent: "center",
        transition: "all 0.15s",
      }}
      onMouseEnter={e => { e.currentTarget.style.borderColor = "#C0524A"; e.currentTarget.style.color = "#C0524A"; }}
      onMouseLeave={e => { e.currentTarget.style.borderColor = "var(--border-subtle)"; e.currentTarget.style.color = "var(--text-tertiary)"; }}
    >
      ✕
    </button>
  </motion.div>
);

// ─────────────────────────────────────────────────────────────
// TEMPORAL ANALYSIS PAGE
// ─────────────────────────────────────────────────────────────
const TemporalAnalysis = () => {
  const { theme } = useContext(ThemeContext);
  const isDark = theme === "dark";

  // ── State ──
  const [activeVar, setActiveVar]   = useState(VARIABLES[0]);
  const [yearMin, setYearMin]       = useState(1970);
  const [yearMax, setYearMax]       = useState(2023);
  const [analysisMode, setMode]     = useState("trend");
  const [pins, setPins]             = useState([PRESET_LOCATIONS[0]]);
  const [activePin, setActivePin]   = useState(0);
  const [seriesMap, setSeriesMap]   = useState({});
  const [isLoading, setIsLoading]   = useState(false);

  // ── Lat/lon input for new pin ──
  const [inputLat, setInputLat] = useState("");
  const [inputLon, setInputLon] = useState("");
  const [inputLabel, setInputLabel] = useState("");

  // ── Load series for a pin ──
  // Backend: GET /api/timeseries?variable=&lat=&lon=&yearMin=&yearMax=
  const loadSeries = useCallback(async (pin, varId, yMin, yMax) => {
    const key = `${pin.lat}_${pin.lon}_${varId}_${yMin}_${yMax}`;
    setIsLoading(true);
    try {
      await new Promise(r => setTimeout(r, 600)); // ← swap with real fetch
      // const res  = await fetch(`/api/timeseries?variable=${varId}&lat=${pin.lat}&lon=${pin.lon}&yearMin=${yMin}&yearMax=${yMax}`);
      // const data = await res.json();
      const data = generateSeries(varId, pin.lat, pin.lon, yMin, yMax);
      setSeriesMap(prev => ({ ...prev, [key]: data }));
    } catch (err) {
      console.error("TemporalAnalysis: fetch failed", err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // ── Load all pins on var/year change ──
  useEffect(() => {
    pins.forEach(pin => loadSeries(pin, activeVar.id, yearMin, yearMax));
  }, [activeVar.id, yearMin, yearMax, pins.length]);

  // ── Add new pin ──
  const addPin = () => {
    const lat = parseFloat(inputLat);
    const lon = parseFloat(inputLon);
    if (isNaN(lat) || isNaN(lon)) return;
    if (lat < -90 || lat > 90 || lon < -180 || lon > 180) return;
    const colors = ["#D4870A", "#5B8FA8", "#7D9B6B", "#C0524A", "#9B6B9B", "#4A8B8B"];
    const newPin = { lat, lon, label: inputLabel || `${lat}°N, ${lon}°E`, color: colors[pins.length % colors.length] };
    setPins(prev => [...prev, newPin]);
    loadSeries(newPin, activeVar.id, yearMin, yearMax);
    setActivePin(pins.length);
    setInputLat(""); setInputLon(""); setInputLabel("");
  };

  // ── Get series for a pin ──
  const getKey  = (pin) => `${pin.lat}_${pin.lon}_${activeVar.id}_${yearMin}_${yearMax}`;
  const getSeries = (pin) => seriesMap[getKey(pin)];

  // ── Active pin series ──
  const activeSeries = pins[activePin] ? getSeries(pins[activePin]) : null;
  const activeStats  = activeSeries?.stats;

  // ── Build Plotly traces ──
  const buildTraces = () => {
    const traces = [];
    pins.forEach((pin, i) => {
      const s = getSeries(pin);
      if (!s) return;
      const name = pin.label || `Pin ${i+1}`;

      if (analysisMode === "raw" || analysisMode === "trend") {
        traces.push({
          type: "scatter", mode: "lines",
          x: s.years, y: s.values,
          name,
          line: { color: pin.color, width: i === activePin ? 2 : 1.2, shape: "spline", smoothing: 0.6 },
          opacity: i === activePin ? 1 : 0.45,
          hovertemplate: `${name}: %{y:.2f} ${activeVar.unit}<br>%{x}<extra></extra>`,
        });
      }
      if (analysisMode === "trend" && i === activePin) {
        traces.push({
          type: "scatter", mode: "lines",
          x: s.years, y: s.trendLine,
          name: "Linear trend",
          line: { color: pin.color, width: 1.5, dash: "dot" },
          opacity: 0.7,
          showlegend: true,
          hovertemplate: `Trend: %{y:.2f}<extra></extra>`,
        });
      }
      if (analysisMode === "anomaly") {
        traces.push({
          type: "bar",
          x: s.years, y: s.anomaly,
          name,
          marker: {
            color: s.anomaly.map(v => v >= 0
              ? (isDark ? "rgba(192,82,74,0.75)" : "rgba(192,82,74,0.7)")
              : (isDark ? "rgba(91,143,168,0.75)" : "rgba(91,143,168,0.7)")
            ),
            line: { width: 0 },
          },
          hovertemplate: `Anomaly: %{y:+.3f} ${activeVar.unit}<br>%{x}<extra></extra>`,
        });
      }
      if (analysisMode === "rolling") {
        traces.push({
          type: "scatter", mode: "lines",
          x: s.years, y: s.values,
          name: `${name} (raw)`,
          line: { color: pin.color, width: 0.8 },
          opacity: 0.25,
          showlegend: false,
          hoverinfo: "skip",
        });
        traces.push({
          type: "scatter", mode: "lines",
          x: s.years, y: s.rolling,
          name: `${name} (10-yr)`,
          line: { color: pin.color, width: 2.5, shape: "spline", smoothing: 0.8 },
          hovertemplate: `${name} 10-yr: %{y:.2f} ${activeVar.unit}<br>%{x}<extra></extra>`,
        });
      }
    });
    return traces;
  };

  const chartLayout = {
    paper_bgcolor: "transparent",
    plot_bgcolor: "transparent",
    height: 380,
    margin: { t: 12, r: 20, b: 44, l: 52 },
    legend: {
      font: { size: 11, color: isDark ? "#9A8060" : "#6B5040", family: "DM Sans" },
      bgcolor: "transparent",
      borderwidth: 0,
      orientation: "h",
      x: 0, y: -0.18,
    },
    xaxis: {
      tickfont: { size: 10, color: isDark ? "#9A8060" : "#6B5040", family: "DM Sans" },
      gridcolor: isDark ? "rgba(201,169,122,0.07)" : "rgba(44,26,14,0.07)",
      zerolinecolor: "transparent",
      title: { text: "Year", font: { size: 11, color: isDark ? "#9A8060" : "#6B5040", family: "DM Sans" } },
    },
    yaxis: {
      tickfont: { size: 10, color: isDark ? "#9A8060" : "#6B5040", family: "DM Sans" },
      gridcolor: isDark ? "rgba(201,169,122,0.07)" : "rgba(44,26,14,0.07)",
      zerolinecolor: isDark ? "rgba(201,169,122,0.15)" : "rgba(44,26,14,0.15)",
      title: { text: activeVar.unit, font: { size: 11, color: isDark ? "#9A8060" : "#6B5040", family: "DM Sans" } },
    },
    hovermode: "x unified",
    hoverlabel: {
      bgcolor: isDark ? "#231508" : "#FFF8EE",
      bordercolor: isDark ? "rgba(201,169,122,0.3)" : "rgba(44,26,14,0.2)",
      font: { size: 11, color: isDark ? "#E8D5B0" : "#1E1009", family: "DM Sans" },
    },
    shapes: analysisMode === "anomaly" ? [{
      type: "line",
      x0: yearMin, x1: yearMax, y0: 0, y1: 0,
      line: { color: isDark ? "rgba(201,169,122,0.3)" : "rgba(44,26,14,0.25)", width: 1, dash: "dot" },
    }] : [],
  };

  return (
    <Layout>
      <style>{`
        .input-field {
          width: 100%;
          padding: 8px 12px;
          font-family: 'DM Sans', sans-serif;
          font-size: 13px;
          background: var(--bg-input);
          border: 1px solid var(--border-default);
          border-radius: var(--radius-md);
          color: var(--text-primary);
          outline: none;
          transition: border-color 0.18s, box-shadow 0.18s;
        }
        .input-field:focus {
          border-color: var(--border-focus);
          box-shadow: 0 0 0 3px var(--accent-amber-soft);
        }
        .input-field::placeholder { color: var(--text-disabled); }
        .temporal-grid {
          display: grid;
          grid-template-columns: 300px 1fr;
          gap: 20px;
          align-items: start;
        }
        @media (max-width: 900px) {
          .temporal-grid { grid-template-columns: 1fr; }
        }
      `}</style>

      {/* ── PAGE HEADER ── */}
      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} style={{ marginBottom: 24 }}>
        <h1 style={{ fontFamily: "'Playfair Display', serif", fontSize: "clamp(1.5rem,3vw,2rem)", fontWeight: 700, color: "var(--text-primary)", margin: "0 0 4px" }}>
          Temporal Analysis
        </h1>
        <p style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 13, color: "var(--text-tertiary)", margin: 0 }}>
          {activeVar.label} · {yearMin}–{yearMax} · {pins.length} location{pins.length !== 1 ? "s" : ""} pinned
        </p>
      </motion.div>

      <div className="temporal-grid">

        {/* ── LEFT PANEL ── */}
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>

          {/* Variable selector */}
          <motion.div initial={{ opacity: 0, x: -12 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.06 }}
            style={{ background: "var(--bg-surface)", border: "1px solid var(--border-subtle)", borderRadius: "var(--radius-lg)", overflow: "hidden" }}>
            <div style={{ padding: "14px 16px", borderBottom: "1px solid var(--border-subtle)", background: "linear-gradient(135deg,rgba(74,92,58,0.06),rgba(212,135,10,0.04))" }}>
              <h3 style={{ fontFamily: "'Playfair Display', serif", fontSize: 13, fontWeight: 600, color: "var(--text-primary)", margin: 0 }}>Variable</h3>
            </div>
            <div style={{ padding: "12px", display: "flex", flexDirection: "column", gap: 6 }}>
              {VARIABLES.map(v => (
                <button key={v.id} onClick={() => setActiveVar(v)} style={{
                  display: "flex", alignItems: "center", gap: 9,
                  padding: "8px 12px", borderRadius: "var(--radius-md)",
                  border: `1px solid ${activeVar.id === v.id ? v.color + "55" : "transparent"}`,
                  background: activeVar.id === v.id ? v.color + "11" : "transparent",
                  cursor: "pointer", transition: "all 0.15s", textAlign: "left",
                }}
                onMouseEnter={e => { if (activeVar.id !== v.id) e.currentTarget.style.background = "var(--bg-hover)"; }}
                onMouseLeave={e => { if (activeVar.id !== v.id) e.currentTarget.style.background = "transparent"; }}
                >
                  <span style={{ fontSize: 15 }}>{v.icon}</span>
                  <span style={{ fontSize: 13, color: "var(--text-primary)", flex: 1 }}>{v.label}</span>
                  <span style={{ fontSize: 10.5, color: v.color, background: v.color + "18", padding: "1px 6px", borderRadius: 10, fontWeight: 500 }}>{v.unit}</span>
                  {activeVar.id === v.id && (
                    <svg viewBox="0 0 16 16" fill="none" width="11" height="11" style={{ color: v.color, flexShrink: 0 }}>
                      <path d="M3 8l4 4 6-7" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                  )}
                </button>
              ))}
            </div>
          </motion.div>

          {/* Year range */}
          <motion.div initial={{ opacity: 0, x: -12 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.1 }}
            style={{ background: "var(--bg-surface)", border: "1px solid var(--border-subtle)", borderRadius: "var(--radius-lg)", overflow: "hidden" }}>
            <div style={{ padding: "14px 16px", borderBottom: "1px solid var(--border-subtle)", background: "linear-gradient(135deg,rgba(74,92,58,0.06),rgba(212,135,10,0.04))" }}>
              <h3 style={{ fontFamily: "'Playfair Display', serif", fontSize: 13, fontWeight: 600, color: "var(--text-primary)", margin: 0 }}>Year Range</h3>
            </div>
            <div style={{ padding: "14px 16px", display: "flex", flexDirection: "column", gap: 12 }}>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                {[["From", yearMin, setYearMin], ["To", yearMax, setYearMax]].map(([lbl, val, setter]) => (
                  <div key={lbl}>
                    <label style={{ fontSize: 10.5, fontWeight: 500, letterSpacing: "0.07em", textTransform: "uppercase", color: "var(--text-tertiary)", display: "block", marginBottom: 5 }}>{lbl}</label>
                    <input type="number" className="input-field" value={val} min={YEAR_MIN} max={YEAR_MAX}
                      onChange={e => setter(Math.min(Math.max(parseInt(e.target.value) || YEAR_MIN, YEAR_MIN), YEAR_MAX))} />
                  </div>
                ))}
              </div>
              <div style={{ height: 1, background: "var(--border-subtle)" }} />
              <div style={{ display: "flex", justifyContent: "center" }}>
                <span style={{ fontSize: 11, color: "var(--accent-amber)", fontStyle: "italic" }}>
                  {yearMax - yearMin} year span
                </span>
              </div>
            </div>
          </motion.div>

          {/* Location pins */}
          <motion.div initial={{ opacity: 0, x: -12 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.14 }}
            style={{ background: "var(--bg-surface)", border: "1px solid var(--border-subtle)", borderRadius: "var(--radius-lg)", overflow: "hidden" }}>
            <div style={{ padding: "14px 16px", borderBottom: "1px solid var(--border-subtle)", display: "flex", alignItems: "center", justifyContent: "space-between", background: "linear-gradient(135deg,rgba(74,92,58,0.06),rgba(212,135,10,0.04))" }}>
              <h3 style={{ fontFamily: "'Playfair Display', serif", fontSize: 13, fontWeight: 600, color: "var(--text-primary)", margin: 0 }}>Locations</h3>
              <span style={{ fontSize: 10.5, color: "var(--text-tertiary)", background: "var(--bg-hover)", padding: "2px 8px", borderRadius: 12 }}>
                {pins.length} / 5 pins
              </span>
            </div>
            <div style={{ padding: "12px", display: "flex", flexDirection: "column", gap: 6 }}>
              <AnimatePresence>
                {pins.map((pin, i) => (
                  <LocationPin key={`${pin.lat}_${pin.lon}`} pin={pin} index={i}
                    isActive={i === activePin} onClick={() => setActivePin(i)}
                    onRemove={() => { setPins(p => p.filter((_, j) => j !== i)); setActivePin(0); }} />
                ))}
              </AnimatePresence>

              {/* Quick presets */}
              <div style={{ marginTop: 4 }}>
                <p style={{ fontSize: 10, color: "var(--text-tertiary)", textTransform: "uppercase", letterSpacing: "0.07em", fontWeight: 500, margin: "0 0 6px" }}>Quick add</p>
                <div style={{ display: "flex", gap: 5, flexWrap: "wrap" }}>
                  {PRESET_LOCATIONS.filter(p => !pins.find(pin => pin.lat === p.lat && pin.lon === p.lon)).slice(0, 4).map(p => (
                    <button key={p.label} onClick={() => { if (pins.length >= 5) return; setPins(prev => [...prev, p]); loadSeries(p, activeVar.id, yearMin, yearMax); }}
                      style={{ fontSize: 10.5, padding: "3px 9px", borderRadius: 14, border: "1px solid var(--border-default)", background: "var(--bg-input)", color: "var(--text-secondary)", cursor: "pointer", fontFamily: "'DM Sans',sans-serif", transition: "all 0.15s" }}
                      onMouseEnter={e => { e.currentTarget.style.borderColor = p.color; e.currentTarget.style.color = p.color; }}
                      onMouseLeave={e => { e.currentTarget.style.borderColor = "var(--border-default)"; e.currentTarget.style.color = "var(--text-secondary)"; }}
                    >+ {p.label}</button>
                  ))}
                </div>
              </div>

              {/* Custom pin input */}
              {pins.length < 5 && (
                <div style={{ marginTop: 8, padding: "12px", background: "var(--bg-input)", borderRadius: "var(--radius-md)", border: "1px solid var(--border-subtle)" }}>
                  <p style={{ fontSize: 10, color: "var(--text-tertiary)", textTransform: "uppercase", letterSpacing: "0.07em", fontWeight: 500, margin: "0 0 8px" }}>Custom location</p>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 6, marginBottom: 6 }}>
                    <input className="input-field" type="number" placeholder="Latitude" value={inputLat} onChange={e => setInputLat(e.target.value)} style={{ padding: "6px 10px", fontSize: 12 }} />
                    <input className="input-field" type="number" placeholder="Longitude" value={inputLon} onChange={e => setInputLon(e.target.value)} style={{ padding: "6px 10px", fontSize: 12 }} />
                  </div>
                  <input className="input-field" placeholder="Label (optional)" value={inputLabel} onChange={e => setInputLabel(e.target.value)} style={{ padding: "6px 10px", fontSize: 12, marginBottom: 8 }} />
                  <button onClick={addPin} style={{
                    width: "100%", padding: "7px", borderRadius: "var(--radius-md)",
                    border: "1px solid rgba(212,135,10,0.35)",
                    background: "var(--accent-amber-soft)",
                    color: "var(--accent-amber)", fontSize: 12, fontWeight: 500,
                    cursor: "pointer", fontFamily: "'DM Sans',sans-serif",
                  }}>
                    + Add Pin
                  </button>
                </div>
              )}
            </div>
          </motion.div>
        </div>

        {/* ── RIGHT PANEL ── */}
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>

          {/* Chart card */}
          <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}
            style={{ background: "var(--bg-surface)", border: "1px solid var(--border-subtle)", borderRadius: "var(--radius-lg)", overflow: "hidden", boxShadow: "var(--shadow-sm)" }}>
            <div style={{ padding: "14px 20px 12px", borderBottom: "1px solid var(--border-subtle)", display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 10, background: "linear-gradient(135deg,rgba(74,92,58,0.06),rgba(212,135,10,0.04))" }}>
              <div>
                <h3 style={{ fontFamily: "'Playfair Display', serif", fontSize: 14, fontWeight: 600, color: "var(--text-primary)", margin: 0 }}>
                  {activeVar.label} Time Series
                </h3>
                <p style={{ fontSize: 11, color: "var(--text-tertiary)", margin: "2px 0 0" }}>
                  {yearMin}–{yearMax} · {pins.length} location{pins.length > 1 ? "s" : ""}
                </p>
              </div>
              <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                {ANALYSIS_MODES.map(m => (
                  <ModeChip key={m.id} label={m.label} active={analysisMode === m.id} onClick={() => setMode(m.id)} />
                ))}
              </div>
            </div>

            <div style={{ padding: "12px 16px 16px", minHeight: 400 }}>
              <AnimatePresence mode="wait">
                {isLoading ? (
                  <motion.div key="loading" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                    style={{ height: 380, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 14 }}>
                    <motion.div animate={{ rotate: 360 }} transition={{ duration: 1.4, repeat: Infinity, ease: "linear" }}
                      style={{ width: 38, height: 38, borderRadius: "50%", border: "2.5px solid var(--border-default)", borderTopColor: "var(--accent-amber)" }} />
                    <span style={{ fontSize: 12, color: "var(--text-tertiary)", fontFamily: "'DM Sans',sans-serif" }}>Loading time series…</span>
                  </motion.div>
                ) : Plot && buildTraces().length > 0 ? (
                  <motion.div key={`${activeVar.id}_${yearMin}_${yearMax}_${analysisMode}`} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.3 }}>
                    <Plot
                      data={buildTraces()}
                      layout={chartLayout}
                      config={{ displayModeBar: false, responsive: true }}
                      style={{ width: "100%" }}
                    />
                  </motion.div>
                ) : (
                  <motion.div key="empty" initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                    style={{ height: 380, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 12 }}>
                    <div style={{ fontSize: 36, opacity: 0.4 }}>📈</div>
                    <p style={{ fontSize: 13, color: "var(--text-tertiary)", fontFamily: "'DM Sans',sans-serif", textAlign: "center" }}>
                      {!Plot ? "Install react-plotly.js to enable charts" : "Add a location pin to begin"}
                    </p>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </motion.div>

          {/* Stats panel */}
          <AnimatePresence>
            {activeStats && (
              <motion.div
                initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }}
                style={{ overflow: "hidden" }}
              >
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(130px,1fr))", gap: 10 }}>
                  {[
                    { label: "Mean",          value: activeStats.mean,      unit: activeVar.unit, color: activeVar.color },
                    { label: "Maximum",       value: activeStats.max,       unit: activeVar.unit, color: "#C0524A"       },
                    { label: "Minimum",       value: activeStats.min,       unit: activeVar.unit, color: "#5B8FA8"       },
                    { label: "Trend /decade", value: `${activeStats.trend > 0 ? "+" : ""}${activeStats.trend}`, unit: activeVar.unit, color: "#7D9B6B" },
                    { label: "Latest value",  value: activeStats.lastValue, unit: activeVar.unit, color: "#9B6B9B"       },
                    { label: "Baseline mean", value: activeStats.baselineMean, unit: `${activeVar.unit} (1981–2010)`, color: "#D4870A" },
                  ].map((s, i) => (
                    <motion.div key={s.label} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}>
                      <StatPill {...s} />
                    </motion.div>
                  ))}
                </div>
              </motion.div>
            )}
          </AnimatePresence>

        </div>
      </div>
    </Layout>
  );
};

export default TemporalAnalysis;