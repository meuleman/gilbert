import { useState, useCallback, useEffect, useRef, useMemo, useContext } from 'react'

import { sum, max } from 'd3-array'
import Loading from '../Loading'
import RegionsContext from './RegionsContext'
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
  const { sets, activeSet, saveSet, deleteSet, setActiveSet } = useContext(RegionsContext)

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

  const [regions, setRegions] = useState([])
  useEffect(() => {
    if(queryRegions && queryRegions.length) {
      let rs = convertFilterRegions(queryRegions.slice(0, numSegments), queryRegionOrder)
      setRegions(rs)
    }
  }, [queryRegions, numSegments, queryRegionOrder])

  const handleDownload = useCallback(() => {
    download(regions)
  }, [regions])

  useEffect(() => {
    onNumSegments(numSegments)
  }, [numSegments])

  const handleNumSegments = useCallback((e) => {
    setNumSegments(+e.target.value)
  }, [onNumSegments])

  useEffect(() => {
    if(regions?.length) {
      saveSet("Query Set", regions)
    } else {
      deleteSet("Query Set")
    }
  }, [regions])

  // const handleSave = useCallback(() => {
  //   console.log("saving", queryRegions.slice(0, numSegments))
  //   saveSet("Query Set", queryRegions.slice(0, numSegments))
  // },[queryRegions, numSegments, saveSet])

  return (
    <div className={`regionset-modal`}>
        <div className={`control-buttons`}>
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

          {/* <button data-tooltip-id="save-regions"
            onClick={handleSave}
          >
            💾
          </button> */}
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
