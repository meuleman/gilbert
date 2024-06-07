import SVGSelected from '../SVGSelected'
import { scaleLinear } from 'd3-scale'
import { max } from 'd3-array'

const DisplayFilteredRegions = ({
  regions,
  order,
  fill = "black",
  stroke = "orange",
  strokeWidth = 0.05,
  showGenes = false,
  numRegions,
  radiusMultiplier=0.325,
} = {}) => {
  if(regions.length) {
    const maxScore = max(regions, (r => r.p?.count || 0))
    const colorScale = scaleLinear()
      .domain([0, maxScore])
      .range(["white", fill])
    
    const SVGExampleArr = regions.map((r) => { 
      let c = colorScale(r.p?.count|| 0)
      return SVGSelected({ 
        hit: r, 
        stroke,
        fill: c,
        strokeWidthMultiplier: strokeWidth, 
        showGenes: showGenes,
         radiusMultiplier: radiusMultiplier 
        })
    })

    return SVGExampleArr
  } else {
    return ([null])
  }
}

export default DisplayFilteredRegions

