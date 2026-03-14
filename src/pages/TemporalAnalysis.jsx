const TemporalAnalysis = () => {
  return (
    <div style={{ padding: "30px" }}>
      <h1>Temporal Climate Analysis</h1>

      <p>
        Analyze how climate variables change over time at specific locations.
      </p>

      <div style={{ display: "flex", gap: "20px" }}>
        <div>
          <label>Latitude</label>
          <input type="number" />
        </div>

        <div>
          <label>Longitude</label>
          <input type="number" />
        </div>
      </div>

      <div style={{ marginTop: "20px" }}>
        <label>Date Range</label>
        <input type="date" />
        <input type="date" style={{ marginLeft: "10px" }} />
      </div>

      <div
        style={{
          marginTop: "40px",
          height: "400px",
          background: "#e0e0e0"
        }}
      >
        Time Series Chart Placeholder
      </div>
    </div>
  );
};

export default TemporalAnalysis;