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
      let {data, points, meta, transform, order, dataOrder} = state
      if(!points || !data) return;

      // rendering constants
      let t = {...transform}

      ctx.clearRect(0, 0, width, height);
      // if the data's order doesn't match the current order we render it more transparently
      ctx.globalAlpha = 1 //order == dataOrder ? 1 : 0.85
      ctx.strokeStyle = stroke
      ctx.fillStyle = fill
      ctx.lineWidth = 0.5;

      let i,d,xx,yy; 
      
      // we render the stroke of the points regardless of if we have data loaded
      // the points always get updated on zoom so we can show them instantly
      let step = Math.pow(0.5, order)
      let sw = step * (1 - strokeWidthMultiplier);
      let rw = sizeScale(sw) * t.k - 1
      for(i = 0; i < points.length; i++) {
        d = points[i];
        // scale and transform the coordinates
        xx = t.x + xScale(d.x) * t.k
        yy = t.y + yScale(d.y) * t.k
        ctx.strokeRect(xx - rw/2, yy - rw/2, rw, rw)
      }
      
      // TODO render the hilber path?
      
      // make sure to render with the data's order
      step = Math.pow(0.5, dataOrder)
      sw = step * (1 - strokeWidthMultiplier);
      rw = sizeScale(sw) * t.k - 1
      // console.log("rendering canvas", t, data)
      // ctx.fillRect(t.x + xScale(1.5), t.y + yScale(1.5), rw * 2, rw * 2)
      for(i = 0; i < data.length; i++) {
        d = data[i];
        // scale and transform the coordinates
        xx = t.x + xScale(d.x) * t.k
        yy = t.y + yScale(d.y) * t.k
        // ctx.strokeRect(xx - rw/2, yy - rw/2, rw, rw)
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