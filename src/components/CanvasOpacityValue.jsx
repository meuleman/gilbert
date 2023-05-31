import { scaleLinear } from "d3-scale";

// A canvas rendering function that renders a single colored rectangle for each data point
// with opacity scaled to the max of the order
export default function CanvasSimpleValueComponent({ canvasRef, state, scales, layer }) {
  if(canvasRef.current) {
    const ctx = canvasRef.current.getContext('2d');
    if(!ctx) return;

    // layer options
    let { fieldChoice, fieldColor, strokeWidthMultiplier, aggregateName} = layer

    // scales
    let {xScale ,yScale ,sizeScale} = scales
    
    // state
    let {data, points, meta, transform, order, dataOrder} = state
    if(!points || !data || !meta) return;

    console.log("CanvasSimpleValueComponent", meta, aggregateName)
    // the min and max for scaling
    let fields_agg = meta["fields_" + aggregateName]
    let nonzero_min_agg = meta["nonzero_min_" + aggregateName]
    let min_agg = nonzero_min_agg ? nonzero_min_agg : meta["min_" + aggregateName]
    let max_agg = meta["max_" + aggregateName]

    // rendering constants
    let t = {...transform}

    let i,d,xx,yy; 
    // make sure to render with the data's order
    const step = Math.pow(0.5, dataOrder)
    const sw = step * (1 - strokeWidthMultiplier);
    const rw = sizeScale(sw) * t.k - 1

    let domain = [min_agg, max_agg]
    let alphaScale = scaleLinear()
      .domain(domain)
      .range([0, 1]) 
    
    for(i = 0; i < data.length; i++) {
      d = data[i];
      // scale and transform the coordinates
      xx = t.x + xScale(d.x) * t.k
      yy = t.y + yScale(d.y) * t.k
      // ctx.strokeRect(xx - rw/2, yy - rw/2, rw, rw)
      if(d.data) {
        const sample = fieldChoice(d.data, meta);
        if(sample) {
          if(min_agg.length) {
            let fi = fields_agg.indexOf(sample.field)
            domain = [min_agg[fi], max_agg[fi]]
            alphaScale.domain(domain)
          }
          let a = alphaScale(sample.value)
          ctx.globalAlpha = a < 0 ? 0 : a
          ctx.fillStyle = fieldColor(sample.field)
          ctx.fillRect(xx - rw/2, yy - rw/2, rw, rw)
        }
      }
    }
  }
}