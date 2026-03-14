import { useState, useEffect, useCallback, useRef, useContext } from "react";
import { motion, AnimatePresence } from "framer-motion";
import Layout from "../components/Layout";
import { ThemeContext } from "../context/ThemeContext";

// ─────────────────────────────────────────────────────────────
// PLOTLY — lazy loaded
// ─────────────────────────────────────────────────────────────
let Plot = null;
try { Plot = (await import("react-plotly.js")).default; } catch (_) {}

// ─────────────────────────────────────────────────────────────
// STORY CHAPTERS — backend-compatible
// Replace with: GET /api/story/chapters
// Each chapter drives its own visualization and narrative
// ─────────────────────────────────────────────────────────────
const CHAPTERS = [
  {
    id: "warming_trend",
    index: 1,
    title: "A Warming Planet",
    subtitle: "Global Temperature Anomaly · 1880–2023",
    eyebrow: "Chapter 1 · Global Warming",
    summary: "Earth's average surface temperature has risen by approximately 1.2°C since the pre-industrial era. The last decade was the warmest on record.",
    narrative: [
      "Since systematic temperature records began in 1880, Earth's surface has warmed at an accelerating pace.",
      "The most striking shift occurred post-1980 — warming rates tripled compared to the previous century.",
      "2023 marked the hottest year ever recorded, with anomalies exceeding +1.4°C above the 1951–1980 baseline.",
    ],
    anomalyHighlights: [
      { year: 1988, label: "Hansen's Congress testimony", color: "#D4870A" },
      { year: 1998, label: "Strong El Niño spike",        color: "#C0524A" },
      { year: 2016, label: "Record +1.2°C anomaly",       color: "#C0524A" },
      { year: 2023, label: "All-time record",             color: "#8B2500" },
    ],
    accentColor: "#C0524A",
    icon: "🌡",
    chartType: "timeseries",
    variable: "temperature",
    stats: [
      { label: "Warming since 1880",  value: "+1.2°C", color: "#C0524A" },
      { label: "Warmest decade",      value: "2010s",   color: "#D4870A" },
      { label: "Rate (post-1980)",    value: "0.19°C/decade", color: "#C0524A" },
      { label: "2023 anomaly",        value: "+1.45°C", color: "#8B2500" },
    ],
  },
  {
    id: "arctic_amplification",
    index: 2,
    title: "Arctic in Crisis",
    subtitle: "Arctic Sea Ice Extent · 1979–2023",
    eyebrow: "Chapter 2 · Arctic Amplification",
    summary: "The Arctic is warming 3–4× faster than the global average — a phenomenon known as Arctic amplification. Sea ice extent has shrunk by ~13% per decade.",
    narrative: [
      "The Arctic acts as Earth's air conditioner, reflecting solar energy back to space through its bright ice surface.",
      "As ice melts, dark ocean water absorbs more heat — a self-reinforcing feedback loop called the ice-albedo effect.",
      "September sea ice — the annual minimum — has declined from ~7.5 million km² in 1980 to under 4.5 million km² today.",
    ],
    anomalyHighlights: [
      { year: 1985, label: "Pre-decline baseline",     color: "#5B8FA8" },
      { year: 2007, label: "First record low",         color: "#D4870A" },
      { year: 2012, label: "All-time minimum record",  color: "#C0524A" },
      { year: 2020, label: "Second-lowest on record",  color: "#C0524A" },
    ],
    accentColor: "#5B8FA8",
    icon: "🧊",
    chartType: "timeseries",
    variable: "ice_extent",
    stats: [
      { label: "Decline rate",     value: "−13%/decade", color: "#5B8FA8" },
      { label: "2012 minimum",     value: "3.41M km²",   color: "#C0524A" },
      { label: "Warming vs global", value: "3–4×",       color: "#D4870A" },
      { label: "Ice lost since '80", value: "~3M km²",   color: "#C0524A" },
    ],
  },
  {
    id: "precip_shift",
    index: 3,
    title: "Shifting Rainfall",
    subtitle: "Precipitation Anomaly · Global Distribution",
    eyebrow: "Chapter 3 · Hydrological Cycle",
    summary: "A warmer atmosphere holds more moisture. Wet regions are getting wetter, dry regions drier — intensifying floods, droughts and monsoon variability.",
    narrative: [
      "The Clausius-Clapeyron relation tells us that for every 1°C of warming, the atmosphere can hold ~7% more moisture.",
      "This intensifies precipitation extremes: heavy rainfall events have increased 30% in frequency since 1980.",
      "Meanwhile, subtropical dry zones are expanding poleward, threatening food production across the Sahel, Mediterranean and southwestern USA.",
    ],
    anomalyHighlights: [
      { year: 1991, label: "Pinatubo drying effect",   color: "#7D9B6B" },
      { year: 2010, label: "Pakistan megaflood",       color: "#5B8FA8" },
      { year: 2018, label: "Record monsoon variability", color: "#D4870A" },
      { year: 2022, label: "Pakistan floods again",   color: "#C0524A" },
    ],
    accentColor: "#7D9B6B",
    icon: "🌧",
    chartType: "heatmap",
    variable: "precipitation",
    stats: [
      { label: "Moisture increase",    value: "+7%/°C",   color: "#7D9B6B" },
      { label: "Extreme events rise",  value: "+30%",     color: "#C0524A" },
      { label: "Dry zone expansion",   value: "~500 km",  color: "#D4870A" },
      { label: "Flood damage increase", value: "3×",      color: "#5B8FA8" },
    ],
  },
  {
    id: "sea_level",
    index: 4,
    title: "Rising Seas",
    subtitle: "Global Mean Sea Level · 1993–2023",
    eyebrow: "Chapter 4 · Sea Level Rise",
    summary: "Global mean sea level has risen ~100mm since 1993, driven by thermal expansion of the oceans and melting of glaciers and ice sheets.",
    narrative: [
      "Satellite altimetry has tracked sea level with millimetre precision since 1993, revealing an accelerating rise.",
      "The rate has doubled — from 2.1mm/yr in the early 1990s to over 4.3mm/yr in the 2020s.",
      "By 2100, sea level could rise 0.3–1.0 m under current trajectories, threatening 1 billion coastal inhabitants.",
    ],
    anomalyHighlights: [
      { year: 1998, label: "El Niño dip then surge",   color: "#5B8FA8" },
      { year: 2011, label: "La Niña temporary drop",   color: "#7D9B6B" },
      { year: 2019, label: "Rate acceleration evident",color: "#D4870A" },
      { year: 2022, label: "New record high",          color: "#C0524A" },
    ],
    accentColor: "#4A8B8B",
    icon: "🌊",
    chartType: "timeseries",
    variable: "sea_level",
    stats: [
      { label: "Rise since 1993",   value: "+101mm",    color: "#4A8B8B" },
      { label: "Current rate",      value: "4.3mm/yr",  color: "#D4870A" },
      { label: "Rate acceleration", value: "+0.08mm/yr²", color: "#C0524A" },
      { label: "Projected 2100",    value: "0.3–1.0m",  color: "#C0524A" },
    ],
  },
  {
    id: "extreme_events",
    index: 5,
    title: "Extreme Weather",
    subtitle: "Frequency of Climate Extremes · 1950–2023",
    eyebrow: "Chapter 5 · Extreme Events",
    summary: "Heat waves, category 4–5 hurricanes, and billion-dollar weather disasters have increased dramatically in frequency and intensity.",
    narrative: [
      "What was once a 1-in-50-year heat wave now occurs every 5–10 years across large parts of the world.",
      "The proportion of Category 4 and 5 tropical cyclones has roughly doubled since the 1980s.",
      "Economic losses from climate-related disasters surpassed $300 billion in 2022 — five times the 1980s average.",
    ],
    anomalyHighlights: [
      { year: 1988, label: "North American drought",   color: "#D4870A" },
      { year: 2003, label: "European heat wave — 70k deaths", color: "#C0524A" },
      { year: 2017, label: "Hurricane Harvey / Irma / Maria", color: "#8B2500" },
      { year: 2021, label: "Pacific Northwest 49.6°C record", color: "#8B2500" },
    ],
    accentColor: "#D4870A",
    icon: "⚡",
    chartType: "bar",
    variable: "extremes",
    stats: [
      { label: "Heat wave frequency",  value: "5–10×",     color: "#C0524A" },
      { label: "Cat 4–5 hurricanes",   value: "2× since '80", color: "#D4870A" },
      { label: "2022 disaster losses", value: "$300B",      color: "#D4870A" },
      { label: "vs 1980s baseline",    value: "5× increase", color: "#8B2500" },
    ],
  },
];

