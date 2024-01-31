import React from 'react';
import { Link } from 'react-router-dom';
import RegionFiles from '../components/Regions/RegionFiles';

const RegionSets = () => {
  return (
    <div>
      <Link to="/">Back to map</Link>
      <RegionFiles />
    </div>
  );
};

export default RegionSets;
