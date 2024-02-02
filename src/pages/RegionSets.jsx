import { Link } from 'react-router-dom';
import RegionFiles from '../components/Regions/RegionFiles';

import GilbertLogo from '../assets/gilbert-logo.svg?react';
import './RegionSets.css';

const RegionSets = () => {
  return (
    <div className="region-sets">
      <div className="header">
        <div className="header--brand">
          <GilbertLogo height="50" width="auto" />
        </div>
        <div className="header--navigation">
            <Link to="/">Back to map</Link>
        </div>
      </div>
      <div className="content">
        <RegionFiles />
      </div>
    </div>
  );
};

export default RegionSets;
