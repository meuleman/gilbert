import { groups} from "d3-array"
import { customOffsetsMap } from "../lib/HilbertChromosome"

// A simple component to render the hilbert curve
export default function HilbertPaths({ 
  fill = "black",
  fontSize = 14,
  strokeWidthMultiplier = 0.05,
} = {}) {
  return function HilbertPathsComponent({ state, scales }) {
    if(!state.points) return null

    const { xScale, yScale, sizeScale } = scales

    let step = Math.pow(0.5, state.order)
    let strokeWidth = sizeScale(step)*strokeWidthMultiplier;

    let chromosomes = groups(state.points, d => d.chromosome)
    let coffsets = chromosomes.map(d => customOffsetsMap.get(d[0]))
    

    return (
      <g>
        {coffsets.map((c,i) => {
          return (
            <text 
              key={i}
              fill={fill}
              x={xScale(c.x)}
              y={yScale(c.y)}
              dy={-sizeScale(Math.pow(0.5, 6)/2)}
              fontSize={fontSize + "px"}
              >{c.name}</text>
          )})}
      </g>
    )
  }
}