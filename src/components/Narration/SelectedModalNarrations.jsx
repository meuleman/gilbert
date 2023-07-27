// A component to display some information below the map when hovering over hilbert cells

import DetailLevelSlider from './DetailLevelSlider'
import factors from './NarrationFactors.json'
import './SelectedModalNarrations.css'

const SelectedModalNarrations = ({
  selectedNarration = null,
  narrationDetailLevel,
  setNarrationDetailLevel,
  setRegion,
} = {}) => {
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
    const dlNarrations = selectedNarration[narrationDetailLevel - 1]
    narrationDisplayCoords = dlNarrations.map((d, i) => {
      console.log(d)
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
    <div>
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
  )
}
export default SelectedModalNarrations