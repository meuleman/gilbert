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
  onNumRegions = () => {},
} = {}) => {

  const { sets, activeSet, activeRegions, activePaths, activeGenesetEnrichment, saveSet, deleteSet, setActiveSet } = useContext(RegionsContext)
  const { hasFilters, setFilters, listFilters } = useContext(FiltersContext)

  const [numRegions, setNumRegions] = useState(100)
  useEffect(() => {
    setNumRegions(Math.min(activeRegions?.length, 100))
  }, [activeRegions])

  const [regions, setRegions] = useState([])
  useEffect(() => {
    if(activeSet) {
      setRegions(activeSet.regions)
    } else {
      setRegions([])
    }
  }, [activeSet])
 
  const handleSelect = useCallback((set) => {
    setActiveSet(set)
  }, [setActiveSet])

  const handleDownload = useCallback((set) => {
    download(activeRegions, set.name)
  }, [activeRegions])

  const handleNumRegions = useCallback((e) => {
    setNumRegions(+e.target.value)
  }, [onNumRegions])
  useEffect(() => {
    onNumRegions(numRegions)
  }, [numRegions])


  return (
    <div className={`active-regionsets-modal ${show ? 'show' : ''}`}>
      <div className={`content`}>
        <div className="manage">
          <span className="set-name">{activeSet?.name}</span>
          <span className="set-count">{activeRegions?.length} / {activeSet?.regions?.length} total regions</span>
          
          <div className="buttons">
            <button data-tooltip-id={`active-deselect`} onClick={() => handleSelect(null)}>❌</button>
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
            {/* <button data-tooltip-id="active-narrate-regions"
              disabled
            >
              📖
            </button> */}
            <Tooltip id="active-narrate-regions">
              Narrate {numRegions} regions
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

        <div className="section factor-summary">
          <h3>Top Factors accross {activePaths?.length} regions</h3>
          {/* TODO: show loading */}
          {activePaths?.length ? <SummarizePaths
            topFullCSNS={activePaths.slice(0, numRegions)}
          /> : null}
        </div>
        <div className="section geneset-summary">
          <h3>Geneset enrichment spectrum</h3>
          {/* TODO: show loading */}
          <Spectrum />
        </div>

        <div className="section region-sets">
          <h3>Top {numRegions} regions</h3>

          <div className="top-paths-selector">
            <label>
            <input 
              type="range" 
              min="1" 
              max={Math.min(regions.length, FILTER_MAX_REGIONS)}
              step={1}
              value={numRegions} 
              onChange={handleNumRegions} 
            />
              <i>Show top {numRegions} regions in visualizations.</i>
          </label>
        </div>

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
                    <td>{region.score?.toFixed(3)}</td>
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
