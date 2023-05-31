// A component to display some information below the map when hovering over hilbert cells

import './SelectedModal.css'

const SelectedModal = ({
  width = 500,
  height = 800,
  selected = null,
  selectedOrder = null,
  layer,
  zoom,
  LayerConfig,
  onClose=()=>{}
} = {}) => {
  let sample = null
  if(layer && selected && selected.data)
    sample = layer.fieldChoice(selected.data)

  return (
    <>
    {selected && (
    <div className="selected-modal" style={{
      width: width - 2 + "px",
      height: height + "px"
    }}>
      
      <div className="header">
        <div className="close" onClick={onClose}>x</div>
      </div>
      <div className="selected-modal-selected">
          <span className="selected-modal-selected-point">
            {selected.chromosome}:{selected.start}
          </span>
          <br/>
          <span className="selected-modal-selected-hilbert">
            Hilbert index: { selected.i } &nbsp;
            Hilbert order: {selectedOrder}
          </span>
          <br/>
          <span className="selected-modal-selected-data">
            {sample && sample.field}: {sample && sample.value}
          </span>
      </div>
     
      {/* <div className="selected-modal-order">
        {zoom && (
          <span>Order: {zoom.order}</span>
        )}

      </div> */}
    </div>
  )}
</>
  )
}
export default SelectedModal