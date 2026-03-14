import { useState, useCallback, useContext, useMemo, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useNavigate } from "react-router-dom";
import Layout from "../components/Layout";
import { ThemeContext } from "../context/ThemeContext";

// ─────────────────────────────────────────────────────────────
// MOCK DATASET CATALOGUE — backend-compatible
// Replace with: GET /api/datasets  →  [DatasetMeta]
// Each dataset is a NetCDF file already parsed by the backend
// ─────────────────────────────────────────────────────────────
const MOCK_DATASETS = [
  {
    id: "era5_2m_temp",
    name: "ERA5 2m Temperature",
    source: "ECMWF ERA5",
    file: "era5_t2m_1950_2023.nc",
    size: "2.4 GB",
    format: "NetCDF-4",
    status: "ready",
    variables: [
      { id: "t2m",  name: "2m Temperature",      unit: "K → °C", dims: "time × lat × lon", shape: "876 × 721 × 1440", dtype: "float32", missing: 0,   min: -89.2,  max: 56.7,  mean: 14.8  },
      { id: "d2m",  name: "2m Dewpoint Temp",     unit: "K",      dims: "time × lat × lon", shape: "876 × 721 × 1440", dtype: "float32", missing: 0,   min: -90.0,  max: 30.0,  mean: 3.4   },
      { id: "lat",  name: "Latitude",             unit: "°N",     dims: "lat",               shape: "721",              dtype: "float64", missing: 0,   min: -90.0,  max: 90.0,  mean: 0.0   },
      { id: "lon",  name: "Longitude",            unit: "°E",     dims: "lon",               shape: "1440",             dtype: "float64", missing: 0,   min: -180.0, max: 180.0, mean: 0.0   },
      { id: "time", name: "Time",                 unit: "hours since 1900-01-01", dims: "time", shape: "876",           dtype: "int32",   missing: 0,   min: null,   max: null,  mean: null  },
    ],
    coverage: { latMin: -90, latMax: 90, lonMin: -180, lonMax: 180, timeStart: "1950-01", timeEnd: "2023-12", resolution: "0.25°" },
    tags: ["temperature", "ERA5", "global", "reanalysis"],
  },
  {
    id: "era5_precip",
    name: "ERA5 Total Precipitation",
    source: "ECMWF ERA5",
    file: "era5_tp_1979_2023.nc",
    size: "1.8 GB",
    format: "NetCDF-4",
    status: "ready",
    variables: [
      { id: "tp",   name: "Total Precipitation",  unit: "m",      dims: "time × lat × lon", shape: "540 × 721 × 1440", dtype: "float32", missing: 0,   min: 0.0,    max: 0.085, mean: 0.003 },
      { id: "lat",  name: "Latitude",             unit: "°N",     dims: "lat",               shape: "721",              dtype: "float64", missing: 0,   min: -90.0,  max: 90.0,  mean: 0.0   },
      { id: "lon",  name: "Longitude",            unit: "°E",     dims: "lon",               shape: "1440",             dtype: "float64", missing: 0,   min: -180.0, max: 180.0, mean: 0.0   },
      { id: "time", name: "Time",                 unit: "hours since 1900-01-01", dims: "time", shape: "540",           dtype: "int32",   missing: 0,   min: null,   max: null,  mean: null  },
    ],
    coverage: { latMin: -90, latMax: 90, lonMin: -180, lonMax: 180, timeStart: "1979-01", timeEnd: "2023-12", resolution: "0.25°" },
    tags: ["precipitation", "ERA5", "global", "reanalysis"],
  },
  {
    id: "cesm_wind",
    name: "CESM2 Wind Speed",
    source: "NCAR CESM2",
    file: "cesm2_wind_1920_2014.nc",
    size: "3.1 GB",
    format: "NetCDF-3",
    status: "ready",
    variables: [
      { id: "u10",  name: "10m U-wind component", unit: "m/s",    dims: "time × lat × lon", shape: "1140 × 192 × 288", dtype: "float32", missing: 0,   min: -35.2,  max: 42.1,  mean: 0.8   },
      { id: "v10",  name: "10m V-wind component", unit: "m/s",    dims: "time × lat × lon", shape: "1140 × 192 × 288", dtype: "float32", missing: 0,   min: -38.4,  max: 39.6,  mean: 0.2   },
      { id: "ws",   name: "Wind Speed",           unit: "m/s",    dims: "time × lat × lon", shape: "1140 × 192 × 288", dtype: "float32", missing: 0,   min: 0.0,    max: 55.3,  mean: 6.4   },
      { id: "lat",  name: "Latitude",             unit: "°N",     dims: "lat",               shape: "192",              dtype: "float64", missing: 0,   min: -90.0,  max: 90.0,  mean: 0.0   },
      { id: "lon",  name: "Longitude",            unit: "°E",     dims: "lon",               shape: "288",              dtype: "float64", missing: 0,   min: 0.0,    max: 357.5, mean: 180.0 },
    ],
    coverage: { latMin: -90, latMax: 90, lonMin: 0, lonMax: 360, timeStart: "1920-01", timeEnd: "2014-12", resolution: "~1°" },
    tags: ["wind", "CESM2", "global", "model"],
  },
];

