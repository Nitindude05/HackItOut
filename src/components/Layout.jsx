import { useContext } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useLocation } from "react-router-dom";
import Sidebar from "./Sidebar";
import { ThemeContext } from "../context/ThemeContext";

// ─────────────────────────────────────────────────────────────
// PAGE TITLE MAP — backend-compatible
// In production, replace with: GET /api/page-meta?path=...
// Returns { title, subtitle, breadcrumb[] }
// ─────────────────────────────────────────────────────────────
const PAGE_META = {
  "/":                    { title: "Home",             subtitle: "Welcome to PyClimaExplorer" },
  "/dashboard":           { title: "Dashboard",        subtitle: "Climate data overview" },
  "/spatial-view":        { title: "Spatial View",     subtitle: "Global heatmaps & 3D visualization" },
  "/temporal-analysis":   { title: "Temporal Analysis",subtitle: "Time-series trends & anomalies" },
  "/dataset-explorer":    { title: "Dataset Explorer", subtitle: "Browse & load NetCDF files" },
  "/comparison":          { title: "Comparison Mode",  subtitle: "Side-by-side dataset analysis" },
  "/story-mode":          { title: "Story Mode",       subtitle: "Guided tour of climate anomalies" },
};

// ─────────────────────────────────────────────────────────────
// TOPBAR COMPONENT
// ─────────────────────────────────────────────────────────────
const TopBar = ({ meta, theme }) => {
  const isDark = theme === "dark";

  return (
    <div
      style={{
        height: "var(--topbar-height)",
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        padding: "0 var(--content-padding)",
        borderBottom: "1px solid var(--border-subtle)",
        background: isDark
          ? "rgba(17, 12, 6, 0.85)"
          : "rgba(247, 240, 228, 0.85)",
        backdropFilter: "blur(12px)",
        WebkitBackdropFilter: "blur(12px)",
        position: "sticky",
        top: 0,
        zIndex: 30,
        flexShrink: 0,
      }}
    >
      {/* Left — Page title */}
      <div>
        <AnimatePresence mode="wait">
          <motion.div
            key={meta?.title}
            initial={{ opacity: 0, y: -6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 6 }}
            transition={{ duration: 0.2 }}
          >
            <h2
              style={{
                fontFamily: "'Playfair Display', serif",
                fontSize: "1.05rem",
                fontWeight: 600,
                color: "var(--text-primary)",
                lineHeight: 1.2,
                margin: 0,
              }}
            >
              {meta?.title || "PyClimaExplorer"}
            </h2>
            <p
              style={{
                fontFamily: "'DM Sans', sans-serif",
                fontSize: "11.5px",
                color: "var(--text-tertiary)",
                margin: 0,
                marginTop: 1,
              }}
            >
              {meta?.subtitle || ""}
            </p>
          </motion.div>
        </AnimatePresence>
      </div>

      {/* Right — Status chips */}
      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
        {/* Live data indicator */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 6,
            padding: "5px 12px",
            borderRadius: 20,
            background: "var(--color-success-bg)",
            border: "1px solid rgba(90, 158, 106, 0.2)",
          }}
        >
          <span
            style={{
              width: 6,
              height: 6,
              borderRadius: "50%",
              background: "var(--color-success)",
              display: "inline-block",
              animation: "topbar-pulse 2.5s infinite",
            }}
          />
          <span
            style={{
              fontFamily: "'DM Sans', sans-serif",
              fontSize: 11.5,
              color: "var(--color-success)",
              fontWeight: 500,
            }}
          >
            ERA5 · Live
          </span>
        </div>

        {/* Dataset chip */}
        <div
          style={{
            padding: "5px 12px",
            borderRadius: 20,
            background: "var(--accent-amber-soft)",
            border: "1px solid rgba(212, 135, 10, 0.2)",
            fontFamily: "'DM Sans', sans-serif",
            fontSize: 11.5,
            color: "var(--accent-amber)",
            fontWeight: 500,
          }}
        >
          NetCDF · 2.4 GB
        </div>
      </div>
    </div>
  );
};

