// A canvas rendering function that renders a single colored rectangle for each data point
export default function CanvasSimpleValueComponent({ canvasRef, state, scales, layer }) {
    if(canvasRef.current) {
      const ctx = canvasRef.current.getContext('2d');
      if(!ctx) return;
  
      // layer options
      let { fieldChoice, fieldColor, stroke, fill, strokeWidthMultiplier} = layer
      
      // scales
      let {xScale ,yScale ,sizeScale, width, height} = scales
      
      // state
      let {data, meta, transform, order, dataOrder} = state

      // rendering constants
      let t = {...transform}
      let step = Math.pow(0.5, dataOrder)
      let sw = step * (1 - strokeWidthMultiplier);
      

      ctx.clearRect(0, 0, width, height);
      // if the data's order doesn't match the current order we render it more transparently
      ctx.globalAlpha = order == dataOrder ? 1 : 0.5
      ctx.strokeStyle = stroke
      ctx.fillStyle = fill
      ctx.lineWidth = 0.5;

      let i,d,xx,yy; 
      let rw = sizeScale(sw) * t.k - 1
      // console.log("rendering canvas", t, data)
      // ctx.fillRect(t.x + xScale(1.5), t.y + yScale(1.5), rw * 2, rw * 2)
      for(i = 0; i < data.length; i++) {
        d = data[i];
        // scale and transform the coordinates
        xx = t.x + xScale(d.x) * t.k - 1
        yy = t.y + yScale(d.y) * t.k - 1
        ctx.strokeRect(xx - rw/2, yy - rw/2, rw, rw)
        if(d.data) {
          const sample = fieldChoice(d.data, meta);
          if(sample) {
            ctx.fillStyle = fieldColor(sample.field)
            ctx.fillRect(xx - rw/2, yy - rw/2, rw, rw)
          }
        }
      }
    }
}