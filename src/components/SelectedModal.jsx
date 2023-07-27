// A component to display some information below the map when hovering over hilbert cells

import DetailLevelSlider from './Narration/DetailLevelSlider'
import './SelectedModal.css'

const SelectedModal = ({
  width = 500,
  height = 800,
  selected = null,
  selectedOrder = null,
  selectedNarration = null,
  narrationDetailLevel,
  setNarrationDetailLevel,
  setRegion,
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

  // narrations
  let narrationDisplayCoords = null
  let maxDetailLevel = null
  if(selectedNarration) {
    maxDetailLevel = selectedNarration.length
    const handleClick = function (chrom, start, stop) {
      setRegion({
        chromosome: chrom, 
        start: start, 
        end: stop 
      })
    }

    // clear list
    var narrationList = document.getElementById('similar-regions-list');
    var selectedList = document.getElementById('selected-list');
    if(narrationList) {
      narrationList.innerHTML = ''
    }
    if(selectedList) {
      selectedList.innerHTML = ''
    }
    // get narrations for specified order
    narrationDisplayCoords = selectedNarration[narrationDetailLevel - 1].map((d, i) => {
      const chrom = d.coordinates.split(':')[0]
      const start = d.coordinates.split(':')[1].split('-')[0]
      const stop = d.coordinates.split(':')[1].split('-')[1]

      // assign each segment coordinate to list
      if(narrationList && selectedList) {
        var regionElement = document.createElement('li');
        regionElement.classList.add('selected-modal-narration-item');
        regionElement.addEventListener("click", () => handleClick(chrom, start, stop));
        if(i===0) {
          regionElement.textContent = chrom + ':' + start
          selectedList.appendChild(regionElement)
        } else {
          regionElement.textContent = i + ': ' + chrom + ':' + start
          narrationList.appendChild(regionElement)
        }
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
          <span className='selected-modal-narration-label'>Selected Region:</span>
          <ul id='selected-list' className='selected-modal-narration-list'/>
          <DetailLevelSlider
            detailLevel={narrationDetailLevel}
            maxDetailLevel={maxDetailLevel}
            setDetailLevel={setNarrationDetailLevel}
          />
          <span className='selected-modal-narration-label'>Similar Regions:</span>
          <ul id='similar-regions-list' className='selected-modal-narration-list'/>
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