import { BrowserRouter as Router, Routes, Route } from 'react-router-dom'
import Home from './pages/Home'
import RegionSets from './pages/RegionSets'
import RegionSet from './pages/RegionSet'
import RegionDetail from './pages/RegionDetail'
import YC240322 from './pages/YC240322'
import Filter from './pages/Filter'

import FiltersProvider from './components/ComboLock/FiltersProvider';
import RegionsProvider from './components/Regions/RegionsProvider';

import 'antd/dist/reset.css';

import './App.css'


function App() {
  return (
    <Router>
      {/* <Nav /> */}
      <div className="page">
      <Routes>
        <Route path="/" element={
          <FiltersProvider>
            <RegionsProvider>
              <Home />
            </RegionsProvider>
          </FiltersProvider>
        } />
        <Route path="/regions" element={<RegionSets />} />
        <Route path="/regions/:regionset" element={<RegionSet />} />
        <Route path="/region" element={<RegionDetail />} />
        <Route path="/umap" element={<YC240322 />} />
        <Route path="/filter" element={<Filter />} />
      </Routes>
      </div>
    </Router>

  );
}

export default App
