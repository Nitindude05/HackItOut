import { useState, useCallback, useContext, useRef } from "react";
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
// VARIABLE CONFIG — backend-compatible
// Replace with: GET /api/spatial-variables
// ─────────────────────────────────────────────────────────────
const VARIABLES = [
  { id: "temperature",        label: "Surface Temp",      unit: "°C",     colorscale: "RdBu",    reverse: true,  icon: "🌡", range: [-40, 45]  },
  { id: "precipitation",      label: "Precipitation",     unit: "mm/day", colorscale: "Blues",   reverse: false, icon: "🌧", range: [0, 20]    },
  { id: "wind_speed",         label: "Wind Speed",        unit: "m/s",    colorscale: "Viridis", reverse: false, icon: "💨", range: [0, 25]    },
  { id: "sea_level_pressure", label: "Sea Level Pressure",unit: "hPa",    colorscale: "Plasma",  reverse: false, icon: "⟳", range: [960, 1040] },
];

const TIME_SLICES = [
  { id: "1960", label: "1960" },
  { id: "1980", label: "1980" },
  { id: "2000", label: "2000" },
  { id: "2010", label: "2010" },
  { id: "2020", label: "2020" },
  { id: "2023", label: "2023" },
];

// ─────────────────────────────────────────────────────────────
// MOCK DATA — replace with GET /api/spatial?variable=&year=
// ─────────────────────────────────────────────────────────────
const generateSpatialData = (variableId, year) => {
  const lats = Array.from({ length: 37 }, (_, i) => -90 + i * 5);
  const lons = Array.from({ length: 73 }, (_, i) => -180 + i * 5);
  const trend = (parseInt(year) - 1960) * 0.02;

  const z = lats.map((lat) =>
    lons.map((lon) => {
      let val;
      if (variableId === "temperature") {
        val = 15 - Math.abs(lat) * 0.55 + Math.sin(lon * 0.04) * 9 + trend;
      } else if (variableId === "precipitation") {
        val = Math.max(0, 5 - Math.abs(lat) * 0.07 + Math.sin((lon + lat) * 0.06) * 4);
      } else if (variableId === "wind_speed") {
        val = 6 + Math.abs(Math.cos(lat * 0.06)) * 8 + Math.sin(lon * 0.03) * 3;
      } else {
        val = 1013 + Math.sin(lat * 0.04) * 12 + Math.cos(lon * 0.02) * 8;
      }
      return parseFloat((val + (Math.random() - 0.5) * 2.5).toFixed(2));
    })
  );
  return { lats, lons, z };
};

// ─────────────────────────────────────────────────────────────
// SMALL COMPONENTS
// ─────────────────────────────────────────────────────────────
const ToggleChip = ({ label, active, onClick, icon }) => (
  <button
    onClick={onClick}
    style={{
      display: "flex", alignItems: "center", gap: 6,
      padding: "6px 14px",
      borderRadius: 20,
      border: `1px solid ${active ? "rgba(212,135,10,0.45)" : "var(--border-default)"}`,
      background: active
        ? "linear-gradient(135deg, rgba(212,135,10,0.18), rgba(74,92,58,0.14))"
        : "var(--bg-input)",
      color: active ? "var(--accent-amber)" : "var(--text-tertiary)",
      fontSize: 12, fontWeight: active ? 500 : 400,
      cursor: "pointer", fontFamily: "'DM Sans', sans-serif",
      transition: "all 0.18s ease",
      boxShadow: active ? "0 2px 8px rgba(212,135,10,0.12)" : "none",
    }}
  >
    {icon && <span style={{ fontSize: 13 }}>{icon}</span>}
    {label}
  </button>
);

