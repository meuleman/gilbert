import { BrowserRouter as Router, Routes, Route } from 'react-router-dom'
import Home from './pages/Home'
import RegionSets from './pages/RegionSets'
import RegionSet from './pages/RegionSet'
import RegionDetail from './pages/RegionDetail'
import RegionCSN from './pages/CSNS'
import YC240322 from './pages/YC240322'

import RegionsProvider from './components/Regions/RegionsProvider';
import { ZoomProvider } from './contexts/ZoomContext';

import 'antd/dist/reset.css';

import './App.css'


function App() {
  return (
    <Router>
      {/* <Nav /> */}
      <div className="page">
      <Routes>
        <Route path="/" element={
            <RegionsProvider>
              <ZoomProvider>
                <Home />
              </ZoomProvider>
            </RegionsProvider>
        } />
        <Route path="/regions" element={<RegionSets />} />
        <Route path="/regions/:regionset" element={<RegionSet />} />
        <Route path="/region" element={<RegionDetail />} />
        <Route path="/csns" element={<RegionCSN />} />
        <Route path="/umap" element={
            <RegionsProvider>
              <ZoomProvider>
                <YC240322 />
              </ZoomProvider>
            </RegionsProvider>
          } />
      </Routes>
      </div>
    </Router>

  );
}

export default App
