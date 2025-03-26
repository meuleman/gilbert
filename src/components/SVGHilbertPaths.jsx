import { line } from "d3-shape"
import { groups} from "d3-array"
import { createSegments } from "../lib/segments"

// A simple component to render the hilbert curve
export default function HilbertPaths({ 
  stroke = "gray",
  strokeWidthMultiplier = 0.05,
  opacity = 1
} = {}) {
  return function HilbertPathsComponent({ state, scales }) {
    if(!state.points) return null

    const { xScale, yScale, sizeScale } = scales

    let step = Math.pow(0.5, state.order)
    let strokeWidth = sizeScale(step)*strokeWidthMultiplier;
    if (isNaN(strokeWidth)) { // TODO: figure out why this is happening
      strokeWidth = 0;
    }

    let chromosomes = groups(state.points, d => d.chromosome)
    let cpoints = chromosomes.flatMap(d => {
      // return an array for each continuous segment of the chromosome's points
      return createSegments(d[1])
    })

    let path = line()
      .x((d) => xScale(d.x))
      .y((d) => yScale(d.y))

    return (
      <g>
        {cpoints.map((segment,i) => {
          return (
            <path 
              d={path(segment)} 
              key={i}
              stroke={stroke} 
              strokeWidth={strokeWidth} 
              strokeLinejoin="round"
              strokeLinecap="round"
              fill="none"
              opacity={opacity}
              />
          )})}
      </g>
    )
  }
}