const VarPill = ({ variable, active, onClick }) => (
  <button
    onClick={onClick}
    style={{
      display: "flex", alignItems: "center", gap: 7,
      padding: "7px 13px",
      borderRadius: "var(--radius-md)",
      border: `1px solid ${active ? "rgba(212,135,10,0.4)" : "var(--border-subtle)"}`,
      background: active ? "var(--accent-amber-soft)" : "var(--bg-surface)",
      color: active ? "var(--accent-amber)" : "var(--text-secondary)",
      fontSize: 12, fontWeight: active ? 500 : 400,
      cursor: "pointer", fontFamily: "'DM Sans', sans-serif",
      transition: "all 0.18s ease",
      whiteSpace: "nowrap",
    }}
  >
    <span>{variable.icon}</span>
    <span>{variable.label}</span>
    <span style={{
      fontSize: 10, padding: "1px 5px", borderRadius: 10,
      background: active ? "rgba(212,135,10,0.15)" : "var(--bg-hover)",
      color: active ? "var(--accent-amber)" : "var(--text-tertiary)",
    }}>
      {variable.unit}
    </span>
  </button>
);

// ─────────────────────────────────────────────────────────────
// 2D HEATMAP
// ─────────────────────────────────────────────────────────────
const HeatMap2D = ({ data, variable, isDark }) => {
  if (!Plot) return (
    <div style={{
      height: 460, display: "flex", alignItems: "center",
      justifyContent: "center", flexDirection: "column", gap: 10,
    }}>
      <div style={{ fontSize: 32 }}>🗺</div>
      <p style={{ fontSize: 12, color: "var(--text-tertiary)", fontFamily: "'DM Sans', sans-serif", textAlign: "center" }}>
        Install react-plotly.js to enable<br />interactive maps
      </p>
      <code style={{ fontSize: 11, color: "var(--accent-amber)", background: "var(--accent-amber-soft)", padding: "4px 10px", borderRadius: 6 }}>
        npm install react-plotly.js plotly.js-dist-min
      </code>
    </div>
  );

  return (
    <Plot
      data={[{
        type: "heatmap",
        z: data.z,
        x: data.lons,
        y: data.lats,
        colorscale: variable.colorscale,
        reversescale: variable.reverse,
        zmin: variable.range[0],
        zmax: variable.range[1],
        colorbar: {
          title: { text: variable.unit, font: { size: 11, color: isDark ? "#C9A97A" : "#4A3020", family: "DM Sans" } },
          thickness: 14,
          tickfont: { size: 10, color: isDark ? "#9A8060" : "#4A3020", family: "DM Sans" },
          len: 0.85,
          x: 1.01,
        },
        hovertemplate: `${variable.label}: %{z} ${variable.unit}<br>Lat: %{y}°  Lon: %{x}°<extra></extra>`,
      }]}
      layout={{
        paper_bgcolor: "transparent",
        plot_bgcolor: "transparent",
        height: 460,
        margin: { t: 8, r: 80, b: 44, l: 44 },
        xaxis: {
          title: { text: "Longitude", font: { size: 11, color: isDark ? "#9A8060" : "#6B5040", family: "DM Sans" }, standoff: 6 },
          tickfont: { size: 10, color: isDark ? "#9A8060" : "#6B5040", family: "DM Sans" },
          gridcolor: isDark ? "rgba(201,169,122,0.07)" : "rgba(44,26,14,0.08)",
          zerolinecolor: isDark ? "rgba(201,169,122,0.12)" : "rgba(44,26,14,0.14)",
          dtick: 60,
        },
        yaxis: {
          title: { text: "Latitude", font: { size: 11, color: isDark ? "#9A8060" : "#6B5040", family: "DM Sans" }, standoff: 6 },
          tickfont: { size: 10, color: isDark ? "#9A8060" : "#6B5040", family: "DM Sans" },
          gridcolor: isDark ? "rgba(201,169,122,0.07)" : "rgba(44,26,14,0.08)",
          zerolinecolor: isDark ? "rgba(201,169,122,0.12)" : "rgba(44,26,14,0.14)",
          dtick: 30,
        },
      }}
      config={{ displayModeBar: true, modeBarButtonsToRemove: ["lasso2d", "select2d"], responsive: true, displaylogo: false }}
      style={{ width: "100%" }}
    />
  );
};

