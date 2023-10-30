import { getOffsets } from "../lib/segments"
// A canvas rendering function that renders a letter with a single colored rectangle for each data point

export default function CanvasTextValueComponent({ canvasRef, state, scales, layer }) {
  if(canvasRef.current) {
    const ctx = canvasRef.current.getContext('2d');
    if(!ctx) return;

    // layer options
    let { fieldChoice, fieldColor, strokeWidthMultiplier} = layer
    
    // scales
    let {xScale ,yScale ,sizeScale} = scales
    
    // state
    let {data, transform, order} = state
    if(!data) return;

    // rendering constants
    let t = {...transform}

    ctx.textAlign = "center";
    let i,d,dm1,dp1,xx,yy; 
    // make sure to render with the data's order
    const step = Math.pow(0.5, order)
    const sw = step //* (1 - strokeWidthMultiplier);
    const rw = sizeScale(sw) * t.k // - 1
    const srw = rw * 0.7

    for(i = 0; i < data.length; i++) {
      d = data[i];
      dm1 = data[i-1];
      dp1 = data[i+1];
      // scale and transform the coordinates
      xx = t.x + xScale(d.x) * t.k
      yy = t.y + yScale(d.y) * t.k
      let text = fieldChoice(d)
      if(text) {
        ctx.fillStyle = fieldColor(text.value)
        ctx.strokeStyle = fieldColor(text.value)
        ctx.fillRect(xx - srw/2, yy - srw/2, srw, srw)
        ctx.strokeRect(xx - srw/2, yy - srw/2, srw, srw)
        if(dm1) {
          let { xoff, yoff, w, h } = getOffsets(d, dm1, rw, srw)
          ctx.fillRect(xx  + xoff, yy + yoff, w, h)
          ctx.strokeRect(xx  + xoff, yy + yoff, w, h)
        }
        if(dp1) {
          let { xoff, yoff, w, h } = getOffsets(d, dp1, rw, srw)
          ctx.fillRect(xx  + xoff, yy + yoff, w, h)
          ctx.strokeRect(xx  + xoff, yy + yoff, w, h)
        }

        ctx.fillStyle = 'white'
        ctx.font = `${rw/1.75}px monospace`;
        ctx.fillText(text.value, xx, yy + rw/4)
      }
    }
  }
}