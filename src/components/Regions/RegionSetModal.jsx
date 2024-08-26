import { useState, useCallback, useEffect, useRef, useMemo, useContext } from 'react'

import { sum, max } from 'd3-array'
import Loading from '../Loading'
// import FiltersContext from '../ComboLock/FiltersContext'
import {showPosition, showInt, showKb} from '../../lib/display'
import { download, convertFilterRegions } from '../../lib/regionsets'
import {Tooltip} from 'react-tooltip';


// import './SankeyModal.css'


const RegionSetModal = ({
  selectedRegion = null,
  hoveredRegion = null,
  queryRegions = null,
  queryRegionsCount = null,
  queryRegionOrder = null,
  queryLoading = "",
  onNumSegments = () => {},
  onClearRegion = () => {},
} = {}) => {

  // const { filters } = useContext(FiltersContext)
  // const order = useMemo(() => {
  //   return max(Object.keys(filters), d => +d) || 0
  // }, [filters])

  // const totalSegments = useMemo(() => {
  //   if(!queryRegions) return 0
  //   // return sum(queryRegions, r => r.indices.length)
  //   return queryRegions.length
  // }, [queryRegions])

  const [numSegments, setNumSegments] = useState(100)
  useEffect(() => {
    setNumSegments(Math.min(queryRegions?.length, 100))
  }, [queryRegions])

  function calculateCount(num, order) {
    let obp = Math.pow(4, 14 - order)
    let tbp = num * obp
    let percent = tbp / 3088269856 * 100
    return {
      num,
      obp,
      tbp,
      percent
    }
  }

  const totalCounts = useMemo(() => {
    return calculateCount(queryRegionsCount, queryRegionOrder)
  }, [queryRegionsCount, queryRegionOrder])

  const shownCounts = useMemo(() => {
    return calculateCount(numSegments, queryRegionOrder)
  }, [numSegments, queryRegionOrder])


  const [showControls, setShowControls] = useState(true)

  const handleDownload = useCallback(() => {
    let regions = convertFilterRegions(queryRegions.slice(0, numSegments), queryRegionOrder)
    download(regions)
  }, [queryRegions, numSegments, queryRegionOrder])

  useEffect(() => {
    onNumSegments(numSegments)
  }, [numSegments])

  const handleNumSegments = useCallback((e) => {
    setNumSegments(+e.target.value)
  }, [onNumSegments])

  return (
    <div className={`regionset-modal`}>
        <div className={`control-buttons`}>
          {/* <button 
            onClick={useCallback(() => setShowPanel(!showPanel), [showPanel])}
            data-tooltip-id="sankey-show-visualization"
            disabled={!csns.length}
            >
              <span style={{
                // transform: "rotate(90deg)", 
                display:"block",
                filter: csns.length ? 'none' : 'grayscale(100%)' // Apply grayscale if csns is empty
              }}>{showPanel ? "➡️" : "⬅️"}</span>
          </button>
          <Tooltip id="sankey-show-visualization">
            {showPanel ? "Hide Path Narration Panel" : "Show Path Narration Panel"}
          </Tooltip> */}
  
          {/* {showPanel ? <button 
            onClick={handleShowControl}
            disabled={!csns.length}
            data-tooltip-id="sankey-show-control"
            >⚙️</button>: null}
            <Tooltip id="sankey-show-control">
              Show Controls
            </Tooltip> */}
  
          {/* {selectedRegion ? <button 
            onClick={onClearRegion}
            data-tooltip-id="sankey-clear-region"
            style={{
              position: "relative",
            }}
            >
              <span style={{
                // transform: "rotate(90deg)", 
                display:"block",
                
              }}>🗺️</span>
              <span style={{
                display:"block",
                position: "absolute",
                top: "9px",
              }}>❌</span>
          </button> : null }
          {selectedRegion ? <Tooltip id="sankey-clear-region">
            Clear selected region {showPosition(selectedRegion)}
          </Tooltip> : null} */}
 
        </div>
      <div className={`content`}
        style={{
          // width: csns.length || loading ? "400px" : "0px",
        }}
      >
        <div className="loading-info">
            {queryLoading ? <Loading text={"Filtering regions..."} /> : null}
        </div>
        {queryRegions ? <div className="query-info">
          Showing {numSegments} / {totalCounts.num} <i>{showKb(totalCounts.obp)}</i> regions (
          <span data-tooltip-id="region-percent-tooltip">{shownCounts.percent.toFixed(2)}% of the genome</span>)
          <Tooltip id="region-percent-tooltip">
            {totalCounts.num ? <span> Total {totalCounts.num} regions, representing {showInt(totalCounts.tbp)} basepairs, or {totalCounts.percent.toFixed(2)}% of the genome</span> : null}
          </Tooltip>
        </div>: null }



      </div>
      <div className={`controls ${showControls ? "show" : "hide"}`}>
        {queryRegions && queryRegions.length ? 
        <div className="query-controls">
          <label>
            <input 
              type="range" 
              min="1" 
              max={Math.min(queryRegions?.length, 1000)}
              step={1}
              value={numSegments} 
              onChange={handleNumSegments} 
            />
          </label>

          <button data-tooltip-id="save-regions"
            disabled
          >
            💾
          </button>
          <Tooltip id="save-regions">
            Save {numSegments} regions as a Region Set
          </Tooltip>
          <button data-tooltip-id="download-regions"
            onClick={handleDownload}
          >
            ⬇️
          </button>
          <Tooltip id="download-regions">
            Download {numSegments} regions to a BED file
          </Tooltip>
          <button data-tooltip-id="narrate-regions"
          disabled
          >
            📖
          </button>
          <Tooltip id="narrate-regions">
            Narrate {numSegments} regions
          </Tooltip>

        </div> : null }
      </div>
    </div>
  )
}
export default RegionSetModal
