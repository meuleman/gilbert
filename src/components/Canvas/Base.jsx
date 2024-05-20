// The base canvas rendering function
// This will always run before the data layer rendering function
// It clears the canvas and draws the outlines of the points
// It could also draw the hilbert path if we wanted for performance (tho it would get covered)
import { line } from "d3-shape"
import { groups} from "d3-array"
import { createSegments } from "../../lib/segments"

export default function CanvasBaseComponent({ canvasRef, state, scales, layer }) {
  if(canvasRef.current) {
    const ctx = canvasRef.current.getContext('2d');
    if(!ctx) return;

    // layer options
    let { stroke, fill, strokeWidthMultiplier} = layer
    
    // scales
    let {xScale ,yScale ,sizeScale, width, height} = scales
    
    // state
    let {points, transform, order } = state
    if(!points) return;

    let chromosomes = groups(state.points, d => d.chromosome)
    let cpoints = chromosomes.flatMap(d => {
      // return an array for each continuous segment of the chromosome's points
      return createSegments(d[1])
    })

    // rendering constants
    let t = {...transform}

    ctx.clearRect(0, 0, width, height);
    // if the data's order doesn't match the current order we render it more transparently
    ctx.globalAlpha = 1 //order == dataOrder ? 1 : 0.85
    // ctx.strokeStyle = "lightgray" 
    ctx.strokeStyle = "black" 
    ctx.fillStyle = "white"
    // ctx.fillStyle = "lightgray"
    ctx.lineWidth = 0.5;

    let path = line()
      .x((d) => t.x + xScale(d.x) * t.k)
      .y((d) => t.y + yScale(d.y) * t.k)
      .context(ctx)

    cpoints.forEach((segment)  => {
      ctx.beginPath()
      path(segment)
      ctx.stroke()
    })

    // we render the stroke of the points regardless of if we have data loaded
    // the points always get updated on zoom so we can show them instantly
    // let i,d,xx,yy; 
    // let step = Math.pow(0.5, order)
    // let sw = step * (1 - strokeWidthMultiplier);
    // let rw = sizeScale(sw) * t.k - 1
    // for(i = 0; i < points.length; i++) {
    //   d = points[i];
    //   // scale and transform the coordinates
    //   xx = t.x + xScale(d.x) * t.k
    //   yy = t.y + yScale(d.y) * t.k
    //   // ctx.globalAlpha = i/points.length // indicate the direction of the hilbert curve
    //   // ctx.globalAlpha = 0.7
    //   // ctx.fillRect(xx - rw/2, yy - rw/2, rw, rw)
    //   ctx.globalAlpha = 1
    //   ctx.lineWidth = 0.5 + i/points.length
    //   ctx.strokeRect(xx - rw/2, yy - rw/2, rw, rw)
    // }
  }
}