// A component to display some information below the map when hovering over hilbert cells
import LayerDropdown from './LayerDropdown'
import { getGenesInCell, getGenesOverCell } from '../lib/Genes'
import { sum } from 'd3-array'
import {Tooltip} from 'react-tooltip';

import './StatusBar.css'

import { format } from "d3-format"

const StatusBar = ({
  width = 800,
  hover = null,
  // filteredRegions = [],
  regionsByOrder = {},
  topCSNS = new Map(),
  layer,
  zoom,
  showFilter = false,
  showDebug = false,
  showSettings = false,
  orderOffset,
  onFilter=()=>{},
  onDebug=()=>{},
  onSettings=()=>{},
  onOrderOffset=()=>{},
  onClear=()=>{},
} = {}) => {
  let sample = null
  let sampleSummary = ""
  if(layer && hover && hover.data) {
    sample = layer.fieldChoice(hover)
  }

  let numformat = (x) => x
  if(sample) {
    let value = sample.value
    numformat = format(",d")
    if(value && value !== Math.floor(value)) {
      numformat = format(".4f")
    }
    if(typeof value === "string") {
      numformat = (x) => x
    }
  }

  if(sample) {
    sampleSummary = `${sample.field}: ${numformat(sample.value)}`
    if(layer.fieldSummary) {
      sampleSummary = layer.fieldSummary(hover)
    }
  }

  let inside,outside;
  let filteredPathCount = 0;
  let topCSNCount = 0;
  let topCSNRepresented = 0;
  if(hover) {
    inside = getGenesInCell(hover, zoom.order)
    if(inside.length > 3) {
      inside = inside.length
    } else {
      inside = inside.map(d => d.hgnc).join(", ")
    }
    outside = getGenesOverCell(hover, zoom.order)
    if(outside.length > 3) {
      outside = outside.length
    } else {
      outside = outside.map(d => d.hgnc).join(", ")
    }
    if(regionsByOrder?.total) {
      if(regionsByOrder.chrmsMap[hover.chromosome] && regionsByOrder.chrmsMap[hover.chromosome][hover.i]) {
        let filteredRegion = regionsByOrder.chrmsMap[hover.chromosome][hover.i]
        filteredPathCount = filteredRegion?.count
      }
    } else {
      filteredPathCount = 0
    }
    let topCSN = topCSNS.get(hover.chromosome + ":" + hover.i)
    if(topCSN) {
      topCSNCount = topCSN.length
      topCSNRepresented = sum(topCSN, d => d.representedPaths)
    }
  } else {
    filteredPathCount = 0
    topCSNCount = 0
    topCSNRepresented = 0
  }

  return (
    <div className="status-bar" style={{
    }}>

      <div className="status-bar-row">
        <div style={{width: '30px'}}>
        
        </div>
        <div className="filtered-regions">
          {topCSNCount ? <span>{topCSNCount} top path{topCSNCount > 1 ? "s" : ""} (representing {topCSNRepresented} paths)</span> : null}
          {filteredPathCount ? <span> {filteredPathCount} total filtered paths</span> : null}
        </div>
        <div className="status-bar-hover">
          {hover && (
            <>
              <span className="status-bar-hover-point">
                {hover.chromosome}:{hover.start} (region: {hover.i})
              </span>
              {sample && sample.field && (<span className="status-bar-hover-data">
                {sampleSummary}
              </span>)}
            </>
            )}
        </div>
     
        
        <div className="genes">
        {hover && (
          <>
          {inside && (<span>
            Genes in region: {inside} &nbsp;
          </span>
          
          )}
          {outside && (<span>
            Genes overlapping region: {outside}
          </span>)}
          </>
        )}
        </div>
        <div className="settings">
          <label className="order-offset">
            <span>Order Offset</span>
            <input type="number" min={-2} max={2} value={orderOffset} onChange={(e) => onOrderOffset(+e.target.value)} />
            <span>effective order {zoom.order}</span>
          </label>
          <button className={`filter-button ${showFilter ? 'active' : null}`}
            onClick={() => onFilter(!showFilter)}
            data-tooltip-id="filter">
            🔒
          </button>
          <Tooltip id="filter" place="top" effect="solid" className="tooltip-custom">
            Filter regions by factor
          </Tooltip>

          <button className={`clear-button`}
            onClick={() => onClear()}
            data-tooltip-id="clear">
            ❌
          </button>
          <Tooltip id="clear" place="top" effect="solid" className="tooltip-custom">
            Clear all selected state
          </Tooltip>

          <button className={`settings-button ${showSettings ? 'active' : null}`}
            onClick={() => onSettings(!showSettings)}
            data-tooltip-id="settings">
            {/* <input type="checkbox" checked={showSettings} onChange={onSettings} /> */}
            ⚙️
          </button>
          <Tooltip id="settings" place="top" effect="solid" className="tooltip-custom">
            Settings panel
          </Tooltip>
          <button className={`debug-button ${showDebug ? 'active' : null}`}
            onClick={() => onDebug(!showDebug)}
            data-tooltip-id="debug">
            🐞
          </button>
          <Tooltip id="debug" place="top" effect="solid" className="tooltip-custom">
            Debugging info
          </Tooltip>
        </div>
      </div>
    </div>
  )
}
export default StatusBar