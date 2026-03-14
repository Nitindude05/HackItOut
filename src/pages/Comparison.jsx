import { useState, useCallback, useContext, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import Layout from "../components/Layout";
import { ThemeContext } from "../context/ThemeContext";

// ─────────────────────────────────────────────────────────────
// PLOTLY — lazy loaded
// ─────────────────────────────────────────────────────────────
let Plot = null;
try { Plot = (await import("react-plotly.js")).default; } catch (_) {}

// ─────────────────────────────────────────────────────────────
// CONFIG — backend-compatible
// Replace VARIABLES with: GET /api/variables
// Replace year lists with: GET /api/available-years?variable=
// ─────────────────────────────────────────────────────────────
const VARIABLES = [
  { id: "temperature",   label: "Surface Temp",   unit: "°C",     icon: "🌡", colorscale: "RdBu",    reverse: true,  range: [-40, 45],   deltaRange: [-5, 5]   },
  { id: "precipitation", label: "Precipitation",  unit: "mm/day", icon: "🌧", colorscale: "Blues",   reverse: false, range: [0, 20],     deltaRange: [-8, 8]   },
  { id: "wind_speed",    label: "Wind Speed",     unit: "m/s",    icon: "💨", colorscale: "Viridis", reverse: false, range: [0, 25],     deltaRange: [-10, 10] },
];

const YEARS = Array.from({ length: 15 }, (_, i) => 1960 + i * 5).concat([2020, 2023]);

// ─────────────────────────────────────────────────────────────
// MOCK DATA — replace with GET /api/spatial?variable=&year=
// ─────────────────────────────────────────────────────────────
const generateGrid = (variableId, year) => {
  const lats = Array.from({ length: 37 }, (_, i) => -90 + i * 5);
  const lons = Array.from({ length: 73 }, (_, i) => -180 + i * 5);
  const warmingTrend = (parseInt(year) - 1960) * 0.022;
  const z = lats.map((lat) =>
    lons.map((lon) => {
      let v;
      if (variableId === "temperature")
        v = 15 - Math.abs(lat) * 0.55 + Math.sin(lon * 0.04) * 9 + warmingTrend;
      else if (variableId === "precipitation")
        v = Math.max(0, 5 - Math.abs(lat) * 0.07 + Math.sin((lon + lat) * 0.06) * 4);
      else
        v = 6 + Math.abs(Math.cos(lat * 0.06)) * 8 + Math.sin(lon * 0.03) * 3;
      return parseFloat((v + (Math.random() - 0.5) * 1.8).toFixed(2));
    })
  );
  return { lats, lons, z };
};

const computeDelta = (zA, zB) =>
  zA.map((row, i) => row.map((v, j) => parseFloat((zB[i][j] - v).toFixed(3))));

const computeStats = (z) => {
  const flat = z.flat().filter(v => v !== null);
  const mean = flat.reduce((a, b) => a + b, 0) / flat.length;
  const min  = Math.min(...flat);
  const max  = Math.max(...flat);
  const std  = Math.sqrt(flat.reduce((a, b) => a + (b - mean) ** 2, 0) / flat.length);
  return { mean: mean.toFixed(3), min: min.toFixed(3), max: max.toFixed(3), std: std.toFixed(3) };
};

// ─────────────────────────────────────────────────────────────
// SMALL COMPONENTS
// ─────────────────────────────────────────────────────────────
const Chip = ({ label, active, onClick, color }) => (
  <button onClick={onClick} style={{
    padding: "5px 12px", borderRadius: 20,
    border: `1px solid ${active ? (color || "rgba(212,135,10,0.45)") : "var(--border-default)"}`,
    background: active ? (color ? color + "18" : "var(--accent-amber-soft)") : "var(--bg-input)",
    color: active ? (color || "var(--accent-amber)") : "var(--text-tertiary)",
    fontSize: 11.5, fontWeight: active ? 500 : 400,
    cursor: "pointer", fontFamily: "'DM Sans', sans-serif",
    transition: "all 0.15s ease", whiteSpace: "nowrap",
  }}>
    {label}
  </button>
);

const YearSelect = ({ value, onChange, label, accentColor, excludeYear }) => (
  <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
    <label style={{
      fontSize: 10, fontWeight: 500, letterSpacing: "0.09em",
      textTransform: "uppercase", color: "var(--text-tertiary)",
      fontFamily: "'DM Sans', sans-serif",
    }}>
      {label}
    </label>
    <select
      value={value}
      onChange={e => onChange(Number(e.target.value))}
      style={{
        padding: "8px 12px",
        fontFamily: "'DM Sans', sans-serif",
        fontSize: 13, fontWeight: 500,
        background: "var(--bg-input)",
        border: `1px solid ${accentColor}55`,
        borderRadius: "var(--radius-md)",
        color: accentColor,
        outline: "none",
        cursor: "pointer",
        appearance: "none",
        WebkitAppearance: "none",
        backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 16 16' fill='none' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M4 6l4 4 4-4' stroke='%23888' stroke-width='1.5' stroke-linecap='round'/%3E%3C/svg%3E")`,
        backgroundRepeat: "no-repeat",
        backgroundPosition: "right 10px center",
        backgroundSize: "14px",
        paddingRight: 30,
      }}
    >
      {YEARS.filter(y => y !== excludeYear).map(y => (
        <option key={y} value={y}>{y}</option>
      ))}
    </select>
  </div>
);

// ─────────────────────────────────────────────────────────────
// MAP PANEL
// ─────────────────────────────────────────────────────────────
const MapPanel = ({ data, variable, year, label, labelColor, isDark, isLoading }) => {
  if (isLoading) return (
    <div style={{ height: 320, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 14 }}>
      <motion.div animate={{ rotate: 360 }} transition={{ duration: 1.4, repeat: Infinity, ease: "linear" }}
        style={{ width: 36, height: 36, borderRadius: "50%", border: "2.5px solid var(--border-default)", borderTopColor: labelColor }} />
      <span style={{ fontSize: 12, color: "var(--text-tertiary)", fontFamily: "'DM Sans', sans-serif" }}>Loading {year}…</span>
    </div>
  );

  if (!Plot || !data) return (
    <div style={{ height: 320, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 10 }}>
      <span style={{ fontSize: 32, opacity: 0.3 }}>🗺</span>
      <p style={{ fontSize: 12, color: "var(--text-tertiary)", fontFamily: "'DM Sans', sans-serif", textAlign: "center" }}>
        Select years and variable to load map
      </p>
    </div>
  );

  return (
    <Plot
      data={[{
        type: "heatmap",
        z: data.z, x: data.lons, y: data.lats,
        colorscale: variable.colorscale,
        reversescale: variable.reverse,
        zmin: variable.range[0],
        zmax: variable.range[1],
        colorbar: {
          thickness: 10,
          tickfont: { size: 9, color: isDark ? "#C9A97A" : "#4A3020", family: "DM Sans" },
          len: 0.8, x: 1.02,
          title: { text: variable.unit, font: { size: 10, color: isDark ? "#9A8060" : "#6B5040", family: "DM Sans" } },
        },
        hovertemplate: `${variable.label}: %{z} ${variable.unit}<br>Lat: %{y}°  Lon: %{x}°<extra></extra>`,
      }]}
      layout={{
        paper_bgcolor: "transparent", plot_bgcolor: "transparent",
        height: 320,
        margin: { t: 4, r: 60, b: 36, l: 36 },
        xaxis: {
          tickfont: { size: 9, color: isDark ? "#9A8060" : "#6B5040", family: "DM Sans" },
          gridcolor: isDark ? "rgba(201,169,122,0.06)" : "rgba(44,26,14,0.07)",
          dtick: 60, zerolinecolor: "transparent",
        },
        yaxis: {
          tickfont: { size: 9, color: isDark ? "#9A8060" : "#6B5040", family: "DM Sans" },
          gridcolor: isDark ? "rgba(201,169,122,0.06)" : "rgba(44,26,14,0.07)",
          dtick: 30, zerolinecolor: "transparent",
        },
      }}
      config={{ displayModeBar: false, responsive: true }}
      style={{ width: "100%" }}
    />
  );
};

// ─────────────────────────────────────────────────────────────
// DELTA MAP
// ─────────────────────────────────────────────────────────────
const DeltaMap = ({ dataA, dataB, variable, yearA, yearB, isDark }) => {
  if (!Plot || !dataA || !dataB) return (
    <div style={{ height: 300, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 10 }}>
      <span style={{ fontSize: 28, opacity: 0.3 }}>📊</span>
      <p style={{ fontSize: 12, color: "var(--text-tertiary)", fontFamily: "'DM Sans', sans-serif" }}>
        Load both maps to see the difference
      </p>
    </div>
  );

  const deltaZ = computeDelta(dataA.z, dataB.z);

  return (
    <Plot
      data={[{
        type: "heatmap",
        z: deltaZ, x: dataA.lons, y: dataA.lats,
        colorscale: "RdBu",
        reversescale: true,
        zmid: 0,
        zmin: variable.deltaRange[0],
        zmax: variable.deltaRange[1],
        colorbar: {
          title: { text: `Δ${variable.unit}`, font: { size: 10, color: isDark ? "#9A8060" : "#6B5040", family: "DM Sans" } },
          thickness: 10,
          tickfont: { size: 9, color: isDark ? "#C9A97A" : "#4A3020", family: "DM Sans" },
          len: 0.8,
        },
        hovertemplate: `Δ${variable.label}: %{z:+.3f} ${variable.unit}<br>%{y}° / %{x}°<extra></extra>`,
      }]}
      layout={{
        paper_bgcolor: "transparent", plot_bgcolor: "transparent",
        height: 300,
        margin: { t: 4, r: 70, b: 36, l: 36 },
        xaxis: {
          tickfont: { size: 9, color: isDark ? "#9A8060" : "#6B5040", family: "DM Sans" },
          gridcolor: isDark ? "rgba(201,169,122,0.06)" : "rgba(44,26,14,0.07)",
          dtick: 60, zerolinecolor: "transparent",
        },
        yaxis: {
          tickfont: { size: 9, color: isDark ? "#9A8060" : "#6B5040", family: "DM Sans" },
          gridcolor: isDark ? "rgba(201,169,122,0.06)" : "rgba(44,26,14,0.07)",
          dtick: 30, zerolinecolor: "transparent",
        },
        annotations: [{
          x: 0.5, y: 0.97, xref: "paper", yref: "paper",
          text: `${yearB} minus ${yearA}`,
          showarrow: false,
          font: { size: 11, color: isDark ? "rgba(232,213,176,0.5)" : "rgba(44,26,14,0.4)", family: "DM Sans" },
        }],
      }}
      config={{ displayModeBar: false, responsive: true }}
      style={{ width: "100%" }}
    />
  );
};

// ─────────────────────────────────────────────────────────────
// STATS TABLE
// ─────────────────────────────────────────────────────────────
const StatsTable = ({ statsA, statsB, yearA, yearB, unit, colorA, colorB }) => {
  const metrics = ["mean", "min", "max", "std"];
  const metricLabels = { mean: "Mean", min: "Minimum", max: "Maximum", std: "Std. Dev." };

  return (
    <table style={{ width: "100%", borderCollapse: "collapse", fontFamily: "'DM Sans', sans-serif" }}>
      <thead>
        <tr style={{ borderBottom: "1px solid var(--border-subtle)" }}>
          {["Metric", yearA, yearB, "Δ Change"].map((h, i) => (
            <th key={i} style={{
              padding: "8px 12px", textAlign: i === 0 ? "left" : "right",
              fontSize: 10.5, fontWeight: 500, letterSpacing: "0.07em",
              textTransform: "uppercase",
              color: i === 1 ? colorA : i === 2 ? colorB : i === 3 ? "var(--accent-amber)" : "var(--text-tertiary)",
            }}>
              {h}
            </th>
          ))}
        </tr>
      </thead>
      <tbody>
        {metrics.map((m, i) => {
          const vA = parseFloat(statsA[m]);
          const vB = parseFloat(statsB[m]);
          const delta = (vB - vA).toFixed(3);
          const isPositive = parseFloat(delta) > 0;
          return (
            <motion.tr key={m}
              initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }}
              transition={{ delay: i * 0.06 }}
              style={{ borderBottom: "1px solid var(--border-subtle)" }}
            >
              <td style={{ padding: "9px 12px", fontSize: 12.5, color: "var(--text-secondary)", fontWeight: 500 }}>
                {metricLabels[m]}
              </td>
              <td style={{ padding: "9px 12px", textAlign: "right", fontSize: 12.5, color: colorA, fontWeight: 500, fontFamily: "'Playfair Display', serif" }}>
                {statsA[m]} <span style={{ fontSize: 10, color: "var(--text-tertiary)", fontFamily: "'DM Sans', sans-serif" }}>{unit}</span>
              </td>
              <td style={{ padding: "9px 12px", textAlign: "right", fontSize: 12.5, color: colorB, fontWeight: 500, fontFamily: "'Playfair Display', serif" }}>
                {statsB[m]} <span style={{ fontSize: 10, color: "var(--text-tertiary)", fontFamily: "'DM Sans', sans-serif" }}>{unit}</span>
              </td>
              <td style={{ padding: "9px 12px", textAlign: "right" }}>
                <span style={{
                  fontSize: 12, fontWeight: 600,
                  color: isPositive ? "#C0524A" : "#5B8FA8",
                  background: isPositive ? "rgba(192,82,74,0.1)" : "rgba(91,143,168,0.1)",
                  padding: "2px 8px", borderRadius: 12,
                  fontFamily: "'Playfair Display', serif",
                }}>
                  {isPositive ? "+" : ""}{delta}
                </span>
              </td>
            </motion.tr>
          );
        })}
      </tbody>
    </table>
  );
};

