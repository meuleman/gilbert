// A simple component to render squares for each point
export default function SVGBBox({ 
  stroke = "gray",
  fill = "none",
  strokeWidthMultiplier = 0.05,
  hit = null,
  order = 4
} = {}) {
  return function SVGBBoxComponent({ state, scales }) {
    if(!hit) return null

    const { xScale, yScale, sizeScale } = scales
    let step = Math.pow(0.5, order)

    let rw = sizeScale(step)
    
    return (
      <g>
          <rect
            x={xScale(hit.x) - rw/2}
            y={yScale(hit.y) - rw/2}
            width={rw}
            height={rw}
            fill={fill}
            stroke={stroke}
            strokeWidth={sizeScale(step)*strokeWidthMultiplier}
          ></rect>
    </g>
    )
  }
}