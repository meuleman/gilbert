import './LayerLegend.css'
import * as d3 from 'd3'
// import lenses from './Lenses/lenses.json'
import { useEffect, useMemo } from 'react'

const LayerLegend = ({
  data,
  hover,
} = {}) => {
  var factorList = document.getElementById('factor-list');
  if(factorList) factorList.innerHTML = '';

  let inViewData, singleSegmentData, factors
  let hoverHighlights = []
  if(data) {
    if(data.data.length > 0) {
      inViewData = data.data
      singleSegmentData = inViewData[0].data
      factors = Object.keys(singleSegmentData)

      if(factors) {
        if(hover) {
          let hoverData = hover.data
          if (hoverData) 
            hoverHighlights = factors.filter((f) => {return hoverData[f] > 0})
        }

        let factorPos
        factorPos = factors.map((f, i) => {
          if(factorList) {
            var factorElement = document.createElement('li');
            factorElement.classList.add('factor-item');
            factorElement.textContent = f
            // Set the color of the square bullet using CSS variable
            factorElement.style.setProperty('--bullet-color', data.layer.fieldColor(f));  
            if(hoverHighlights.includes(f)) 
              factorElement.style.textShadow = '1px 0px 0px black';
            factorList.appendChild(factorElement)
          }
          return 
        })
      }
    }
  }

  return (
    <>
      {(
        <div className="legend-box" id="legend-box">
          <span className='legend-label'>Factors</span>
          <ul id='factor-list' className='factor-list'/>
        </div>
      )}
    </>
  )
}
export default LayerLegend