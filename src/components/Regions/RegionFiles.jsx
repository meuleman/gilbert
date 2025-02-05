import { useState, useCallback, useEffect, useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { tsvParseRows } from 'd3-dsv';
import { saveSetList, getSetList } from './localstorage';
import { parseBED } from '../../lib/regionsets';

import './RegionFiles.css';



function RegionFiles({
  activeRegionSet = null,
  onSelectRegionSet = () => {},
} = {}) {
  const navigate = useNavigate();
 
  const [setList, setSetList] = useState(getSetList());

  useEffect(() => {
    saveSetList(setList);
  }, [setList]);

  

  const saveSet = useCallback((name, data, navigateOnSave = false, createdDate = new Date()) => {
    console.log("storing the data", name)
    const stringified = JSON.stringify(data)
    console.log(`Stringified size: ${stringified.length / 1024 / 1024} MB`);
    try {
    localStorage.setItem(name, stringified);
    } catch(e) {
      console.log("error", e)
      // TODO: handle this error and show a message to the user
    }
    setSetList(oldList => {
      const existingSetIndex = oldList.findIndex(set => set.name === name);
      let newList = oldList
      if (existingSetIndex !== -1) {
        newList = oldList.map((item, index) => 
          index === existingSetIndex
            ? { 
                ...item, 
                rows: data.length,
                updatedAt: new Date().toISOString() 
              }
            : item
        )
      } else {
        // Add new set with metadata
        const newSet = {
          name,
          rows: data.length,
          createdAt: createdDate.toISOString(),
          updatedAt: new Date().toISOString(),
        };
        newList = [...oldList, newSet]
      }
      saveSetList(newList);
      if(navigateOnSave) {
        navigate(`/regions/${name}`);
      }
      return newList
    });
  }, [navigate]);

  const deleteSet = useCallback((name) => {
    // Remove from local storage
    localStorage.removeItem(name);
    // Remove from the list
    setSetList(setList.filter(set => set.name !== name));
  }, [setList]);

  const handleFileChange = useCallback((event) => {
    const file = event.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = function (e) {
        const content = e.target.result;
        // Process file content into an array
        const data = parseBED(content);
        // Store in local storage
        saveSet(file.name, data, false)
      };
      reader.readAsText(file);
    }
  }, [saveSet]);

  // // Example Regions to project onto the Hilbert Curve
  const exampleSets = useMemo(() => [
  ], [])
  useEffect(() => {
    exampleSets.forEach(set =>  saveSet(set.name, set.data, false, new Date("2024-01-01")))
  }, [exampleSets, saveSet]);

  const [orderedSetList, setOrderedSetList] = useState(setList);
  useEffect(() => {
    const ordered = [...setList].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
    console.log("ordered", ordered)
    setOrderedSetList(ordered);
  }, [setList]);

  const handleSelect = useCallback((regionset) => {
    onSelectRegionSet(regionset);
  }, [])

  return (
    <div className="region-files">
      <input type="file" onChange={handleFileChange} />
      <table>
        <thead>
          
        </thead>
        <tbody>
        {orderedSetList.map((set, index) => (
          <tr key={index}>
            <td>
              {activeRegionSet == set ? <button>❌</button>
              : <button onClick={() => handleSelect(set)}>Select</button>}
              </td>
            <td>{set.name}</td>
            {/* <td><Link to={`/regions/${set.name}`}>Details</Link></td> */}
            {/* <td><Link to={`/?regionset=${set.name}`}>Map</Link></td> */}
            <td> {set.rows} rows</td> 
            {/* <td>({set.createdAt})</td> */}
            <td>
              {exampleSets.find(d => d.name == set.name) 
                ? "Example" 
                : <button onClick={() => deleteSet(set.name)}>🗑️</button> 
              }
            </td>
          </tr>
        ))}
        </tbody>
      </table>
    </div>
  );
}

export default RegionFiles;