// ─────────────────────────────────────────────────────────────
// MOCK CHART DATA GENERATORS
// Replace each with: GET /api/story/chapter-data?id=
// ─────────────────────────────────────────────────────────────
const getChartData = (chapter) => {
  if (chapter.variable === "temperature") {
    const years = Array.from({ length: 144 }, (_, i) => 1880 + i);
    const base  = -0.4;
    let v = base;
    const values = years.map(y => {
      v += 0.007 + (Math.random() - 0.47) * 0.08 + (y > 1980 ? 0.004 : 0);
      return parseFloat(v.toFixed(3));
    });
    const rolling = values.map((_, i) => {
      const w = values.slice(Math.max(0, i-4), i+5);
      return parseFloat((w.reduce((a,b) => a+b,0)/w.length).toFixed(3));
    });
    return { years, values, rolling };
  }
  if (chapter.variable === "ice_extent") {
    const years = Array.from({ length: 45 }, (_, i) => 1979 + i);
    let v = 7.4;
    const values = years.map(y => {
      v -= 0.06 + (Math.random() - 0.3) * 0.15;
      return parseFloat(Math.max(3.2, v).toFixed(3));
    });
    return { years, values };
  }
  if (chapter.variable === "sea_level") {
    const years = Array.from({ length: 31 }, (_, i) => 1993 + i);
    let v = 0;
    const values = years.map(y => {
      v += 3.2 + (y > 2012 ? 0.6 : 0) + (Math.random() - 0.3) * 2;
      return parseFloat(v.toFixed(1));
    });
    return { years, values };
  }
  if (chapter.variable === "precipitation") {
    const lats = Array.from({ length: 19 }, (_, i) => -90 + i * 10);
    const lons = Array.from({ length: 37 }, (_, i) => -180 + i * 10);
    const z = lats.map(lat =>
      lons.map(lon => parseFloat(((Math.random() - 0.5) * 8 - Math.abs(lat) * 0.03 + Math.cos(lon * 0.05) * 2).toFixed(2)))
    );
    return { lats, lons, z };
  }
  if (chapter.variable === "extremes") {
    const decades = ["1950s","1960s","1970s","1980s","1990s","2000s","2010s","2020s"];
    const values  = [12, 14, 18, 24, 35, 52, 78, 95];
    return { decades, values };
  }
  return null;
};

