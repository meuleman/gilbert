// A simple component to render squares for each point
export default function SVGBBox({ 
  stroke = "gray",
  fill = "none",
  strokeWidthMultiplier = 0.5,
} = {}) {
  return function SVGBBoxComponent({ state, scales }) {
    if(!state.points) return null

    const { xScale, yScale, sizeScale } = scales
    let bbox = state.bbox;
    let step = Math.pow(0.5, state.order)
    
    return (
      <g>
          <rect
            x={xScale(bbox.x)}
            y={yScale(bbox.y)}
            width={sizeScale(bbox.width)}
            height={sizeScale(bbox.height)}
            fill={fill}
            stroke={stroke}
            strokeWidth={sizeScale(step)*strokeWidthMultiplier}
          ></rect>
    </g>
    )
  }
}