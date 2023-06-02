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
  LayerConfig,
  onLayer=()=>{}
} = {}) => {
  let sample = null
  if(layer && hover && hover.data)
    sample = layer.fieldChoice(hover)

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
      width: width - 2 + "px",
    }}>

      <div className="status-bar-row">
        <div className="status-bar-hover">
          {hover && (
            <>
              <span className="status-bar-hover-point">
                {hover.chromosome}:{hover.start} (region: {hover.i})
              </span>
              <span className="status-bar-hover-data">
                {sample && sample.field}: {sample && numformat(sample.value)}
              </span>
            </>
            )}
        </div>
     
        <div className="status-bar-layer">
          <LayerDropdown 
            LayerConfig={LayerConfig} 
            activeLayer={layer} 
            onLayer={onLayer} 
            order={zoom.order}
            />
        </div>
        <div className="status-bar-order">
          {zoom && (
            <span>Order: {zoom.order}</span>
          )}
        </div>
      </div> 
      <div className="status-bar-row">
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
      </div>
    </div>
  )
}
export default StatusBar