// ─────────────────────────────────────────────────────────────
// CHAPTER CHART
// ─────────────────────────────────────────────────────────────
const ChapterChart = ({ chapter, isDark }) => {
  const data = getChartData(chapter);
  if (!Plot || !data) return (
    <div style={{ height: 260, display:"flex", alignItems:"center", justifyContent:"center", flexDirection:"column", gap:10 }}>
      <span style={{ fontSize:32, opacity:0.3 }}>📊</span>
      <p style={{ fontSize:12, color:"var(--text-tertiary)", fontFamily:"'DM Sans',sans-serif" }}>Install react-plotly.js to enable charts</p>
    </div>
  );

  const axisStyle = {
    tickfont: { size: 10, color: isDark ? "#9A8060" : "#6B5040", family: "DM Sans" },
    gridcolor: isDark ? "rgba(201,169,122,0.07)" : "rgba(44,26,14,0.07)",
    zerolinecolor: isDark ? "rgba(201,169,122,0.15)" : "rgba(44,26,14,0.15)",
  };
  const baseLayout = {
    paper_bgcolor: "transparent", plot_bgcolor: "transparent",
    margin: { t: 8, r: 20, b: 40, l: 52 }, height: 260,
    showlegend: false,
    hovermode: "x unified",
    hoverlabel: { bgcolor: isDark?"#231508":"#FFF8EE", bordercolor: isDark?"rgba(201,169,122,0.3)":"rgba(44,26,14,0.2)", font:{ size:11, color: isDark?"#E8D5B0":"#1E1009", family:"DM Sans" } },
    xaxis: axisStyle, yaxis: axisStyle,
  };

  // Timeseries
  if (chapter.chartType === "timeseries" && data.years) {
    const traces = [{
      type: "scatter", mode: "lines",
      x: data.years, y: data.values,
      line: { color: chapter.accentColor + "55", width: 1 },
      showlegend: false, hoverinfo: "skip",
    }];
    if (data.rolling) traces.push({
      type: "scatter", mode: "lines",
      x: data.years, y: data.rolling,
      name: "10-yr rolling mean",
      line: { color: chapter.accentColor, width: 2.5, shape: "spline", smoothing: 0.8 },
      fill: "tozeroy",
      fillcolor: chapter.accentColor + "10",
      hovertemplate: `%{y:.3f}<br>%{x}<extra></extra>`,
    });
    // Annotation markers for anomaly highlights
    const annotations = (chapter.anomalyHighlights || []).map(h => ({
      x: h.year, y: data.rolling
        ? data.rolling[data.years.indexOf(Math.min(...data.years.filter(y=>y>=h.year)))]
        : data.values[data.years.indexOf(Math.min(...data.years.filter(y=>y>=h.year)))],
      xref: "x", yref: "y",
      text: `${h.year}`,
      showarrow: true,
      arrowhead: 2, arrowsize: 0.8, arrowwidth: 1.2,
      arrowcolor: h.color,
      ax: 0, ay: -28,
      font: { size: 9, color: h.color, family: "DM Sans" },
      bgcolor: h.color + "18",
      bordercolor: h.color + "55",
      borderwidth: 1,
      borderpad: 3,
      opacity: 0.85,
    }));

    return (
      <Plot data={traces}
        layout={{ ...baseLayout, annotations, yaxis: { ...axisStyle, zeroline: chapter.variable === "temperature" } }}
        config={{ displayModeBar: false, responsive: true }} style={{ width: "100%" }} />
    );
  }

  // Precipitation heatmap
  if (chapter.chartType === "heatmap") {
    return (
      <Plot
        data={[{
          type: "heatmap", z: data.z, x: data.lons, y: data.lats,
          colorscale: "RdBu", reversescale: false, zmid: 0,
          zmin: -8, zmax: 8,
          colorbar: { title:{ text:"Δmm/day", font:{ size:10, color: isDark?"#9A8060":"#6B5040", family:"DM Sans" } }, thickness:10, tickfont:{ size:9, color: isDark?"#C9A97A":"#4A3020", family:"DM Sans" }, len:0.8 },
          hovertemplate: "Δ: %{z:.2f} mm/day<extra></extra>",
        }]}
        layout={{ ...baseLayout, margin:{ t:4, r:70, b:36, l:36 }, xaxis:{ ...axisStyle, dtick:60 }, yaxis:{ ...axisStyle, dtick:30 } }}
        config={{ displayModeBar: false, responsive: true }} style={{ width: "100%" }} />
    );
  }

  // Bar chart for extremes
  if (chapter.chartType === "bar") {
    return (
      <Plot
        data={[{
          type: "bar", x: data.decades, y: data.values,
          marker: {
            color: data.decades.map((_, i) => {
              const t = i / (data.decades.length - 1);
              return `rgba(${Math.round(74 + t * 118)}, ${Math.round(92 - t * 50)}, ${Math.round(58 - t * 20)}, 0.85)`;
            }),
            line: { width: 0 },
          },
          hovertemplate: "%{x}: %{y} events<extra></extra>",
        }]}
        layout={{ ...baseLayout, bargap: 0.25, yaxis: { ...axisStyle, title:{ text:"Events", font:{size:11, color: isDark?"#9A8060":"#6B5040", family:"DM Sans"} } } }}
        config={{ displayModeBar: false, responsive: true }} style={{ width: "100%" }} />
    );
  }

  return null;
};

