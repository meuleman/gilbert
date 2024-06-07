// A component to display some information below the map when hovering over hilbert cells
import LayerDropdown from './LayerDropdown'
import { getGenesInCell, getGenesOverCell } from '../lib/Genes'
import './StatusBar.css'

import { format } from "d3-format"

const StatusBar = ({
  width = 800,
  hover = null,
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
  }

  return (
    <div className="status-bar" style={{
    }}>

      <div className="status-bar-row">
        <div style={{width: '30px'}}>
        <button className={`filter-button ${showFilter ? 'active' : null}`}
          onClick={() => onFilter(!showFilter)}>
          🔒
        </button>
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
          <button className={`settings-button ${showSettings ? 'active' : null}`}
            onClick={() => onSettings(!showSettings)}>
            {/* <input type="checkbox" checked={showSettings} onChange={onSettings} /> */}
            ⚙️
          </button>
          <button className={`debug-button ${showDebug ? 'active' : null}`}
            onClick={() => onDebug(!showDebug)}>
            🐞
          </button>
        </div>
      </div>
    </div>
  )
}
export default StatusBar