import { line } from "d3-shape"
import { getRangesOverCell } from "../lib/Genes"

// Render a square around the selected hilbert cell (either hover or selected)
// Optionally render genes that are overlapping with this cell
export default function SVGBBox({ 
  stroke = "gray",
  fill = "none",
  strokeWidthMultiplier = 0.2,
  hit = null,
  // order = 4,
  showGenes = false,
} = {}) {
  return function SVGBBoxComponent({ state, scales }) {
    if(!hit) return null

    const { points, bbox, order } = state
    const { xScale, yScale, sizeScale } = scales

    let step = Math.pow(0.5, hit.order)
    let rw = sizeScale(step)
    let sw = sizeScale(Math.pow(0.5, order))*strokeWidthMultiplier


    let genePaths;
    // we can filter to the genes are overlap with our selection
    if(showGenes) {
      // TODO this gets calculated every mousemove
      // could think of a clever way to cache since the genes likely wont change
      // especially when zoomed in since there will probably only be one gene
      const ranges = getRangesOverCell(hit, order)
      
      const path = line()
        .x((d) => xScale(d.x))
        .y((d) => yScale(d.y))
      
      genePaths = ranges.map((range,i) => {
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
        )})
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
          {showGenes && genePaths}
    </g>
    )
  }
}