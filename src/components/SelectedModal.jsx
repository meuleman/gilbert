// A component to display some information below the map when hovering over hilbert cells

import './SelectedModal.css'

const SelectedModal = ({
  width = 500,
  height = 800,
  selected = null,
  selectedOrder = null,
  selectedNarration=null,
  narrationDetailLevel=0,
  layer,
  zoom,
  layers,
  onClose=()=>{}
} = {}) => {
  let sample = null
  let sampleSummary = ""
  if(layer && selected && selected.data) {
    sample = layer.fieldChoice(selected)
    if(sample) {
      sampleSummary = `${sample.field}: ${sample.value}`
      if(layer.fieldSummary) {
        sampleSummary = layer.fieldSummary(selected)
      }
    }
    console.log("sample", sample, sampleSummary)
  }

  let narrationDisplayCoords = null
  if(selectedNarration) {
    /////////add onclick and pass the setRegion function from app as props
    // clear list
    var narrationList = document.getElementById('narration-list');
    if(narrationList) {
      narrationList.innerHTML = ''
    }
    // get narrations for specified order
    const dlNarration = selectedNarration[narrationDetailLevel]
    narrationDisplayCoords = dlNarration.map((d, i) => {
      const chrom = d.coordinates.split(':')[0]
      const start = d.coordinates.split(':')[1].split('-')[0]
      const stop = d.coordinates.split(':')[1].split('-')[1]
      let simRegionTxt = ''
      if(i===0) {
        simRegionTxt = 'Selected Region: '
      } else {
        simRegionTxt = 'Similar Region ' + i + ': '
      }

      // assign each segment coordinate to list
      if(narrationList) {
        var similarRegionElement = document.createElement('li');
        similarRegionElement.classList.add('narration-item');
        similarRegionElement.textContent = simRegionTxt + chrom + ':' + start

        narrationList.appendChild(similarRegionElement)
      }
      return chrom + ':' + start
    })
  }

  return (
    <>
    {selected && (
    <div className="selected-modal" style={{
      width: width - 2 + "px",
      height: height - 12 + "px"
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
            {sampleSummary}
          </span>
          <br/>
          <ul id='narration-list' className='narration-list'/>
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