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
    // we can filter to the genes are overlap with our selection
    if(showGenes) {
      let hilbert = new HilbertChromosome(order)
      let threshold = hilbertPosToOrder(1, {from: order, to: 14 })
      // filter the genes to where the hilbert cell is overlaping with the gene
      let filteredGencode = gencode.filter(d => {
        return (hit.start > d.start && hit.start < d.end) || (hit.start + threshold > d.start && hit.start + threshold < d.end)
      })
      // let inside = filteredGencode.filter(d => d.length < threshold)
      // further filter to only those that are bigger than a single hilbert cell
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
        <defs>
          <marker
            id={"gene-triangle-selected-" + stroke}
            viewBox="0 0 10 10"
            refX="5"
            refY="5"
            markerUnits="strokeWidth"
            markerWidth="2.5"
            markerHeight="2.5"
            orient="auto">
            <path d="M 0 0 L 10 5 L 0 10 z" fill={stroke} />
          </marker>
        </defs>
        <defs>
          <marker
            id={"gene-circle-selected-" + stroke}
            viewBox="0 0 10 10"
            refX="5"
            refY="5"
            markerUnits="strokeWidth"
            markerWidth="2.5"
            markerHeight="2.5"
            orient="auto">
            <circle cx="5" cy="5" r="5" fill={stroke} />
          </marker>
        </defs>
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
              markerStart={"url(#gene-circle-selected-" + stroke + ")"}
              markerEnd={"url(#gene-triangle-selected-" + stroke + ")"}
              />
          )})}
    </g>
    )
  }
}