// ─────────────────────────────────────────────────────────────
// 3D GLOBE
// ─────────────────────────────────────────────────────────────
const Globe3D = ({ data, variable, isDark }) => {
  if (!Plot) return null;

  // Flatten grid to scatter_geo points for globe rendering
  const lats = [], lons = [], vals = [];
  data.lats.forEach((lat, i) => {
    data.lons.forEach((lon, j) => {
      lats.push(lat);
      lons.push(lon);
      vals.push(data.z[i][j]);
    });
  });

  return (
    <Plot
      data={[{
        type: "scattergeo",
        mode: "markers",
        lat: lats,
        lon: lons,
        marker: {
          color: vals,
          colorscale: variable.colorscale,
          reversescale: variable.reverse,
          size: 4,
          opacity: 0.82,
          cmin: variable.range[0],
          cmax: variable.range[1],
          colorbar: {
            title: { text: variable.unit, font: { size: 11, color: isDark ? "#C9A97A" : "#4A3020", family: "DM Sans" } },
            thickness: 14,
            tickfont: { size: 10, color: isDark ? "#9A8060" : "#4A3020", family: "DM Sans" },
            len: 0.75,
          },
          line: { width: 0 },
        },
        hovertemplate: `${variable.label}: %{marker.color:.2f} ${variable.unit}<br>%{lat}°N  %{lon}°E<extra></extra>`,
      }]}
      layout={{
        paper_bgcolor: "transparent",
        height: 460,
        margin: { t: 0, r: 80, b: 0, l: 0 },
        geo: {
          projection: { type: "orthographic", rotation: { lon: 20, lat: 20, roll: 0 } },
          showland: true,
          landcolor: isDark ? "#2A1E10" : "#D4C4A0",
          showocean: true,
          oceancolor: isDark ? "#0D1A22" : "#C8DCE8",
          showcoastlines: true,
          coastlinecolor: isDark ? "rgba(201,169,122,0.3)" : "rgba(44,26,14,0.25)",
          coastlinewidth: 0.6,
          showframe: false,
          bgcolor: "transparent",
          showcountries: true,
          countrycolor: isDark ? "rgba(201,169,122,0.15)" : "rgba(44,26,14,0.12)",
          countrywidth: 0.4,
          lataxis: { showgrid: false },
          lonaxis: { showgrid: false },
        },
      }}
      config={{ displayModeBar: false, responsive: true, scrollZoom: false }}
      style={{ width: "100%" }}
    />
  );
};

// ─────────────────────────────────────────────────────────────
// LOADING SPINNER
// ─────────────────────────────────────────────────────────────
const MapLoader = () => (
  <div style={{
    height: 460, display: "flex", flexDirection: "column",
    alignItems: "center", justifyContent: "center", gap: 16,
  }}>
    <motion.div
      animate={{ rotate: 360 }}
      transition={{ duration: 1.5, repeat: Infinity, ease: "linear" }}
      style={{
        width: 42, height: 42, borderRadius: "50%",
        border: "3px solid var(--border-default)",
        borderTopColor: "var(--accent-amber)",
      }}
    />
    <p style={{
      fontFamily: "'DM Sans', sans-serif",
      fontSize: 13, color: "var(--text-tertiary)",
    }}>
      Rendering spatial data…
    </p>
  </div>
);

