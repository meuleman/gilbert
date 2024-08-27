import { useState, useCallback, useEffect, useRef, useMemo, useContext } from 'react'

import { sum, max } from 'd3-array'
import Loading from '../Loading'
import {showPosition, showInt, showKb} from '../../lib/display'
import {Tooltip} from 'react-tooltip';
import { download, parseBED } from '../../lib/regionsets'
import RegionsContext from './RegionsContext'

import './ActiveRegionSetModal.css'


const ActiveRegionSetModal = ({
  selectedRegion = null,
  hoveredRegion = null,
  onNumRegions = () => {},
} = {}) => {

  const { sets, activeSet, saveSet, deleteSet, setActiveSet } = useContext(RegionsContext)

  const [numRegions, setNumRegions] = useState(100)

  const [regions, setRegions] = useState([])
  useEffect(() => {
    if(activeSet) {
      setRegions(activeSet.regions)
    } else {
      setRegions([])
    }
  }, [activeSet])
 

  const handleSelect = useCallback((region) => {
    // setActiveSet(set)
  }, [])

  const handleDownload = useCallback((set) => {
    console.log("SET", set)
    download(set.regions, set.name)
  }, [])

  const handleNumRegions = useCallback((e) => {
    setNumRegions(+e.target.value)
  }, [onNumRegions])
  useEffect(() => {
    onNumRegions(numRegions)
  }, [numRegions])


  return (
    <div className={`active-regionsets-modal`}>
      <div className={`content`}>
        <div className="manage">
          <span className="set-name">{activeSet.name}</span>
          <label>
            <input 
              type="range" 
              min="1" 
              max={Math.min(regions.length, 1000)}
              step={1}
              value={numRegions} 
              onChange={handleNumRegions} 
            />
            <br></br>
            {numRegions} / {activeSet.regions.length}
          </label>
          <div className="buttons">
            <button data-tooltip-id={`active-download-regions`}
              onClick={() => handleDownload(activeSet)}
            >
              ⬇️
            </button>
            <Tooltip id={`active-download-regions`}>
              Download {numRegions} regions to BED file
            </Tooltip>
            <button data-tooltip-id="active-narrate-regions"
              disabled
            >
              📖
            </button>
            <Tooltip id="active-narrate-regions">
              Narrate {numRegions} regions
            </Tooltip>

          </div>
        </div>

        <div className="region-sets">
          <table>
            <thead>
              <tr>
                <th>Position</th>
                <th>Score</th>
              </tr>
            </thead>
          </table>
          <div className="table-body-container">
            <table>
              <tbody>
                {regions.slice(0, numRegions).map((region, index) => (
                  <tr key={index}>
                    <td>{showPosition(region)}</td>
                    <td>{region.score}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  )
}
export default ActiveRegionSetModal
