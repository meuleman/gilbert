// A simple component to render squares for each point
export default function DebugRects({ 
  stroke = "gray",
  fill = "none",
  strokeWidthMultiplier = 0.05,
} = {}) {
  return function DebugRectsComponent({ state, scales }) {
    if(!state.points) return null

    const { xScale, yScale, sizeScale } = scales
    let step = Math.pow(0.5, state.order)
    
    return (
      <g>
        {state.points.map((d, i) => {
          return (
            <rect
              key={"debug-rect-"+i}
              x={xScale(d.x - step/2)}
              y={yScale(d.y - step/2)}
              width={sizeScale(step)*(1 - strokeWidthMultiplier)}
              height={sizeScale(step)*(1 - strokeWidthMultiplier)}
              fill={fill}
              stroke={stroke}
              strokeWidth={sizeScale(step)*strokeWidthMultiplier}
            ></rect>
          )
        }
      )}
    </g>
    )
  }
}