const STATUS_CONFIG = {
  ready:      { label: "Ready",      color: "#5A9E6A", bg: "rgba(90,158,106,0.1)",   border: "rgba(90,158,106,0.25)"  },
  loading:    { label: "Loading…",   color: "#D4870A", bg: "rgba(212,135,10,0.1)",   border: "rgba(212,135,10,0.25)"  },
  error:      { label: "Error",      color: "#C0524A", bg: "rgba(192,82,74,0.1)",    border: "rgba(192,82,74,0.25)"   },
  processing: { label: "Processing", color: "#5B8FA8", bg: "rgba(91,143,168,0.1)",   border: "rgba(91,143,168,0.25)"  },
};

const DTYPE_COLOR = { float32: "#D4870A", float64: "#5B8FA8", int32: "#7D9B6B", int64: "#9B6B9B" };

// ─────────────────────────────────────────────────────────────
// SMALL COMPONENTS
// ─────────────────────────────────────────────────────────────
const StatusBadge = ({ status }) => {
  const cfg = STATUS_CONFIG[status] || STATUS_CONFIG.ready;
  return (
    <span style={{
      fontSize: 10.5, fontWeight: 500, padding: "2px 9px",
      borderRadius: 20, letterSpacing: "0.04em",
      background: cfg.bg, color: cfg.color,
      border: `1px solid ${cfg.border}`,
      fontFamily: "'DM Sans', sans-serif",
      whiteSpace: "nowrap",
    }}>
      {cfg.label}
    </span>
  );
};

const Tag = ({ label }) => (
  <span style={{
    fontSize: 10, padding: "2px 7px", borderRadius: 20,
    background: "var(--bg-hover)",
    border: "1px solid var(--border-subtle)",
    color: "var(--text-tertiary)",
    fontFamily: "'DM Sans', sans-serif",
    whiteSpace: "nowrap",
  }}>
    {label}
  </span>
);

const SortIcon = ({ dir }) => (
  <svg viewBox="0 0 12 16" fill="currentColor" width="8" height="10" style={{ opacity: dir ? 1 : 0.3 }}>
    {dir === "asc"  && <path d="M6 2L2 8h8L6 2z"/>}
    {dir === "desc" && <path d="M6 14L2 8h8L6 14z"/>}
    {!dir && <><path d="M6 2L2 7h8L6 2z" opacity="0.4"/><path d="M6 14L2 9h8L6 14z" opacity="0.4"/></>}
  </svg>
);

