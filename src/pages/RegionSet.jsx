import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import RegionTable from '../components/Regions/RegionTable';

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
    <div>
      <Link to="/regions">Back to region sets</Link><br></br>
      <Link to={`/${regionset}`}>Map this region set</Link>
      <div>{regionset} - {meta.rows}
        <button onClick={() => deleteSet(regionset)}>Delete</button>
      </div>
      <div>
        { set?.length ? <RegionTable rows={set} /> : null }
      </div>
    </div>
  );
};

export default RegionSet;
