import { useState, useEffect, useCallback, useMemo } from 'react';
import { useParams, useLocation, useNavigate, Link } from 'react-router-dom';
import { getGenesInCell, getGenesOverCell } from '../lib/Genes'
import GilbertLogo from '../assets/gilbert-logo.svg?react';
import { urlify, jsonify } from '../lib/regions';
import { showKb, showPosition } from '../lib/display';
import './RegionDetail.css';


const RegionDetail = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const queryParams = useMemo(() => new URLSearchParams(location.search), [location]);
  const region = useMemo(() => {return jsonify(queryParams.get('region'))}, [queryParams]);

  const [inside, setInside] = useState([]);
  const [outside, setOutside] = useState([]);
  useEffect(() => {
    if(region) {
      console.log("region", region)
      setInside(getGenesInCell(region, region.order))
      setOutside(getGenesOverCell(region, region.order))
    }
  }, [region])


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
          {showPosition(region)}
          {/* {JSON.stringify(region)} */}
        </div>
        <div className="genes">
          <div>
            Genes inside region: {inside.length}
            {inside.length ? inside.map((d,i) => (
              <div key={d.hgnc} className="gene">
                <span className="hgnc">{d.hgnc}</span> &nbsp;
                {showPosition(d)}
              </div>)) 
            : null }
          </div>
          <div>
            Genes overlapping region: {outside.length}
          </div>
        </div>
      </div>
    </div>
  );
};

export default RegionDetail;
