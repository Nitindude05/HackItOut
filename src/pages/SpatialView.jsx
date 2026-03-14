const SpatialView = () => {
  return (
    <div style={{ padding: "30px" }}>
      <h1>Spatial Climate Visualization</h1>

      <p>
        Explore global climate variables across geographic regions.
      </p>

      <div style={{ marginTop: "20px" }}>
        <label>Select Variable</label>
        <select>
          <option>Temperature</option>
          <option>Precipitation</option>
          <option>Wind Speed</option>
        </select>
      </div>

      <div style={{ marginTop: "20px" }}>
        <label>Select Time</label>
        <input type="range" />
      </div>

      <div
        style={{
          marginTop: "30px",
          height: "500px",
          background: "#d9d9d9"
        }}
      >
        Global Climate Map Placeholder
      </div>
    </div>
  );
};

export default SpatialView;