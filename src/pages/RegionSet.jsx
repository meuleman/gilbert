import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import RegionTable from '../components/Regions/RegionTable';
import GilbertLogo from '../assets/gilbert-logo.svg?react';
import './RegionSet.css';


const RegionSet = () => {
  const { regionset } = useParams();
  const [meta, setMeta] = useState({});
  const [set, setSet] = useState([]);
  const navigate = useNavigate();
  useEffect(() => {
    const metas = JSON.parse(localStorage.getItem("setList"));
    const meta = metas.find(d => d.name == regionset)
    setMeta(meta);
    const set = JSON.parse(localStorage.getItem(regionset));
    setSet(set);
  }, [regionset]);

  function deleteSet(name) {
    console.log("deleting name", name)
    localStorage.removeItem(name);
    // TODO: this should probably be shared logic with RegionFiles.jsx
    // Remove from the list
    const setList = JSON.parse(localStorage.getItem('setList'));
    const newSetList = setList.filter(set => set.name !== name);
    console.log("NEW SET LIST", newSetList)
    localStorage.setItem('setList', JSON.stringify(newSetList));
    navigate('/regions');
  }

  console.log("set", set)
  useEffect(() => {
    console.log("use effect on set", set)
  }, [set]);

  return (
    <div className="region-set">
      <div className="header">
        <div className="header--brand">
          <GilbertLogo height="50" width="auto" />
        </div>
        <div className="header--navigation">
          <Link to="/regions">Back to region sets</Link><br></br>
          <Link to={`/?regionset=${regionset}`}>Map this region set</Link>
        </div>
      </div>
      <div className="content">
        <div>{regionset} - {meta.rows}
          <button onClick={() => deleteSet(regionset)}>Delete</button>
        </div>
        <div>
          { set?.length ? <RegionTable rows={set} /> : null }
        </div>
      </div>
    </div>
  );
};

export default RegionSet;
