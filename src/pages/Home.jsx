 import { Link } from "react-router-dom";

const Home = () => {
  return (
    <div style={{ padding: "40px" }}>
      <h1>🌍 PyClimaExplorer</h1>
      <p>
        PyClimaExplorer is an interactive climate data visualization dashboard
        that allows users to explore NetCDF climate datasets such as
        temperature, precipitation, and wind speed.
      </p>

      <h3>Features</h3>
      <ul>
        <li>Global climate data visualization</li>
        <li>Interactive heatmaps</li>
        <li>Time-series analysis</li>
        <li>Dataset comparison</li>
      </ul>

      <h3>Get Started</h3>
      <button>Upload Dataset (.nc)</button>
      <button style={{ marginLeft: "10px" }}>Load Sample Dataset</button>

      <h3 style={{ marginTop: "40px" }}>Navigate</h3>
      <ul>
        <li><Link to="/dashboard">Dashboard</Link></li>
        <li><Link to="/spatial-view">Spatial Visualization</Link></li>
        <li><Link to="/temporal-analysis">Temporal Analysis</Link></li>
        <li><Link to="/dataset-explorer">Dataset Explorer</Link></li>
        <li><Link to="/comparison">Comparison Mode</Link></li>
        <li><Link to="/story-mode">Story Mode</Link></li>
      </ul>
    </div>
  );
};

export default Home;