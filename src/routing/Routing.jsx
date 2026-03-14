import { Routes, Route } from "react-router-dom";

import Home from "../pages/Home";
import Dashboard from "../pages/Dashboard";
import SpatialView from "../pages/SpatialView";
import TemporalAnalysis from "../pages/TemporalAnalysis";
import DatasetExplorer from "../pages/DatasetExplorer";
import Comparison from "../pages/Comparison";
import StoryMode from "../pages/StoryMode"

const Routing = () => {
  return (
    <Routes>
      <Route path="/" element={<Home />} />
      <Route path="/dashboard" element={<Dashboard />} />
      <Route path="/spatial-view" element={<SpatialView />} />
      <Route path="/temporal-analysis" element={<TemporalAnalysis />} />
      <Route path="/dataset-explorer" element={<DatasetExplorer />} />
      <Route path="/comparison" element={<Comparison />} />
      <Route path="/story-mode" element={<StoryMode />} />
    </Routes>
  );
};

export default Routing;