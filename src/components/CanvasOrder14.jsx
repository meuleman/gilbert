import { getOffsets } from "../lib/segments"
import { line } from "d3-shape";
// A canvas rendering function that renders a letter with a single colored rectangle for each data point

export default function CanvasOrder14Component({ canvasRef, state, scales, layer }) {
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
    let linef = line()
      .x(d => d.x)
      .y(d => d.y)
      .context(ctx)

    let i,d,dm1,dp1,xx,yy; 
    // make sure to render with the data's order
    const step = Math.pow(0.5, order)
    const sw = step //* (1 - strokeWidthMultiplier);
    const rw = sizeScale(sw) * t.k // - 1
    const srw = rw * 0.7

    const ATColor = "#ddd"
    const GCColor = "#ccc"
    const badgeColor = "#bbb"

    for(i = 0; i < data.length; i++) {
      d = data[i];
      dm1 = data[i-1];
      dp1 = data[i+1];
      // scale and transform the coordinates
      xx = t.x + xScale(d.x) * t.k
      yy = t.y + yScale(d.y) * t.k

      let text = d.data.nucleotide

      if(text) {
        ctx.fillStyle = text == "A" || text == "T" ? ATColor : GCColor
        ctx.strokeStyle = text == "A" || text == "T" ? ATColor : GCColor

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

        ctx.lineWidth = srw
        ctx.beginPath()
        linef(points)
        ctx.stroke()

        let cornerOffset = rw/6
        let radius = rw/10
        // render protein_function in top left
        if(d.data.protein_function) {
          ctx.fillStyle = fieldColor("Protein Function")
        } else {
          ctx.fillStyle = badgeColor
        }
          ctx.beginPath()
          ctx.arc(xx - cornerOffset, yy - cornerOffset, radius, 0, 2*Math.PI)
          ctx.fill()
        // render clinvar_sig in bottom right
        if(d.data.clinvar_sig) {
          ctx.fillStyle = fieldColor("ClinVar Sig")
        } else {
          ctx.fillStyle = badgeColor
        }
          ctx.beginPath()
          ctx.arc(xx + cornerOffset, yy + cornerOffset, radius, 0, 2*Math.PI)
          ctx.fill()
       
        // render conservation in bottom left
        if(d.data.conservation) {
          ctx.fillStyle = fieldColor("Conservation")
        } else {
          ctx.fillStyle = badgeColor
        }
          ctx.beginPath()
          ctx.arc(xx - cornerOffset, yy + cornerOffset, radius, 0, 2*Math.PI)
          ctx.fill()

        // render gwas in top right
        if(d.data.gwas) {
          ctx.fillStyle = fieldColor("GWAS")
        } else {
          ctx.fillStyle = badgeColor
        }
          ctx.beginPath()
          ctx.arc(xx + cornerOffset, yy - cornerOffset, radius, 0, 2*Math.PI)
          ctx.fill()

        // ctx.fillStyle = 'white'
        ctx.fillStyle = 'black'
        let fs = rw/3
        // ctx.font = `${rw/1.75}px monospace`;
        ctx.font = `${fs}px monospace`;
        // ctx.fillText(text.value, xx, yy + rw/4)
        ctx.fillText(text, xx, yy + rw/4 - 0.3*fs)
      }
    }
  }
}