// ─────────────────────────────────────────────────────────────
// VARIABLE PREVIEW DRAWER
// ─────────────────────────────────────────────────────────────
const VariableDrawer = ({ variable, datasetName, onClose, onLoadDashboard }) => (
  <motion.div
    initial={{ opacity: 0, x: 40 }}
    animate={{ opacity: 1, x: 0 }}
    exit={{ opacity: 0, x: 40 }}
    transition={{ duration: 0.24, ease: [0.4,0,0.2,1] }}
    style={{
      position: "fixed",
      top: 0, right: 0, bottom: 0,
      width: 340,
      background: "var(--bg-elevated)",
      border: "1px solid var(--border-default)",
      borderRight: "none",
      boxShadow: "var(--shadow-lg)",
      zIndex: 60,
      display: "flex",
      flexDirection: "column",
      fontFamily: "'DM Sans', sans-serif",
    }}
  >
    {/* Drawer header */}
    <div style={{
      padding: "18px 20px 14px",
      borderBottom: "1px solid var(--border-subtle)",
      background: "linear-gradient(135deg, rgba(74,92,58,0.08), rgba(212,135,10,0.05))",
    }}>
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 12 }}>
        <div>
          <p style={{ fontSize: 10.5, color: "var(--text-tertiary)", margin: "0 0 4px", textTransform: "uppercase", letterSpacing: "0.08em", fontWeight: 500 }}>
            {datasetName}
          </p>
          <h3 style={{ fontFamily: "'Playfair Display', serif", fontSize: 15, fontWeight: 600, color: "var(--text-primary)", margin: 0, lineHeight: 1.3 }}>
            {variable.name}
          </h3>
          <p style={{ fontSize: 12, color: "var(--accent-amber)", margin: "3px 0 0", fontWeight: 500 }}>
            {variable.unit}
          </p>
        </div>
        <button onClick={onClose} style={{
          width: 28, height: 28, borderRadius: 8,
          border: "1px solid var(--border-default)",
          background: "var(--bg-hover)", color: "var(--text-tertiary)",
          cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center",
          fontSize: 13, flexShrink: 0,
        }}>✕</button>
      </div>
    </div>

    {/* Drawer body */}
    <div style={{ flex: 1, overflowY: "auto", padding: "18px 20px" }}>

      {/* Dimension & shape */}
      <Section label="Structure">
        <MetaRow label="Dimensions" value={variable.dims} />
        <MetaRow label="Shape"      value={variable.shape} />
        <MetaRow label="Data type"
          value={<span style={{ color: DTYPE_COLOR[variable.dtype] || "var(--text-primary)", fontWeight: 500 }}>{variable.dtype}</span>}
        />
        <MetaRow label="Missing values" value={variable.missing === 0 ? "None ✓" : variable.missing.toLocaleString()} />
      </Section>

      {/* Stats */}
      {variable.min !== null && (
        <Section label="Statistics">
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8, marginTop: 4 }}>
            {[
              { label: "Min",  value: variable.min,  color: "#5B8FA8" },
              { label: "Mean", value: variable.mean, color: "#D4870A" },
              { label: "Max",  value: variable.max,  color: "#C0524A" },
            ].map(s => (
              <div key={s.label} style={{ textAlign: "center", padding: "10px 8px", background: "var(--bg-input)", borderRadius: "var(--radius-md)", border: "1px solid var(--border-subtle)" }}>
                <p style={{ fontSize: 10, color: "var(--text-tertiary)", margin: "0 0 4px", textTransform: "uppercase", letterSpacing: "0.06em" }}>{s.label}</p>
                <p style={{ fontFamily: "'Playfair Display', serif", fontSize: 15, fontWeight: 700, color: s.color, margin: 0, lineHeight: 1 }}>{s.value}</p>
                <p style={{ fontSize: 10, color: "var(--text-tertiary)", margin: "2px 0 0" }}>{variable.unit.split("→")[0].trim()}</p>
              </div>
            ))}
          </div>
        </Section>
      )}

      {/* Mini value range bar */}
      {variable.min !== null && (
        <Section label="Value distribution">
          <div style={{ position: "relative", height: 20, background: "var(--border-subtle)", borderRadius: 4, overflow: "hidden", margin: "4px 0 8px" }}>
            <div style={{
              position: "absolute", left: 0, top: 0, bottom: 0,
              width: "100%",
              background: "linear-gradient(90deg, #5B8FA8, #D4870A, #C0524A)",
              borderRadius: 4,
              opacity: 0.75,
            }} />
          </div>
          <div style={{ display: "flex", justifyContent: "space-between" }}>
            <span style={{ fontSize: 10.5, color: "var(--text-tertiary)" }}>{variable.min}</span>
            <span style={{ fontSize: 10.5, color: "var(--text-tertiary)" }}>{variable.mean} (mean)</span>
            <span style={{ fontSize: 10.5, color: "var(--text-tertiary)" }}>{variable.max}</span>
          </div>
        </Section>
      )}
    </div>

    {/* Drawer footer — actions */}
    <div style={{ padding: "14px 20px", borderTop: "1px solid var(--border-subtle)", display: "flex", flexDirection: "column", gap: 8 }}>
      <button
        onClick={() => onLoadDashboard(variable)}
        style={{
          width: "100%", padding: "10px",
          borderRadius: "var(--radius-md)",
          border: "1px solid rgba(212,135,10,0.4)",
          background: "linear-gradient(135deg, rgba(212,135,10,0.18), rgba(74,92,58,0.14))",
          color: "var(--accent-amber)", fontSize: 13, fontWeight: 500,
          cursor: "pointer", fontFamily: "'DM Sans', sans-serif",
          display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
        }}
      >
        🌡 Load into Dashboard
      </button>
      <button onClick={onClose} style={{
        width: "100%", padding: "9px",
        borderRadius: "var(--radius-md)",
        border: "1px solid var(--border-default)",
        background: "transparent",
        color: "var(--text-tertiary)", fontSize: 12,
        cursor: "pointer", fontFamily: "'DM Sans', sans-serif",
      }}>
        Close
      </button>
    </div>
  </motion.div>
);

