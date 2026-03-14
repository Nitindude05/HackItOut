import { useState, useEffect, useCallback, useContext } from "react";
import { motion, AnimatePresence } from "framer-motion";
import Layout from "../components/Layout";
import DataControls from "../components/DataControls";
import { ThemeContext } from "../context/ThemeContext";

// ─────────────────────────────────────────────────────────────
// PLOTLY — lazy-loaded to keep bundle small
// Install: npm install react-plotly.js plotly.js-dist-min
// ─────────────────────────────────────────────────────────────
let Plot = null;
try { Plot = (await import("react-plotly.js")).default; } catch (_) {}

// ─────────────────────────────────────────────────────────────
// MOCK DATA GENERATOR
// Replace each function with real API calls:
//   GET /api/heatmap?variable=&yearMin=&yearMax=&lat=&lon=
//   GET /api/timeseries?variable=&yearMin=&yearMax=&lat=&lon=
//   GET /api/summary?variable=&yearMin=&yearMax=
// ─────────────────────────────────────────────────────────────
const generateHeatmapData = (variable) => {
  const lats = Array.from({ length: 36 }, (_, i) => -87.5 + i * 5);
  const lons = Array.from({ length: 72 }, (_, i) => -177.5 + i * 5);
  const z = lats.map((lat) =>
    lons.map((lon) => {
      const base = variable === "temperature"
        ? 15 - Math.abs(lat) * 0.5 + Math.sin(lon * 0.05) * 8
        : variable === "precipitation"
        ? Math.max(0, 4 - Math.abs(lat) * 0.06 + Math.random() * 3)
        : 5 + Math.random() * 10;
      return parseFloat((base + (Math.random() - 0.5) * 4).toFixed(2));
    })
  );
  return { lats, lons, z };
};

const generateTimeSeriesData = (variable, yearMin, yearMax) => {
  const years = [];
  const values = [];
  let base = variable === "temperature" ? 14.5 : variable === "precipitation" ? 2.8 : 6.2;
  for (let y = yearMin; y <= yearMax; y++) {
    years.push(y);
    base += (Math.random() - 0.46) * 0.12;
    values.push(parseFloat((base + Math.sin(y * 0.3) * 0.4).toFixed(3)));
  }
  return { years, values };
};

const generateSummary = (variable, yearMin, yearMax) => ({
  mean:    (variable === "temperature" ? 14.8 : variable === "precipitation" ? 2.9 : 6.5).toFixed(2),
  anomaly: ((Math.random() - 0.4) * 1.2).toFixed(2),
  trend:   ((Math.random() * 0.04) + 0.01).toFixed(3),
  coverage: "Global · 0.25°",
  span: `${yearMin}–${yearMax}`,
  records: `${(yearMax - yearMin + 1) * 365}`,
});

// ─────────────────────────────────────────────────────────────
// STAT CARD
// ─────────────────────────────────────────────────────────────
const StatCard = ({ label, value, unit, sub, accent, index }) => (
  <motion.div
    initial={{ opacity: 0, y: 14 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ delay: 0.08 * index, duration: 0.28 }}
    style={{
      padding: "16px 18px",
      background: "var(--bg-surface)",
      border: "1px solid var(--border-subtle)",
      borderRadius: "var(--radius-lg)",
      boxShadow: "var(--shadow-sm)",
      position: "relative",
      overflow: "hidden",
    }}
  >
    {/* Top accent line */}
    <div style={{
      position: "absolute", top: 0, left: 0, right: 0,
      height: 2,
      background: `linear-gradient(90deg, ${accent}99, transparent)`,
    }} />

    <p style={{
      fontFamily: "'DM Sans', sans-serif",
      fontSize: 10.5, fontWeight: 500,
      letterSpacing: "0.08em", textTransform: "uppercase",
      color: "var(--text-tertiary)", margin: "0 0 8px",
    }}>
      {label}
    </p>
    <div style={{ display: "flex", alignItems: "baseline", gap: 5, marginBottom: 4 }}>
      <span style={{
        fontFamily: "'Playfair Display', serif",
        fontSize: 22, fontWeight: 700,
        color: "var(--text-primary)", lineHeight: 1,
      }}>
        {value}
      </span>
      <span style={{
        fontFamily: "'DM Sans', sans-serif",
        fontSize: 12, color: accent, fontWeight: 500,
      }}>
        {unit}
      </span>
    </div>
    {sub && (
      <p style={{
        fontSize: 11, color: "var(--text-tertiary)",
        margin: 0, fontStyle: "italic",
      }}>
        {sub}
      </p>
    )}
  </motion.div>
);

