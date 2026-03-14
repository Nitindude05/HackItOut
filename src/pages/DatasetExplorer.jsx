const DatasetExplorer = () => {
  return (
    <div style={{ padding: "30px" }}>
      <h1>Dataset Explorer</h1>

      <p>
        Inspect the metadata and structure of the loaded NetCDF dataset.
      </p>

      <h3>Dataset Metadata</h3>

      <table border="1" cellPadding="10">
        <thead>
          <tr>
            <th>Variable</th>
            <th>Unit</th>
            <th>Dimensions</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>Temperature</td>
            <td>K</td>
            <td>time, lat, lon</td>
          </tr>
          <tr>
            <td>Precipitation</td>
            <td>mm/day</td>
            <td>time, lat, lon</td>
          </tr>
          <tr>
            <td>Wind Speed</td>
            <td>m/s</td>
            <td>time, lat, lon</td>
          </tr>
        </tbody>
      </table>
    </div>
  );
};

export default DatasetExplorer;