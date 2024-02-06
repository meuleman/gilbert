// A component to display some information below the map when hovering over hilbert cells

import * as d3 from 'd3'
import './SelectedModalSimSearch.css'
import { useEffect, useState, useMemo } from 'react'
import { HilbertChromosome } from '../../lib/HilbertChromosome'
import simSearchFactors from './SimSearchFactors.json'
// import { useEffect } from 'react'


const SelectedModalSimSearch = ({
  simSearch,
  searchByFactorInds,
  handleFactorClick,
  selectedOrder,
  setRegion,
  setHover,
  regionHeight=15,
  regionMargin=-5,
  barGap=2,
  convThresh=0,
  svgXAdjust=240,
  factorHeaderYHeight = 13,
  factorHeaderGap = 7,
  inSearchMinWidth = 80,
  notInSearchMinWidth = 100,
  onZoom=()=>{}
} = {}) => {
  let hilbert = new HilbertChromosome(selectedOrder)
  let simSearchRegions, selectedRegion, similarRegions, factors, layerFactors
  
  const [hidden, setHidden] = useState(false)

  const handleRegionClick = function (chrom, start, stop) {
    let range = hilbert.fromRegion(chrom, start, stop-1)[0]
    range.end = parseInt(stop)
    setRegion(range)
  }
  const handleRegionMouseOver = function (chrom, start, stop, ranks) {
    let range = hilbert.fromRegion(chrom, start, stop-1)[0]
    range.end = parseInt(stop)

    let hoverData = {}
    ranks.map((r, i) => {
      let factorName = factors[i].fullName
      let factorRank = r
      hoverData[factorName] = factorRank
    })
    range.data = hoverData
    setHover(range, true)
  }

  const handleRegionMouseLeave = function () {
    setHover(null, true)
  }

  // function to clear the convolution svg
  const removeConvBars = () => {
    let inSearchSvgElement = d3.selectAll('svg#inSearchSvg')
    let notInSearchSvgElement = d3.selectAll('svg#notInSearchSvg')
    let convSvgTooltip = d3.selectAll("div#tooltip")

    // if an element has been created
    if(inSearchSvgElement._groups[0].length) inSearchSvgElement.remove()
    if(notInSearchSvgElement._groups[0].length) notInSearchSvgElement.remove()
    if(convSvgTooltip._groups[0].length) convSvgTooltip.remove()
  }

  // set max detail level and sim search results for current detail level
  if(simSearch) {
    factors = simSearch.factors
    if(simSearch.layer) {  // only in search by factor
      let layer = simSearch.layer
      if(layer === "DHS Components") layerFactors = simSearchFactors['DHS'].map(d => d.fullName)
      else if(layer === 'Chromatin States') layerFactors = simSearchFactors['Chromatin States'].map(d => d.fullName)
    }
    if(simSearch.simSearch) {
      if (simSearch.method == "Region") {
        simSearchRegions = simSearch.simSearch
        selectedRegion = simSearchRegions.slice(0,1)
        similarRegions = simSearchRegions.slice(1)
      } else {
        simSearchRegions = simSearch.simSearch
        similarRegions = simSearchRegions
      }
    } else {
      removeConvBars()
    }
  }
    
  useEffect(() => {
    removeConvBars()
    let selectedList = document.getElementById('selected-list');
    let simSearchList = document.getElementById('similar-regions-list');

    let listItems
    if(selectedList && simSearchList) {
      let selectedListItem = [...selectedList.querySelectorAll('li')]    
      let similarListItems = [...simSearchList.querySelectorAll('li')]
      listItems = selectedListItem.concat(similarListItems)
    }
    
    if(listItems?.length > 0 && !hidden) {
      let simSearchListContainer = d3.select("#selected-modal-simsearch-list-container")

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
        let factor = factorInfo.fullName
        tooltip
          .html(factor)
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
          .style("stroke-width", "0.5")
      }

      const onclick = (factorInfo) => {
        const factorInd = factorInfo.ind
        let newSearchByFactorArr = [...searchByFactorInds]
        if(searchByFactorInds.includes(factorInd)) {
          newSearchByFactorArr = newSearchByFactorArr.filter(i => i !== factorInd)
        } else {
          newSearchByFactorArr.push(factorInd)
        }
        handleFactorClick(newSearchByFactorArr, simSearch.method)
      }

      // get the y positions for each region
      let allRegionYPos = listItems.map((i) => i.getBoundingClientRect().top)

      // find the ranks we want to create convolution bars for
      let inSearchData = []
      let notInSearchData = []
      let factorsInSearch
      if(searchByFactorInds) {
        factorsInSearch = searchByFactorInds
      }

      let headerY = factorHeaderYHeight + factorHeaderGap
      if(factorsInSearch) {
        let allRegionYPosMin = Math.min(...allRegionYPos)
        allRegionYPos.forEach((y, i) => {
          const yAdjusted = y - allRegionYPosMin + headerY
          const ranks = simSearchRegions[i].percentiles
          const ranksWithFactorIndsSorted = ranks
            .map((r, i) => ({rank: r, factorInd: factors[i].ind}))  // factorInd may not be i (ie Chromatin States)
            .sort((a, b) => b.rank - a.rank)
          
          let inSearchFactorCount = 0
          let notInSearchFactorCount = 0

          ranksWithFactorIndsSorted.map((r) => {
            let nonZeroRank = r.rank > 0
            if((nonZeroRank) && factorsInSearch.includes(r.factorInd)) {
              inSearchData.push({factorInd: r.factorInd, factorCount: inSearchFactorCount, yAdjusted: yAdjusted})
              inSearchFactorCount += 1
            } else if(nonZeroRank) {
              if((layerFactors && layerFactors.includes(factors[r.factorInd].fullName)) || !layerFactors) {
                notInSearchData.push({factorInd: r.factorInd, factorCount: notInSearchFactorCount, yAdjusted: yAdjusted})
                notInSearchFactorCount += 1
              }
            }
          })
        })
      }

      const addBar = function (factorInd, factorCount, yAdjusted, svg) {
        const factor = factors.filter(f => f.ind == factorInd)[0]
        svg
          .append("rect")
          .attr("x", factorCount * (regionHeight / 2 + barGap))
          .attr("y", yAdjusted)
          .attr("width", regionHeight / 2)
          .attr("height", regionHeight)
          .style("fill", factor.color)
          .style("stroke", "black")
          .style("stroke-width", "0.5")
          .on("mouseover", function() {mouseover.bind(this)(factor)})
          .on("mousemove", mousemove)
          .on("mouseleave", mouseleave)
          .on("click", function() {onclick.bind(this)(factor)})
        return
      }

      // define the size and position of convolution bar svg
      // heights for all bar svgs
      let barSvgHeight = Math.max(...allRegionYPos) - Math.min(...allRegionYPos) + regionHeight + headerY
      let firstRegion = listItems[0].getBoundingClientRect()
      let firstRegionOverallSize = firstRegion.height
      let svgYAdjust = barSvgHeight + regionMargin + (firstRegionOverallSize - regionHeight) / 2

      // in search bars
      let maxInSeachFactorCount = Math.max(...inSearchData.map((d) => d.factorCount + 1))
      let inSearchBarSvgWidth = Math.max((regionHeight / 2 + barGap) * maxInSeachFactorCount, inSearchMinWidth)
      
      let inSearchSvg = simSearchListContainer
        .append("svg")
        .attr('id', 'inSearchSvg')
        .attr('className', 'conv-svg')
        .attr("width", inSearchBarSvgWidth)
        .attr("height", barSvgHeight)
        .style("position", "absolute")
        .attr("transform", "translate(" + (svgXAdjust + regionMargin) + ", -" + svgYAdjust + ")")

      // add bars
      inSearchSvg
          .append("text")
          .attr("text-anchor", "start")
          .attr("dy", factorHeaderYHeight)
          .style('font-size', factorHeaderYHeight)
          .style('font', 'sans-serif')
          .text("In Search")
      inSearchData.map((d) => {
        addBar(d.factorInd, d.factorCount, d.yAdjusted, inSearchSvg)
      })

      // not in search
      let maxNotInSearchFactorCount = Math.max(...notInSearchData.map((d) => d.factorCount + 1))
      let notInSearchBarSvgWidth = Math.max((regionHeight / 2 + barGap) * maxNotInSearchFactorCount, notInSearchMinWidth)
      
      let notInSearchSvg = simSearchListContainer
        .append("svg")
        .attr('id', 'notInSearchSvg')
        .attr('className', 'conv-svg')
        .attr("width", notInSearchBarSvgWidth)
        .attr("height", barSvgHeight)
        .style("position", "absolute")
        .attr("transform", "translate(" + (svgXAdjust + inSearchBarSvgWidth + regionMargin) + ", -" + svgYAdjust + ")")

      // add bars
      if(notInSearchData.length > 0) {
        notInSearchSvg
          .append("text")
          .attr("text-anchor", "start")
          .attr("dy", factorHeaderYHeight)
          .style('font-size', factorHeaderYHeight)
          .style('font', 'sans-serif')
          .text("Not In Search")
        notInSearchData.map((d) => {
          addBar(d.factorInd, d.factorCount, d.yAdjusted, notInSearchSvg)
        })
      }

      ///// other metrics - we have this information for search by factor (and what the current layer is -> <layerFactors>), we just need it for regional
    }
  }, [simSearchRegions, hidden])
  
  const handleClickForHidden = function () {
    setHidden(!hidden)
    removeConvBars()
  }

  const handleClick = (chrom, start, stop) => handleRegionClick(chrom, start, stop);
  const handleMouseOver = (chrom, start, stop, factorRanks) => handleRegionMouseOver(chrom, start, stop, factorRanks);
  const handleMouseLeave = () => handleRegionMouseLeave();

  const addRegion = (s) => {
    const [chrom, startStop] = s.coordinates.split(':')
    const [start, stop] = startStop.split('-')
    const rank = s.rank
    const factorRanks = s.percentiles
    let label = rank === 0 ? chrom + ':' + start : rank + ': ' + chrom + ':' + start

    return (
      <li 
        className='selected-modal-simsearch-item' 
        key={rank}
        onMouseOver={() => handleMouseOver(chrom, start, stop, factorRanks)}
        onMouseLeave={() => handleMouseLeave()}
        style={{
          "fontSize": regionHeight + "px",
          "margin": regionMargin + "px",
          "fontFamily": "monospace"
        }}
      >
        <span className="selector" style={{fontSize: regionHeight * 1.25 + "px"}} onClick={() => handleClick(chrom, start, stop)} title="Select region">🎯</span>
        <span className="zoomer" onClick={() => onZoom({chromosome: chrom, start, end: stop})} title="Zoom to region">🧭</span> 
        <span className="label"> {label}</span>
        
      </li>
    )
  }

  return (
    (simSearch?.simSearch && 
      (!hidden ?
        <div id='selected-modal-simsearch-list-container' className='selected-modal-simsearch-list-container'>
          <button 
            className='simsearch-container-close-button'
            onClick={() => handleClickForHidden()}
          />
          <span className='selected-modal-simsearch-label' id='selected-modal-simsearch-label-selected' style={{"fontSize": regionHeight + "px"}}>
            {selectedRegion ? (
              "Selected Region:"
            ) : null}
          </span>

          <ul id='selected-list' className='selected-modal-simsearch-list'>
            {selectedRegion ? (selectedRegion.map(addRegion)) : null}
          </ul>
          <span className='selected-modal-simsearch-label' id='selected-modal-simsearch-label-similar' style={{"fontSize": regionHeight + "px"}}> 
            {similarRegions && (similarRegions.length > 0) ?
              (simSearch.method === "Region") ?
                "Similar Regions:"
                : "Top Regions:"
            : null}
          </span>
          
          <ul id='similar-regions-list' className='selected-modal-simsearch-list'>
            {similarRegions ? (similarRegions.map(addRegion)) : null}
          </ul>
          
        </div>
      : 
      <div
        className='selected-modal-simsearch-list-container-hidden'
      >
        <div className='simsearch-hidden-header'>Similar Regions</div>
        <button 
            className='simsearch-container-open-button'
            onClick={() => handleClickForHidden()}
          />

      </div>)
    )
  )
}
export default SelectedModalSimSearch