// ─────────────────────────────────────────────────────────────
// LAYOUT COMPONENT
// ─────────────────────────────────────────────────────────────
const Layout = ({ children }) => {
  const { theme } = useContext(ThemeContext);
  const location = useLocation();
  const isDark = theme === "dark";

  const pageMeta = PAGE_META[location.pathname] || {
    title: "PyClimaExplorer",
    subtitle: "Climate visualization platform",
  };

  return (
    <>
      {/* Global styles for topbar pulse + page transitions */}
      <style>{`
        @keyframes topbar-pulse {
          0%, 100% { opacity: 1; box-shadow: 0 0 0 2px rgba(90,158,106,0.2); }
          50%       { opacity: 0.7; box-shadow: 0 0 0 4px rgba(90,158,106,0.08); }
        }

        /* Grain texture overlay for depth */
        .clima-grain::after {
          content: '';
          position: fixed;
          inset: 0;
          background-image: url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)'/%3E%3C/svg%3E");
          opacity: ${isDark ? "0.022" : "0.015"};
          pointer-events: none;
          z-index: 9999;
        }

        /* Main content scrollbar */
        .clima-main-content::-webkit-scrollbar { width: 5px; }
        .clima-main-content::-webkit-scrollbar-track { background: transparent; }
        .clima-main-content::-webkit-scrollbar-thumb {
          background: var(--border-default);
          border-radius: 3px;
        }
      `}</style>

      {/* Root layout wrapper — applies grain texture */}
      <div
        className="clima-grain"
        style={{
          display: "flex",
          minHeight: "100vh",
          width: "100%",
          background: "var(--bg-base)",
          position: "relative",
          overflow: "hidden",
        }}
      >
        {/* Ambient background glow blobs — subtle atmosphere */}
        <div
          aria-hidden="true"
          style={{
            position: "fixed",
            top: "-10%",
            right: "10%",
            width: 500,
            height: 500,
            borderRadius: "50%",
            background: isDark
              ? "radial-gradient(circle, rgba(74,92,58,0.07) 0%, transparent 70%)"
              : "radial-gradient(circle, rgba(74,92,58,0.05) 0%, transparent 70%)",
            pointerEvents: "none",
            zIndex: 0,
          }}
        />
        <div
          aria-hidden="true"
          style={{
            position: "fixed",
            bottom: "5%",
            left: "15%",
            width: 400,
            height: 400,
            borderRadius: "50%",
            background: isDark
              ? "radial-gradient(circle, rgba(91,143,168,0.05) 0%, transparent 70%)"
              : "radial-gradient(circle, rgba(91,143,168,0.04) 0%, transparent 70%)",
            pointerEvents: "none",
            zIndex: 0,
          }}
        />

        {/* ── SIDEBAR ── */}
        <div style={{ position: "relative", zIndex: 20, flexShrink: 0 }}>
          <Sidebar />
        </div>

        {/* ── MAIN AREA ── */}
        <div
          style={{
            flex: 1,
            display: "flex",
            flexDirection: "column",
            minWidth: 0,
            position: "relative",
            zIndex: 10,
          }}
        >
          {/* Sticky topbar */}
          <TopBar meta={pageMeta} theme={theme} />

          {/* Scrollable content area */}
          <main
            className="clima-main-content"
            style={{
              flex: 1,
              overflowY: "auto",
              overflowX: "hidden",
              padding: "var(--content-padding)",
              background: "var(--main-bg)",
              backgroundImage: "var(--main-bg-pattern)",
              minHeight: 0,
            }}
          >
            {/* Page transition animation */}
            <AnimatePresence mode="wait">
              <motion.div
                key={location.pathname}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -6 }}
                transition={{
                  duration: 0.28,
                  ease: [0.4, 0, 0.2, 1],
                }}
                style={{
                  maxWidth: "var(--content-max-width)",
                  width: "100%",
                  margin: "0 auto",
                }}
              >
                {children}
              </motion.div>
            </AnimatePresence>
          </main>
        </div>
      </div>
    </>
  );
};

export default Layout;