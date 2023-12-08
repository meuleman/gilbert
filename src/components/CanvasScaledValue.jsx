import { scaleLinear } from "d3-scale";
import { getOffsets } from "../lib/segments"

// A canvas rendering function that renders a single colored rectangle for each data point
// with opacity scaled to the max of the order
export default function CanvasScaledValueComponent({ canvasRef, state, scales, layer }) {
  if(canvasRef.current) {
    const ctx = canvasRef.current.getContext('2d');
    if(!ctx) {
      // console.log("missing context?")
      // console.log('canvas rect', canvasRef)
      return;
    }

    // layer options
    let { fieldChoice, fieldColor, strokeWidthMultiplier, aggregateName} = layer

    // scales
    let {xScale ,yScale ,sizeScale} = scales
    
    // state
    let {data, meta, transform, order} = state
    if(!data || !meta) {
    //   console.log("scaled value missing something", "points", points, "data", data, "meta", meta)
      return;
    }

    // the min and max for scaling
    let fields = meta["fields"]
    let max_layer = false
    if ((fields.length == 2) && (fields[0] == "max_field") && (fields[1] == "max_value")) {
      max_layer = true
    }
    let nonzero_min = meta["nonzero_min"]
    let min = nonzero_min ? nonzero_min : meta["min"]
    if(!min.length && min < 0) min = 0;
    let max = meta["max"]

    // rendering constants
    let t = {...transform}

    let i,d,dm1,dp1,xx,yy; 
    // make sure to render with the data's order
    const step = Math.pow(0.5, order)
    const sw = step * 1//(1 - strokeWidthMultiplier);
    const rw = sizeScale(sw) * t.k // - 1

    let domain = [min, max]
    let alphaScale = scaleLinear()
      .domain(domain)
      .range([0, 1]) 
    let shrinkScale = scaleLinear()
      .domain(domain)
      .range([0.1, 1]) 
    
    for(i = 0; i < data.length; i++) {
      d = data[i];
      dm1 = data[i-1];
      dp1 = data[i+1];
      // scale and transform the coordinates
      xx = t.x + xScale(d.x) * t.k
      yy = t.y + yScale(d.y) * t.k
      // ctx.strokeRect(xx - rw/2, yy - rw/2, rw, rw)
      if(d.data) {
        const sample = fieldChoice(d);
        if(sample) {
          if(min.length) {
            let fi
            if (max_layer) {
              fi = 1
            } else {
              fi = fields.indexOf(sample.field)
            }
            domain = [min[fi] < 0 ? 0 : min[fi], max[fi]]
            alphaScale.domain(domain)
            shrinkScale.domain(domain)
          }
          // let a = alphaScale(sample.value)
          let srw = rw * shrinkScale(sample.value)
          // ctx.globalAlpha = a < 0 ? 0 : a
          ctx.fillStyle = fieldColor(sample.field)
          ctx.strokeStyle = fieldColor(sample.field)
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
        }
      }
    }
  }
}