// ─────────────────────────────────────────────────────────────
// CHART SHELL — handles loading / empty / error states
// ─────────────────────────────────────────────────────────────
const ChartShell = ({ title, subtitle, children, isLoading, isEmpty, action }) => (
  <div style={{
    background: "var(--bg-surface)",
    border: "1px solid var(--border-subtle)",
    borderRadius: "var(--radius-lg)",
    boxShadow: "var(--shadow-sm)",
    overflow: "hidden",
  }}>
    {/* Header */}
    <div style={{
      padding: "16px 20px 12px",
      borderBottom: "1px solid var(--border-subtle)",
      display: "flex", alignItems: "center",
      justifyContent: "space-between",
      background: "linear-gradient(135deg, rgba(74,92,58,0.05) 0%, rgba(212,135,10,0.03) 100%)",
    }}>
      <div>
        <h3 style={{
          fontFamily: "'Playfair Display', serif",
          fontSize: 14, fontWeight: 600,
          color: "var(--text-primary)", margin: 0,
        }}>
          {title}
        </h3>
        {subtitle && (
          <p style={{ fontSize: 11, color: "var(--text-tertiary)", margin: "2px 0 0" }}>
            {subtitle}
          </p>
        )}
      </div>
      {action && (
        <div style={{ display: "flex", gap: 6 }}>{action}</div>
      )}
    </div>

    {/* Body */}
    <div style={{ padding: "16px 20px 20px", minHeight: 340 }}>
      <AnimatePresence mode="wait">
        {isLoading ? (
          <motion.div
            key="loading"
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            style={{
              height: 300, display: "flex", flexDirection: "column",
              alignItems: "center", justifyContent: "center", gap: 14,
            }}
          >
            <motion.div
              animate={{ rotate: 360 }}
              transition={{ duration: 1.4, repeat: Infinity, ease: "linear" }}
              style={{
                width: 36, height: 36, borderRadius: "50%",
                border: "2.5px solid var(--border-default)",
                borderTopColor: "var(--accent-amber)",
              }}
            />
            <span style={{ fontSize: 12, color: "var(--text-tertiary)", fontFamily: "'DM Sans', sans-serif" }}>
              Loading climate data…
            </span>
          </motion.div>
        ) : isEmpty ? (
          <motion.div
            key="empty"
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            style={{
              height: 300, display: "flex", flexDirection: "column",
              alignItems: "center", justifyContent: "center", gap: 12,
            }}
          >
            <div style={{ fontSize: 36, opacity: 0.4 }}>🌍</div>
            <p style={{
              fontSize: 13, color: "var(--text-tertiary)",
              fontFamily: "'DM Sans', sans-serif",
              textAlign: "center", maxWidth: 240, lineHeight: 1.6,
            }}>
              Select a variable and apply dataset controls to visualize data
            </p>
          </motion.div>
        ) : (
          <motion.div
            key="chart"
            initial={{ opacity: 0 }} animate={{ opacity: 1 }}
            transition={{ duration: 0.3 }}
          >
            {children}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  </div>
);

// ─────────────────────────────────────────────────────────────
// PLOTLY HEATMAP
// ─────────────────────────────────────────────────────────────
const HeatmapChart = ({ data, variable, isDark }) => {
  if (!Plot || !data) return (
    <div style={{ height: 300, display: "flex", alignItems: "center", justifyContent: "center" }}>
      <span style={{ fontSize: 12, color: "var(--text-tertiary)", fontFamily: "'DM Sans', sans-serif" }}>
        Install react-plotly.js to enable charts
      </span>
    </div>
  );

  const colorscales = {
    temperature: "RdBu",
    precipitation: "Blues",
    wind_speed: "Viridis",
    default: "Earth",
  };

  return (
    <Plot
      data={[{
        type: "heatmap",
        z: data.z,
        x: data.lons,
        y: data.lats,
        colorscale: colorscales[variable] || colorscales.default,
        reversescale: variable === "temperature",
        colorbar: {
          thickness: 12,
          tickfont: { size: 10, color: isDark ? "#C9A97A" : "#3D2B1F", family: "DM Sans" },
          len: 0.8,
        },
        hovertemplate: "Lat: %{y}°<br>Lon: %{x}°<br>Value: %{z}<extra></extra>",
      }]}
      layout={{
        paper_bgcolor: "transparent",
        plot_bgcolor: "transparent",
        margin: { t: 8, r: 16, b: 36, l: 40 },
        height: 300,
        xaxis: {
          title: { text: "Longitude", font: { size: 11, color: isDark ? "#9A8060" : "#6B5040", family: "DM Sans" } },
          tickfont: { size: 10, color: isDark ? "#9A8060" : "#6B5040", family: "DM Sans" },
          gridcolor: isDark ? "rgba(201,169,122,0.06)" : "rgba(44,26,14,0.07)",
          zerolinecolor: isDark ? "rgba(201,169,122,0.1)" : "rgba(44,26,14,0.12)",
        },
        yaxis: {
          title: { text: "Latitude", font: { size: 11, color: isDark ? "#9A8060" : "#6B5040", family: "DM Sans" } },
          tickfont: { size: 10, color: isDark ? "#9A8060" : "#6B5040", family: "DM Sans" },
          gridcolor: isDark ? "rgba(201,169,122,0.06)" : "rgba(44,26,14,0.07)",
          zerolinecolor: isDark ? "rgba(201,169,122,0.1)" : "rgba(44,26,14,0.12)",
        },
      }}
      config={{ displayModeBar: false, responsive: true }}
      style={{ width: "100%" }}
    />
  );
};

// ─────────────────────────────────────────────────────────────
// PLOTLY TIME SERIES
// ─────────────────────────────────────────────────────────────
const TimeSeriesChart = ({ data, variable, isDark }) => {
  if (!Plot || !data) return null;

  return (
    <Plot
      data={[{
        type: "scatter",
        mode: "lines+markers",
        x: data.years,
        y: data.values,
        line: {
          color: "#D4870A",
          width: 2,
          shape: "spline",
          smoothing: 0.8,
        },
        marker: { size: 4, color: "#D4870A", opacity: 0.7 },
        fill: "tozeroy",
        fillcolor: isDark ? "rgba(212,135,10,0.07)" : "rgba(212,135,10,0.05)",
        hovertemplate: "Year: %{x}<br>Value: %{y}<extra></extra>",
      }]}
      layout={{
        paper_bgcolor: "transparent",
        plot_bgcolor: "transparent",
        margin: { t: 8, r: 16, b: 36, l: 48 },
        height: 280,
        xaxis: {
          tickfont: { size: 10, color: isDark ? "#9A8060" : "#6B5040", family: "DM Sans" },
          gridcolor: isDark ? "rgba(201,169,122,0.06)" : "rgba(44,26,14,0.07)",
          zerolinecolor: "transparent",
        },
        yaxis: {
          tickfont: { size: 10, color: isDark ? "#9A8060" : "#6B5040", family: "DM Sans" },
          gridcolor: isDark ? "rgba(201,169,122,0.06)" : "rgba(44,26,14,0.07)",
          zerolinecolor: "transparent",
        },
        showlegend: false,
      }}
      config={{ displayModeBar: false, responsive: true }}
      style={{ width: "100%" }}
    />
  );
};

// ─────────────────────────────────────────────────────────────
// CHIP BUTTON (chart action)
// ─────────────────────────────────────────────────────────────
const ChipBtn = ({ label, active, onClick }) => (
  <button
    onClick={onClick}
    style={{
      padding: "4px 10px",
      borderRadius: 20,
      border: `1px solid ${active ? "rgba(212,135,10,0.4)" : "var(--border-default)"}`,
      background: active ? "var(--accent-amber-soft)" : "var(--bg-input)",
      color: active ? "var(--accent-amber)" : "var(--text-tertiary)",
      fontSize: 11, fontWeight: active ? 500 : 400,
      cursor: "pointer", fontFamily: "'DM Sans', sans-serif",
      transition: "all 0.15s ease",
    }}
  >
    {label}
  </button>
);

// ─────────────────────────────────────────────────────────────
// DASHBOARD PAGE
// ─────────────────────────────────────────────────────────────
const Dashboard = () => {
  const { theme } = useContext(ThemeContext);
  const isDark = theme === "dark";

  // ── State ──
  const [queryParams, setQueryParams]     = useState(null);
  const [isLoading, setIsLoading]         = useState(false);
  const [heatmapData, setHeatmapData]     = useState(null);
  const [timeSeriesData, setTimeSeriesData] = useState(null);
  const [summary, setSummary]             = useState(null);
  const [mapType, setMapType]             = useState("heatmap");
  const [tsMode, setTsMode]               = useState("annual");

  // ── Triggered by DataControls onApply ──
  // Backend integration:
  //   GET /api/heatmap?variable=&yearMin=&yearMax=&lat=&lon=
  //   GET /api/timeseries?variable=&yearMin=&yearMax=&lat=&lon=
  //   GET /api/summary?variable=&yearMin=&yearMax=
  const handleApply = useCallback(async (params) => {
    setQueryParams(params);
    setIsLoading(true);
    setHeatmapData(null);
    setTimeSeriesData(null);
    setSummary(null);

    try {
      await new Promise((r) => setTimeout(r, 1000)); // ← swap with real fetch
      // const [hm, ts, sm] = await Promise.all([
      //   fetch(`/api/heatmap?${new URLSearchParams(params)}`).then(r => r.json()),
      //   fetch(`/api/timeseries?${new URLSearchParams(params)}`).then(r => r.json()),
      //   fetch(`/api/summary?${new URLSearchParams(params)}`).then(r => r.json()),
      // ]);

      const hm = generateHeatmapData(params.variable);
      const ts = generateTimeSeriesData(params.variable, params.yearMin, params.yearMax);
      const sm = generateSummary(params.variable, params.yearMin, params.yearMax);

      setHeatmapData(hm);
      setTimeSeriesData(ts);
      setSummary(sm);
    } catch (err) {
      console.error("Dashboard: data fetch failed", err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // ── Stat cards derived from summary ──
  const statCards = summary
    ? [
        { label: "Mean Value",     value: summary.mean,     unit: queryParams?.variable === "temperature" ? "°C" : queryParams?.variable === "precipitation" ? "mm/d" : "m/s", accent: "#D4870A", sub: `${summary.span}` },
        { label: "Anomaly",        value: `${summary.anomaly > 0 ? "+" : ""}${summary.anomaly}`, unit: "Δ", accent: Number(summary.anomaly) > 0 ? "#C0524A" : "#5B8FA8", sub: "vs. 1981–2010 baseline" },
        { label: "Trend",          value: `+${summary.trend}`,  unit: "/yr",    accent: "#7D9B6B", sub: "Linear regression" },
        { label: "Data Points",    value: Number(summary.records).toLocaleString(), unit: "records", accent: "#9B6B9B", sub: summary.coverage },
      ]
    : [];

  return (
    <Layout>
      <style>{`
        .dashboard-grid {
          display: grid;
          grid-template-columns: 280px 1fr;
          gap: 20px;
          align-items: start;
        }
        @media (max-width: 900px) {
          .dashboard-grid { grid-template-columns: 1fr; }
        }
      `}</style>

      {/* ── PAGE HEADER ── */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        style={{ marginBottom: 24 }}
      >
        <h1 style={{
          fontFamily: "'Playfair Display', serif",
          fontSize: "clamp(1.5rem, 3vw, 2rem)",
          fontWeight: 700,
          color: "var(--text-primary)",
          margin: "0 0 4px",
        }}>
          Climate Dashboard
        </h1>
        <p style={{
          fontFamily: "'DM Sans', sans-serif",
          fontSize: 13, color: "var(--text-tertiary)", margin: 0,
        }}>
          {queryParams
            ? `Showing ${queryParams.variable.replace("_", " ")} · ${queryParams.yearMin}–${queryParams.yearMax} · ${queryParams.latitude}°N, ${queryParams.longitude}°E`
            : "Apply dataset controls to begin visualization"}
        </p>
      </motion.div>

      {/* ── STAT CARDS (visible after apply) ── */}
      <AnimatePresence>
        {summary && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            style={{ marginBottom: 20, overflow: "hidden" }}
          >
            <div style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))",
              gap: 12,
            }}>
              {statCards.map((s, i) => (
                <StatCard key={i} {...s} index={i} />
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── MAIN GRID: Controls + Charts ── */}
      <div className="dashboard-grid">

        {/* ── LEFT: DataControls ── */}
        <div style={{ position: "sticky", top: "calc(var(--topbar-height) + 20px)" }}>
          <DataControls onApply={handleApply} />
        </div>

        {/* ── RIGHT: Charts stack ── */}
        <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>

          {/* ── HEATMAP ── */}
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.32, delay: 0.1 }}
          >
            <ChartShell
              title="Global Heatmap"
              subtitle={queryParams ? `${queryParams.variable.replace("_", " ")} · ${queryParams.yearMin}–${queryParams.yearMax}` : "Select a dataset to visualize"}
              isLoading={isLoading}
              isEmpty={!heatmapData && !isLoading}
              action={
                heatmapData && (
                  <>
                    <ChipBtn label="Heatmap" active={mapType === "heatmap"} onClick={() => setMapType("heatmap")} />
                    <ChipBtn label="Contour" active={mapType === "contour"} onClick={() => setMapType("contour")} />
                  </>
                )
              }
            >
              <HeatmapChart data={heatmapData} variable={queryParams?.variable} isDark={isDark} />
            </ChartShell>
          </motion.div>

          {/* ── TIME SERIES ── */}
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.32, delay: 0.18 }}
          >
            <ChartShell
              title="Temporal Trends"
              subtitle={queryParams ? `Annual mean · ${queryParams.latitude}°N, ${queryParams.longitude}°E` : "Select a location to see time-series"}
              isLoading={isLoading}
              isEmpty={!timeSeriesData && !isLoading}
              action={
                timeSeriesData && (
                  <>
                    <ChipBtn label="Annual"  active={tsMode === "annual"}  onClick={() => setTsMode("annual")}  />
                    <ChipBtn label="Monthly" active={tsMode === "monthly"} onClick={() => setTsMode("monthly")} />
                    <ChipBtn label="Anomaly" active={tsMode === "anomaly"} onClick={() => setTsMode("anomaly")} />
                  </>
                )
              }
            >
              <TimeSeriesChart data={timeSeriesData} variable={queryParams?.variable} isDark={isDark} />
            </ChartShell>
          </motion.div>

        </div>
      </div>
    </Layout>
  );
};

export default Dashboard;