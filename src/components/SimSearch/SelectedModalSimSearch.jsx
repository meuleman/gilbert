// A component to display some information below the map when hovering over hilbert cells

import * as d3 from 'd3'
import DetailLevelSlider from './DetailLevelSlider'
import allFactors from './SimSearchFactors.json'
import './SelectedModalSimSearch.css'
import { useEffect } from 'react'
import { HilbertChromosome } from '../../lib/HilbertChromosome'
// import { useEffect } from 'react'


const SelectedModalSimSearch = ({
  selectedSimSearch = null,
  simSearchDetailLevel,
  setSimSearchDetailLevel,
  simSearchMethod,
  selectedOrder,
  setRegion,
  setHover,
  hover,
  layer,
  order,
  listFontSize=12,
  listMargin=-17
} = {}) => {
  let hilbert = new HilbertChromosome(order)
  let simSearchFactorOrder
  let dlSimSearch

  const handleRegionClick = function (chrom, start, stop) {
    setRegion({
      chromosome: chrom, 
      start: start, 
      end: stop,
      order: selectedOrder
    })
  }
  const handleRegionMouseOver = function (chrom, start, stop, ranks) {
    let range = hilbert.fromRegion(chrom, start, stop-1)[0]
    if(simSearchFactorOrder){
      let hoverData = {}
      simSearchFactorOrder.map((index, i) => {
        let factorName = factors[index].fullName
        let factorRank = ranks[i]
        hoverData[factorName] = factorRank
      })
      range.data = hoverData
    }
    setHover(range)
  }

  const handleRegionMouseLeave = function () {
    setHover(null)
  }

  // function to clear the convolution svg
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
  // set quiescent factor color to non-white value
  if (factors) {
    factors.map((f, i) => {
      if(f.color === "#ffffff") {
        f.color = "#ECECEC"
      }
    })
  }

  // set max detail level and sim search results for current detail level
  let maxDetailLevel
  if(selectedSimSearch) {
    maxDetailLevel = selectedSimSearch.length
    if (simSearchDetailLevel) {
      dlSimSearch = selectedSimSearch[simSearchDetailLevel - 1]
      simSearchFactorOrder = dlSimSearch[0].factor_order
    }
  } else {
    removeConvBars()
  }
    
  useEffect(() => {
    removeConvBars()
    let selectedList = document.getElementById('selected-list');
    let selectedListItem = [...selectedList.querySelectorAll('li')]

    let simSearchList = document.getElementById('similar-regions-list');
    let simSearchListItems = [...simSearchList.querySelectorAll('li')]
    
    if((selectedListItem.length > 0)) {
      // get the y positions for each region
      let selectedListItemYPos = selectedListItem.map((i) => i.getBoundingClientRect().top)
      let simSearchListItemsYPos = simSearchListItems.map((i) => i.getBoundingClientRect().top)
      let allRegionYPos = selectedListItemYPos.concat(simSearchListItemsYPos)
      
      // define the height of convolution bars
      let maxBarHeight = 20
      let regionHeight = Math.min(maxBarHeight, Math.min(...allRegionYPos.slice(1).map((y, i) => y - allRegionYPos[i])))
      // spacing between bars
      let gapW = 1
      let gapH = 1


      
      // define the size and position of convolution bar svg
      let convBarSvgHeight = Math.max(...allRegionYPos) - Math.min(...allRegionYPos) + regionHeight
      let convBarSvgWidth = 100;
      let svgYAdjust = convBarSvgHeight - 10
      
      let svgXAdjust = 200
      let simSearchListContainer = d3.select("#selected-modal-simsearch-list-container")

      let convSvg = simSearchListContainer
        .append("svg")
        .attr('id', 'convSvg')
        .attr('className', 'conv-svg')
        .attr("width", convBarSvgWidth)
        .attr("height", convBarSvgHeight)
        .style("position", "absolute")
        .attr("transform", "translate(" + svgXAdjust + ", -" + svgYAdjust + ")");

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

      // threshold to include convolution bars
      let convThresh = 0 // Math.sqrt(0.9)

      // add convolution bars
      allRegionYPos.map((y, i) => {
        const yAdjusted = y - Math.min(...allRegionYPos) //+ regionHeight
        const ranks = dlSimSearch[i].percentiles
        const queryRanks = dlSimSearch[0].percentiles
        let factorCount = 0
        ranks.map((r, j) => {
          if(r * queryRanks[j] > convThresh) {
            const factorInd = simSearchFactorOrder[j]
            const factor = factors[factorInd]
            convSvg
              .append("rect")
              .attr("x", factorCount * regionHeight / 2)
              .attr("y", yAdjusted)
              .attr("width", regionHeight / 2 - gapW)
              .attr("height", regionHeight - gapH)
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
    }
  }, [dlSimSearch])

  return (
    <div id='selected-modal-simsearch-list-container' className='selected-modal-simsearch-list-container'>
      <DetailLevelSlider
        detailLevel={simSearchDetailLevel}
        maxDetailLevel={maxDetailLevel}
        setDetailLevel={setSimSearchDetailLevel}
      />
      <span className='selected-modal-simsearch-label' id='selected-modal-simsearch-label-selected' style={{"fontSize": listFontSize + "px"}}>
        {dlSimSearch ? (
          "Selected Region:"
        ) : null}
      </span>

      <ul id='selected-list' className='selected-modal-simsearch-list'>
        {dlSimSearch ? (
          dlSimSearch.slice(0,1).map((s) => {
            const chrom = s.coordinates.split(':')[0]
            const start = s.coordinates.split(':')[1].split('-')[0]
            const stop = s.coordinates.split(':')[1].split('-')[1]
            const rank = s.rank
            const factorRanks = s.percentiles
            return <li 
              className='selected-modal-simsearch-item' 
              key={rank}
              onClick={() => handleRegionClick(chrom, start, stop)}
              onMouseOver={() => handleRegionMouseOver(chrom, start, stop, factorRanks)}
              onMouseLeave={() => handleRegionMouseLeave()}
              style={{
                "fontSize": listFontSize + "px",
                "margin": listMargin + "px"
              }}
            >
              {chrom}:{start}
            </li>
          })
        ) : null}
      </ul>
      <span className='selected-modal-simsearch-label' id='selected-modal-simsearch-label-similar' style={{"fontSize": listFontSize + "px"}}> 
        {dlSimSearch ?
          (dlSimSearch.length > 1) ?
            "Similar Regions:"
          : null
        : null}
      </span>
      
      <ul id='similar-regions-list' className='selected-modal-simsearch-list'>
        {dlSimSearch ? (
          dlSimSearch.slice(1).map((s) => {
            const chrom = s.coordinates.split(':')[0]
            const start = s.coordinates.split(':')[1].split('-')[0]
            const stop = s.coordinates.split(':')[1].split('-')[1]
            const rank = s.rank
            const factorRanks = s.percentiles
            return <li 
              className='selected-modal-simsearch-item' 
              key={rank}
              onClick={() => handleRegionClick(chrom, start, stop)}
              onMouseOver={() => handleRegionMouseOver(chrom, start, stop, factorRanks)}
              onMouseLeave={() => handleRegionMouseLeave()}
              style={{
                "fontSize": listFontSize + "px",
                "margin": listMargin + "px"
              }}
            >
              {rank}: {chrom}:{start}
            </li>
          })
        ) : null}
      </ul>
    </div>
  )
}
export default SelectedModalSimSearch