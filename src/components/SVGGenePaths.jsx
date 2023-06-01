import { line } from "d3-shape"
import { groups, rollups, extent } from "d3-array"
import { HilbertChromosome, hilbertPosToOrder } from "../lib/HilbertChromosome" 
import { createSegments } from "../lib/segments"

// https://observablehq.com/@enjalot/genetic-datasets
import gencode from "../data/gencode.json"

// A simple component to render the hilbert curve
export default function GenePaths({ 
  stroke = "gray",
  strokeWidthMultiplier = 0.05,
  opacity = 1
} = {}) {
  return function GenePathsComponent({ state, scales }) {

    const { points, order } = state
    const { xScale, yScale, sizeScale } = scales

    if(!points) return;

    let hilbert = new HilbertChromosome(order)

    let step = Math.pow(0.5, order)
    let strokeWidth = sizeScale(step)*strokeWidthMultiplier;

    // render gene summaries
    let pointConstraints = rollups(points, v => extent(v, d => d.start), d => d.chromosome)
    let pointConstraintsChrs = pointConstraints.map(d => d[0])
    let pointConstraintsExtents = pointConstraints.map(d => d[1])
    let filteredGencode = gencode.filter(d => {
      let pi = pointConstraintsChrs.indexOf(d.chromosome)
      if(pi < 0) return false;
      return d.start > pointConstraintsExtents[pi][0] && d.start < pointConstraintsExtents[pi][1]
    })
    let threshold = hilbertPosToOrder(1, {from: order, to: 14 })
    // let inside = filteredGencode.filter(d => d.length < threshold)
    let outside = filteredGencode.filter(d => d.length > threshold)

    // console.log("outside", outside)

    // render the genes that are bigger than one cell as paths
    let ranges = outside.map(o => {
      let range = hilbert.fromRegion(o.chromosome, o.start, o.end)
      if(o.posneg == '-') range.reverse()
      return range
    })

    let path = line()
      .x((d) => xScale(d.x))
      .y((d) => yScale(d.y))

    return (
      <g>
        <defs>
          <marker
            id="gene-triangle"
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
            id="gene-circle"
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
        {ranges.map((range,i) => {
          return (
            <path 
              d={path(range)} 
              key={i}
              stroke={stroke} 
              strokeWidth={strokeWidth} 
              strokeLinejoin="round"
              strokeLinecap="round"
              fill="none"
              opacity={opacity}
              markerStart="url(#gene-circle)"
              markerEnd="url(#gene-triangle)"
              />
          )})}
      </g>
    )
  }
}