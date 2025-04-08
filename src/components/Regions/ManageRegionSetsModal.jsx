import { useCallback, useContext } from 'react'

import {Tooltip} from 'react-tooltip';
import { download, parseBED } from '../../lib/regionsets'
import RegionsContext from './RegionsContext'
import { fetchRegionSetFromFactor } from '../../lib/apiService';
import { fromIndex } from '../../lib/regions'
import FactorSearch from '../FactorSearch'

import './ManageRegionSetsModal.css'


const ManageRegionSetModal = ({
  show = false,
  selectedRegion = null,
  hoveredRegion = null,
} = {}) => {

  const { sets, activeSet, saveSet, deleteSet, setActiveSet } = useContext(RegionsContext)
  // const { setFilters } = useContext(FiltersContext)

  // useEffect(() => {
  //   console.log("manage, sets!", sets)
  // }, [sets])

  const handleSelect = useCallback((set) => {
    setActiveSet(set)
    // if(set?.type !== "filter") {
    //   setFilters({})
    // }
  }, [setActiveSet ])

  const handleDownload = useCallback((set) => {
    console.log("SET", set)
    download(set.regions, set.name)
  }, [])

  const handleFileChange = useCallback((event) => {
    const file = event.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = function (e) {
        const content = e.target.result;
        // Process file content into an array
        const data = parseBED(content);
        // Store in local storage
        // setFilters({})
        saveSet(file.name, data, {type: "file", activate: true})
      };
      reader.readAsText(file);
    }
  }, [saveSet]);

  const handleSelectFactor = useCallback((selected) => {
    if (!selected) return
    console.log("selected", selected)
    let range = []
    // console.log("gencode", gencode)
    if(selected.factor) {
      // query for the paths for the factor
      let f = selected.factor
      fetchRegionSetFromFactor({factor: f.index, dataset: f.layer.datasetName}, null)
        .then((response) => {
          let regions = response.regions.map(r => {
            return {...fromIndex(r.chromosome, r.i, r.order), score: r.score}
          })
          saveSet(selected.factor.label, regions, { activate: true, type: "search", factor: selected.factor })
        })
    } 
  }, [saveSet])

  return (
    <div className={`manage-regionsets-modal ${show ? 'show' : ''}`}>
      <div className={`control-buttons`}>
      </div>
      <div className={`content`}>
        <div className="loading-info">
        </div>
        <div className="add-new">
          {/* <label></label> */}
          <input type="file" onChange={handleFileChange} />
        </div>
        { !activeSet && <FactorSearch onSelect={handleSelectFactor} /> }
        <div className="region-sets">
          <table>
            <tbody>
              {sets.map((set, index) => (
              <tr key={index}>
                <td>
                  {activeSet?.name == set.name 
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
                  <button onClick={() => {
                    setActiveSet(null)
                    deleteSet(set.name)
                  }} disabled={set.example}>🗑️</button> 
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
