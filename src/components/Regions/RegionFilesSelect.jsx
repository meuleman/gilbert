import { useState, useCallback, useEffect } from 'react';
import { Link } from 'react-router-dom';

import './RegionFilesSelect.css';

function RegionFilesSelect({ selected, onSelect }) {
 
  const getSetList = () => {
    return JSON.parse(localStorage.getItem('setList')) || [];
  }

  const [setList, setSetList] = useState(getSetList());

  function getSet(name) {
    return JSON.parse(localStorage.getItem(name));
  }

  const handleSelect = useCallback((name) => {
    console.log("handle select", name)
    const set = getSet(name)
    console.log("handle select", set)
    onSelect(name, set)
  }, [onSelect]);

  return (
    <div className="region-files-select">
      { setList?.length ? 
      <>
      <select onChange={(e) => handleSelect(e.target.value)} value={selected || ""}>
        <option value="">Select a region set</option>
        {setList.map((set, index) => (
          <option key={index} value={set.name}>{set.name}</option>
        ))}
      </select>
      <Link to="/regions">Manage region sets</Link>
      </>
      : <Link to="/regions">No region sets found. Click here to upload a region set.</Link> }
    </div>
  );
}

export default RegionFilesSelect;
