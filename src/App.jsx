import { HashRouter as Router, Routes, Route } from 'react-router-dom'
import Home from './pages/Home'
import RegionSets from './pages/RegionSets'
import RegionSet from './pages/RegionSet'
import './App.css'


function App() {
  return (
    <Router>
      {/* <Nav /> */}
      <div className="page">
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/:regionset" element={<Home />} />
        <Route path="/regions" element={<RegionSets />} />
        <Route path="/regions/:regionset" element={<RegionSet />} />
      </Routes>
      </div>
    </Router>

  );
}

export default App