// ─────────────────────────────────────────────────────────────
// SPATIAL VIEW PAGE
// ─────────────────────────────────────────────────────────────
const SpatialView = () => {
  const { theme } = useContext(ThemeContext);
  const isDark = theme === "dark";

  const [viewMode, setViewMode]       = useState("2d");   // "2d" | "3d"
  const [activeVar, setActiveVar]     = useState(VARIABLES[0]);
  const [activeYear, setActiveYear]   = useState("2020");
  const [isLoading, setIsLoading]     = useState(false);
  const [spatialData, setSpatialData] = useState(null);
  const [hoverCoord, setHoverCoord]   = useState(null);

  // ── Load data whenever variable or year changes ──
  // Backend: GET /api/spatial?variable=temperature&year=2020
  const loadData = useCallback(async (varId, year) => {
    setIsLoading(true);
    setSpatialData(null);
    try {
      await new Promise((r) => setTimeout(r, 700)); // ← swap with real fetch
      // const res  = await fetch(`/api/spatial?variable=${varId}&year=${year}`);
      // const data = await res.json();
      const data = generateSpatialData(varId, year);
      setSpatialData(data);
    } catch (err) {
      console.error("SpatialView: load failed", err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const handleVarChange = (v) => {
    setActiveVar(v);
    loadData(v.id, activeYear);
  };

  const handleYearChange = (year) => {
    setActiveYear(year);
    loadData(activeVar.id, year);
  };

  // Load on mount
  useState(() => { loadData(activeVar.id, activeYear); });

  return (
    <Layout>
      <style>{`
        .year-pill { transition: all 0.15s ease; }
        .year-pill:hover { border-color: var(--accent-amber) !important; color: var(--accent-amber) !important; }
      `}</style>

      {/* ── PAGE HEADER ── */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        style={{ marginBottom: 20 }}
      >
        <h1 style={{
          fontFamily: "'Playfair Display', serif",
          fontSize: "clamp(1.5rem, 3vw, 2rem)",
          fontWeight: 700,
          color: "var(--text-primary)",
          margin: "0 0 4px",
        }}>
          Spatial View
        </h1>
        <p style={{
          fontFamily: "'DM Sans', sans-serif",
          fontSize: 13, color: "var(--text-tertiary)", margin: 0,
        }}>
          {activeVar.label} · {activeYear} · Global 0.25° resolution
        </p>
      </motion.div>

      {/* ── TOP TOOLBAR ── */}
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.08 }}
        style={{
          display: "flex", flexWrap: "wrap",
          alignItems: "center", justifyContent: "space-between",
          gap: 12, marginBottom: 16,
          padding: "12px 16px",
          background: "var(--bg-surface)",
          border: "1px solid var(--border-subtle)",
          borderRadius: "var(--radius-lg)",
        }}
      >
        {/* Variable pills */}
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          {VARIABLES.map((v) => (
            <VarPill
              key={v.id}
              variable={v}
              active={activeVar.id === v.id}
              onClick={() => handleVarChange(v)}
            />
          ))}
        </div>

        {/* 2D / 3D toggle */}
        <div style={{ display: "flex", gap: 6 }}>
          <ToggleChip label="2D Map"   icon="🗺" active={viewMode === "2d"} onClick={() => setViewMode("2d")} />
          <ToggleChip label="3D Globe" icon="🌍" active={viewMode === "3d"} onClick={() => setViewMode("3d")} />
        </div>
      </motion.div>

      {/* ── MAP CARD ── */}
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.14 }}
        style={{
          background: "var(--bg-surface)",
          border: "1px solid var(--border-subtle)",
          borderRadius: "var(--radius-lg)",
          boxShadow: "var(--shadow-md)",
          overflow: "hidden",
          marginBottom: 20,
        }}
      >
        {/* Card header */}
        <div style={{
          padding: "14px 20px",
          borderBottom: "1px solid var(--border-subtle)",
          display: "flex", alignItems: "center",
          justifyContent: "space-between",
          background: isDark
            ? "linear-gradient(135deg, rgba(74,92,58,0.08), rgba(91,143,168,0.05))"
            : "linear-gradient(135deg, rgba(74,92,58,0.05), rgba(91,143,168,0.03))",
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <span style={{ fontSize: 18 }}>{activeVar.icon}</span>
            <div>
              <h3 style={{
                fontFamily: "'Playfair Display', serif",
                fontSize: 14, fontWeight: 600,
                color: "var(--text-primary)", margin: 0,
              }}>
                {activeVar.label}
              </h3>
              <p style={{ fontSize: 11, color: "var(--text-tertiary)", margin: 0 }}>
                {viewMode === "2d" ? "Equirectangular projection" : "Orthographic globe"} · {activeYear}
              </p>
            </div>
          </div>

          {/* View mode badge */}
          <span style={{
            fontSize: 10.5, fontWeight: 500,
            padding: "3px 10px", borderRadius: 20,
            background: viewMode === "3d" ? "rgba(91,143,168,0.14)" : "var(--accent-amber-soft)",
            color: viewMode === "3d" ? "var(--accent-sky)" : "var(--accent-amber)",
            border: `1px solid ${viewMode === "3d" ? "rgba(91,143,168,0.25)" : "rgba(212,135,10,0.25)"}`,
            letterSpacing: "0.05em",
          }}>
            {viewMode === "3d" ? "3D Globe" : "2D Heatmap"}
          </span>
        </div>

        {/* Map area */}
        <div style={{ padding: "12px 16px 16px", minHeight: 476, position: "relative" }}>
          <AnimatePresence mode="wait">
            {isLoading ? (
              <motion.div key="loader" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                <MapLoader />
              </motion.div>
            ) : spatialData ? (
              <motion.div
                key={`${viewMode}-${activeVar.id}-${activeYear}`}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.3 }}
              >
                {viewMode === "2d"
                  ? <HeatMap2D data={spatialData} variable={activeVar} isDark={isDark} />
                  : <Globe3D   data={spatialData} variable={activeVar} isDark={isDark} />
                }
              </motion.div>
            ) : null}
          </AnimatePresence>
        </div>
      </motion.div>

      {/* ── TIME SLICE SELECTOR ── */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.22 }}
        style={{
          padding: "14px 20px",
          background: "var(--bg-surface)",
          border: "1px solid var(--border-subtle)",
          borderRadius: "var(--radius-lg)",
          display: "flex", alignItems: "center",
          gap: 16, flexWrap: "wrap",
          marginBottom: 20,
        }}
      >
        <span style={{
          fontFamily: "'DM Sans', sans-serif",
          fontSize: 11, fontWeight: 500,
          letterSpacing: "0.08em", textTransform: "uppercase",
          color: "var(--text-tertiary)", whiteSpace: "nowrap",
        }}>
          Time Slice
        </span>

        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          {TIME_SLICES.map((ts) => (
            <button
              key={ts.id}
              className="year-pill"
              onClick={() => handleYearChange(ts.id)}
              style={{
                padding: "5px 14px", borderRadius: 20,
                border: `1px solid ${activeYear === ts.id ? "rgba(212,135,10,0.45)" : "var(--border-default)"}`,
                background: activeYear === ts.id ? "var(--accent-amber-soft)" : "var(--bg-input)",
                color: activeYear === ts.id ? "var(--accent-amber)" : "var(--text-secondary)",
                fontSize: 12, fontWeight: activeYear === ts.id ? 500 : 400,
                cursor: "pointer", fontFamily: "'DM Sans', sans-serif",
              }}
            >
              {ts.label}
            </button>
          ))}
        </div>

        {/* Delta hint */}
        <div style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: 6 }}>
          <span style={{
            fontSize: 11, color: "var(--text-tertiary)",
            fontFamily: "'DM Sans', sans-serif", fontStyle: "italic",
          }}>
            Showing {activeVar.label} for {activeYear}
          </span>
        </div>
      </motion.div>

      {/* ── INFO CARDS ROW ── */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.28 }}
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
          gap: 12,
        }}
      >
        {[
          { label: "Variable",    value: activeVar.label,  unit: activeVar.unit,  icon: activeVar.icon },
          { label: "Year",        value: activeYear,        unit: "CE",            icon: "📅" },
          { label: "View Mode",   value: viewMode === "2d" ? "2D Map" : "3D Globe", unit: viewMode === "3d" ? "orthographic" : "equirectangular", icon: viewMode === "2d" ? "🗺" : "🌍" },
          { label: "Resolution",  value: "0.25°",           unit: "~28 km",        icon: "📐" },
        ].map((item, i) => (
          <div
            key={i}
            style={{
              padding: "14px 16px",
              background: "var(--bg-surface)",
              border: "1px solid var(--border-subtle)",
              borderRadius: "var(--radius-md)",
              display: "flex", alignItems: "center", gap: 12,
            }}
          >
            <span style={{
              fontSize: 20, width: 36, height: 36,
              display: "flex", alignItems: "center",
              justifyContent: "center",
              background: "var(--accent-amber-soft)",
              borderRadius: 8,
            }}>
              {item.icon}
            </span>
            <div>
              <p style={{ fontSize: 10.5, color: "var(--text-tertiary)", margin: "0 0 2px", textTransform: "uppercase", letterSpacing: "0.07em", fontWeight: 500 }}>
                {item.label}
              </p>
              <p style={{ fontSize: 13, color: "var(--text-primary)", margin: 0, fontWeight: 500 }}>
                {item.value}
              </p>
              <p style={{ fontSize: 10.5, color: "var(--accent-amber)", margin: 0, fontStyle: "italic" }}>
                {item.unit}
              </p>
            </div>
          </div>
        ))}
      </motion.div>
    </Layout>
  );
};

export default SpatialView;