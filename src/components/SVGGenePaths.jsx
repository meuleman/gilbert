import { line } from "d3-shape"
import { getGenesInView } from "../lib/Genes"

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

    let step = Math.pow(0.5, order)
    let strokeWidth = sizeScale(step)*strokeWidthMultiplier;

    // We only render genes that are longer than a single hilbert cell
    // and that are not too long (1500 cells by default)
    let ranges = getGenesInView(points, order)
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
              strokeDasharray={strokeWidth*2 + " " + strokeWidth*2}
              fill="none"
              opacity={opacity}
              // markerStart="url(#gene-circle)"
              // markerEnd="url(#gene-triangle)"
              />
          )})}
      </g>
    )
  }
}