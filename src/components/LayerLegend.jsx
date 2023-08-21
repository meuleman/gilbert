import './LayerLegend.css'
import * as d3 from 'd3'
// import lenses from './Lenses/lenses.json'
import { useEffect, useMemo } from 'react'

const LayerLegend = ({
  initialTop = 770,
  height = 41,
  baseHeight = 41,
  heightPerFactor = 19,
  data,
} = {}) => {
  const removeFactorBars = () => {
    if (document.getElementById('legend-box')) {
      d3.selectAll('svg#factorSvg').remove()
      d3.selectAll("div#tooltip").remove()
    }
  }

  let inViewData, singleSegmentData, factors, colors
  if(data) {
    const layer = data.layer
    const fieldColor = layer.fieldColor

    if(data.data.length > 0) {
      inViewData = data.data
      singleSegmentData = inViewData[0].data
      factors = Object.keys(singleSegmentData)
      colors = factors.map((f) => {
        return fieldColor(f)
      })
    }
  }

  var factorList = document.getElementById('factor-list');
  if(factorList) {
    factorList.innerHTML = ''
  }

  if(factors) {
    let factorPos
    factorPos = factors.map((f, i) => {
      let c = colors[i]
      c = 'black'
      let factortY = null
      let factorHeight = null
      if(factorList) {
        var factorElement = document.createElement('li');
        factorElement.classList.add('factor-item');
        factorElement.textContent = f
        factorElement.style.color = c;
        factorList.appendChild(factorElement)

        factortY = factorElement.getBoundingClientRect().top
        factorHeight = factorElement.clientHeight
      }
      return { y: factortY, height: factorHeight }
    })

    // add bar for each factor
    removeFactorBars()
    const factorYPos = factorPos.map((d) => {
      return d.y
    })
    const factorHeight = factorPos[0].height

    let factorSvgWidth = 10;
    let factorSvgX = 20;
    let factorSvgHeight = Math.max(...factorYPos) - Math.min(...factorYPos) + factorHeight
    let yOffset = 8
    let gapH = 7

    let legendBox = d3.select("#legend-box")
    let factorSvg = legendBox
      .append("svg")
      .attr('id', 'factorSvg')
      .attr('className', 'factor-svg')
      .attr("width", factorSvgWidth)
      .attr("height", factorSvgHeight)
      .style("position", "absolute")
      .attr("transform", "translate(" + factorSvgX + ", -" + (yOffset + factorSvgHeight) + ")");
    
    factorYPos.map((y, i) => {
      const yAdjusted = y - Math.min(...factorYPos)
      let c = colors[i]
      factorSvg
        .append("rect")
        .attr("x", 0)
        .attr("y", yAdjusted)
        .attr("width", factorSvgWidth)
        .attr("height", factorHeight - gapH)
        .style("fill", c)
        .style("stroke", "black")
        .style("stroke-width", "0.5")

      // adjust height of box
      let numFactors = factors.length
      let calculatedHeight = heightPerFactor * numFactors + baseHeight
      let maxHeight = parseInt(
        window
          .getComputedStyle(document.getElementById('legend-box'))
          .getPropertyValue('max-height')
          .split('px')[0]
      )
      height = Math.min(...[calculatedHeight, maxHeight])
    })
  }


  return (
    <>
      {(
        <div className="legend-box" id="legend-box" style={{
          top: (initialTop - height) + "px",
          height: height + "px"
        }}>
          <span className='legend-label'>Factors:</span>
          <ul id='factor-list' className='factor-list'/>
        </div>
      )}
    </>
  )
}
export default LayerLegend