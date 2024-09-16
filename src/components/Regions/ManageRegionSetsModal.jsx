import { useState, useCallback, useEffect, useRef, useMemo, useContext } from 'react'

import { sum, max } from 'd3-array'
import Loading from '../Loading'
import {showPosition, showInt, showKb} from '../../lib/display'
import {Tooltip} from 'react-tooltip';
import { download, parseBED } from '../../lib/regionsets'
import RegionsContext from './RegionsContext'

import './ManageRegionSetsModal.css'


const ManageRegionSetModal = ({
  selectedRegion = null,
  hoveredRegion = null,
} = {}) => {

  const { sets, activeSet, saveSet, deleteSet, setActiveSet } = useContext(RegionsContext)

  useEffect(() => {
    console.log("manage, sets!", sets)
  }, [sets])

  const handleSelect = useCallback((set) => {
    setActiveSet(set)
  }, [setActiveSet])

  const handleDownload = useCallback((set) => {
    console.log("SET", set)
    download(set.regions, set.name)
  }, [])

  const [recentlySaved, setRecentlySaved] = useState(null)
  const handleFileChange = useCallback((event) => {
    const file = event.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = function (e) {
        const content = e.target.result;
        // Process file content into an array
        const data = parseBED(content);
        // Store in local storage
        saveSet(file.name, data)
        setRecentlySaved(file.name)
      };
      reader.readAsText(file);
    }
  }, [saveSet]);

  useEffect(() => {
    if (recentlySaved) {
      let newSet = sets.find(d => d.name === recentlySaved)
      if(newSet) {
        setActiveSet(newSet)
        setRecentlySaved(null)
      }
    }
  }, [sets, recentlySaved, setActiveSet])
  

  return (
    <div className={`manage-regionsets-modal`}>
      <div className={`control-buttons`}>
      </div>
      <div className={`content`}>
        <div className="loading-info">
        </div>
        <div className="add-new">
          {/* <label></label> */}
          <input type="file" onChange={handleFileChange} />
        </div>
        <div className="region-sets">
          <table>
            <tbody>
              {sets.map((set, index) => (
              <tr key={index}>
                <td>
                  {activeSet == set 
                  ? <button onClick={() => handleSelect(null)}>❌</button>
                  : <button onClick={() => handleSelect(set)}>Select</button>}
                  </td>
                <td>{set.name}</td>
                {/* <td><Link to={`/regions/${set.name}`}>Details</Link></td> */}
                {/* <td><Link to={`/?regionset=${set.name}`}>Map</Link></td> */}
                <td> {set.regions?.length} regions</td> 
                {/* <td>({set.createdAt})</td> */}
                <td>
                  <button data-tooltip-id={`download-regions-${index}`}
                    onClick={() => handleDownload(set)}
                  >
                    ⬇️
                  </button>
                  <Tooltip id={`download-regions-${index}`}>
                    Download {set.name} ({set.regions?.length} regions) to a BED file
                  </Tooltip>
                </td>
                <td>
                  <button onClick={() => deleteSet(set.name)} disabled={set.example}>🗑️</button> 
                </td>
              </tr>
              ))}
            </tbody>
          </table>
        </div>
        
      </div>
    </div>
  )
}
export default ManageRegionSetModal
