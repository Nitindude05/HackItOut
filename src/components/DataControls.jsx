import { useState, useCallback, useContext } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ThemeContext } from "../context/ThemeContext";

// ─────────────────────────────────────────────────────────────
// CLIMATE VARIABLES CONFIG — backend-compatible
// Replace with: GET /api/climate-variables
// Returns: [{ id, label, unit, icon, description, colorAccent }]
// ─────────────────────────────────────────────────────────────
const CLIMATE_VARIABLES = [
  {
    id: "temperature",
    label: "Surface Temperature",
    unit: "°C",
    icon: "🌡",
    description: "2m air temperature above ground",
    colorAccent: "#C0524A",
  },
  {
    id: "precipitation",
    label: "Precipitation",
    unit: "mm/day",
    icon: "🌧",
    description: "Total precipitation rate",
    colorAccent: "#5B8FA8",
  },
  {
    id: "wind_speed",
    label: "Wind Speed",
    unit: "m/s",
    icon: "💨",
    description: "10m horizontal wind speed",
    colorAccent: "#7D9B6B",
  },
  {
    id: "sea_level_pressure",
    label: "Sea Level Pressure",
    unit: "hPa",
    icon: "⟳",
    description: "Mean sea level pressure",
    colorAccent: "#9B6B9B",
  },
  {
    id: "humidity",
    label: "Relative Humidity",
    unit: "%",
    icon: "💧",
    description: "Near-surface relative humidity",
    colorAccent: "#4A8B8B",
  },
];

const YEAR_MIN = 1950;
const YEAR_MAX = 2024;

// ─────────────────────────────────────────────────────────────
// DUAL RANGE SLIDER
// ─────────────────────────────────────────────────────────────
const DualRangeSlider = ({ min, max, valueMin, valueMax, onChange }) => {
  const pct = (v) => ((v - min) / (max - min)) * 100;

  const handleMin = (e) => {
    const val = Math.min(Number(e.target.value), valueMax - 1);
    onChange(val, valueMax);
  };
  const handleMax = (e) => {
    const val = Math.max(Number(e.target.value), valueMin + 1);
    onChange(valueMin, val);
  };

  return (
    <div style={{ position: "relative", height: 36, marginTop: 8 }}>
      <style>{`
        .dual-slider input[type=range] {
          position: absolute;
          width: 100%;
          height: 4px;
          background: transparent;
          pointer-events: none;
          appearance: none;
          -webkit-appearance: none;
          top: 50%;
          transform: translateY(-50%);
          outline: none;
        }
        .dual-slider input[type=range]::-webkit-slider-thumb {
          -webkit-appearance: none;
          appearance: none;
          width: 18px;
          height: 18px;
          border-radius: 50%;
          background: var(--accent-amber);
          border: 2.5px solid var(--bg-surface);
          box-shadow: 0 1px 6px rgba(0,0,0,0.35);
          pointer-events: all;
          cursor: grab;
          transition: transform 0.15s ease, box-shadow 0.15s ease;
        }
        .dual-slider input[type=range]::-webkit-slider-thumb:active {
          cursor: grabbing;
          transform: scale(1.18);
          box-shadow: 0 0 0 4px var(--accent-amber-soft);
        }
        .dual-slider input[type=range]::-moz-range-thumb {
          width: 18px; height: 18px;
          border-radius: 50%;
          background: var(--accent-amber);
          border: 2.5px solid var(--bg-surface);
          pointer-events: all;
          cursor: grab;
        }
      `}</style>

      {/* Track background */}
      <div
        style={{
          position: "absolute",
          top: "50%",
          left: 0,
          right: 0,
          height: 4,
          transform: "translateY(-50%)",
          borderRadius: 4,
          background: "var(--border-default)",
        }}
      />
      {/* Active fill */}
      <div
        style={{
          position: "absolute",
          top: "50%",
          left: `${pct(valueMin)}%`,
          width: `${pct(valueMax) - pct(valueMin)}%`,
          height: 4,
          transform: "translateY(-50%)",
          borderRadius: 4,
          background: "linear-gradient(90deg, var(--accent-amber), var(--accent-sage))",
        }}
      />
      <div className="dual-slider" style={{ position: "absolute", inset: 0 }}>
        <input type="range" min={min} max={max} value={valueMin} onChange={handleMin} />
        <input type="range" min={min} max={max} value={valueMax} onChange={handleMax} />
      </div>
    </div>
  );
};

