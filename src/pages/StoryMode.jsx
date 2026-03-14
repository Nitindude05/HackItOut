const StoryMode = () => {
  return (
    <div style={{ padding: "30px" }}>
      <h1>Climate Story Mode</h1>

      <p>
        A guided tour of climate insights and anomalies discovered in the data.
      </p>

      <div style={{ marginTop: "30px" }}>
        <h3>Slide 1: Global Warming Trend</h3>
        <p>
          Average global temperature has increased significantly over the last
          few decades due to greenhouse gas emissions.
        </p>
      </div>

      <div style={{ marginTop: "20px" }}>
        <h3>Slide 2: Arctic Ice Melt</h3>
        <p>
          Arctic regions are warming faster than the global average, leading to
          rapid ice loss.
        </p>
      </div>

      <div style={{ marginTop: "20px" }}>
        <h3>Slide 3: Rainfall Pattern Changes</h3>
        <p>
          Many regions are experiencing increased rainfall variability and
          extreme weather events.
        </p>
      </div>
    </div>
  );
};

export default StoryMode;