// A component to display some information below the map when hovering over hilbert cells
import LayerDropdown from './LayerDropdown'
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
  }
  
  return (
    <div className="status-bar" style={{
      width: width - 2 + "px",
    }}>
      
        <div className="status-bar-hover">
        {hover && (
          <>
            <span className="status-bar-hover-point">
              {hover.chromosome}:{hover.start} (hilbert index: {hover.i})
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
  )
}
export default StatusBar