// ─────────────────────────────────────────────────────────────
// COORDINATE INPUT
// ─────────────────────────────────────────────────────────────
const CoordInput = ({ label, value, onChange, min, max, step, placeholder }) => (
  <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
    <label
      style={{
        fontFamily: "'DM Sans', sans-serif",
        fontSize: 11,
        fontWeight: 500,
        letterSpacing: "0.08em",
        textTransform: "uppercase",
        color: "var(--text-tertiary)",
      }}
    >
      {label}
    </label>
    <input
      type="number"
      value={value}
      min={min}
      max={max}
      step={step}
      placeholder={placeholder}
      onChange={(e) => onChange(Number(e.target.value))}
      style={{
        width: "100%",
        padding: "9px 12px",
        fontFamily: "'DM Sans', sans-serif",
        fontSize: 13,
        background: "var(--bg-input)",
        border: "1px solid var(--border-default)",
        borderRadius: "var(--radius-md)",
        color: "var(--text-primary)",
        outline: "none",
        transition: "border-color 0.18s ease, box-shadow 0.18s ease",
      }}
      onFocus={(e) => {
        e.target.style.borderColor = "var(--border-focus)";
        e.target.style.boxShadow = "0 0 0 3px var(--accent-amber-soft)";
      }}
      onBlur={(e) => {
        e.target.style.borderColor = "var(--border-default)";
        e.target.style.boxShadow = "none";
      }}
    />
  </div>
);

