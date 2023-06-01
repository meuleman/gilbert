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
    let {data, points, transform, dataOrder} = state
    if(!points || !data) return;

    // rendering constants
    let t = {...transform}

    ctx.textAlign = "center";
    let i,d,xx,yy; 
    // make sure to render with the data's order
    const step = Math.pow(0.5, dataOrder)
    const sw = step * (1 - strokeWidthMultiplier);
    const rw = sizeScale(sw) * t.k - 1
    for(i = 0; i < data.length; i++) {
      d = data[i];
      // scale and transform the coordinates
      xx = t.x + xScale(d.x) * t.k
      yy = t.y + yScale(d.y) * t.k
      let text = fieldChoice(d)
      if(text) {
        ctx.fillStyle = fieldColor(text.value)
        ctx.fillRect(xx - rw/2, yy - rw/2, rw, rw)
        ctx.fillStyle = 'white'
        ctx.font = `${rw/1.5}px monospace`;
        ctx.fillText(text.value, xx, yy + rw/4)
      }
    }
  }
}