// ─────────────────────────────────────────────────────────────
// CHAPTER THUMBNAIL (nav panel)
// ─────────────────────────────────────────────────────────────
const ChapterThumb = ({ chapter, isActive, isCompleted, onClick }) => (
  <button
    onClick={onClick}
    style={{
      width: "100%", display: "flex", alignItems: "center", gap: 10,
      padding: "10px 12px",
      borderRadius: "var(--radius-md)",
      border: `1px solid ${isActive ? chapter.accentColor + "55" : "var(--border-subtle)"}`,
      background: isActive ? chapter.accentColor + "0E" : "transparent",
      cursor: "pointer", textAlign: "left",
      transition: "all 0.18s ease",
      position: "relative",
      overflow: "hidden",
    }}
  >
    {isActive && (
      <div style={{ position:"absolute", left:0, top:0, bottom:0, width:3, background: chapter.accentColor, borderRadius:"0 3px 3px 0" }} />
    )}
    <span style={{
      width:32, height:32, borderRadius:8, flexShrink:0,
      background: isActive ? chapter.accentColor + "22" : "var(--bg-hover)",
      border: `1px solid ${isActive ? chapter.accentColor + "44" : "var(--border-subtle)"}`,
      display:"flex", alignItems:"center", justifyContent:"center", fontSize:16,
    }}>
      {isCompleted && !isActive ? "✓" : chapter.icon}
    </span>
    <div style={{ flex:1, minWidth:0 }}>
      <p style={{ fontSize:12, fontWeight: isActive ? 500 : 400, color: isActive ? "var(--text-primary)" : "var(--text-secondary)", margin:0, whiteSpace:"nowrap", overflow:"hidden", textOverflow:"ellipsis" }}>
        {chapter.title}
      </p>
      <p style={{ fontSize:10, color:"var(--text-tertiary)", margin:0 }}>
        Ch. {chapter.index} of {CHAPTERS.length}
      </p>
    </div>
    {isCompleted && !isActive && (
      <svg viewBox="0 0 16 16" fill="none" width="12" height="12" style={{ color:"var(--color-success)", flexShrink:0 }}>
        <path d="M3 8l4 4 6-7" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
      </svg>
    )}
  </button>
);

