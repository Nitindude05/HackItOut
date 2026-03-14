const Dashboard = () => {
  return (
    <div style={{ padding: "30px" }}>
      <h1>Climate Dashboard</h1>

      <div style={{ display: "flex", gap: "20px" }}>
        
        {/* Sidebar */}
        <div style={{ width: "250px" }}>
          <h3>Filters</h3>

          <label>Select Variable</label>
          <select>
            <option>Temperature</option>
            <option>Precipitation</option>
            <option>Wind Speed</option>
          </select>

          <br /><br />

          <label>Select Time Range</label>
          <input type="range" />

          <br /><br />

          <label>Latitude</label>
          <input type="number" />

          <br /><br />

          <label>Longitude</label>
          <input type="number" />
        </div>

        {/* Main Content */}
        <div style={{ flex: 1 }}>
          <h3>Global Heatmap</h3>
          <div style={{ height: "300px", background: "#e0e0e0" }}>
            Map Placeholder
          </div>

          <h3 style={{ marginTop: "30px" }}>Time Series</h3>
          <div style={{ height: "300px", background: "#e0e0e0" }}>
            Line Chart Placeholder
          </div>
        </div>

      </div>
    </div>
  );
};

export default Dashboard;