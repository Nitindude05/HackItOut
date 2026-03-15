import { Link, useLocation } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { useContext, useState } from "react";
import { ThemeContext } from "../context/ThemeContext";

// ─────────────────────────────────────────────
// NAV CONFIG — backend-compatible structure
// To drive this from an API, replace this array
// with a fetch() call to e.g. GET /api/nav-items
// Each item can carry permissions, badges, etc.
// ─────────────────────────────────────────────
export const NAV_ITEMS = [
  {
    name: "Home",
    path: "/",
    icon: (
      <svg viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4">
        <path d="M10.707 2.293a1 1 0 00-1.414 0l-7 7a1 1 0 001.414 1.414L4 10.414V17a1 1 0 001 1h4a1 1 0 001-1v-3h2v3a1 1 0 001 1h4a1 1 0 001-1v-6.586l.293.293a1 1 0 001.414-1.414l-7-7z" />
      </svg>
    ),
    description: "Overview & quick stats",
  },
  {
    name: "Dashboard",
    path: "/dashboard",
    icon: (
      <svg viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4">
        <path d="M2 10a8 8 0 018-8v8h8a8 8 0 11-16 0z" />
        <path d="M12 2.252A8.014 8.014 0 0117.748 8H12V2.252z" />
      </svg>
    ),
    description: "Climate data overview",
  },
  {
    name: "Spatial View",
    path: "/spatial-view",
    icon: (
      <svg viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4">
        <path fillRule="evenodd" d="M12 1.586l-4 4v12.828l4-4V1.586zM3.707 3.293A1 1 0 002 4v10a1 1 0 00.293.707L6 18.414V5.586L3.707 3.293zM17.707 5.293L14 1.586v12.828l2.293 2.293A1 1 0 0018 16V6a1 1 0 00-.293-.707z" clipRule="evenodd" />
      </svg>
    ),
    description: "Global heatmaps & maps",
    badge: "2D / 3D",
  },
  {
    name: "Temporal Analysis",
    path: "/temporal-analysis",
    icon: (
      <svg viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4">
        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z" clipRule="evenodd" />
      </svg>
    ),
    description: "Time-series trends",
  },
  {
    name: "Dataset Explorer",
    path: "/dataset-explorer",
    icon: (
      <svg viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4">
        <path d="M3 12v3c0 1.657 3.134 3 7 3s7-1.343 7-3v-3c0 1.657-3.134 3-7 3s-7-1.343-7-3z" />
        <path d="M3 7v3c0 1.657 3.134 3 7 3s7-1.343 7-3V7c0 1.657-3.134 3-7 3S3 8.657 3 7z" />
        <path d="M17 5c0 1.657-3.134 3-7 3S3 6.657 3 5s3.134-3 7-3 7 1.343 7 3z" />
      </svg>
    ),
    description: "Browse NetCDF files",
  },
  {
    name: "Comparison",
    path: "/comparison",
    icon: (
      <svg viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4">
        <path d="M8 5a1 1 0 011 1v3h3a1 1 0 110 2H9v3a1 1 0 11-2 0v-3H4a1 1 0 110-2h3V6a1 1 0 011-1z" />
        <path fillRule="evenodd" d="M2 10a8 8 0 1116 0 8 8 0 01-16 0zm8-6a6 6 0 100 12A6 6 0 0010 4z" clipRule="evenodd" />
      </svg>
    ),
    description: "Side-by-side datasets",
    badge: "Bonus",
  },
  {
    name: "Story Mode",
    path: "/story-mode",
    icon: (
      <svg viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4">
        <path d="M9 4.804A7.968 7.968 0 005.5 4c-1.255 0-2.443.29-3.5.804v10A7.969 7.969 0 015.5 14c1.669 0 3.218.51 4.5 1.385A7.962 7.962 0 0114.5 14c1.255 0 2.443.29 3.5.804v-10A7.968 7.968 0 0014.5 4c-1.255 0-2.443.29-3.5.804V12a1 1 0 11-2 0V4.804z" />
      </svg>
    ),
    description: "Guided climate tour",
    badge: "Bonus",
  },
];

