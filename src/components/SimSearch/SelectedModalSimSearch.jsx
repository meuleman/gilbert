// A component to display some information below the map when hovering over hilbert cells

import * as d3 from 'd3'
import DetailLevelSlider from './DetailLevelSlider'
import './SelectedModalSimSearch.css'
import { useEffect } from 'react'
import { HilbertChromosome } from '../../lib/HilbertChromosome'
// import { useEffect } from 'react'


const SelectedModalSimSearch = ({
  simSearch,
  simSearchDetailLevel,
  setSimSearchDetailLevel,
  searchByFactorIndices,
  selectedOrder,
  setRegion,
  setHover,
  regionHeight=15,
  regionMargin=-5,
  barGap=1,
  convThresh=0,
  svgXAdjust=200,
} = {}) => {
  let hilbert = new HilbertChromosome(selectedOrder)
  let simSearchFactorOrder, simSearchRegions, selectedRegion, similarRegions, factors

  const handleRegionClick = function (chrom, start, stop) {
    let range = hilbert.fromRegion(chrom, start, stop-1)[0]
    range.end = parseInt(stop)
    setRegion(range)
  }
  const handleRegionMouseOver = function (chrom, start, stop, ranks) {
    let range = hilbert.fromRegion(chrom, start, stop-1)[0]
    range.end = parseInt(stop)
    if(simSearchFactorOrder){
      let hoverData = {}
      simSearchFactorOrder.map((index, i) => {
        let factorName = factors[index].fullName
        let factorRank = ranks[i]
        hoverData[factorName] = factorRank
      })
      range.data = hoverData
    }
    setHover(range, true)
  }

  const handleRegionMouseLeave = function () {
    setHover(null, true)
  }

  // function to clear the convolution svg
  const removeConvBars = () => {
    let convSvgElement = d3.selectAll('svg#convSvg')
    let convSvgTooltip = d3.selectAll("div#tooltip")

    // if an element has been created
    if(convSvgElement._groups[0].length) convSvgElement.remove()
    if(convSvgTooltip._groups[0].length) convSvgTooltip.remove()
  }

  // set max detail level and sim search results for current detail level
  let maxDetailLevel
  if(simSearch) {
    factors = simSearch.factors
    if(simSearch.simSearch) {
      maxDetailLevel = simSearch.simSearch.length
      if (simSearchDetailLevel) {
        simSearchRegions = simSearch.simSearch[simSearchDetailLevel - 1]
        selectedRegion = simSearchRegions.slice(0,1)
        similarRegions = simSearchRegions.slice(1)
      } else {
        simSearchRegions = simSearch.simSearch
        similarRegions = simSearchRegions
      }
      simSearchFactorOrder = simSearchRegions[0].factor_order
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
    
    if(listItems?.length > 0) {
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



      // get the y positions for each region
      let allRegionYPos = listItems.map((i) => i.getBoundingClientRect().top)

      // find the ranks we want to create convolution bars for
      let convBarData = []
      allRegionYPos.map((y, i) => {
        const yAdjusted = y - Math.min(...allRegionYPos)
        const ranks = simSearchRegions[i].percentiles
        const queryRanks = simSearchRegions[0].percentiles
        let factorCount = 0
        ranks.map((r, j) => {
          if(simSearch.method === "Region") {
            if(r * queryRanks[j] > convThresh) {
              convBarData.push({ind: j, factorCount: factorCount, yAdjusted: yAdjusted})
              factorCount += 1
            }
          } else {
            if((r > 0) && (searchByFactorIndices)) {
              if (searchByFactorIndices.includes(simSearchFactorOrder[j])) {
                convBarData.push({ind: j, factorCount: factorCount, yAdjusted: yAdjusted})
                factorCount += 1
              }
            }
          }
        })
      })

      let maxFactorCount = Math.max(...convBarData.map((d) => d.factorCount + 1))
      
      // define the size and position of convolution bar svg
      let convBarSvgHeight = Math.max(...allRegionYPos) - Math.min(...allRegionYPos) + regionHeight
      let convBarSvgWidth = (regionHeight / 2 + barGap) * maxFactorCount

      let firstRegion = listItems[0].getBoundingClientRect()
      let firstRegionOverallSize = firstRegion.height
      let svgYAdjust = convBarSvgHeight + regionMargin + (firstRegionOverallSize - regionHeight) / 2
      
      let convSvg = simSearchListContainer
        .append("svg")
        .attr('id', 'convSvg')
        .attr('className', 'conv-svg')
        .attr("width", convBarSvgWidth)
        .attr("height", convBarSvgHeight)
        .style("position", "absolute")
        .attr("transform", "translate(" + (svgXAdjust + regionMargin) + ", -" + svgYAdjust + ")")

      const addBar = function (i, factorCount, yAdjusted) {
        const factorInd = simSearchFactorOrder[i]
        const factor = factors[factorInd]
        convSvg
          .append("rect")
          .attr("x", factorCount * (regionHeight / 2 + barGap))
          .attr("y", yAdjusted)
          .attr("width", regionHeight / 2)
          .attr("height", regionHeight)
          .style("fill", factor.color)
          .style("stroke", "black")
          .style("stroke-width", "0.1")
          .on("mouseover", function() {mouseover.bind(this)(factor)})
          .on("mousemove", mousemove)
          .on("mouseleave", mouseleave)
        // factorCount += 1
        return //factorCount
      }

      // add convolution bars
      convBarData.map((d) => {
        const yAdjusted = d.yAdjusted
        const i = d.ind
        const factorCount = d.factorCount
        addBar(i, factorCount, yAdjusted)
      })
      // // add convolution bars
      // allRegionYPos.map((y, i) => {
      //   const yAdjusted = y - Math.min(...allRegionYPos)
      //   const ranks = simSearchRegions[i].percentiles
      //   const queryRanks = simSearchRegions[0].percentiles
      //   let factorCount = 0
      //   ranks.map((r, j) => {
      //     if(simSearch.method === "Region") {
      //       if(r * queryRanks[j] > convThresh) {
      //         factorCount = addBar(j, factorCount, yAdjusted)
      //       }
      //     } else {
      //       if((r > 0) && (searchByFactorIndices)) {
      //         if (searchByFactorIndices.includes(simSearchFactorOrder[j])) {
      //           factorCount = addBar(j, factorCount, yAdjusted)
      //         }
      //       }
      //     }
      //   })
      // })
    }
  }, [simSearchRegions])

  return (
    (simSearch?.simSearch ?
    <div id='selected-modal-simsearch-list-container' className='selected-modal-simsearch-list-container'>
      {(simSearchDetailLevel) && (
        <DetailLevelSlider
          detailLevel={simSearchDetailLevel}
          maxDetailLevel={maxDetailLevel}
          setDetailLevel={setSimSearchDetailLevel}
        />
      )}
      
      <span className='selected-modal-simsearch-label' id='selected-modal-simsearch-label-selected' style={{"fontSize": regionHeight + "px"}}>
        {selectedRegion ? (
          "Selected Region:"
        ) : null}
      </span>

      <ul id='selected-list' className='selected-modal-simsearch-list'>
        {selectedRegion ? (
          selectedRegion.map((s) => {
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
                "fontSize": regionHeight + "px",
                "margin": regionMargin + "px"
              }}
            >
              {chrom}:{start}
            </li>
          })
        ) : null}
      </ul>
      <span className='selected-modal-simsearch-label' id='selected-modal-simsearch-label-similar' style={{"fontSize": regionHeight + "px"}}> 
        {similarRegions ?
          (similarRegions.length > 0) ?
            (simSearchDetailLevel) ?
              "Similar Regions:"
              : "Top Regions:"
          : null
        : null}
      </span>
      
      <ul id='similar-regions-list' className='selected-modal-simsearch-list'>
        {similarRegions ? (
          similarRegions.map((s) => {
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
                "fontSize": regionHeight + "px",
                "margin": regionMargin + "px"
              }}
            >
              {rank}: {chrom}:{start}
            </li>
          })
        ) : null}
      </ul>
    </div>
    : <div/>)
  )
}
export default SelectedModalSimSearch