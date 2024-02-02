import { useState, useEffect, useCallback } from 'react';
import { useParams, useLocation, useNavigate, Link } from 'react-router-dom';
import RegionTable from '../components/Regions/RegionTable';
import GilbertLogo from '../assets/gilbert-logo.svg?react';
import { urlify, jsonify } from '../lib/regions';
import './RegionDetail.css';


const RegionDetail = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const queryParams = new URLSearchParams(location.search);
  const region = jsonify(queryParams.get('region'));

  return (
    <div className="region-detail">
      <div className="header">
        <div className="header--brand">
          <GilbertLogo height="50" width="auto" />
        </div>
        <div className="header--navigation">
          <Link to={`/?region=${urlify(region)}`}>Back to map</Link>
        </div>
      </div>
      <div className="content">
        <div>Region
        </div>
        <div>
          {JSON.stringify(region)}
        </div>
      </div>
    </div>
  );
};

export default RegionDetail;