// ─────────────────────────────────────────────────────────────
// STORY MODE PAGE
// ─────────────────────────────────────────────────────────────
const StoryMode = () => {
  const { theme } = useContext(ThemeContext);
  const isDark = theme === "dark";

  const [currentIdx, setCurrentIdx]     = useState(0);
  const [completed, setCompleted]       = useState(new Set());
  const [autoPlay, setAutoPlay]         = useState(false);
  const [narrativeIdx, setNarrativeIdx] = useState(0);
  const [isTransitioning, setIsTransitioning] = useState(false);
  const autoRef = useRef(null);

  const chapter = CHAPTERS[currentIdx];

  // ── Navigation ──
  const goTo = useCallback((idx) => {
    if (idx < 0 || idx >= CHAPTERS.length || isTransitioning) return;
    setIsTransitioning(true);
    setCompleted(prev => new Set([...prev, currentIdx]));
    setTimeout(() => {
      setCurrentIdx(idx);
      setNarrativeIdx(0);
      setIsTransitioning(false);
    }, 280);
  }, [currentIdx, isTransitioning]);

  const goNext = () => goTo(currentIdx + 1);
  const goPrev = () => goTo(currentIdx - 1);

  // ── Auto-play ──
  useEffect(() => {
    if (autoPlay) {
      autoRef.current = setInterval(() => {
        setCurrentIdx(prev => {
          const next = prev + 1;
          if (next >= CHAPTERS.length) { setAutoPlay(false); return prev; }
          setCompleted(c => new Set([...c, prev]));
          setNarrativeIdx(0);
          return next;
        });
      }, 8000);
    }
    return () => clearInterval(autoRef.current);
  }, [autoPlay]);

  // ── Keyboard navigation ──
  useEffect(() => {
    const handler = (e) => {
      if (e.key === "ArrowRight" || e.key === "ArrowDown") goNext();
      if (e.key === "ArrowLeft"  || e.key === "ArrowUp")   goPrev();
      if (e.key === "Escape") setAutoPlay(false);
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [currentIdx, isTransitioning]);

  const progressPct = ((currentIdx + 1) / CHAPTERS.length) * 100;

  return (
    <Layout>
      <style>{`
        .story-grid { display: grid; grid-template-columns: 220px 1fr; gap: 20px; align-items: start; }
        @media (max-width: 860px) { .story-grid { grid-template-columns: 1fr; } }
        .narrative-text { transition: opacity 0.2s ease; }
      `}</style>

      {/* ── PAGE HEADER ── */}
      <motion.div initial={{ opacity:0, y:-10 }} animate={{ opacity:1, y:0 }} style={{ marginBottom: 20 }}>
        <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", flexWrap:"wrap", gap:12 }}>
          <div>
            <h1 style={{ fontFamily:"'Playfair Display',serif", fontSize:"clamp(1.5rem,3vw,2rem)", fontWeight:700, color:"var(--text-primary)", margin:"0 0 4px" }}>
              Climate Story Mode
            </h1>
            <p style={{ fontFamily:"'DM Sans',sans-serif", fontSize:13, color:"var(--text-tertiary)", margin:0 }}>
              A guided tour through Earth's most critical climate signals
            </p>
          </div>

          {/* Auto-play + keyboard hint */}
          <div style={{ display:"flex", gap:8, alignItems:"center" }}>
            <span style={{ fontSize:10.5, color:"var(--text-tertiary)", fontFamily:"'DM Sans',sans-serif" }}>
              ← → keys to navigate
            </span>
            <button
              onClick={() => setAutoPlay(v => !v)}
              style={{
                display:"flex", alignItems:"center", gap:6, padding:"7px 14px",
                borderRadius:20,
                border: `1px solid ${autoPlay ? "rgba(212,135,10,0.45)" : "var(--border-default)"}`,
                background: autoPlay ? "var(--accent-amber-soft)" : "var(--bg-surface)",
                color: autoPlay ? "var(--accent-amber)" : "var(--text-secondary)",
                fontSize:12, fontWeight: autoPlay?500:400,
                cursor:"pointer", fontFamily:"'DM Sans',sans-serif",
                transition:"all 0.15s",
              }}
            >
              {autoPlay ? "⏸ Pause" : "▶ Auto-play"}
            </button>
          </div>
        </div>

        {/* Global progress bar */}
        <div style={{ marginTop:14, height:3, background:"var(--border-subtle)", borderRadius:2, overflow:"hidden" }}>
          <motion.div
            animate={{ width: `${progressPct}%` }}
            transition={{ duration:0.4, ease:[0.4,0,0.2,1] }}
            style={{ height:"100%", background:`linear-gradient(90deg, ${chapter.accentColor}, var(--accent-sage))`, borderRadius:2 }}
          />
        </div>
        <div style={{ display:"flex", justifyContent:"space-between", marginTop:4 }}>
          <span style={{ fontSize:10, color:"var(--text-tertiary)", fontFamily:"'DM Sans',sans-serif" }}>
            Chapter {currentIdx+1} of {CHAPTERS.length}
          </span>
          <span style={{ fontSize:10, color:"var(--accent-amber)", fontFamily:"'DM Sans',sans-serif" }}>
            {Math.round(progressPct)}% complete
          </span>
        </div>
      </motion.div>

      <div className="story-grid">

        {/* ── LEFT: Chapter nav ── */}
        <div style={{ display:"flex", flexDirection:"column", gap:6, position:"sticky", top:"calc(var(--topbar-height) + 20px)" }}>
          <p style={{ fontSize:10, fontWeight:500, letterSpacing:"0.09em", textTransform:"uppercase", color:"var(--text-tertiary)", margin:"0 0 6px", fontFamily:"'DM Sans',sans-serif" }}>
            Chapters
          </p>
          {CHAPTERS.map((ch, i) => (
            <ChapterThumb
              key={ch.id}
              chapter={ch}
              isActive={i === currentIdx}
              isCompleted={completed.has(i)}
              onClick={() => goTo(i)}
            />
          ))}

          {/* Completion badge */}
          {completed.size === CHAPTERS.length && (
            <motion.div
              initial={{ opacity:0, scale:0.9 }} animate={{ opacity:1, scale:1 }}
              style={{ marginTop:10, padding:"10px 12px", borderRadius:"var(--radius-md)", background:"var(--color-success-bg)", border:"1px solid rgba(90,158,106,0.25)", textAlign:"center" }}
            >
              <div style={{ fontSize:20, marginBottom:4 }}>🌍</div>
              <p style={{ fontSize:11, color:"var(--color-success)", fontWeight:500, margin:0, fontFamily:"'DM Sans',sans-serif" }}>
                Tour complete!
              </p>
            </motion.div>
          )}
        </div>

        {/* ── RIGHT: Chapter content ── */}
        <AnimatePresence mode="wait">
          <motion.div
            key={chapter.id}
            initial={{ opacity:0, y:18 }}
            animate={{ opacity:1, y:0 }}
            exit={{ opacity:0, y:-12 }}
            transition={{ duration:0.32, ease:[0.4,0,0.2,1] }}
            style={{ display:"flex", flexDirection:"column", gap:16 }}
          >
            {/* ── CHAPTER HERO CARD ── */}
            <div style={{
              background:"var(--bg-surface)",
              border:`1px solid ${chapter.accentColor}33`,
              borderRadius:"var(--radius-lg)",
              overflow:"hidden",
              boxShadow:`0 4px 24px ${chapter.accentColor}10`,
            }}>
              {/* Hero header */}
              <div style={{
                padding:"20px 24px 16px",
                background:`linear-gradient(135deg, ${chapter.accentColor}10 0%, ${chapter.accentColor}04 100%)`,
                borderBottom:"1px solid var(--border-subtle)",
                position:"relative", overflow:"hidden",
              }}>
                {/* Large background icon */}
                <div style={{ position:"absolute", right:20, top:10, fontSize:72, opacity:0.06, userSelect:"none", lineHeight:1 }}>
                  {chapter.icon}
                </div>

                <p style={{ fontSize:10.5, fontWeight:500, letterSpacing:"0.1em", textTransform:"uppercase", color:chapter.accentColor, margin:"0 0 8px", fontFamily:"'DM Sans',sans-serif" }}>
                  {chapter.eyebrow}
                </p>
                <h2 style={{ fontFamily:"'Playfair Display',serif", fontSize:"clamp(1.3rem,2.5vw,1.8rem)", fontWeight:700, color:"var(--text-primary)", margin:"0 0 6px", lineHeight:1.2 }}>
                  {chapter.title}
                </h2>
                <p style={{ fontSize:12, color:"var(--text-tertiary)", margin:0, fontFamily:"'DM Sans',sans-serif" }}>
                  {chapter.subtitle}
                </p>
              </div>

              {/* Chart */}
              <div style={{ padding:"14px 18px 18px" }}>
                <AnimatePresence mode="wait">
                  <motion.div
                    key={`${chapter.id}_chart`}
                    initial={{ opacity:0 }} animate={{ opacity:1 }} exit={{ opacity:0 }}
                    transition={{ duration:0.25 }}
                  >
                    <ChapterChart chapter={chapter} isDark={isDark} />
                  </motion.div>
                </AnimatePresence>
              </div>
            </div>

            {/* ── NARRATIVE + STATS ROW ── */}
            <div style={{ display:"grid", gridTemplateColumns:"1fr 200px", gap:14 }}>

              {/* Narrative */}
              <div style={{
                background:"var(--bg-surface)",
                border:"1px solid var(--border-subtle)",
                borderRadius:"var(--radius-lg)",
                padding:"18px 20px",
              }}>
                <p style={{ fontSize:10, fontWeight:500, letterSpacing:"0.09em", textTransform:"uppercase", color:"var(--text-tertiary)", margin:"0 0 12px", fontFamily:"'DM Sans',sans-serif" }}>
                  The Science
                </p>

                {/* Summary */}
                <p style={{ fontSize:13.5, color:"var(--text-primary)", lineHeight:1.7, margin:"0 0 16px", fontFamily:"'DM Sans',sans-serif", fontWeight:400 }}>
                  {chapter.summary}
                </p>

                <div style={{ height:1, background:"var(--border-subtle)", margin:"0 0 14px" }} />

                {/* Narrative bullets */}
                <div style={{ display:"flex", flexDirection:"column", gap:10 }}>
                  {chapter.narrative.map((para, i) => (
                    <motion.div
                      key={i}
                      initial={{ opacity:0, x:-8 }}
                      animate={{ opacity:1, x:0 }}
                      transition={{ delay: i * 0.1, duration:0.25 }}
                      style={{ display:"flex", gap:10, alignItems:"flex-start" }}
                    >
                      <span style={{ width:6, height:6, borderRadius:"50%", background:chapter.accentColor, flexShrink:0, marginTop:7 }} />
                      <p style={{ fontSize:12.5, color:"var(--text-secondary)", lineHeight:1.65, margin:0, fontFamily:"'DM Sans',sans-serif" }}>
                        {para}
                      </p>
                    </motion.div>
                  ))}
                </div>
              </div>

              {/* Stats */}
              <div style={{ display:"flex", flexDirection:"column", gap:8 }}>
                {chapter.stats.map((s, i) => (
                  <motion.div
                    key={i}
                    initial={{ opacity:0, x:8 }} animate={{ opacity:1, x:0 }}
                    transition={{ delay: i * 0.08 }}
                    style={{
                      padding:"12px 14px",
                      background:"var(--bg-surface)",
                      border:"1px solid var(--border-subtle)",
                      borderRadius:"var(--radius-md)",
                      borderLeft:`3px solid ${s.color}`,
                    }}
                  >
                    <p style={{ fontSize:9.5, fontWeight:500, letterSpacing:"0.07em", textTransform:"uppercase", color:"var(--text-tertiary)", margin:"0 0 4px", fontFamily:"'DM Sans',sans-serif" }}>
                      {s.label}
                    </p>
                    <p style={{ fontFamily:"'Playfair Display',serif", fontSize:16, fontWeight:700, color:s.color, margin:0, lineHeight:1 }}>
                      {s.value}
                    </p>
                  </motion.div>
                ))}
              </div>
            </div>

            {/* ── ANOMALY TIMELINE ── */}
            <div style={{
              background:"var(--bg-surface)",
              border:"1px solid var(--border-subtle)",
              borderRadius:"var(--radius-lg)",
              padding:"16px 20px",
            }}>
              <p style={{ fontSize:10, fontWeight:500, letterSpacing:"0.09em", textTransform:"uppercase", color:"var(--text-tertiary)", margin:"0 0 12px", fontFamily:"'DM Sans',sans-serif" }}>
                Key Anomalies
              </p>
              <div style={{ display:"flex", gap:8, flexWrap:"wrap" }}>
                {chapter.anomalyHighlights.map((h, i) => (
                  <motion.div
                    key={i}
                    initial={{ opacity:0, y:6 }} animate={{ opacity:1, y:0 }}
                    transition={{ delay: i * 0.08 }}
                    style={{
                      display:"flex", alignItems:"center", gap:7,
                      padding:"7px 12px",
                      background: h.color + "10",
                      border:`1px solid ${h.color}33`,
                      borderRadius:"var(--radius-md)",
                    }}
                  >
                    <span style={{ fontFamily:"'Playfair Display',serif", fontSize:14, fontWeight:700, color:h.color, whiteSpace:"nowrap" }}>
                      {h.year}
                    </span>
                    <span style={{ fontSize:11.5, color:"var(--text-secondary)", fontFamily:"'DM Sans',sans-serif" }}>
                      {h.label}
                    </span>
                  </motion.div>
                ))}
              </div>
            </div>

            {/* ── PREV / NEXT NAVIGATION ── */}
            <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", paddingTop:4 }}>
              <motion.button
                onClick={goPrev}
                disabled={currentIdx === 0}
                whileTap={{ scale:0.97 }}
                style={{
                  display:"flex", alignItems:"center", gap:7,
                  padding:"10px 18px", borderRadius:"var(--radius-md)",
                  border:"1px solid var(--border-default)",
                  background: currentIdx === 0 ? "transparent" : "var(--bg-surface)",
                  color: currentIdx === 0 ? "var(--text-disabled)" : "var(--text-secondary)",
                  fontSize:13, cursor: currentIdx === 0 ? "not-allowed" : "pointer",
                  fontFamily:"'DM Sans',sans-serif", transition:"all 0.15s",
                }}
              >
                ← Previous
              </motion.button>

              {/* Chapter dots */}
              <div style={{ display:"flex", gap:6, alignItems:"center" }}>
                {CHAPTERS.map((ch, i) => (
                  <button key={i} onClick={() => goTo(i)} style={{
                    width: i === currentIdx ? 20 : 7,
                    height:7, borderRadius:4,
                    background: i === currentIdx ? chapter.accentColor : completed.has(i) ? "var(--color-success)" : "var(--border-default)",
                    border:"none", cursor:"pointer",
                    transition:"all 0.25s ease",
                    padding:0,
                  }} />
                ))}
              </div>

              <motion.button
                onClick={goNext}
                disabled={currentIdx === CHAPTERS.length - 1}
                whileTap={{ scale:0.97 }}
                style={{
                  display:"flex", alignItems:"center", gap:7,
                  padding:"10px 18px", borderRadius:"var(--radius-md)",
                  border:`1px solid ${currentIdx < CHAPTERS.length - 1 ? chapter.accentColor + "55" : "var(--border-default)"}`,
                  background: currentIdx < CHAPTERS.length - 1
                    ? `linear-gradient(135deg, ${chapter.accentColor}18, rgba(74,92,58,0.12))`
                    : "transparent",
                  color: currentIdx < CHAPTERS.length - 1 ? chapter.accentColor : "var(--text-disabled)",
                  fontSize:13, cursor: currentIdx < CHAPTERS.length - 1 ? "pointer" : "not-allowed",
                  fontFamily:"'DM Sans',sans-serif", fontWeight:500, transition:"all 0.15s",
                }}
              >
                {currentIdx < CHAPTERS.length - 1
                  ? `Next: ${CHAPTERS[currentIdx+1].title} →`
                  : "Tour complete ✓"
                }
              </motion.button>
            </div>
          </motion.div>
        </AnimatePresence>
      </div>
    </Layout>
  );
};

export default StoryMode;