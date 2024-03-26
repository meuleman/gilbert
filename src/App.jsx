import { BrowserRouter as Router, Routes, Route } from 'react-router-dom'
import Home from './pages/Home'
import RegionSets from './pages/RegionSets'
import RegionSet from './pages/RegionSet'
import RegionDetail from './pages/RegionDetail'
import YC240322 from './pages/YC240322'
import './App.css'


function App() {
  return (
    <Router>
      {/* <Nav /> */}
      <div className="page">
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/regions" element={<RegionSets />} />
        <Route path="/regions/:regionset" element={<RegionSet />} />
        <Route path="/region" element={<RegionDetail />} />
        <Route path="/umap" element={<YC240322 />} />
      </Routes>
      </div>
    </Router>

  );
}

export default App
