import { useState, useRef, useContext } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Link } from "react-router-dom";
import Layout from "../components/Layout";
import { ThemeContext } from "../context/ThemeContext";

// ─────────────────────────────────────────────────────────────
// FEATURE CARDS CONFIG — backend-compatible
// Replace with: GET /api/features  →  [{ id, icon, title, desc, path, badge }]
// ─────────────────────────────────────────────────────────────
const FEATURES = [
  {
    id: "spatial",
    icon: "🗺",
    title: "Spatial View",
    desc: "Global heatmaps and 3D globe rendering for any climate variable at any time slice.",
    path: "/spatial-view",
    badge: "2D · 3D",
    accent: "#7D9B6B",
    accentSoft: "rgba(125,155,107,0.12)",
  },
  {
    id: "temporal",
    icon: "📈",
    title: "Temporal Analysis",
    desc: "Time-series line plots revealing trends, anomalies and seasonal cycles over decades.",
    path: "/temporal-analysis",
    badge: "1950–2024",
    accent: "#5B8FA8",
    accentSoft: "rgba(91,143,168,0.12)",
  },
  {
    id: "comparison",
    icon: "⚖",
    title: "Comparison Mode",
    desc: "Side-by-side dataset comparisons — contrast 1990 vs 2020 climate conditions instantly.",
    path: "/comparison",
    badge: "Bonus",
    accent: "#D4870A",
    accentSoft: "rgba(212,135,10,0.12)",
  },
  {
    id: "story",
    icon: "📖",
    title: "Story Mode",
    desc: "Guided tours through key climate anomalies — El Niño, Arctic amplification, and more.",
    path: "/story-mode",
    badge: "Bonus",
    accent: "#C0524A",
    accentSoft: "rgba(192,82,74,0.12)",
  },
  {
    id: "explorer",
    icon: "🗄",
    title: "Dataset Explorer",
    desc: "Browse, inspect and load NetCDF files from ERA5, CESM and other reanalysis products.",
    path: "/dataset-explorer",
    badge: "NetCDF",
    accent: "#9B6B9B",
    accentSoft: "rgba(155,107,155,0.12)",
  },
  {
    id: "dashboard",
    icon: "🌡",
    title: "Live Dashboard",
    desc: "Real-time summary of loaded datasets with variable stats and coverage overview.",
    path: "/dashboard",
    badge: "Live",
    accent: "#4A8B8B",
    accentSoft: "rgba(74,139,139,0.12)",
  },
];

// ─────────────────────────────────────────────────────────────
// STATS — backend-compatible
// Replace with: GET /api/stats  →  [{ label, value, unit }]
// ─────────────────────────────────────────────────────────────
const STATS = [
  { label: "Years of data",    value: "74+",  unit: "ERA5"      },
  { label: "Climate variables", value: "5",   unit: "variables" },
  { label: "Spatial coverage", value: "0.25°", unit: "resolution" },
  { label: "File formats",     value: "NetCDF", unit: "supported" },
];

