import './LayerLegend.css'
import * as d3 from 'd3'
// import lenses from './Lenses/lenses.json'
import { useEffect, useMemo, useState } from 'react'
import SimSearchFactors from './SimSearch/SimSearchFactors.json'

const LayerLegend = ({
  data,
  hover,
  selected,
  handleFactorClick,
  searchByFactorInds,
  maxNumFactors=25,
} = {}) => {
  let fullFactorList, factorsToShow, factorsToHighlight = []
  let layerName, SBFFactors, SBFFactorNames, SBFFactorInds = null
  var factorList = document.getElementById('factor-list');
  if(factorList) factorList.innerHTML = '';

  // if the legend is hidden or not
  const [hidden, setHidden] = useState(false)

  const handleClickForHidden = function () {
    setHidden(!hidden)
  }

  // function to handle the click for adding factors to the search by factor list
  const handleClick = (factor) => {
    if(SBFFactors) {
      const factorInd = SBFFactorNames.indexOf(factor)
      const SBFFactorInd = SBFFactors[factorInd].ind
      let newSBFIndices = searchByFactorInds
      if(newSBFIndices.includes(SBFFactorInd)) {
        newSBFIndices = newSBFIndices.filter((ind) => {return ind !== SBFFactorInd})
      } else {
        newSBFIndices.push(SBFFactorInd)
      }
      const currentMetricFactorInds = SBFFactors.map(d => d.ind)
      newSBFIndices = newSBFIndices.filter(i => currentMetricFactorInds.includes(i))
      handleFactorClick(newSBFIndices)
    }
  }

  // set layer name and search by factor factors
  layerName = data?.layer.name
  if(layerName === 'DHS Components') SBFFactors = SimSearchFactors['DHS'];
  else if(layerName === 'Chromatin States') SBFFactors = SimSearchFactors['Chromatin States'];
  if(SBFFactors) {
    SBFFactorNames = SBFFactors.map(f => f.fullName)
    SBFFactorInds = SBFFactors.map(f => f.ind)
  }
  
  // set the full list of factors
  if(data) {
    let meta = data.meta
    if(meta) {
      fullFactorList = (
        (meta.fields.length == 2) && (meta.fields[0] == "max_field") && (meta.fields[1] == "max_value")
      ) ? meta['full_fields'] : meta['fields']
    }
  }

  // set the factors to show
  // if there are less than maxNumFactors, show all factors
  if(fullFactorList && (fullFactorList.length <= maxNumFactors)) {
    factorsToShow = fullFactorList
  } else {
    let dataToShow
    // prioritize selected data
    if(selected?.data) {
      dataToShow = selected.data
    // if no selected data, use hover data
    } else if(hover?.data) {
      dataToShow = hover.data
    }
    if(dataToShow) {
      let dataToShowFactors = Object.keys(dataToShow)
      let dataToShowValues = Object.values(dataToShow)
      // if max layer, set other factors and their corresponding values to 0
      if ((dataToShowFactors.length == 2) && (dataToShowFactors[0] == "max_field") && (dataToShowFactors[1] == "max_value") && fullFactorList) {
        dataToShow = Object.fromEntries(
          fullFactorList.map((f, i) => {
            return [f, (fullFactorList[dataToShowValues[0]] == f) ? dataToShowValues[1] : 0]
          }
        ))
        dataToShowFactors = Object.keys(dataToShow)
        dataToShowValues = Object.values(dataToShow)
      }
      // ensure that the factors are for our current layer
      if(
        (dataToShowFactors.length > 0) && 
        (dataToShowFactors.filter(f => fullFactorList?.includes(f)).length === dataToShowFactors.length)
      ) {
        // sort the factors by their values
        let factorValues = dataToShowValues.map((v, i) => {
          return { value: v, index: i, factor: dataToShowFactors[i] }
        }).sort((f1, f2) => {return f2.value - f1.value})
        // filter out factors with 0 values and take the top maxNumFactors
        let factorValuesFiltered = factorValues.filter((f, i) => {
          if((f.value > 0) && (i < maxNumFactors)){
            return f.factor
          }
        })
        factorsToShow = factorValuesFiltered.map(f => f.factor)
      }
    }
  }

  // set the factors to highlight
  if(hover?.data) {
    let hoverData = hover.data
    let hoverKeys = Object.keys(hoverData)
    if ((hoverKeys.length == 2) && (hoverKeys[0] == "max_field") && (hoverKeys[1] == "max_value") && fullFactorList) {
      let factorName = fullFactorList[hover.data?.max_field]
      hoverData = {[factorName]: hover.data.max_value}
    }
    factorsToHighlight = fullFactorList?.filter((f) => {return hoverData[f] > 0})
  }

  // add factors to legend
  if(!hidden) {
    factorsToShow?.forEach((f) => {
      if(factorList) {
        var factorElement = document.createElement('li');
        factorElement.classList.add('factor-item');
        factorElement.textContent = f
        // add on click behavior
        factorElement.onclick = () => handleClick(f)
        // Set the color of the square bullet using CSS variable
        factorElement.style.setProperty('--bullet-color', data.layer.fieldColor(f));  
        if(factorsToHighlight.includes(f)) 
          factorElement.style.textShadow = '1px 0px 0px black';
        if(SBFFactorNames) {
          const SBFFactorInd = SBFFactorInds[SBFFactorNames.indexOf(f)]
          if(searchByFactorInds?.includes && searchByFactorInds.includes(SBFFactorInd)) {
            factorElement.style.setProperty('--checkmark', `'\\2713'`)
          }
        }
        factorList.appendChild(factorElement)
      }
    })
  }

  return (
    <>
      <div className="legend-box" id="legend-box">
        <button 
          className={!hidden ? 'container-close-button' : 'container-open-button' }
          onClick={() => handleClickForHidden()}
        />
        <span className='legend-label'>Factors</span>
        {!hidden ? 
          <ul 
            id='factor-list' 
            className='factor-list' 
          />
        :
          <ul 
            id='factor-list' 
            className='factor-list' 
            style={{'margin': '0px'}}
          />
        }
      </div>
    </>
  )
}
export default LayerLegend