import { line } from "d3-shape"
import { rollups, extent } from "d3-array"
import { HilbertChromosome, hilbertPosToOrder } from "../lib/HilbertChromosome" 
// https://observablehq.com/@enjalot/genetic-datasets
import gencode from "../data/gencode.json"

// Render a square around the selected hilbert cell (either hover or selected)
// Optionally render genes that are overlapping with this cell
export default function SVGBBox({ 
  stroke = "gray",
  fill = "none",
  strokeWidthMultiplier = 0.2,
  hit = null,
  order = 4,
  showGenes = false,
} = {}) {
  return function SVGBBoxComponent({ state, scales }) {
    if(!hit) return null

    const { points } = state
    const { xScale, yScale, sizeScale } = scales
    let step = Math.pow(0.5, order)

    let rw = sizeScale(step)
    let sw = sizeScale(Math.pow(0.5, order))*strokeWidthMultiplier


    let ranges, path;
    if(showGenes) {
      let hilbert = new HilbertChromosome(order)
      // render gene summaries
      let threshold = hilbertPosToOrder(1, {from: order, to: 14 })
      let filteredGencode = gencode.filter(d => {
        return (hit.start > d.start && hit.start < d.end) || (hit.start + threshold > d.start && hit.start + threshold < d.end)
      })
      // let inside = filteredGencode.filter(d => d.length < threshold)
      let outside = filteredGencode.filter(d => d.length > threshold)

      ranges = outside.map(o => {
        let range = hilbert.fromRegion(o.chromosome, o.start, o.end)
        if(o.posneg == '-') range.reverse()
        return range
      })

      path = line()
        .x((d) => xScale(d.x))
        .y((d) => yScale(d.y))
    }

    
    return (
      <g>
          <rect
            x={xScale(hit.x) - rw/2}
            y={yScale(hit.y) - rw/2}
            width={rw}
            height={rw}
            fill={fill}
            stroke={stroke}
            strokeWidth={sw}
          ></rect>
          {showGenes && ranges.map((range,i) => {
          return (
            <path 
              d={path(range)} 
              key={i}
              stroke={stroke} 
              strokeWidth={sw} 
              strokeLinejoin="round"
              strokeLinecap="round"
              fill="none"
              opacity="1"
              markerStart="url(#gene-circle)"
              markerEnd="url(#gene-triangle)"
              />
          )})}
    </g>
    )
  }
}