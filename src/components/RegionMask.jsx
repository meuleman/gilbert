import { line } from "d3-shape"
import { scaleDiverging } from "d3-scale"
import { interpolateBrBG } from "d3-scale-chromatic"
import { getRangesOverCell } from "../lib/Genes"
import { HilbertChromosome, hilbertPosToOrder } from "../lib/HilbertChromosome"

// Render a square around the selected hilbert cell (either hover or selected)
// Optionally render genes that are overlapping with this cell
export default function RegionMask({ 
  regions=[],
  stroke = "gray",
  fill = "none",
  strokeWidthMultiplier = 0.2,
} = {}) {
  return function RegionMaskComponent({ state, scales }) {
    if(regions.length && regions.filter(d => !!d).length) {
      const { points, bbox, order } = state
      const { xScale, yScale, sizeScale } = scales

      // let step = Math.pow(0.5, order)
      // let rw = sizeScale(step)
      // let sw = sizeScale(Math.pow(0.5, order))*strokeWidthMultiplier

      const rects = regions.filter(d => !!d && d.type !== "autocomplete").map((region,i) => {
        let step = Math.pow(0.5, region.order)
        let rw = sizeScale(step)
        return (<rect
          key={i + "-rect"}
          x={xScale(region.x) - rw/2}
          y={yScale(region.y) - rw/2}
          width={rw}
          height={rw}
          fill="black"
          // stroke="black"
          // strokeWidth={sw}
        ></rect>)
      })
      
      return (
        <g>
          <defs>
          <mask id="mask">  
            <rect x="0%" y="0%" width="100%" height="100%" fill="white">
            </rect>
            {rects}
          </mask>
          </defs>
            {rects.length && (
            <rect
              x={xScale.range()[0]}
              y={yScale.range()[0]}
              width={xScale.range()[1] - xScale.range()[0]}
              height={yScale.range()[1] - yScale.range()[0]}
              fill="white"
              stroke="none"
              fillOpacity="0.75"
              mask="url(#mask)"
            ></rect>
          )}
            
      </g>
      )
    } else {
      return null
    }
  }
}