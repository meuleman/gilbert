import { scaleLinear } from "d3-scale";
import { getOffsets } from "../../lib/segments"
import { line } from "d3-shape";

// const f = Math.floor
const f = (x) => x//Math.round(x) + 0.5

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
    let nonzero_min = meta["nonzero_min"]
    let fields, max, min
    if (
        (meta["fields"].length == 2) && 
        ((meta["fields"][0] == "max_field") || (meta["fields"][0] == "top_fields")) && 
        ((meta["fields"][1] == "max_value") || (meta["fields"][1] == "top_values"))
      ) {
      fields = meta["full_fields"]
      max = meta["full_max"]
      min = nonzero_min ? nonzero_min : meta["full_min"]
    } else {
      fields = meta["fields"]
      max = meta["max"]
      min = nonzero_min ? nonzero_min : meta["min"]
    }
    if(!min.length && min < 0) min = 0;

    // rendering constants
    let t = {...transform}

    let i,d,dm1,dp1,xx,yy; 
    // make sure to render with the data's order
    const step = Math.pow(0.5, order)
    const sw = step * 1//(1 - strokeWidthMultiplier);
    const rw = f(sizeScale(sw) * t.k) // - 1

    let domain = [min, max]
    let alphaScale = scaleLinear()
      .domain(domain)
      .range([0, 1]) 
    let shrinkScale = scaleLinear()
      .domain(domain)
      .range([0.1, 1]) 

    let linef = line()
      .x(d => d.x)
      .y(d => d.y)
      .context(ctx)
    
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
            let fi = fields.indexOf(sample.field)
            domain = [min[fi] < 0 ? 0 : min[fi], max[fi]]
            alphaScale.domain(domain)
            shrinkScale.domain(domain)
          }
          // let a = alphaScale(sample.value)
          let srw = f(rw * (shrinkScale(sample.value) || 0.1)) * 0.95

          // Debugging oversized rendering of fields. showing that the max isn't matching the values seen
          if(srw > 50) {
            let fi = fields.indexOf(sample.field)
            console.log("BIG SAMPLE d", srw, d, sample, "field index", fi, "max", max[fi])
          }
          
          let points = []
          if(dm1) {
            let { xoff, yoff, w, h } = getOffsets(d, dm1, rw, srw)
            points.push({x: xx + xoff, y: yy + yoff})
          }
          points.push({x: xx, y: yy})
          if(dp1) {
            let { xoff, yoff, w, h } = getOffsets(d, dp1, rw, srw)
            points.push({x: xx + xoff, y: yy + yoff})
          }

          // TODO: comment out this if block if you don't like the segment borders
          // if(layer.datasetName.indexOf("enr") >= 0) {
          //   let extend = 1.05
          //   let opoints = []
          //   if(dm1) {
          //     let { xoff, yoff, w, h } = getOffsets(d, dm1, rw, srw, extend)
          //     opoints.push({x: xx + xoff, y: yy + yoff})
          //   }
          //   opoints.push({x: xx, y: yy})
          //   if(dp1) {
          //     let { xoff, yoff, w, h } = getOffsets(d, dp1, rw, srw, extend)
          //     opoints.push({x: xx + xoff, y: yy + yoff})
          //   }
          //   ctx.strokeStyle = "black"
          //   ctx.lineWidth = srw * extend
          //   ctx.beginPath()
          //   linef(opoints)
          //   ctx.stroke()
          // }
          
          ctx.fillStyle = fieldColor(sample.field)
          ctx.strokeStyle = fieldColor(sample.field)
          ctx.lineWidth = srw
          ctx.beginPath()
          linef(points)
          ctx.stroke()



        }
      }
    }
  }
}