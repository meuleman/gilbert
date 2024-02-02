import { useState, useCallback, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { tsvParseRows } from 'd3-dsv';
import { saveSetList, getSetList } from './localstorage';

import './RegionFiles.css';


function RegionFiles() {
  const navigate = useNavigate();
 
  const [setList, setSetList] = useState(getSetList());

  useEffect(() => {
    saveSetList(setList);
  }, [setList]);

  function processFile(content) {
    // Process content into an array (depends on file format)
    console.log("content", content)
    const parsedData = tsvParseRows(content, (d) => ({
      chromosome: d[0],
      start: +d[1],
      end: +d[2],
      length: +d[2] - +d[1],
      name: d[3],
      score: +d[4]
    }));
    console.log("parsed data", parsedData)
    return parsedData;
  }

  const saveSet = useCallback((name, data) => {
    console.log("storing the data", name)
    const stringified = JSON.stringify(data)
    console.log(`Stringified size: ${stringified.length / 1024 / 1024} MB`);
    try {
    localStorage.setItem(name, stringified);
    } catch(e) {
      console.log("error", e)
      // TODO: handle this error and show a message to the user
    }
    const existingSetIndex = setList.findIndex(set => set.name === name);
    console.log("existing setlist", setList)
    console.log("existing set index", existingSetIndex)
    if (existingSetIndex !== -1) {
      // Update the existing set's metadata
      const newList = setList.map((item, index) =>
        index === existingSetIndex
          ? { 
              ...item, 
              rows: data.length,
              updatedAt: new Date().toISOString() 
            }
          : item
      );
      setSetList(newList);
      saveSetList(newList);
    } else {
      // Add new set with metadata
      const newSet = {
        name,
        rows: data.length,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      const newList = [...setList, newSet];
      setSetList(newList);
      // save to localstorage
      saveSetList(newList);
    }
    navigate(`/regions/${name}`);
  }, [setList, navigate]);

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
        const data = processFile(content);
        // Store in local storage
        saveSet(file.name, data)
      };
      reader.readAsText(file);
    }
  }, [saveSet]);

  return (
    <div className="region-files">
      <input type="file" onChange={handleFileChange} />
      <table>
        <thead>
          
        </thead>
        <tbody>
        {setList.map((set, index) => (
          <tr key={index}>
            <td>{set.name}</td>
            <td><Link to={`/regions/${set.name}`}>Details</Link></td>
            <td><Link to={`/${set.name}`}>Map</Link></td>
            <td> {set.rows} rows</td> 
            <td>({set.updatedAt})</td>
            <td>
              <button onClick={() => deleteSet(set.name)}>Delete</button>
            </td>
          </tr>
        ))}
        </tbody>
      </table>
    </div>
  );
}

export default RegionFiles;
