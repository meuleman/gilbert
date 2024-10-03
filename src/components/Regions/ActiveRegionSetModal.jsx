import { useState, useCallback, useEffect, useRef, useMemo, useContext } from 'react'

import { sum, max } from 'd3-array'
import Loading from '../Loading'
import {showPosition, showInt, showKbOrder} from '../../lib/display'
import {Tooltip} from 'react-tooltip';
import { download, parseBED } from '../../lib/regionsets'
import RegionsContext from './RegionsContext'
import FiltersContext from '../ComboLock/FiltersContext'
import Spectrum from '../Narration/Spectrum';
import SummarizePaths from '../Narration/SummarizePaths';
import { FILTER_MAX_REGIONS } from '../../lib/constants';

import './ActiveRegionSetModal.css'

// const FILTER_MAX_REGIONS = 1000


const ActiveRegionSetModal = ({
  show = false,
  selectedRegion = null,
  hoveredRegion = null,
} = {}) => {

  const { 
    activeSet, 
    activeRegions, 
    numTopRegions, 
    setNumTopRegions, 
    activePaths, 
    setActiveSet 
  } = useContext(RegionsContext)

  const { hasFilters, setFilters, listFilters } = useContext(FiltersContext)

  const [regions, setRegions] = useState([])
  useEffect(() => {
    if(activeSet) {
      setRegions(activeSet.regions)
    } else {
      setRegions([])
    }
  }, [activeSet])

  const handleDeselect = useCallback(() => {
    setActiveSet(null)
    setFilters({})
  }, [setActiveSet, setFilters])

  const handleDownload = useCallback((set) => {
    download(activeRegions, set.name)
  }, [activeRegions])

  const handleNumRegions = useCallback((e) => {
    setNumTopRegions(+e.target.value)
  }, [setNumTopRegions])

  return (
    <div className={`active-regionsets-modal ${show ? 'show' : ''}`}>
      <div className={`content`}>
        <div className="manage">
          <span className="set-name">{activeSet?.name}</span>
          <span className="set-count">{activeRegions?.length} total regions</span>
          
          <div className="buttons">
            <button data-tooltip-id={`active-deselect`} onClick={handleDeselect}>❌</button>
            <Tooltip id={`active-deselect`}>
              Deselect active region set
            </Tooltip>
            <button data-tooltip-id={`active-download-regions`}
              onClick={() => handleDownload(activeSet)}
            >
              ⬇️
            </button>
            <Tooltip id={`active-download-regions`}>
              Download {activeRegions?.length} regions to BED file
            </Tooltip>

          </div>
        </div>

        {activeSet?.type !== "filter" && hasFilters() ? <div className="section active-filters">
            <span>Active filters: </span>
            <span className="active-filters-list">
            {listFilters().map(f => <span key={f.label}>
              <span style={{"display": "inline-block", "background-color": f.color, "width": "10px", "height": "10px", "margin-right":"4px"}}>
              </span>
              {f.label} ({showKbOrder(f.order)})</span>)}
            </span>
            <button onClick={() => setFilters({})}>❌ Clear filters</button>
          </div>
         : null}
        
        <div className="section region-sets">
          <h3>Top {numTopRegions} regions used in visualizations</h3>

          <div className="top-paths-selector">
            <label>
            <input 
              type="range" 
              min="1" 
              max={Math.min(regions.length, FILTER_MAX_REGIONS)}
              step={1}
              value={numTopRegions} 
              onChange={handleNumRegions} 
            />
          </label>
        </div>

          <div className="table-body-container" style={{ fontSize: '12px' }}>
            <table style={{ width: '100%', tableLayout: 'fixed' }}>
              <thead>
                <tr>
                  <th style={{ width: '80%' }}>Position</th>
                  {activeRegions?.[0]?.score && <th style={{ width: '10%' }}>Score</th>}
                  <th style={{ width: '10%' }}>Path Score</th>
                </tr>
              </thead>
              <tbody>
                {regions.slice(0, numTopRegions).map((region, index) => (
                  <tr key={index}>
                    <td style={{ width: '80%' }}>{showPosition(region)}</td>
                    {activeRegions?.[0]?.score && <td style={{ width: '10%' }}>{region.score?.toFixed(3)}</td>}
                    <td style={{ width: '10%' }}>{activePaths?.[index]?.score?.toFixed(3)}</td>
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
