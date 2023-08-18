// A component to display some information below the map when hovering over hilbert cells

import * as d3 from 'd3'
import DetailLevelSlider from './DetailLevelSlider'
import allFactors from './SimSearchFactors.json'
import './SelectedModalSimSearch.css'
import { useEffect } from 'react'
// import { useEffect } from 'react'


const SelectedModalSimSearch = ({
  selectedSimSearch = null,
  simSearchDetailLevel,
  setSimSearchDetailLevel,
  simSearchMethod,
  selectedOrder,
  setRegion,
  layer,
} = {}) => {
  const removeConvBars = () => {
    if (document.getElementById('selected-modal-simsearch-list-container')) {
      d3.selectAll('svg#convSvg').remove()
      d3.selectAll("div#tooltip").remove()
    }
  }

  let factors
  if (simSearchMethod === 'DHS Components SFC') {
    factors = allFactors['DHS']
  }
  else if(simSearchMethod === 'Chromatin States SFC') {
    factors = allFactors['Chromatin States']
  }

  const clearSimSearchList = () => {
    // clear list
    var simSearchList = document.getElementById('similar-regions-list');
    var selectedList = document.getElementById('selected-list');
    if(simSearchList) {
      simSearchList.innerHTML = ''
    }
    if(selectedList) {
      selectedList.innerHTML = ''
    }
  }

  let maxDetailLevel = null
  if(selectedSimSearch && factors) {
    // set quiescent factor color to non-white value
    let quiescentFactorInd = null
    factors.map((f, i) => {
      if(f.color === "#ffffff") {
        quiescentFactorInd = i
      }
    })
    if(quiescentFactorInd) {
      factors[quiescentFactorInd].color = "#ECECEC"
    }
    
    maxDetailLevel = selectedSimSearch.length
    const handleClick = function (chrom, start, stop) {
      setRegion({
        chromosome: chrom, 
        start: start, 
        end: stop,
        order: selectedOrder
      })
    }

    // set labels
    var selectedLabel = document.getElementById('selected-modal-simsearch-label-selected')
    var similarLabel = document.getElementById('selected-modal-simsearch-label-similar')
    if(selectedLabel) {
      selectedLabel.textContent = "Selected Region:"
    }
    if(similarLabel) {
      similarLabel.textContent = "Similar Regions:"
    }
    // clear list
    var simSearchList = document.getElementById('similar-regions-list');
    var selectedList = document.getElementById('selected-list');
    if(simSearchList) {
      simSearchList.innerHTML = ''
    }
    if(selectedList) {
      selectedList.innerHTML = ''
    }
    // get simSearch for specified order
    const dlSimSearch = selectedSimSearch[simSearchDetailLevel - 1]
    let simSearchElementsPos = null
    simSearchElementsPos = dlSimSearch.map((d, i) => {
      const chrom = d.coordinates.split(':')[0]
      const start = d.coordinates.split(':')[1].split('-')[0]
      const stop = d.coordinates.split(':')[1].split('-')[1]

      const ranks = d.percentiles
      let factorOrder = [null]
      if(d.factor_order) {
        factorOrder = d.factor_order
      }

      let regionElementY = null
      let regionElementHeight = null
      // assign each segment coordinate to list
      if(simSearchList && selectedList) {
        var regionElement = document.createElement('li');
        regionElement.classList.add('selected-modal-simsearch-item');
        regionElement.addEventListener("click", () => handleClick(chrom, start, stop));
        if(i===0) {
          regionElement.textContent = chrom + ':' + start
          selectedList.appendChild(regionElement)
        } else {
          regionElement.textContent = i + ': ' + chrom + ':' + start
          simSearchList.appendChild(regionElement)
        }
        regionElementY = regionElement.getBoundingClientRect().top
        regionElementHeight = regionElement.clientHeight
      }
      return { y: regionElementY, height: regionElementHeight, ranks: ranks, factorOrder: factorOrder }
    })

    removeConvBars()
    const simSearchElementsYPos = simSearchElementsPos.map((d) => {
      return d.y
    })
    const simSearchRanks = simSearchElementsPos.map((d) => {
      return d.ranks
    })
    const simSearchElementsHeight = simSearchElementsPos[0].height
    const simSearchFactorOrder = simSearchElementsPos[0].factorOrder
  
    let convBarSvgWidth = 200;
    let convBarSvgHeight = Math.max(...simSearchElementsYPos) - Math.min(...simSearchElementsYPos) + simSearchElementsHeight
    let simSearchListContainer = d3.select("#selected-modal-simsearch-list-container")
    let convSvg = simSearchListContainer
      .append("svg")
      .attr('id', 'convSvg')
      .attr('className', 'conv-svg')
      .attr("width", convBarSvgWidth)
      .attr("height", convBarSvgHeight)
      .style("position", "absolute")
      .attr("transform", "translate(" + convBarSvgWidth + ", -" + convBarSvgHeight + ")");

    const tooltip = simSearchListContainer
      .append('div')
      .style('opacity', 0)
      .attr('id', 'tooltip')
      .attr('class', 'tooltip')
      .style('background-color', 'white')
      .style('border', 'solid')
      .style('border-width', '1px')
      .style('border-radius', '5px')
      .style('padding', '5px')
      .style('position', 'absolute')
      .style('display', 'inline')
      .style('z-index', -1)
      .style('max-width', '500px')

    const mouseover = function (factorInfo) {
      
      let factor = factorInfo.name
      let metric = ""
      if(factorInfo.metric === "DHSs") {
        metric = "DHS Components SFC"
      } else if(factorInfo.metric === "chromatin states") {
        metric = "Chromatin States SFC"
      }
      tooltip
        .html(factor + " (" + metric + ")")
        .style('opacity', 1)
        .style('z-index', 1)
      d3.select(this)
        .style("stroke", "black")
        .style("stroke-width", "1")
    }

    const findOffset = function () {
      // offset of parent element
      const parentElement = document.getElementById('selected-modal-simsearch-list-container');
      const parentOffset = parentElement.getBoundingClientRect()
      return parentOffset
    }

    const mousemove = function (e) {
      const parentOffset = findOffset()
      tooltip.style('left', (e.clientX - parentOffset.x + 20) + 'px')
      tooltip.style('top', (e.clientY - parentOffset.y) + 'px')
    }

    // mouseleave
    const mouseleave = function () {
      tooltip
        .style('opacity', 0)
        .style('z-index', -1)
      d3.select(this)
        .style("stroke", "black")
        .style("stroke-width", "0.1")
    }

    let convBarWidth = 10
    let convThresh = 0 // Math.sqrt(0.9)
    let gapW = 1
    let gapH = 7
    let yOffset = 8
    const queryRanks = simSearchRanks[0]

    simSearchElementsYPos.map((y, i) => {
      const yAdjusted = y - Math.min(...simSearchElementsYPos) + yOffset
      const ranks = simSearchRanks[i]
      let factorCount = 0
      ranks.map((r, j) => {
        if(r * queryRanks[j] > convThresh) {
          const factorInd = simSearchFactorOrder[j]
          const factor = factors[factorInd]
          convSvg
            .append("rect")
            .attr("x", factorCount * convBarWidth)
            .attr("y", yAdjusted)
            .attr("width", convBarWidth - gapW)
            .attr("height", simSearchElementsHeight - gapH)
            .style("fill", factor.color)
            .style("stroke", "black")
            .style("stroke-width", "0.1")
            .on("mouseover", function() {mouseover.bind(this)(factor)})
            .on("mousemove", mousemove)
            .on("mouseleave", mouseleave)
          factorCount += 1
        }
      })
    })
  } else {
    removeConvBars()
    // clear list
    var simSearchList = document.getElementById('similar-regions-list');
    var selectedList = document.getElementById('selected-list');
    if(simSearchList) {
      simSearchList.innerHTML = ''
    }
    if(selectedList) {
      selectedList.innerHTML = ''
    }
    var selectedLabel = document.getElementById('selected-modal-simsearch-label-selected')
    var similarLabel = document.getElementById('selected-modal-simsearch-label-similar')
    if(selectedLabel) {
      selectedLabel.textContent = ''
    }
    if(similarLabel) {
      similarLabel.textContent = ''
    }
  }

  return (
    <div id='selected-modal-simsearch-list-container' className='selected-modal-simsearch-list-container'>
      <DetailLevelSlider
        detailLevel={simSearchDetailLevel}
        maxDetailLevel={maxDetailLevel}
        setDetailLevel={setSimSearchDetailLevel}
      />
      <span className='selected-modal-simsearch-label' id='selected-modal-simsearch-label-selected'></span>
      <ul id='selected-list' className='selected-modal-simsearch-list'/>
      <span className='selected-modal-simsearch-label' id='selected-modal-simsearch-label-similar'></span>
      <ul id='similar-regions-list' className='selected-modal-simsearch-list'/>
    </div>
  )
}
export default SelectedModalSimSearch