// Helper sub-components for drawer
const Section = ({ label, children }) => (
  <div style={{ marginBottom: 20 }}>
    <p style={{ fontSize: 10, fontWeight: 500, letterSpacing: "0.09em", textTransform: "uppercase", color: "var(--text-tertiary)", margin: "0 0 10px", borderBottom: "1px solid var(--border-subtle)", paddingBottom: 6 }}>
      {label}
    </p>
    {children}
  </div>
);

const MetaRow = ({ label, value }) => (
  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "5px 0", borderBottom: "1px solid var(--border-subtle)" }}>
    <span style={{ fontSize: 12, color: "var(--text-tertiary)" }}>{label}</span>
    <span style={{ fontSize: 12, color: "var(--text-primary)", fontWeight: 400, textAlign: "right", maxWidth: "60%" }}>{value}</span>
  </div>
);

// ─────────────────────────────────────────────────────────────
// DATASET CARD
// ─────────────────────────────────────────────────────────────
const DatasetCard = ({ dataset, isActive, onSelect }) => (
  <motion.div
    onClick={onSelect}
    whileHover={{ y: -2 }}
    transition={{ duration: 0.15 }}
    style={{
      padding: "16px 18px",
      background: "var(--bg-surface)",
      border: `1px solid ${isActive ? "rgba(212,135,10,0.4)" : "var(--border-subtle)"}`,
      borderRadius: "var(--radius-lg)",
      cursor: "pointer",
      boxShadow: isActive ? "var(--shadow-glow)" : "var(--shadow-sm)",
      transition: "border-color 0.18s, box-shadow 0.18s",
      position: "relative",
      overflow: "hidden",
    }}
  >
    {isActive && (
      <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: 2, background: "linear-gradient(90deg, var(--accent-amber), var(--accent-sage))" }} />
    )}
    <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 10, marginBottom: 10 }}>
      <div style={{ flex: 1, minWidth: 0 }}>
        <h4 style={{ fontFamily: "'Playfair Display', serif", fontSize: 13, fontWeight: 600, color: "var(--text-primary)", margin: "0 0 2px", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
          {dataset.name}
        </h4>
        <p style={{ fontSize: 11, color: "var(--text-tertiary)", margin: 0 }}>{dataset.source}</p>
      </div>
      <StatusBadge status={dataset.status} />
    </div>
    <div style={{ display: "flex", gap: 12, marginBottom: 10 }}>
      {[
        { label: "Format", value: dataset.format },
        { label: "Size",   value: dataset.size   },
        { label: "Vars",   value: dataset.variables.length },
      ].map(item => (
        <div key={item.label}>
          <p style={{ fontSize: 9.5, color: "var(--text-tertiary)", textTransform: "uppercase", letterSpacing: "0.07em", margin: "0 0 2px" }}>{item.label}</p>
          <p style={{ fontSize: 12, color: "var(--text-primary)", fontWeight: 500, margin: 0 }}>{item.value}</p>
        </div>
      ))}
    </div>
    <div style={{ fontSize: 10.5, color: "var(--text-tertiary)", marginBottom: 10, display: "flex", gap: 6 }}>
      <span>🗓 {dataset.coverage.timeStart} → {dataset.coverage.timeEnd}</span>
      <span>·</span>
      <span>📐 {dataset.coverage.resolution}</span>
    </div>
    <div style={{ display: "flex", gap: 5, flexWrap: "wrap" }}>
      {dataset.tags.map(t => <Tag key={t} label={t} />)}
    </div>
  </motion.div>
);

// ─────────────────────────────────────────────────────────────
// DATASET EXPLORER PAGE
// ─────────────────────────────────────────────────────────────
const DatasetExplorer = () => {
  const { theme } = useContext(ThemeContext);
  const isDark = theme === "dark";
  const navigate = useNavigate();
  const fileInputRef = useRef();

  // ── State ──
  const [datasets, setDatasets]         = useState(MOCK_DATASETS);
  const [activeDataset, setActiveDataset] = useState(MOCK_DATASETS[0].id);
  const [search, setSearch]             = useState("");
  const [sortCol, setSortCol]           = useState("name");
  const [sortDir, setSortDir]           = useState("asc");
  const [selectedVar, setSelectedVar]   = useState(null);
  const [uploading, setUploading]       = useState(false);
  const [dragging, setDragging]         = useState(false);

  const dataset = datasets.find(d => d.id === activeDataset) || datasets[0];

  // ── Sorted + filtered variables ──
  const filteredVars = useMemo(() => {
    let vars = dataset.variables.filter(v =>
      v.name.toLowerCase().includes(search.toLowerCase()) ||
      v.unit.toLowerCase().includes(search.toLowerCase()) ||
      v.dims.toLowerCase().includes(search.toLowerCase())
    );
    vars = [...vars].sort((a, b) => {
      const av = a[sortCol] ?? ""; const bv = b[sortCol] ?? "";
      return sortDir === "asc"
        ? String(av).localeCompare(String(bv), undefined, { numeric: true })
        : String(bv).localeCompare(String(av), undefined, { numeric: true });
    });
    return vars;
  }, [dataset, search, sortCol, sortDir]);

  const handleSort = (col) => {
    if (sortCol === col) setSortDir(d => d === "asc" ? "desc" : "asc");
    else { setSortCol(col); setSortDir("asc"); }
  };

  // ── File upload ──
  // Backend: POST /api/datasets/upload  multipart/form-data → DatasetMeta
  const handleUpload = useCallback(async (file) => {
    if (!file || !file.name.match(/\.nc[4]?$/i)) return;
    setUploading(true);
    try {
      await new Promise(r => setTimeout(r, 1600)); // ← swap with real fetch
      // const form = new FormData();
      // form.append("file", file);
      // const res  = await fetch("/api/datasets/upload", { method: "POST", body: form });
      // const meta = await res.json();
      const newDs = {
        id: `upload_${Date.now()}`,
        name: file.name.replace(".nc", "").replace(/_/g, " "),
        source: "User Upload",
        file: file.name,
        size: `${(file.size / 1024 / 1024).toFixed(1)} MB`,
        format: "NetCDF",
        status: "ready",
        variables: MOCK_DATASETS[0].variables, // mock: reuse ERA5 vars
        coverage: MOCK_DATASETS[0].coverage,
        tags: ["uploaded", "custom"],
      };
      setDatasets(prev => [newDs, ...prev]);
      setActiveDataset(newDs.id);
    } catch (err) {
      console.error("Upload failed", err);
    } finally {
      setUploading(false);
    }
  }, []);

  const COLS = [
    { id: "name",    label: "Variable",   width: "28%" },
    { id: "unit",    label: "Unit",       width: "14%" },
    { id: "dims",    label: "Dimensions", width: "20%" },
    { id: "shape",   label: "Shape",      width: "20%" },
    { id: "dtype",   label: "Type",       width: "10%" },
    { id: "actions", label: "",           width: "8%", noSort: true },
  ];

  return (
    <Layout>
      <style>{`
        .explorer-grid { display: grid; grid-template-columns: 280px 1fr; gap: 20px; align-items: start; }
        @media (max-width: 900px) { .explorer-grid { grid-template-columns: 1fr; } }
        .var-row:hover { background: var(--bg-hover) !important; }
        .search-input::placeholder { color: var(--text-disabled); }
        .search-input:focus { border-color: var(--border-focus); box-shadow: 0 0 0 3px var(--accent-amber-soft); }
      `}</style>

      {/* ── PAGE HEADER ── */}
      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} style={{ marginBottom: 24 }}>
        <h1 style={{ fontFamily: "'Playfair Display', serif", fontSize: "clamp(1.5rem,3vw,2rem)", fontWeight: 700, color: "var(--text-primary)", margin: "0 0 4px" }}>
          Dataset Explorer
        </h1>
        <p style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 13, color: "var(--text-tertiary)", margin: 0 }}>
          {datasets.length} dataset{datasets.length > 1 ? "s" : ""} loaded · Browse variables, inspect metadata, load into dashboard
        </p>
      </motion.div>

      <div className="explorer-grid">

        {/* ── LEFT: Dataset list + upload ── */}
        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>

          {/* Upload drop zone */}
          <motion.div
            initial={{ opacity: 0, x: -12 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.06 }}
            onDragOver={e => { e.preventDefault(); setDragging(true); }}
            onDragLeave={() => setDragging(false)}
            onDrop={e => { e.preventDefault(); setDragging(false); handleUpload(e.dataTransfer.files[0]); }}
            onClick={() => fileInputRef.current?.click()}
            style={{
              padding: "18px 16px",
              border: `2px dashed ${dragging ? "var(--accent-amber)" : "var(--border-default)"}`,
              borderRadius: "var(--radius-lg)",
              background: dragging ? "var(--accent-amber-soft)" : "var(--bg-surface)",
              cursor: "pointer", textAlign: "center",
              transition: "all 0.18s ease",
            }}
          >
            <input ref={fileInputRef} type="file" accept=".nc,.nc4" style={{ display: "none" }}
              onChange={e => handleUpload(e.target.files[0])} />
            {uploading ? (
              <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 8 }}>
                <motion.div animate={{ rotate: 360 }} transition={{ duration: 1.2, repeat: Infinity, ease: "linear" }}
                  style={{ width: 28, height: 28, borderRadius: "50%", border: "2.5px solid var(--border-default)", borderTopColor: "var(--accent-amber)" }} />
                <span style={{ fontSize: 12, color: "var(--text-tertiary)", fontFamily: "'DM Sans',sans-serif" }}>Parsing NetCDF…</span>
              </div>
            ) : (
              <>
                <div style={{ fontSize: 24, marginBottom: 8 }}>☁</div>
                <p style={{ fontSize: 13, fontWeight: 500, color: dragging ? "var(--accent-amber)" : "var(--text-primary)", margin: "0 0 3px", fontFamily: "'DM Sans',sans-serif" }}>
                  {dragging ? "Drop to upload" : "Upload NetCDF file"}
                </p>
                <p style={{ fontSize: 11, color: "var(--text-tertiary)", margin: 0, fontFamily: "'DM Sans',sans-serif" }}>
                  .nc · .nc4 · drag & drop or click
                </p>
              </>
            )}
          </motion.div>

          {/* Dataset list */}
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {datasets.map((ds, i) => (
              <motion.div key={ds.id} initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.06 + i * 0.06 }}>
                <DatasetCard dataset={ds} isActive={activeDataset === ds.id} onSelect={() => setActiveDataset(ds.id)} />
              </motion.div>
            ))}
          </div>

          {/* Coverage card for active dataset */}
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.2 }}
            style={{ padding: "14px 16px", background: "var(--bg-surface)", border: "1px solid var(--border-subtle)", borderRadius: "var(--radius-lg)" }}>
            <p style={{ fontSize: 10, fontWeight: 500, letterSpacing: "0.09em", textTransform: "uppercase", color: "var(--text-tertiary)", margin: "0 0 10px", borderBottom: "1px solid var(--border-subtle)", paddingBottom: 6 }}>
              Spatial Coverage
            </p>
            {[
              ["Lat range",   `${dataset.coverage.latMin}° → ${dataset.coverage.latMax}°`],
              ["Lon range",   `${dataset.coverage.lonMin}° → ${dataset.coverage.lonMax}°`],
              ["Resolution",  dataset.coverage.resolution],
              ["Time start",  dataset.coverage.timeStart],
              ["Time end",    dataset.coverage.timeEnd],
            ].map(([k, v]) => (
              <MetaRow key={k} label={k} value={v} />
            ))}
          </motion.div>
        </div>

        {/* ── RIGHT: Variable table ── */}
        <motion.div initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}
          style={{ background: "var(--bg-surface)", border: "1px solid var(--border-subtle)", borderRadius: "var(--radius-lg)", overflow: "hidden", boxShadow: "var(--shadow-sm)" }}>

          {/* Table header */}
          <div style={{ padding: "14px 20px 12px", borderBottom: "1px solid var(--border-subtle)", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, flexWrap: "wrap", background: "linear-gradient(135deg,rgba(74,92,58,0.06),rgba(212,135,10,0.04))" }}>
            <div>
              <h3 style={{ fontFamily: "'Playfair Display', serif", fontSize: 14, fontWeight: 600, color: "var(--text-primary)", margin: "0 0 2px" }}>
                Variables · {dataset.name}
              </h3>
              <p style={{ fontSize: 11, color: "var(--text-tertiary)", margin: 0 }}>
                {filteredVars.length} of {dataset.variables.length} variables · click a row to inspect
              </p>
            </div>
            {/* Search */}
            <div style={{ position: "relative" }}>
              <svg viewBox="0 0 16 16" fill="none" width="13" height="13"
                style={{ position: "absolute", left: 10, top: "50%", transform: "translateY(-50%)", color: "var(--text-tertiary)", pointerEvents: "none" }}>
                <path d="M7 12A5 5 0 107 2a5 5 0 000 10zM14 14l-3-3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
              </svg>
              <input
                className="search-input"
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="Search variables…"
                style={{
                  padding: "7px 12px 7px 30px", width: 200,
                  fontFamily: "'DM Sans',sans-serif", fontSize: 12,
                  background: "var(--bg-input)",
                  border: "1px solid var(--border-default)",
                  borderRadius: "var(--radius-md)",
                  color: "var(--text-primary)",
                  outline: "none", transition: "all 0.18s",
                }}
              />
            </div>
          </div>

          {/* Table */}
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontFamily: "'DM Sans',sans-serif" }}>
              <thead>
                <tr style={{ background: isDark ? "rgba(44,26,14,0.4)" : "rgba(240,232,212,0.5)" }}>
                  {COLS.map(col => (
                    <th key={col.id} style={{ width: col.width, padding: "10px 14px", textAlign: "left", borderBottom: "1px solid var(--border-subtle)", cursor: col.noSort ? "default" : "pointer", userSelect: "none" }}
                      onClick={() => !col.noSort && handleSort(col.id)}>
                      <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
                        <span style={{ fontSize: 10.5, fontWeight: 500, letterSpacing: "0.07em", textTransform: "uppercase", color: "var(--text-tertiary)" }}>
                          {col.label}
                        </span>
                        {!col.noSort && <SortIcon dir={sortCol === col.id ? sortDir : null} />}
                      </div>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                <AnimatePresence>
                  {filteredVars.length === 0 ? (
                    <tr>
                      <td colSpan={COLS.length} style={{ padding: "40px", textAlign: "center" }}>
                        <div style={{ fontSize: 28, marginBottom: 8 }}>🔍</div>
                        <p style={{ fontSize: 13, color: "var(--text-tertiary)" }}>No variables match "{search}"</p>
                      </td>
                    </tr>
                  ) : filteredVars.map((v, i) => (
                    <motion.tr
                      key={v.id}
                      className="var-row"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ delay: i * 0.03 }}
                      onClick={() => setSelectedVar(v)}
                      style={{
                        borderBottom: "1px solid var(--border-subtle)",
                        cursor: "pointer",
                        background: selectedVar?.id === v.id ? "var(--bg-active)" : "transparent",
                        transition: "background 0.15s",
                      }}
                    >
                      <td style={{ padding: "11px 14px" }}>
                        <span style={{ fontSize: 13, fontWeight: 500, color: "var(--text-primary)" }}>{v.name}</span>
                      </td>
                      <td style={{ padding: "11px 14px" }}>
                        <span style={{ fontSize: 12, color: "var(--accent-amber)", background: "var(--accent-amber-soft)", padding: "2px 7px", borderRadius: 12, fontWeight: 500, whiteSpace: "nowrap" }}>
                          {v.unit}
                        </span>
                      </td>
                      <td style={{ padding: "11px 14px" }}>
                        <span style={{ fontSize: 12, color: "var(--text-secondary)", fontFamily: "'DM Sans',monospace" }}>{v.dims}</span>
                      </td>
                      <td style={{ padding: "11px 14px" }}>
                        <span style={{ fontSize: 11.5, color: "var(--text-tertiary)" }}>{v.shape}</span>
                      </td>
                      <td style={{ padding: "11px 14px" }}>
                        <span style={{ fontSize: 11, color: DTYPE_COLOR[v.dtype] || "var(--text-tertiary)", fontWeight: 500, background: (DTYPE_COLOR[v.dtype] || "#888") + "18", padding: "2px 7px", borderRadius: 10 }}>
                          {v.dtype}
                        </span>
                      </td>
                      <td style={{ padding: "11px 14px" }}>
                        <button
                          onClick={e => { e.stopPropagation(); setSelectedVar(v); }}
                          style={{
                            fontSize: 11, padding: "4px 10px", borderRadius: "var(--radius-sm)",
                            border: "1px solid var(--border-default)", background: "var(--bg-hover)",
                            color: "var(--text-secondary)", cursor: "pointer",
                            fontFamily: "'DM Sans',sans-serif", transition: "all 0.15s",
                          }}
                          onMouseEnter={e => { e.currentTarget.style.borderColor = "var(--accent-amber)"; e.currentTarget.style.color = "var(--accent-amber)"; }}
                          onMouseLeave={e => { e.currentTarget.style.borderColor = "var(--border-default)"; e.currentTarget.style.color = "var(--text-secondary)"; }}
                        >
                          Inspect
                        </button>
                      </td>
                    </motion.tr>
                  ))}
                </AnimatePresence>
              </tbody>
            </table>
          </div>

          {/* Table footer */}
          <div style={{ padding: "10px 20px", borderTop: "1px solid var(--border-subtle)", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <span style={{ fontSize: 11, color: "var(--text-tertiary)", fontFamily: "'DM Sans',sans-serif" }}>
              {filteredVars.length} variable{filteredVars.length !== 1 ? "s" : ""} · {dataset.file}
            </span>
            <button
              onClick={() => navigate("/dashboard")}
              style={{
                fontSize: 12, padding: "6px 14px",
                borderRadius: "var(--radius-md)",
                border: "1px solid rgba(212,135,10,0.4)",
                background: "var(--accent-amber-soft)",
                color: "var(--accent-amber)", fontWeight: 500,
                cursor: "pointer", fontFamily: "'DM Sans',sans-serif",
                display: "flex", alignItems: "center", gap: 6,
                transition: "all 0.15s",
              }}
            >
              Open Dashboard →
            </button>
          </div>
        </motion.div>
      </div>

      {/* ── VARIABLE DRAWER ── */}
      <AnimatePresence>
        {selectedVar && (
          <>
            <motion.div
              initial={{ opacity: 0 }} animate={{ opacity: 0.45 }} exit={{ opacity: 0 }}
              onClick={() => setSelectedVar(null)}
              style={{ position: "fixed", inset: 0, background: "#000", zIndex: 55 }}
            />
            <VariableDrawer
              variable={selectedVar}
              datasetName={dataset.name}
              onClose={() => setSelectedVar(null)}
              onLoadDashboard={() => { setSelectedVar(null); navigate("/dashboard"); }}
            />
          </>
        )}
      </AnimatePresence>
    </Layout>
  );
};

export default DatasetExplorer;