// ─────────────────────────────────────────────────────────────
// COMPARISON PAGE
// ─────────────────────────────────────────────────────────────
const Comparison = () => {
  const { theme } = useContext(ThemeContext);
  const isDark = theme === "dark";

  const COLOR_A = "#D4870A";
  const COLOR_B = "#5B8FA8";

  // ── State ──
  const [activeVar, setActiveVar]   = useState(VARIABLES[0]);
  const [yearA, setYearA]           = useState(1990);
  const [yearB, setYearB]           = useState(2020);
  const [dataA, setDataA]           = useState(null);
  const [dataB, setDataB]           = useState(null);
  const [statsA, setStatsA]         = useState(null);
  const [statsB, setStatsB]         = useState(null);
  const [loadingA, setLoadingA]     = useState(false);
  const [loadingB, setLoadingB]     = useState(false);
  const [viewMode, setViewMode]     = useState("sidebyside"); // "sidebyside" | "delta"
  const [syncZoom, setSyncZoom]     = useState(true);
  const [hasLoaded, setHasLoaded]   = useState(false);

  // ── Load data ──
  // Backend: GET /api/spatial?variable=&year=  →  { lats, lons, z }
  const loadA = useCallback(async (varId, year) => {
    setLoadingA(true); setDataA(null); setStatsA(null);
    try {
      await new Promise(r => setTimeout(r, 700));
      // const res = await fetch(`/api/spatial?variable=${varId}&year=${year}`);
      // const d   = await res.json();
      const d = generateGrid(varId, year);
      setDataA(d);
      setStatsA(computeStats(d.z));
    } finally { setLoadingA(false); }
  }, []);

  const loadB = useCallback(async (varId, year) => {
    setLoadingB(true); setDataB(null); setStatsB(null);
    try {
      await new Promise(r => setTimeout(r, 900));
      const d = generateGrid(varId, year);
      setDataB(d);
      setStatsB(computeStats(d.z));
    } finally { setLoadingB(false); }
  }, []);

  const handleCompare = () => {
    setHasLoaded(true);
    loadA(activeVar.id, yearA);
    loadB(activeVar.id, yearB);
  };

  // Auto-load on mount
  useEffect(() => { handleCompare(); }, []);

  // Reload when variable changes
  useEffect(() => {
    if (hasLoaded) { loadA(activeVar.id, yearA); loadB(activeVar.id, yearB); }
  }, [activeVar.id]);

  const panelStyle = {
    background: "var(--bg-surface)",
    border: "1px solid var(--border-subtle)",
    borderRadius: "var(--radius-lg)",
    overflow: "hidden",
    boxShadow: "var(--shadow-sm)",
  };

  const cardHeader = (title, color, year, extra) => (
    <div style={{
      padding: "13px 18px", borderBottom: "1px solid var(--border-subtle)",
      display: "flex", alignItems: "center", justifyContent: "space-between",
      background: `linear-gradient(135deg, ${color}08, ${color}04)`,
    }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
        <span style={{ width: 10, height: 10, borderRadius: "50%", background: color, display: "inline-block", boxShadow: `0 0 6px ${color}66` }} />
        <h3 style={{ fontFamily: "'Playfair Display', serif", fontSize: 14, fontWeight: 600, color: "var(--text-primary)", margin: 0 }}>
          {title}
        </h3>
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
        <span style={{ fontFamily: "'Playfair Display', serif", fontSize: 18, fontWeight: 700, color }}>
          {year}
        </span>
        {extra}
      </div>
    </div>
  );

  return (
    <Layout>
      <style>{`
        .comp-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 18px; }
        @media (max-width: 860px) { .comp-grid { grid-template-columns: 1fr; } }
        select option { background: var(--bg-elevated); color: var(--text-primary); }
      `}</style>

      {/* ── PAGE HEADER ── */}
      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} style={{ marginBottom: 22 }}>
        <h1 style={{ fontFamily: "'Playfair Display', serif", fontSize: "clamp(1.5rem,3vw,2rem)", fontWeight: 700, color: "var(--text-primary)", margin: "0 0 4px" }}>
          Comparison Mode
        </h1>
        <p style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 13, color: "var(--text-tertiary)", margin: 0 }}>
          Side-by-side climate dataset analysis · {activeVar.label} · {yearA} vs {yearB}
        </p>
      </motion.div>

      {/* ── CONTROLS BAR ── */}
      <motion.div
        initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.08 }}
        style={{ padding: "16px 20px", background: "var(--bg-surface)", border: "1px solid var(--border-subtle)", borderRadius: "var(--radius-lg)", marginBottom: 18, display: "flex", flexWrap: "wrap", gap: 16, alignItems: "flex-end" }}
      >
        {/* Variable */}
        <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          <label style={{ fontSize: 10, fontWeight: 500, letterSpacing: "0.09em", textTransform: "uppercase", color: "var(--text-tertiary)", fontFamily: "'DM Sans', sans-serif" }}>
            Variable
          </label>
          <div style={{ display: "flex", gap: 6 }}>
            {VARIABLES.map(v => (
              <Chip key={v.id} label={`${v.icon} ${v.label}`} active={activeVar.id === v.id} onClick={() => setActiveVar(v)} />
            ))}
          </div>
        </div>

        {/* Year selectors */}
        <div style={{ display: "flex", gap: 12, alignItems: "flex-end" }}>
          <YearSelect label="Dataset A" value={yearA} onChange={setYearA} accentColor={COLOR_A} excludeYear={yearB} />
          <div style={{ paddingBottom: 10, color: "var(--text-tertiary)", fontSize: 16 }}>⇄</div>
          <YearSelect label="Dataset B" value={yearB} onChange={setYearB} accentColor={COLOR_B} excludeYear={yearA} />
        </div>

        {/* Compare button */}
        <motion.button
          onClick={handleCompare}
          whileTap={{ scale: 0.97 }}
          style={{
            padding: "10px 22px", borderRadius: "var(--radius-md)",
            border: "1px solid rgba(212,135,10,0.4)",
            background: "linear-gradient(135deg, rgba(212,135,10,0.18), rgba(74,92,58,0.14))",
            color: "var(--accent-amber)", fontSize: 13, fontWeight: 500,
            cursor: "pointer", fontFamily: "'DM Sans', sans-serif",
            display: "flex", alignItems: "center", gap: 7,
            whiteSpace: "nowrap",
          }}
        >
          <svg viewBox="0 0 16 16" fill="none" width="13" height="13">
            <path d="M2 8h5M9 8h5M8 2v5M8 9v5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
          </svg>
          Compare
        </motion.button>

        {/* View mode + sync */}
        <div style={{ display: "flex", gap: 8, marginLeft: "auto", alignItems: "center" }}>
          <Chip label="Side by Side" active={viewMode === "sidebyside"} onClick={() => setViewMode("sidebyside")} />
          <Chip label="Δ Difference" active={viewMode === "delta"}      onClick={() => setViewMode("delta")}      />
          <div style={{ width: 1, height: 24, background: "var(--border-subtle)" }} />
          <button
            onClick={() => setSyncZoom(v => !v)}
            style={{
              display: "flex", alignItems: "center", gap: 6, padding: "5px 10px",
              borderRadius: 20, border: `1px solid ${syncZoom ? "rgba(125,155,107,0.4)" : "var(--border-default)"}`,
              background: syncZoom ? "rgba(125,155,107,0.1)" : "transparent",
              color: syncZoom ? "#7D9B6B" : "var(--text-tertiary)",
              cursor: "pointer", fontSize: 11.5, fontFamily: "'DM Sans', sans-serif",
              transition: "all 0.15s",
            }}
          >
            <span style={{ fontSize: 12 }}>🔗</span> Sync zoom
          </button>
        </div>
      </motion.div>

      {/* ── MAPS ── */}
      <AnimatePresence mode="wait">
        {viewMode === "sidebyside" ? (
          <motion.div key="sidebyside" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.22 }}>
            <div className="comp-grid" style={{ marginBottom: 18 }}>
              {/* MAP A */}
              <div style={panelStyle}>
                {cardHeader("Dataset A", COLOR_A, yearA)}
                <div style={{ padding: "12px 14px 14px" }}>
                  <MapPanel data={dataA} variable={activeVar} year={yearA} labelColor={COLOR_A} isDark={isDark} isLoading={loadingA} />
                </div>
              </div>

              {/* MAP B */}
              <div style={panelStyle}>
                {cardHeader("Dataset B", COLOR_B, yearB)}
                <div style={{ padding: "12px 14px 14px" }}>
                  <MapPanel data={dataB} variable={activeVar} year={yearB} labelColor={COLOR_B} isDark={isDark} isLoading={loadingB} />
                </div>
              </div>
            </div>
          </motion.div>
        ) : (
          <motion.div key="delta" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.22 }} style={{ marginBottom: 18 }}>
            <div style={{ ...panelStyle }}>
              <div style={{ padding: "13px 18px", borderBottom: "1px solid var(--border-subtle)", display: "flex", alignItems: "center", justifyContent: "space-between", background: "linear-gradient(135deg,rgba(74,92,58,0.07),rgba(91,143,168,0.05))" }}>
                <div>
                  <h3 style={{ fontFamily: "'Playfair Display', serif", fontSize: 14, fontWeight: 600, color: "var(--text-primary)", margin: 0 }}>
                    Difference Map
                  </h3>
                  <p style={{ fontSize: 11, color: "var(--text-tertiary)", margin: "2px 0 0" }}>
                    {yearB} − {yearA} · Blue = decrease · Red = increase
                  </p>
                </div>
                <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                  <span style={{ fontSize: 12, color: "#5B8FA8", background: "rgba(91,143,168,0.12)", padding: "3px 10px", borderRadius: 12, border: "1px solid rgba(91,143,168,0.2)" }}>
                    ↓ Cooler / Less
                  </span>
                  <span style={{ fontSize: 12, color: "#C0524A", background: "rgba(192,82,74,0.12)", padding: "3px 10px", borderRadius: 12, border: "1px solid rgba(192,82,74,0.2)" }}>
                    ↑ Warmer / More
                  </span>
                </div>
              </div>
              <div style={{ padding: "12px 14px 14px" }}>
                <DeltaMap dataA={dataA} dataB={dataB} variable={activeVar} yearA={yearA} yearB={yearB} isDark={isDark} />
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── STATS TABLE ── */}
      <AnimatePresence>
        {statsA && statsB && (
          <motion.div
            initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
            style={{ ...panelStyle, marginBottom: 18 }}
          >
            <div style={{ padding: "13px 18px", borderBottom: "1px solid var(--border-subtle)", display: "flex", alignItems: "center", justifyContent: "space-between", background: "linear-gradient(135deg,rgba(74,92,58,0.06),rgba(212,135,10,0.04))" }}>
              <div>
                <h3 style={{ fontFamily: "'Playfair Display', serif", fontSize: 14, fontWeight: 600, color: "var(--text-primary)", margin: 0 }}>
                  Statistical Comparison
                </h3>
                <p style={{ fontSize: 11, color: "var(--text-tertiary)", margin: "2px 0 0" }}>
                  Global statistics · {activeVar.label} · {activeVar.unit}
                </p>
              </div>
              <div style={{ display: "flex", gap: 10 }}>
                <span style={{ fontSize: 11, color: COLOR_A, fontWeight: 500, background: COLOR_A + "15", padding: "3px 10px", borderRadius: 12 }}>{yearA}</span>
                <span style={{ fontSize: 11, color: COLOR_B, fontWeight: 500, background: COLOR_B + "15", padding: "3px 10px", borderRadius: 12 }}>{yearB}</span>
              </div>
            </div>
            <div style={{ padding: "8px 6px" }}>
              <StatsTable statsA={statsA} statsB={statsB} yearA={yearA} yearB={yearB} unit={activeVar.unit} colorA={COLOR_A} colorB={COLOR_B} />
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── LINKED TIME SERIES ── */}
      {Plot && dataA && dataB && (() => {
        const yearsLine = Array.from({ length: yearB - yearA + 1 }, (_, i) => yearA + i);
        const baseA = parseFloat(statsA?.mean || 14);
        const baseB = parseFloat(statsB?.mean || 15);
        const step  = (baseB - baseA) / (yearsLine.length - 1);
        const trendLine = yearsLine.map((_, i) => parseFloat((baseA + step * i + (Math.random() - 0.5) * 0.3).toFixed(3)));

        return (
          <motion.div
            initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}
            style={panelStyle}
          >
            <div style={{ padding: "13px 18px", borderBottom: "1px solid var(--border-subtle)", background: "linear-gradient(135deg,rgba(74,92,58,0.06),rgba(212,135,10,0.04))" }}>
              <h3 style={{ fontFamily: "'Playfair Display', serif", fontSize: 14, fontWeight: 600, color: "var(--text-primary)", margin: 0 }}>
                Trend Across Comparison Period
              </h3>
              <p style={{ fontSize: 11, color: "var(--text-tertiary)", margin: "2px 0 0" }}>
                Global mean {activeVar.label} · {yearA}–{yearB}
              </p>
            </div>
            <div style={{ padding: "12px 14px 16px" }}>
              <Plot
                data={[
                  {
                    type: "scatter", mode: "lines", x: yearsLine, y: trendLine,
                    name: `${activeVar.label} trend`,
                    line: { color: "var(--accent-amber)", width: 2.5, shape: "spline", smoothing: 0.9 },
                    fill: "tozeroy",
                    fillcolor: isDark ? "rgba(212,135,10,0.06)" : "rgba(212,135,10,0.05)",
                    hovertemplate: `%{y:.3f} ${activeVar.unit}<br>%{x}<extra></extra>`,
                  },
                  {
                    type: "scatter", mode: "markers",
                    x: [yearA, yearB],
                    y: [parseFloat(statsA.mean), parseFloat(statsB.mean)],
                    name: "Endpoints",
                    marker: { color: [COLOR_A, COLOR_B], size: 10, symbol: "circle", line: { width: 2, color: "var(--bg-surface)" } },
                    hovertemplate: `%{y:.3f} ${activeVar.unit}<br>%{x}<extra></extra>`,
                  },
                ]}
                layout={{
                  paper_bgcolor: "transparent", plot_bgcolor: "transparent",
                  height: 220, margin: { t: 6, r: 20, b: 36, l: 52 },
                  showlegend: false,
                  xaxis: {
                    tickfont: { size: 10, color: isDark ? "#9A8060" : "#6B5040", family: "DM Sans" },
                    gridcolor: isDark ? "rgba(201,169,122,0.07)" : "rgba(44,26,14,0.07)",
                    zerolinecolor: "transparent",
                  },
                  yaxis: {
                    tickfont: { size: 10, color: isDark ? "#9A8060" : "#6B5040", family: "DM Sans" },
                    gridcolor: isDark ? "rgba(201,169,122,0.07)" : "rgba(44,26,14,0.07)",
                    title: { text: activeVar.unit, font: { size: 10, color: isDark ? "#9A8060" : "#6B5040", family: "DM Sans" } },
                  },
                  hovermode: "x unified",
                  hoverlabel: {
                    bgcolor: isDark ? "#231508" : "#FFF8EE",
                    bordercolor: isDark ? "rgba(201,169,122,0.3)" : "rgba(44,26,14,0.2)",
                    font: { size: 11, color: isDark ? "#E8D5B0" : "#1E1009", family: "DM Sans" },
                  },
                }}
                config={{ displayModeBar: false, responsive: true }}
                style={{ width: "100%" }}
              />
            </div>
          </motion.div>
        );
      })()}
    </Layout>
  );
};

export default Comparison;