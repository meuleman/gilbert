// import { scaleLinear } from "d3-scale";

// A canvas rendering function that renders a single colored rectangle for each data point
// with opacity scaled to the max of the order
export default function CanvasSimpleValueComponent({ canvasRef, state, scales, layer }) {
  if(canvasRef.current) {
    const ctx = canvasRef.current.getContext('2d');
    if(!ctx) return;

    // layer options
    let { fieldChoice, fieldColor, strokeWidthMultiplier } = layer

    // scales
    let {xScale ,yScale ,sizeScale} = scales
    
    // state
    let {data, points, meta, transform, order, dataOrder} = state
    if(!points || !data || !meta) return;

    // the min and max for scaling
    let fields = meta["fields"]
    let nonzero_min = meta["nonzero_min"]
    let min = nonzero_min ? nonzero_min : meta["min"]
    if(!min.length && min < 0) min = 0;
    let max = meta["max"]

    // console.log(...data.map((d) => {
    //   return d.data['mean']
    // }))
    

    // rendering constants
    let t = {...transform}

    let i,d,xx,yy; 
    // make sure to render with the data's order
    const step = Math.pow(0.5, dataOrder)
    const sw = step * (1 - strokeWidthMultiplier);
    const rw = sizeScale(sw) * t.k - 1

    // function that scales input to alpha values linearly, but 
    // input values equal to 0 are set to 0
    // thanks ChatGPT!!
    function scaleLinearAboveThresh(threshold) {
      let domain = [min, max]
      let range = [0.2, 1]

      function scale(d) {
        if (d > threshold) {
          const dScaled = (d - domain[0]) / (domain[1] - domain[0])
          const dInRange = (range[1] - range[0]) * dScaled + range[0]
          return dInRange
        } else {
          return 0
        }
      }
      scale.domain = function (newDomain=null) {
        if (newDomain) {
          domain = [...newDomain]
          return scale
        } else {
          return [...domain]
        }
      }
      scale.range = function (newRange=null) {
        if (newRange) {
          range = [...newRange]
          return scale
        } else {
          return [...range]
        }
      }
      return scale
    }

    let domain = [min, max]
    // console.log(domain)
    let alphaScale = scaleLinearAboveThresh(0)
      // .domain(domain)
      // .range([0.2, 1]);

    // console.log(alphaScale.domain())

    // let alphaScale = scaleLinear()
    //   .domain(domain)
    //   .range([0.2, 1])
    
    let localMax = 0
    let localMin = 0
    for(i = 0; i < data.length; i++) {
      d = data[i];
      if(d.data) {
        const sample = fieldChoice(d);
        localMax = Math.max(localMax, sample.value)
      }
    }
    alphaScale.domain([[localMin], [localMax]])
    for(i = 0; i < data.length; i++) {
      d = data[i];
      // scale and transform the coordinates
      xx = t.x + xScale(d.x) * t.k
      yy = t.y + yScale(d.y) * t.k
      // ctx.strokeRect(xx - rw/2, yy - rw/2, rw, rw)
      if(d.data) {
        const sample = fieldChoice(d);
        if(sample) {
          // if(min.length) {
            // let fi = fields.indexOf(sample.field)
            // domain = [min[fi] < 0 ? 0 : min[fi], max[fi]]
            // alphaScale.domain(domain)
            // alphaScale.domain([[localMin], [localMax]])
          // }
          let a = alphaScale(sample.value)
          ctx.globalAlpha = a < 0 ? 0 : a
          ctx.fillStyle = fieldColor(sample.field)
          ctx.fillRect(xx - rw/2, yy - rw/2, rw, rw)
        }
      }
    }
  }
}