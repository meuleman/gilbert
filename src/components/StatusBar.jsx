// A component to display some information below the map when hovering over hilbert cells

import './StatusBar.css'

const StatusBar = ({
  width = 800,
  hover = null,
  layer,
  zoom,
  LayerConfig
} = {}) => {
  let sample = null
  if(layer && hover && hover.data)
    sample = layer.fieldChoice(hover.data)

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
              {sample && sample.field}: {sample && sample.value}
            </span>
          </>
          )}
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