// ─────────────────────────────────────────────
// SIDEBAR COMPONENT
// ─────────────────────────────────────────────
const Sidebar = () => {
  const location = useLocation();
  const { theme, toggleTheme } = useContext(ThemeContext);
  const [collapsed, setCollapsed] = useState(false);
  const [hoveredItem, setHoveredItem] = useState(null);

  const isDark = theme === "dark";

  return (
    <>
      {/* ── Google Font import (Playfair Display + DM Sans) ── */}
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:wght@600&family=DM+Sans:wght@300;400;500&display=swap');

        .clima-sidebar {
          font-family: 'DM Sans', sans-serif;
        }
        .clima-logo-text {
          font-family: 'Playfair Display', serif;
        }

        /* Earth-tone CSS variables */
        .clima-sidebar {
          --earth-bark:    #2C1A0E;
          --earth-soil:    #3D2B1F;
          --earth-clay:    #6B3F2A;
          --earth-sand:    #C9A97A;
          --earth-wheat:   #E8D5B0;
          --earth-moss:    #4A5C3A;
          --earth-sage:    #7D9B6B;
          --earth-leaf:    #A8C090;
          --earth-sky:     #5B8FA8;
          --earth-mist:    #C8DDE8;
          --earth-amber:   #D4870A;
          --earth-gold:    #F0C040;
          --badge-bg:      rgba(212,135,10,0.18);
          --badge-text:    #D4870A;
        }

        /* Sidebar bg: rich dark bark in dark mode, warm wheat in light */
        .clima-sidebar.dark-mode {
          background: linear-gradient(180deg, #1C1008 0%, #2C1A0E 40%, #1E2818 100%);
          border-right: 1px solid rgba(201,169,122,0.12);
        }
        .clima-sidebar.light-mode {
          background: linear-gradient(180deg, #F5EDD8 0%, #EDE0C4 50%, #E8F0E0 100%);
          border-right: 1px solid rgba(44,26,14,0.12);
        }

        /* Nav items */
        .clima-nav-item {
          position: relative;
          display: flex;
          align-items: center;
          gap: 10px;
          padding: 10px 14px;
          border-radius: 10px;
          cursor: pointer;
          transition: all 0.22s cubic-bezier(0.4,0,0.2,1);
          text-decoration: none;
          overflow: hidden;
        }
        .clima-nav-item::before {
          content: '';
          position: absolute;
          inset: 0;
          border-radius: 10px;
          opacity: 0;
          transition: opacity 0.22s ease;
        }

        /* Active state */
        .clima-sidebar.dark-mode .clima-nav-item.active {
          background: linear-gradient(135deg, rgba(212,135,10,0.28) 0%, rgba(74,92,58,0.28) 100%);
          border: 1px solid rgba(212,135,10,0.35);
          box-shadow: 0 2px 12px rgba(212,135,10,0.15);
        }
        .clima-sidebar.light-mode .clima-nav-item.active {
          background: linear-gradient(135deg, rgba(107,63,42,0.15) 0%, rgba(74,92,58,0.15) 100%);
          border: 1px solid rgba(107,63,42,0.3);
        }

        /* Hover state */
        .clima-sidebar.dark-mode .clima-nav-item:not(.active):hover {
          background: rgba(201,169,122,0.08);
          border: 1px solid rgba(201,169,122,0.12);
        }
        .clima-sidebar.light-mode .clima-nav-item:not(.active):hover {
          background: rgba(44,26,14,0.07);
          border: 1px solid rgba(44,26,14,0.12);
        }

        /* Default border (invisible, prevents layout shift) */
        .clima-nav-item:not(.active) {
          border: 1px solid transparent;
        }

        /* Active indicator bar */
        .clima-active-bar {
          position: absolute;
          left: 0; top: 20%; bottom: 20%;
          width: 3px;
          border-radius: 0 3px 3px 0;
          background: linear-gradient(180deg, var(--earth-amber), var(--earth-sage));
        }

        /* Icon wrapper */
        .clima-icon {
          flex-shrink: 0;
          width: 32px; height: 32px;
          border-radius: 8px;
          display: flex; align-items: center; justify-content: center;
          transition: all 0.22s ease;
        }
        .clima-sidebar.dark-mode .clima-icon {
          background: rgba(201,169,122,0.1);
          color: var(--earth-sand);
        }
        .clima-sidebar.light-mode .clima-icon {
          background: rgba(44,26,14,0.08);
          color: var(--earth-clay);
        }
        .clima-sidebar.dark-mode .clima-nav-item.active .clima-icon {
          background: rgba(212,135,10,0.22);
          color: var(--earth-gold);
        }
        .clima-sidebar.light-mode .clima-nav-item.active .clima-icon {
          background: rgba(107,63,42,0.15);
          color: var(--earth-clay);
        }

        /* Text */
        .clima-nav-label {
          font-size: 13.5px;
          font-weight: 400;
          letter-spacing: 0.01em;
          transition: color 0.2s ease;
          white-space: nowrap;
        }
        .clima-sidebar.dark-mode .clima-nav-label {
          color: rgba(232,213,176,0.75);
        }
        .clima-sidebar.dark-mode .clima-nav-item.active .clima-nav-label {
          color: var(--earth-wheat);
          font-weight: 500;
        }
        .clima-sidebar.light-mode .clima-nav-label {
          color: rgba(44,26,14,0.65);
        }
        .clima-sidebar.light-mode .clima-nav-item.active .clima-nav-label {
          color: var(--earth-bark);
          font-weight: 500;
        }

        /* Badge */
        .clima-badge {
          margin-left: auto;
          font-size: 9.5px;
          font-weight: 500;
          letter-spacing: 0.04em;
          padding: 2px 7px;
          border-radius: 20px;
          background: var(--badge-bg);
          color: var(--badge-text);
          border: 1px solid rgba(212,135,10,0.25);
          white-space: nowrap;
          text-transform: uppercase;
        }

        /* Tooltip for collapsed mode */
        .clima-tooltip {
          position: absolute;
          left: calc(100% + 12px);
          top: 50%;
          transform: translateY(-50%);
          background: #1C1008;
          color: var(--earth-wheat);
          font-size: 12px;
          padding: 6px 12px;
          border-radius: 8px;
          white-space: nowrap;
          pointer-events: none;
          border: 1px solid rgba(201,169,122,0.2);
          z-index: 100;
          box-shadow: 0 4px 16px rgba(0,0,0,0.4);
        }
        .clima-tooltip::before {
          content: '';
          position: absolute;
          right: 100%; top: 50%;
          transform: translateY(-50%);
          border: 5px solid transparent;
          border-right-color: rgba(201,169,122,0.2);
        }

        /* Theme toggle button */
        .clima-theme-btn {
          width: 100%;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          padding: 9px 14px;
          border-radius: 10px;
          border: 1px solid;
          cursor: pointer;
          font-family: 'DM Sans', sans-serif;
          font-size: 13px;
          font-weight: 400;
          transition: all 0.22s ease;
          letter-spacing: 0.02em;
        }
        .clima-sidebar.dark-mode .clima-theme-btn {
          background: rgba(201,169,122,0.08);
          border-color: rgba(201,169,122,0.2);
          color: var(--earth-sand);
        }
        .clima-sidebar.dark-mode .clima-theme-btn:hover {
          background: rgba(201,169,122,0.14);
          border-color: rgba(212,135,10,0.4);
          color: var(--earth-wheat);
        }
        .clima-sidebar.light-mode .clima-theme-btn {
          background: rgba(44,26,14,0.06);
          border-color: rgba(44,26,14,0.18);
          color: var(--earth-clay);
        }
        .clima-sidebar.light-mode .clima-theme-btn:hover {
          background: rgba(44,26,14,0.12);
          border-color: rgba(107,63,42,0.4);
          color: var(--earth-bark);
        }

        /* Collapse toggle */
        .clima-collapse-btn {
          width: 26px; height: 26px;
          border-radius: 6px;
          border: 1px solid;
          display: flex; align-items: center; justify-content: center;
          cursor: pointer;
          transition: all 0.2s ease;
          flex-shrink: 0;
        }
        .clima-sidebar.dark-mode .clima-collapse-btn {
          border-color: rgba(201,169,122,0.2);
          background: rgba(201,169,122,0.06);
          color: rgba(201,169,122,0.6);
        }
        .clima-sidebar.dark-mode .clima-collapse-btn:hover {
          background: rgba(201,169,122,0.12);
          color: var(--earth-sand);
        }
        .clima-sidebar.light-mode .clima-collapse-btn {
          border-color: rgba(44,26,14,0.2);
          background: rgba(44,26,14,0.04);
          color: rgba(44,26,14,0.5);
        }
        .clima-sidebar.light-mode .clima-collapse-btn:hover {
          background: rgba(44,26,14,0.1);
          color: var(--earth-clay);
        }

        /* Divider */
        .clima-divider {
          height: 1px;
          margin: 6px 14px;
        }
        .clima-sidebar.dark-mode .clima-divider {
          background: rgba(201,169,122,0.1);
        }
        .clima-sidebar.light-mode .clima-divider {
          background: rgba(44,26,14,0.1);
        }

        /* Version chip */
        .clima-version {
          font-size: 10.5px;
          letter-spacing: 0.05em;
          text-transform: uppercase;
        }
        .clima-sidebar.dark-mode .clima-version {
          color: rgba(201,169,122,0.3);
        }
        .clima-sidebar.light-mode .clima-version {
          color: rgba(44,26,14,0.3);
        }

        /* Status dot */
        .clima-status-dot {
          width: 6px; height: 6px;
          border-radius: 50%;
          background: #4CAF50;
          box-shadow: 0 0 0 2px rgba(76,175,80,0.25);
          animation: pulse-dot 2.5s infinite;
          flex-shrink: 0;
        }
        @keyframes pulse-dot {
          0%, 100% { box-shadow: 0 0 0 2px rgba(76,175,80,0.25); }
          50%       { box-shadow: 0 0 0 4px rgba(76,175,80,0.12); }
        }
      `}</style>

      <motion.div
        className={`clima-sidebar ${isDark ? "dark-mode" : "light-mode"} flex flex-col`}
        animate={{ width: collapsed ? 68 : 240 }}
        transition={{ duration: 0.28, ease: [0.4, 0, 0.2, 1] }}
        style={{ minHeight: "100vh", overflow: "hidden", position: "relative" }}
      >
        {/* ── LOGO ROW ── */}
        <div
          className="flex items-center justify-between px-4 py-5"
          style={{ borderBottom: isDark ? "1px solid rgba(201,169,122,0.1)" : "1px solid rgba(44,26,14,0.1)" }}
        >
          <AnimatePresence>
            {!collapsed && (
              <motion.div
                initial={{ opacity: 0, x: -8 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -8 }}
                transition={{ duration: 0.18 }}
                className="flex items-center gap-2 overflow-hidden"
              >
                {/* Logo mark */}
                <div
                  style={{
                    width: 32, height: 32, borderRadius: 9, flexShrink: 0,
                    background: "linear-gradient(135deg, #6B3F2A 0%, #4A5C3A 100%)",
                    display: "flex", alignItems: "center", justifyContent: "center",
                    fontSize: 16,
                  }}
                >
                  🌍
                </div>
                <div>
                  <div
                    className="clima-logo-text"
                    style={{
                      fontSize: 14,
                      fontWeight: 600,
                      color: isDark ? "#E8D5B0" : "#2C1A0E",
                      lineHeight: 1.1,
                      whiteSpace: "nowrap",
                    }}
                  >
                    AeroCast
                  </div>
                  <div className="clima-version" style={{ marginTop: 1 }}>
                    v1.0 · Climate Viz
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Globe icon when collapsed */}
          {collapsed && (
            <div style={{ margin: "0 auto", fontSize: 20 }}>🌍</div>
          )}

          {!collapsed && (
            <button
              className="clima-collapse-btn"
              onClick={() => setCollapsed(true)}
              title="Collapse sidebar"
            >
              <svg viewBox="0 0 16 16" fill="currentColor" width="12" height="12">
                <path d="M11 8L6 3l-.7.7L9.6 8l-4.3 4.3.7.7L11 8z" transform="rotate(180 8 8)" />
              </svg>
            </button>
          )}
        </div>

        {/* ── EXPAND BUTTON (collapsed state) ── */}
        {collapsed && (
          <div className="flex justify-center py-2">
            <button
              className="clima-collapse-btn"
              onClick={() => setCollapsed(false)}
              title="Expand sidebar"
            >
              <svg viewBox="0 0 16 16" fill="currentColor" width="12" height="12">
                <path d="M6 8l5-5-.7-.7L4.6 8l5.7 5.7.7-.7L6 8z" transform="rotate(180 8 8)" />
              </svg>
            </button>
          </div>
        )}

        {/* ── NAV SECTION LABEL ── */}
        <AnimatePresence>
          {!collapsed && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              style={{
                fontSize: 10,
                fontWeight: 500,
                letterSpacing: "0.1em",
                textTransform: "uppercase",
                padding: "14px 18px 6px",
                color: isDark ? "rgba(201,169,122,0.4)" : "rgba(44,26,14,0.35)",
              }}
            >
              Navigation
            </motion.div>
          )}
        </AnimatePresence>

        {/* ── NAV ITEMS ── */}
        <nav className="flex flex-col px-2 gap-1" style={{ flex: 1 }}>
          {NAV_ITEMS.map((item, i) => {
            const active = location.pathname === item.path;
            return (
              <Link
                key={item.path}
                to={item.path}
                style={{ textDecoration: "none", position: "relative" }}
                onMouseEnter={() => setHoveredItem(item.path)}
                onMouseLeave={() => setHoveredItem(null)}
              >
                <motion.div
                  className={`clima-nav-item ${active ? "active" : ""}`}
                  initial={{ opacity: 0, x: -12 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.04, duration: 0.22 }}
                  style={{ justifyContent: collapsed ? "center" : "flex-start" }}
                >
                  {/* Active bar */}
                  {active && <span className="clima-active-bar" />}

                  {/* Icon */}
                  <span className="clima-icon">{item.icon}</span>

                  {/* Label + badge (hidden when collapsed) */}
                  <AnimatePresence>
                    {!collapsed && (
                      <motion.div
                        initial={{ opacity: 0, width: 0 }}
                        animate={{ opacity: 1, width: "auto" }}
                        exit={{ opacity: 0, width: 0 }}
                        transition={{ duration: 0.18 }}
                        style={{ display: "flex", alignItems: "center", gap: 6, overflow: "hidden", flex: 1 }}
                      >
                        <span className="clima-nav-label">{item.name}</span>
                        {item.badge && (
                          <span className="clima-badge">{item.badge}</span>
                        )}
                      </motion.div>
                    )}
                  </AnimatePresence>
                </motion.div>

                {/* Tooltip when collapsed */}
                {collapsed && hoveredItem === item.path && (
                  <motion.div
                    className="clima-tooltip"
                    initial={{ opacity: 0, x: -4 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0 }}
                  >
                    <div style={{ fontWeight: 500, marginBottom: 2 }}>{item.name}</div>
                    <div style={{ opacity: 0.6, fontSize: 11 }}>{item.description}</div>
                  </motion.div>
                )}
              </Link>
            );
          })}
        </nav>

        
      </motion.div>
    </>
  );
};

export default Sidebar;