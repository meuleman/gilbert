// A component to display some information below the map when hovering over hilbert cells

import * as d3 from 'd3'
import DetailLevelSlider from './DetailLevelSlider'
import factors from './NarrationFactors.json'
import './SelectedModalNarrations.css'
// import { useEffect } from 'react'


const SelectedModalNarrations = ({
  selectedNarration = null,
  narrationDetailLevel,
  setNarrationDetailLevel,
  selectedOrder,
  setRegion,
} = {}) => {
  const removeConvBars = () => {
    if (document.getElementById('selected-modal-narration-list-container')) {
      d3.selectAll('svg#convSvg').remove()
      d3.selectAll("div#tooltip").remove()
    }
  }

  const clearNarrationList = () => {
    // clear list
    var narrationList = document.getElementById('similar-regions-list');
    var selectedList = document.getElementById('selected-list');
    if(narrationList) {
      narrationList.innerHTML = ''
    }
    if(selectedList) {
      selectedList.innerHTML = ''
    }
  }
  console.log(selectedNarration)
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
  

  let narrationElementsPos = null
  let maxDetailLevel = null
  if(selectedNarration) {
    maxDetailLevel = selectedNarration.length
    const handleClick = function (chrom, start, stop) {
      setRegion({
        chromosome: chrom, 
        start: start, 
        end: stop,
        order: selectedOrder
      })
    }

    // set labels
    var selectedLabel = document.getElementById('selected-modal-narration-label-selected')
    var similarLabel = document.getElementById('selected-modal-narration-label-similar')
    if(selectedLabel) {
      selectedLabel.textContent = "Selected Region:"
    }
    if(similarLabel) {
      similarLabel.textContent = "Similar Regions:"
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
    narrationElementsPos = dlNarrations.map((d, i) => {
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
        regionElementY = regionElement.getBoundingClientRect().top
        regionElementHeight = regionElement.clientHeight
      }
      return { y: regionElementY, height: regionElementHeight, ranks: ranks, factorOrder: factorOrder }
    })

    removeConvBars()
    const narrationElementsYPos = narrationElementsPos.map((d) => {
      return d.y
    })
    const narrationRanks = narrationElementsPos.map((d) => {
      return d.ranks
    })
    const narrationElementsHeight = narrationElementsPos[0].height
    const narrationFactorOrder = narrationElementsPos[0].factorOrder
  
    let convBarSvgWidth = 200;
    let convBarSvgHeight = Math.max(...narrationElementsYPos) - Math.min(...narrationElementsYPos) + narrationElementsHeight
    let narrationListContainer = d3.select("#selected-modal-narration-list-container")
    let convSvg = narrationListContainer
      .append("svg")
      .attr('id', 'convSvg')
      .attr('className', 'conv-svg')
      .attr("width", convBarSvgWidth)
      .attr("height", convBarSvgHeight)
      .style("position", "absolute")
      .attr("transform", "translate(" + convBarSvgWidth + ", -" + convBarSvgHeight + ")");

    const tooltip = narrationListContainer
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
      const parentElement = document.getElementById('selected-modal-narration-list-container');
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
    const queryRanks = narrationRanks[0]

    narrationElementsYPos.map((y, i) => {
      const yAdjusted = y - Math.min(...narrationElementsYPos) + yOffset
      const ranks = narrationRanks[i]
      let factorCount = 0
      ranks.map((r, j) => {
        if(r * queryRanks[j] > convThresh) {
          const factorInd = narrationFactorOrder[j]
          const factor = factors[factorInd]
          convSvg
            .append("rect")
            .attr("x", factorCount * convBarWidth)
            .attr("y", yAdjusted)
            .attr("width", convBarWidth - gapW)
            .attr("height", narrationElementsHeight - gapH)
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
    var narrationList = document.getElementById('similar-regions-list');
    var selectedList = document.getElementById('selected-list');
    if(narrationList) {
      narrationList.innerHTML = ''
    }
    if(selectedList) {
      selectedList.innerHTML = ''
    }
    var selectedLabel = document.getElementById('selected-modal-narration-label-selected')
    var similarLabel = document.getElementById('selected-modal-narration-label-similar')
    if(selectedLabel) {
      selectedLabel.textContent = ''
    }
    if(similarLabel) {
      similarLabel.textContent = ''
    }
  }

  return (
    <div id='selected-modal-narration-list-container' className='selected-modal-narration-list-container'>
      <DetailLevelSlider
        detailLevel={narrationDetailLevel}
        maxDetailLevel={maxDetailLevel}
        setDetailLevel={setNarrationDetailLevel}
      />
      <span className='selected-modal-narration-label' id='selected-modal-narration-label-selected'></span>
      <ul id='selected-list' className='selected-modal-narration-list'/>
      <span className='selected-modal-narration-label' id='selected-modal-narration-label-similar'></span>
      <ul id='similar-regions-list' className='selected-modal-narration-list'/>
    </div>
  )
}
export default SelectedModalNarrations