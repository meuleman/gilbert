import SVGSelected from '../SVGSelected'
import { scaleSequential } from 'd3-scale';
import { interpolateBlues } from 'd3-scale-chromatic';
import { max, min} from 'd3-array'

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
    const maxCount = max(regions, (r => r.path?.count || 0))
    const minCount = min(regions, (r => r.path?.count || 0))

    const colorScale = scaleSequential(interpolateBlues)
      .domain([minCount, maxCount]);

    const SVGExampleArr = regions.map((r) => { 
      let c = colorScale(r.path?.count|| 0)
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