// ─────────────────────────────────────────────────────────────
// MAIN COMPONENT
// Props:
//   onApply(params) — called when user clicks Apply
//   params shape: { variable, yearMin, yearMax, latitude, longitude }
// ─────────────────────────────────────────────────────────────
const DataControls = ({ onApply }) => {
  const { theme } = useContext(ThemeContext);
  const isDark = theme === "dark";

  const [selectedVar, setSelectedVar] = useState(CLIMATE_VARIABLES[0]);
  const [yearRange, setYearRange]     = useState([1980, 2020]);
  const [latitude, setLatitude]       = useState(28.6);
  const [longitude, setLongitude]     = useState(77.2);
  const [isLoading, setIsLoading]     = useState(false);
  const [lastApplied, setLastApplied] = useState(null);
  const [dropdownOpen, setDropdownOpen] = useState(false);

  const handleYearChange = useCallback((mn, mx) => setYearRange([mn, mx]), []);

  // ── Backend integration point ──
  // Replace simulation with:
  //   POST /api/query  →  { variable, yearMin, yearMax, latitude, longitude }
  //   Response:         →  { datasetId, status, recordCount }
  const handleApply = async () => {
    setIsLoading(true);
    const params = {
      variable:  selectedVar.id,
      yearMin:   yearRange[0],
      yearMax:   yearRange[1],
      latitude,
      longitude,
    };
    try {
      await new Promise((r) => setTimeout(r, 900)); // ← swap with real fetch
      // const res  = await fetch("/api/query", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(params) });
      // const data = await res.json();
      setLastApplied(params);
      if (onApply) onApply(params);
    } catch (err) {
      console.error("DataControls: query failed", err);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <motion.div
      initial={{ x: -20, opacity: 0 }}
      animate={{ x: 0, opacity: 1 }}
      transition={{ duration: 0.3, ease: [0.4, 0, 0.2, 1] }}
      style={{
        background: "var(--bg-surface)",
        border: "1px solid var(--border-subtle)",
        borderRadius: "var(--radius-lg)",
        boxShadow: "var(--shadow-md)",
        fontFamily: "'DM Sans', sans-serif",
        overflow: "visible",
      }}
    >

      {/* ── HEADER ── */}
      <div
        style={{
          padding: "18px 20px 14px",
          borderBottom: "1px solid var(--border-subtle)",
          background: isDark
            ? "linear-gradient(135deg, rgba(74,92,58,0.08) 0%, rgba(212,135,10,0.05) 100%)"
            : "linear-gradient(135deg, rgba(74,92,58,0.05) 0%, rgba(181,108,8,0.04) 100%)",
          borderRadius: "var(--radius-lg) var(--radius-lg) 0 0",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div
            style={{
              width: 34, height: 34, borderRadius: 9, flexShrink: 0,
              background: "var(--accent-amber-soft)",
              border: "1px solid rgba(212,135,10,0.2)",
              display: "flex", alignItems: "center", justifyContent: "center",
              fontSize: 16,
            }}
          >
            🎛
          </div>
          <div>
            <h3
              style={{
                fontFamily: "'Playfair Display', serif",
                fontSize: 14, fontWeight: 600,
                color: "var(--text-primary)",
                margin: 0, lineHeight: 1.2,
              }}
            >
              Dataset Controls
            </h3>
            <p style={{ fontSize: 11, color: "var(--text-tertiary)", margin: 0, marginTop: 1 }}>
              ERA5 Reanalysis · NetCDF
            </p>
          </div>
        </div>
      </div>

      {/* ── BODY ── */}
      <div style={{ padding: "18px 20px", display: "flex", flexDirection: "column", gap: 22 }}>

        {/* ── CLIMATE VARIABLE SELECT ── */}
        <div>
          <label style={{
            display: "block", fontSize: 11, fontWeight: 500,
            letterSpacing: "0.08em", textTransform: "uppercase",
            color: "var(--text-tertiary)", marginBottom: 8,
          }}>
            Climate Variable
          </label>

          <div style={{ position: "relative" }}>
            {/* Trigger */}
            <button
              onClick={() => setDropdownOpen((v) => !v)}
              style={{
                width: "100%",
                display: "flex", alignItems: "center", gap: 10,
                padding: "10px 14px",
                background: "var(--bg-input)",
                border: `1px solid ${dropdownOpen ? "var(--border-focus)" : "var(--border-default)"}`,
                borderRadius: "var(--radius-md)",
                cursor: "pointer",
                boxShadow: dropdownOpen ? "0 0 0 3px var(--accent-amber-soft)" : "none",
                transition: "all 0.18s ease",
                textAlign: "left",
              }}
            >
              <span style={{
                width: 8, height: 8, borderRadius: "50%", flexShrink: 0,
                background: selectedVar.colorAccent,
                boxShadow: `0 0 6px ${selectedVar.colorAccent}55`,
              }} />
              <span style={{ fontSize: 13, color: "var(--text-primary)", flex: 1 }}>
                {selectedVar.label}
              </span>
              <span style={{
                fontSize: 11, color: "var(--text-tertiary)",
                background: "var(--bg-hover)",
                padding: "2px 7px", borderRadius: 20, fontWeight: 500,
              }}>
                {selectedVar.unit}
              </span>
              <svg viewBox="0 0 16 16" fill="none" width="12" height="12"
                style={{ color: "var(--text-tertiary)", transition: "transform 0.2s", transform: dropdownOpen ? "rotate(180deg)" : "none", flexShrink: 0 }}>
                <path d="M4 6l4 4 4-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
              </svg>
            </button>

            {/* Dropdown list */}
            <AnimatePresence>
              {dropdownOpen && (
                <motion.div
                  initial={{ opacity: 0, y: -6, scaleY: 0.95 }}
                  animate={{ opacity: 1, y: 0, scaleY: 1 }}
                  exit={{ opacity: 0, y: -4, scaleY: 0.97 }}
                  transition={{ duration: 0.16 }}
                  style={{
                    position: "absolute", top: "calc(100% + 6px)", left: 0, right: 0,
                    background: "var(--bg-elevated)",
                    border: "1px solid var(--border-default)",
                    borderRadius: "var(--radius-md)",
                    boxShadow: "var(--shadow-lg)",
                    zIndex: 50, overflow: "hidden",
                    transformOrigin: "top",
                  }}
                >
                  {CLIMATE_VARIABLES.map((v) => (
                    <button
                      key={v.id}
                      onClick={() => { setSelectedVar(v); setDropdownOpen(false); }}
                      style={{
                        width: "100%", display: "flex", alignItems: "center", gap: 10,
                        padding: "10px 14px",
                        background: selectedVar.id === v.id ? "var(--bg-active)" : "transparent",
                        border: "none",
                        borderBottom: "1px solid var(--border-subtle)",
                        cursor: "pointer", textAlign: "left",
                        transition: "background 0.15s ease",
                      }}
                      onMouseEnter={(e) => { if (selectedVar.id !== v.id) e.currentTarget.style.background = "var(--bg-hover)"; }}
                      onMouseLeave={(e) => { if (selectedVar.id !== v.id) e.currentTarget.style.background = "transparent"; }}
                    >
                      <span style={{ fontSize: 15 }}>{v.icon}</span>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontSize: 13, color: "var(--text-primary)", fontWeight: selectedVar.id === v.id ? 500 : 400 }}>
                          {v.label}
                        </div>
                        <div style={{ fontSize: 11, color: "var(--text-tertiary)", marginTop: 1 }}>
                          {v.description}
                        </div>
                      </div>
                      <span style={{ fontSize: 10.5, color: "var(--text-tertiary)", background: "var(--bg-hover)", padding: "2px 6px", borderRadius: 12 }}>
                        {v.unit}
                      </span>
                      {selectedVar.id === v.id && (
                        <svg viewBox="0 0 16 16" fill="none" width="12" height="12" style={{ color: "var(--accent-amber)", flexShrink: 0 }}>
                          <path d="M3 8l4 4 6-7" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                      )}
                    </button>
                  ))}
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>

        {/* ── TIME RANGE ── */}
        <div>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 4 }}>
            <label style={{
              fontSize: 11, fontWeight: 500,
              letterSpacing: "0.08em", textTransform: "uppercase",
              color: "var(--text-tertiary)",
            }}>
              Time Range
            </label>
            <span style={{
              fontSize: 12, fontWeight: 500, color: "var(--accent-amber)",
              background: "var(--accent-amber-soft)",
              padding: "2px 10px", borderRadius: 20,
            }}>
              {yearRange[0]} — {yearRange[1]}
            </span>
          </div>

          <DualRangeSlider
            min={YEAR_MIN} max={YEAR_MAX}
            valueMin={yearRange[0]} valueMax={yearRange[1]}
            onChange={handleYearChange}
          />

          <div style={{ display: "flex", justifyContent: "space-between", marginTop: 6 }}>
            <span style={{ fontSize: 10.5, color: "var(--text-tertiary)" }}>{YEAR_MIN}</span>
            <span style={{ fontSize: 10.5, color: "var(--text-tertiary)", fontStyle: "italic" }}>
              {yearRange[1] - yearRange[0]} yr span
            </span>
            <span style={{ fontSize: 10.5, color: "var(--text-tertiary)" }}>{YEAR_MAX}</span>
          </div>
        </div>

        {/* ── DIVIDER ── */}
        <div style={{ height: 1, background: "var(--border-subtle)", margin: "0 -20px" }} />

        {/* ── COORDINATES ── */}
        <div>
          <label style={{
            display: "block", fontSize: 11, fontWeight: 500,
            letterSpacing: "0.08em", textTransform: "uppercase",
            color: "var(--text-tertiary)", marginBottom: 10,
          }}>
            Location Pin
          </label>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
            <CoordInput label="Latitude"  value={latitude}  onChange={setLatitude}  min={-90}  max={90}  step={0.1} placeholder="28.6" />
            <CoordInput label="Longitude" value={longitude} onChange={setLongitude} min={-180} max={180} step={0.1} placeholder="77.2" />
          </div>

          {/* Location presets */}
          <div style={{ marginTop: 10, display: "flex", gap: 6, flexWrap: "wrap" }}>
            {[
              { label: "New Delhi", lat: 28.6,  lon: 77.2  },
              { label: "Amazon",    lat: -3.4,  lon: -62.2 },
              { label: "Arctic",    lat: 78.2,  lon: 15.6  },
            ].map((p) => (
              <button
                key={p.label}
                onClick={() => { setLatitude(p.lat); setLongitude(p.lon); }}
                style={{
                  fontSize: 11, padding: "4px 10px", borderRadius: 20,
                  border: "1px solid var(--border-default)",
                  background: "var(--bg-input)",
                  color: "var(--text-secondary)",
                  cursor: "pointer", fontFamily: "'DM Sans', sans-serif",
                  transition: "all 0.15s ease",
                }}
                onMouseEnter={(e) => { e.currentTarget.style.borderColor = "var(--accent-amber)"; e.currentTarget.style.color = "var(--accent-amber)"; }}
                onMouseLeave={(e) => { e.currentTarget.style.borderColor = "var(--border-default)"; e.currentTarget.style.color = "var(--text-secondary)"; }}
              >
                {p.label}
              </button>
            ))}
          </div>
        </div>

        {/* ── APPLY BUTTON ── */}
        <motion.button
          onClick={handleApply}
          disabled={isLoading}
          whileTap={{ scale: 0.97 }}
          style={{
            width: "100%", padding: "11px 20px",
            borderRadius: "var(--radius-md)",
            border: "1px solid",
            borderColor: isLoading ? "var(--border-default)" : "rgba(212,135,10,0.4)",
            background: isLoading
              ? "var(--bg-hover)"
              : "linear-gradient(135deg, rgba(212,135,10,0.18) 0%, rgba(74,92,58,0.14) 100%)",
            color: isLoading ? "var(--text-tertiary)" : "var(--accent-amber)",
            fontFamily: "'DM Sans', sans-serif",
            fontSize: 13, fontWeight: 500,
            cursor: isLoading ? "not-allowed" : "pointer",
            display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
            transition: "all 0.2s ease",
            letterSpacing: "0.02em",
          }}
        >
          {isLoading ? (
            <>
              <motion.span
                animate={{ rotate: 360 }}
                transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                style={{ display: "inline-block", fontSize: 14 }}
              >
                ◌
              </motion.span>
              Fetching data…
            </>
          ) : (
            <>
              <svg viewBox="0 0 16 16" fill="currentColor" width="13" height="13">
                <path d="M14 6l-2-2-1.5 1.5L9 4V2H7v2L5.5 5.5 4 4 2 6l1.5 1.5L2 9l1 1 1.5-1L6 10.5V13h4v-2.5L11.5 9l1.5 1 1-1-1.5-1.5L14 6z" />
              </svg>
              Apply & Fetch Data
            </>
          )}
        </motion.button>

        {/* ── SUCCESS SUMMARY ── */}
        <AnimatePresence>
          {lastApplied && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              style={{
                overflow: "hidden",
                borderRadius: "var(--radius-md)",
                border: "1px solid rgba(90,158,106,0.2)",
                background: "var(--color-success-bg)",
                padding: "10px 14px",
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 5 }}>
                <svg viewBox="0 0 16 16" fill="none" width="12" height="12" style={{ color: "var(--color-success)", flexShrink: 0 }}>
                  <path d="M3 8l4 4 6-7" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
                <span style={{ fontSize: 11, fontWeight: 500, color: "var(--color-success)", letterSpacing: "0.05em", textTransform: "uppercase" }}>
                  Query applied
                </span>
              </div>
              <div style={{ fontSize: 11, color: "var(--text-tertiary)", lineHeight: 1.8 }}>
                <div>{CLIMATE_VARIABLES.find((v) => v.id === lastApplied.variable)?.label}</div>
                <div>{lastApplied.yearMin} – {lastApplied.yearMax} · {lastApplied.latitude}°N, {lastApplied.longitude}°E</div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

      </div>
    </motion.div>
  );
};

export default DataControls;