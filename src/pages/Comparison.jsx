const Comparison = () => {
  return (
    <div style={{ padding: "30px" }}>
      <h1>Dataset Comparison</h1>

      <p>
        Compare climate variables across two datasets or time periods.
      </p>

      <div style={{ display: "flex", gap: "20px" }}>

        <div style={{ flex: 1 }}>
          <h3>Dataset A</h3>
          <select>
            <option>Temperature</option>
            <option>Precipitation</option>
          </select>

          <div
            style={{
              height: "300px",
              background: "#e0e0e0",
              marginTop: "20px"
            }}
          >
            Map A
          </div>
        </div>

        <div style={{ flex: 1 }}>
          <h3>Dataset B</h3>
          <select>
            <option>Temperature</option>
            <option>Precipitation</option>
          </select>

          <div
            style={{
              height: "300px",
              background: "#e0e0e0",
              marginTop: "20px"
            }}
          >
            Map B
          </div>
        </div>

      </div>
    </div>
  );
};

export default Comparison;