// ─────────────────────────────────────────────────────────────
// UPLOAD MODAL
// Backend: POST /api/upload  multipart/form-data  →  { datasetId, variables[], shape }
// ─────────────────────────────────────────────────────────────
const UploadModal = ({ onClose }) => {
  const [dragging, setDragging]   = useState(false);
  const [file, setFile]           = useState(null);
  const [uploading, setUploading] = useState(false);
  const [done, setDone]           = useState(false);
  const inputRef                  = useRef();

  const handleDrop = (e) => {
    e.preventDefault();
    setDragging(false);
    const f = e.dataTransfer.files[0];
    if (f) setFile(f);
  };

  const handleUpload = async () => {
    if (!file) return;
    setUploading(true);
    try {
      // ── Swap with real upload ──
      await new Promise((r) => setTimeout(r, 1400));
      // const form = new FormData();
      // form.append("file", file);
      // const res  = await fetch("/api/upload", { method: "POST", body: form });
      // const data = await res.json();  // { datasetId, variables[], shape }
      setDone(true);
    } catch (err) {
      console.error("Upload failed", err);
    } finally {
      setUploading(false);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      style={{
        position: "fixed", inset: 0, zIndex: 100,
        display: "flex", alignItems: "center", justifyContent: "center",
        background: "rgba(0,0,0,0.6)",
        backdropFilter: "blur(6px)",
        padding: 24,
      }}
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.94, opacity: 0, y: 16 }}
        animate={{ scale: 1,    opacity: 1, y: 0  }}
        exit={{   scale: 0.96,  opacity: 0, y: 8  }}
        transition={{ duration: 0.24, ease: [0.4,0,0.2,1] }}
        onClick={(e) => e.stopPropagation()}
        style={{
          width: "100%", maxWidth: 480,
          background: "var(--bg-elevated)",
          border: "1px solid var(--border-default)",
          borderRadius: "var(--radius-xl)",
          boxShadow: "var(--shadow-lg)",
          overflow: "hidden",
          fontFamily: "'DM Sans', sans-serif",
        }}
      >
        {/* Modal header */}
        <div style={{
          padding: "20px 24px 16px",
          borderBottom: "1px solid var(--border-subtle)",
          display: "flex", alignItems: "center", justifyContent: "space-between",
        }}>
          <div>
            <h3 style={{
              fontFamily: "'Playfair Display', serif",
              fontSize: 16, fontWeight: 600,
              color: "var(--text-primary)", margin: 0,
            }}>
              Upload Dataset
            </h3>
            <p style={{ fontSize: 12, color: "var(--text-tertiary)", margin: "3px 0 0" }}>
              NetCDF (.nc) files from ERA5, CESM, or compatible sources
            </p>
          </div>
          <button
            onClick={onClose}
            style={{
              width: 28, height: 28, borderRadius: 8,
              border: "1px solid var(--border-default)",
              background: "var(--bg-hover)",
              color: "var(--text-tertiary)",
              cursor: "pointer", display: "flex",
              alignItems: "center", justifyContent: "center",
              fontSize: 14, transition: "all 0.15s",
            }}
          >
            ✕
          </button>
        </div>

        <div style={{ padding: "20px 24px 24px" }}>
          <AnimatePresence mode="wait">
            {done ? (
              <motion.div
                key="done"
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                style={{ textAlign: "center", padding: "24px 0" }}
              >
                <div style={{ fontSize: 40, marginBottom: 12 }}>✅</div>
                <h4 style={{
                  fontFamily: "'Playfair Display', serif",
                  fontSize: 15, color: "var(--text-primary)", marginBottom: 6,
                }}>
                  Dataset loaded successfully
                </h4>
                <p style={{ fontSize: 12, color: "var(--text-tertiary)", marginBottom: 20 }}>
                  {file?.name} · {(file?.size / 1024 / 1024).toFixed(1)} MB
                </p>
                <Link to="/dashboard" style={{ textDecoration: "none" }}>
                  <button style={{
                    padding: "10px 24px", borderRadius: "var(--radius-md)",
                    border: "1px solid rgba(212,135,10,0.4)",
                    background: "linear-gradient(135deg, rgba(212,135,10,0.18) 0%, rgba(74,92,58,0.14) 100%)",
                    color: "var(--accent-amber)", fontSize: 13, fontWeight: 500,
                    cursor: "pointer", fontFamily: "'DM Sans', sans-serif",
                  }}>
                    Go to Dashboard →
                  </button>
                </Link>
              </motion.div>
            ) : (
              <motion.div key="upload">
                {/* Drop zone */}
                <div
                  onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
                  onDragLeave={() => setDragging(false)}
                  onDrop={handleDrop}
                  onClick={() => inputRef.current?.click()}
                  style={{
                    border: `2px dashed ${dragging ? "var(--accent-amber)" : file ? "var(--color-success)" : "var(--border-strong)"}`,
                    borderRadius: "var(--radius-lg)",
                    padding: "32px 20px",
                    textAlign: "center",
                    cursor: "pointer",
                    background: dragging
                      ? "var(--accent-amber-soft)"
                      : file
                      ? "var(--color-success-bg)"
                      : "var(--bg-input)",
                    transition: "all 0.2s ease",
                    marginBottom: 16,
                  }}
                >
                  <input
                    ref={inputRef}
                    type="file"
                    accept=".nc,.nc4,.netcdf"
                    style={{ display: "none" }}
                    onChange={(e) => setFile(e.target.files[0])}
                  />
                  <div style={{ fontSize: 32, marginBottom: 10 }}>
                    {file ? "📦" : "☁"}
                  </div>
                  {file ? (
                    <>
                      <p style={{ fontSize: 13, fontWeight: 500, color: "var(--color-success)", marginBottom: 4 }}>
                        {file.name}
                      </p>
                      <p style={{ fontSize: 11, color: "var(--text-tertiary)" }}>
                        {(file.size / 1024 / 1024).toFixed(2)} MB · Click to change
                      </p>
                    </>
                  ) : (
                    <>
                      <p style={{ fontSize: 13, fontWeight: 500, color: "var(--text-primary)", marginBottom: 4 }}>
                        Drop your NetCDF file here
                      </p>
                      <p style={{ fontSize: 11, color: "var(--text-tertiary)" }}>
                        or click to browse · .nc, .nc4 supported
                      </p>
                    </>
                  )}
                </div>

                {/* Upload button */}
                <motion.button
                  onClick={handleUpload}
                  disabled={!file || uploading}
                  whileTap={{ scale: 0.97 }}
                  style={{
                    width: "100%", padding: "11px",
                    borderRadius: "var(--radius-md)",
                    border: "1px solid",
                    borderColor: !file || uploading ? "var(--border-default)" : "rgba(212,135,10,0.4)",
                    background: !file || uploading
                      ? "var(--bg-hover)"
                      : "linear-gradient(135deg, rgba(212,135,10,0.18) 0%, rgba(74,92,58,0.14) 100%)",
                    color: !file || uploading ? "var(--text-tertiary)" : "var(--accent-amber)",
                    fontSize: 13, fontWeight: 500,
                    cursor: !file || uploading ? "not-allowed" : "pointer",
                    fontFamily: "'DM Sans', sans-serif",
                    display: "flex", alignItems: "center",
                    justifyContent: "center", gap: 8,
                    transition: "all 0.2s ease",
                  }}
                >
                  {uploading ? (
                    <>
                      <motion.span
                        animate={{ rotate: 360 }}
                        transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                        style={{ display: "inline-block" }}
                      >◌</motion.span>
                      Uploading…
                    </>
                  ) : (
                    "Upload & Parse Dataset"
                  )}
                </motion.button>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </motion.div>
    </motion.div>
  );
};

// ─────────────────────────────────────────────────────────────
// FEATURE CARD
// ─────────────────────────────────────────────────────────────
const FeatureCard = ({ feature, index }) => (
  <motion.div
    initial={{ opacity: 0, y: 20 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ delay: 0.55 + index * 0.07, duration: 0.32, ease: [0.4, 0, 0.2, 1] }}
  >
    <Link to={feature.path} style={{ textDecoration: "none", display: "block" }}>
      <motion.div
        whileHover={{ y: -3, boxShadow: "var(--shadow-lg)" }}
        transition={{ duration: 0.2 }}
        style={{
          height: "100%",
          padding: "20px",
          background: "var(--bg-surface)",
          border: "1px solid var(--border-subtle)",
          borderRadius: "var(--radius-lg)",
          boxShadow: "var(--shadow-sm)",
          cursor: "pointer",
          transition: "border-color 0.2s ease",
          position: "relative",
          overflow: "hidden",
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.borderColor = feature.accent + "55";
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.borderColor = "var(--border-subtle)";
        }}
      >
        {/* Subtle top accent line */}
        <div style={{
          position: "absolute", top: 0, left: 0, right: 0,
          height: 2,
          background: `linear-gradient(90deg, ${feature.accent}88, transparent)`,
          borderRadius: "var(--radius-lg) var(--radius-lg) 0 0",
        }} />

        {/* Icon */}
        <div style={{
          width: 40, height: 40, borderRadius: 10,
          background: feature.accentSoft,
          border: `1px solid ${feature.accent}33`,
          display: "flex", alignItems: "center",
          justifyContent: "center", fontSize: 18,
          marginBottom: 14,
        }}>
          {feature.icon}
        </div>

        {/* Title + badge row */}
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
          <h4 style={{
            fontFamily: "'Playfair Display', serif",
            fontSize: 14, fontWeight: 600,
            color: "var(--text-primary)", margin: 0,
          }}>
            {feature.title}
          </h4>
          <span style={{
            fontSize: 10, fontWeight: 500,
            padding: "2px 7px", borderRadius: 20,
            background: feature.accentSoft,
            color: feature.accent,
            border: `1px solid ${feature.accent}33`,
            letterSpacing: "0.04em",
            whiteSpace: "nowrap",
          }}>
            {feature.badge}
          </span>
        </div>

        <p style={{
          fontSize: 12.5, lineHeight: 1.65,
          color: "var(--text-tertiary)", margin: 0,
        }}>
          {feature.desc}
        </p>

        {/* Arrow hint */}
        <div style={{
          marginTop: 14, fontSize: 11,
          color: feature.accent, fontWeight: 500,
          display: "flex", alignItems: "center", gap: 4,
        }}>
          Explore →
        </div>
      </motion.div>
    </Link>
  </motion.div>
);

// ─────────────────────────────────────────────────────────────
// HOME PAGE
// ─────────────────────────────────────────────────────────────
const Home = () => {
  const { theme } = useContext(ThemeContext);
  const isDark = theme === "dark";
  const [uploadOpen, setUploadOpen] = useState(false);

  return (
    <Layout>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,600;0,700;1,600&family=DM+Sans:wght@300;400;500&display=swap');

        .hero-stat-card {
          padding: 16px 20px;
          background: var(--bg-surface);
          border: 1px solid var(--border-subtle);
          border-radius: var(--radius-md);
          text-align: center;
          transition: border-color 0.2s ease, transform 0.2s ease;
        }
        .hero-stat-card:hover {
          border-color: var(--border-default);
          transform: translateY(-2px);
        }
      `}</style>

      {/* ── HERO SECTION ── */}
      <section style={{ paddingTop: 40, paddingBottom: 56, maxWidth: 760, margin: "0 auto", textAlign: "center" }}>

        {/* Eyebrow label */}
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          style={{
            display: "inline-flex", alignItems: "center", gap: 8,
            padding: "5px 14px",
            borderRadius: 20,
            background: "var(--accent-amber-soft)",
            border: "1px solid rgba(212,135,10,0.25)",
            marginBottom: 24,
          }}
        >
          <span style={{ width: 6, height: 6, borderRadius: "50%", background: "var(--accent-amber)", display: "inline-block" }} />
          <span style={{
            fontFamily: "'DM Sans', sans-serif",
            fontSize: 12, fontWeight: 500,
            color: "var(--accent-amber)",
            letterSpacing: "0.06em", textTransform: "uppercase",
          }}>
            ERA5 Reanalysis · NetCDF Visualizer
          </span>
        </motion.div>

        {/* Main headline */}
        <motion.h1
          initial={{ opacity: 0, y: -24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.55, delay: 0.1, ease: [0.4, 0, 0.2, 1] }}
          style={{
            fontFamily: "'Playfair Display', serif",
            fontSize: "clamp(2rem, 5vw, 3.2rem)",
            fontWeight: 700,
            color: "var(--text-primary)",
            lineHeight: 1.18,
            margin: "0 0 20px",
            letterSpacing: "-0.01em",
          }}
        >
          Explore the{" "}
          <em style={{
            fontStyle: "italic",
            color: "var(--accent-amber)",
            position: "relative",
          }}>
            Earth's Climate
          </em>
          {" "}in Real Time
        </motion.h1>

        {/* Subtitle */}
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.35, duration: 0.4 }}
          style={{
            fontFamily: "'DM Sans', sans-serif",
            fontSize: "clamp(14px, 2vw, 16px)",
            fontWeight: 300,
            color: "var(--text-secondary)",
            maxWidth: 560, margin: "0 auto 36px",
            lineHeight: 1.75,
          }}
        >
          An interactive platform for visualizing temperature, precipitation, and wind
          patterns from ERA5 reanalysis datasets — turning raw NetCDF numbers into
          compelling climate stories.
        </motion.p>

        {/* CTA Buttons */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.52, duration: 0.35 }}
          style={{ display: "flex", gap: 12, justifyContent: "center", flexWrap: "wrap" }}
        >
          <Link to="/dashboard" style={{ textDecoration: "none" }}>
            <motion.button
              whileHover={{ scale: 1.03 }}
              whileTap={{ scale: 0.97 }}
              style={{
                padding: "12px 28px",
                borderRadius: "var(--radius-md)",
                border: "1px solid rgba(212,135,10,0.45)",
                background: "linear-gradient(135deg, rgba(212,135,10,0.22) 0%, rgba(74,92,58,0.18) 100%)",
                color: "var(--accent-amber)",
                fontFamily: "'DM Sans', sans-serif",
                fontSize: 14, fontWeight: 500,
                cursor: "pointer",
                display: "flex", alignItems: "center", gap: 8,
                boxShadow: "0 2px 12px rgba(212,135,10,0.15)",
                letterSpacing: "0.01em",
              }}
            >
              <span style={{ fontSize: 16 }}>🌡</span>
              Open Dashboard
            </motion.button>
          </Link>

          <motion.button
            whileHover={{ scale: 1.03 }}
            whileTap={{ scale: 0.97 }}
            onClick={() => setUploadOpen(true)}
            style={{
              padding: "12px 28px",
              borderRadius: "var(--radius-md)",
              border: "1px solid var(--border-default)",
              background: "var(--bg-surface)",
              color: "var(--text-secondary)",
              fontFamily: "'DM Sans', sans-serif",
              fontSize: 14, fontWeight: 400,
              cursor: "pointer",
              display: "flex", alignItems: "center", gap: 8,
              letterSpacing: "0.01em",
            }}
          >
            <span style={{ fontSize: 16 }}>☁</span>
            Upload Dataset
          </motion.button>

          <Link to="/story-mode" style={{ textDecoration: "none" }}>
            <motion.button
              whileHover={{ scale: 1.03 }}
              whileTap={{ scale: 0.97 }}
              style={{
                padding: "12px 28px",
                borderRadius: "var(--radius-md)",
                border: "1px solid rgba(92,82,74,0.3)",
                background: "var(--bg-input)",
                color: "var(--text-secondary)",
                fontFamily: "'DM Sans', sans-serif",
                fontSize: 14, fontWeight: 400,
                cursor: "pointer",
                display: "flex", alignItems: "center", gap: 8,
                letterSpacing: "0.01em",
              }}
            >
              <span style={{ fontSize: 16 }}>📖</span>
              Guided Tour
            </motion.button>
          </Link>
        </motion.div>
      </section>

      {/* ── STATS ROW ── */}
      <motion.section
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.62, duration: 0.35 }}
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))",
          gap: 12,
          marginBottom: 56,
          padding: "0 4px",
        }}
      >
        {STATS.map((stat, i) => (
          <div key={i} className="hero-stat-card">
            <div style={{
              fontFamily: "'Playfair Display', serif",
              fontSize: 22, fontWeight: 700,
              color: "var(--text-primary)",
              marginBottom: 4,
            }}>
              {stat.value}
            </div>
            <div style={{
              fontSize: 11, fontWeight: 500,
              color: "var(--text-tertiary)",
              letterSpacing: "0.06em",
              textTransform: "uppercase",
            }}>
              {stat.label}
            </div>
            <div style={{
              fontSize: 10,
              color: "var(--accent-amber)",
              marginTop: 3,
              fontWeight: 400,
              fontStyle: "italic",
            }}>
              {stat.unit}
            </div>
          </div>
        ))}
      </motion.section>

      {/* ── SECTION LABEL ── */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.52 }}
        style={{ marginBottom: 20 }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <div style={{ height: 1, flex: 1, background: "var(--border-subtle)" }} />
          <span style={{
            fontFamily: "'DM Sans', sans-serif",
            fontSize: 11, fontWeight: 500,
            letterSpacing: "0.1em", textTransform: "uppercase",
            color: "var(--text-tertiary)",
          }}>
            Platform Features
          </span>
          <div style={{ height: 1, flex: 1, background: "var(--border-subtle)" }} />
        </div>
      </motion.div>

      {/* ── FEATURE CARDS GRID ── */}
      <section style={{
        display: "grid",
        gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))",
        gap: 16,
        marginBottom: 64,
      }}>
        {FEATURES.map((feature, i) => (
          <FeatureCard key={feature.id} feature={feature} index={i} />
        ))}
      </section>

      {/* ── FOOTER NOTE ── */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 1.0 }}
        style={{
          textAlign: "center",
          padding: "24px 0 12px",
          borderTop: "1px solid var(--border-subtle)",
        }}
      >
        <p style={{
          fontFamily: "'DM Sans', sans-serif",
          fontSize: 12, color: "var(--text-tertiary)",
          lineHeight: 1.7,
        }}>
          Built for the PyClimaExplorer Hackathon · Powered by ERA5 Reanalysis, Xarray & Plotly
          <br />
          <span style={{ color: "var(--accent-amber)", fontSize: 11 }}>
            Python · React · FastAPI · NetCDF
          </span>
        </p>
      </motion.div>

      {/* ── UPLOAD MODAL ── */}
      <AnimatePresence>
        {uploadOpen && <UploadModal onClose={() => setUploadOpen(false)} />}
      </AnimatePresence>
    </Layout>
  );
};

export default Home;