import './LayerLegend.css'
import * as d3 from 'd3'
// import lenses from './Lenses/lenses.json'
import { useEffect, useMemo, useState } from 'react'
import SimSearchFactors from './SimSearch/SimSearchFactors.json'

const LayerLegend = ({
  data,
  hover,
  selected,
  handleLegendFactorClick,
  searchByFactorIndices,
  maxNumFactors=25,
} = {}) => {
  let layerName, SBFFactors, SBFFactorNames, SBFFactorInds = null

  if(data) {
    layerName = data.layer.name
  }
  if(layerName) {
    if(layerName === 'DHS Components SFC') {
      SBFFactors = SimSearchFactors['DHS']
    } else if(layerName === 'Chromatin States SFC') {
      SBFFactors = SimSearchFactors['Chromatin States']
    }
    if(SBFFactors) {
      SBFFactorNames = SBFFactors.map(f => f.fullName)
      SBFFactorInds = SBFFactors.map(f => f.ind)
    }
  }
  
  const handleClick = (factor) => {
    if(SBFFactors) {
      const factorInd = SBFFactorNames.indexOf(factor)
      const SBFFactorInd = SBFFactors[factorInd].ind
      let newSBFIndices = searchByFactorIndices
      if(newSBFIndices.includes(SBFFactorInd)) {
        newSBFIndices = newSBFIndices.filter((ind) => {return ind !== SBFFactorInd})
      } else {
        newSBFIndices.push(SBFFactorInd)
      }
      handleLegendFactorClick(newSBFIndices)
    }
  }

  var factorList = document.getElementById('factor-list');
  if(factorList) factorList.innerHTML = '';

  let inViewData, singleSegmentData, factors, hoverData, factorDataForList
  let hoverHighlights = []
  if(data) {
    if(data.data.length > 0) {
      inViewData = data.data
      singleSegmentData = inViewData[0].data
      let fullFactorList = Object.keys(singleSegmentData)
      factors = fullFactorList

      // reorder DHS factors
      if(layerName && ((layerName === 'DHS Components SFC') || (layerName === 'DHS OE Chi'))) {
        factors = SimSearchFactors['DHS'].map(f => f.fullName)
      }

      if(factors) {
        if(hover) {
          hoverData = hover.data
          factorDataForList = hoverData
        }
        if (hoverData) {
          hoverHighlights = factors.filter((f) => {return hoverData[f] > 0})
        }

        if(factors.length > maxNumFactors) {  // if there are too many factors to show
          if(selected && (Object.keys(selected.data).filter(f => fullFactorList.includes(f)).length === fullFactorList.length)) {
            factorDataForList = selected.data
          }
          if(factorDataForList && (Object.keys(factorDataForList).filter(f => fullFactorList.includes(f)).length === fullFactorList.length)) {
            // use hover data to get factor order
            let factorValues = Object.values(factorDataForList).map((v, i) => {
              return {value: v, index: i}
            })
            factorValues.sort((f1, f2) => {return f2.value - f1.value})
            // filter to relevant factors
            const factorValuesFiltered = factorValues.filter((f, i) => {
              if((f.value > 0) && (i < maxNumFactors)){
                return factors[f.index]
              }
            })
            // reorder factors
            factors = factorValuesFiltered.map((f) => {
              return factors[f.index]
            })
          } else {
            factors = []
          }
        }
        

        let factorPos
        factorPos = factors.map((f, i) => {
          if(factorList) {
            var factorElement = document.createElement('li');
            factorElement.classList.add('factor-item');
            factorElement.textContent = f
            // add on click behavior
            factorElement.onclick = () => handleClick(f)
            // Set the color of the square bullet using CSS variable
            factorElement.style.setProperty('--bullet-color', data.layer.fieldColor(f));  
            if(hoverHighlights.includes(f)) 
              factorElement.style.textShadow = '1px 0px 0px black';
            if(SBFFactorNames) {
              const SBFFactorInd = SBFFactorInds[SBFFactorNames.indexOf(f)]
              if(searchByFactorIndices.includes(SBFFactorInd)) {
                factorElement.style.setProperty('--checkmark', `'\\2713'`)
              }
            }
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