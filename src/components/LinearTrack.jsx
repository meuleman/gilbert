import { useEffect, useCallback, useRef } from 'react';
import { scaleLinear, scaleBand } from 'd3-scale';
import { extent, range } from 'd3-array';

// import './LinearTrack.css';

function invertScaleLinear(scale, value, bw, bpbw) {
  const domain = scale.domain();
  const paddingOuter = scale(domain[0]);
  // const eachBand = scale.step();
  const eachBand = bw;

  // Calculate the index based on the value
  const index = Math.floor((value - paddingOuter) / eachBand);

  // Return the corresponding domain value if index is within bounds
  // if (index >= 0 && index < domain.length) {
  let startbp = index * bpbw + domain[0] 
  // if (index >= 0 && (index * bpbw + domain[0] < domain[1])) {
  if (startbp >= domain[0] && (startbp < domain[1])) {
    // return domain[index];
    return startbp;
  }

  // Return undefined if the value is outside the scale's domain
  return undefined;
}

const LinearTrack = ({
  width = 640,
  height = 50,
  margin = 5,
  state = null,
  track = null,
  hit = null,
  yExtent = [],
  xExtent = [],
  setHovered = () => {},
} = {}) => {
  const canvasRef = useRef(null);
  let xScale, yScale, bw, bpbw;

  if(canvasRef.current) {
    const ctx = canvasRef.current.getContext('2d');
    let data = state.data
    // let meta = state.meta
    
    if(data && /*meta &&*/ hit && ctx) {

      let { fieldChoice, fieldColor} = state.layer
      // let fields = meta["fields"]
      // let nonzero_min = meta["nonzero_min"]
      // let min = nonzero_min ? nonzero_min : meta["min"]
      // if(!min.length && min < 0) min = 0;
      // let max = meta["max"]
      // let yExtent = [min,max]

      // let xExtent = extent(track, d => d?.i)
      // xExtent[1] += 1

      // xScale = scaleBand()
      //   .domain(range(xExtent[0], xExtent[1]))
      //   .range([margin, width - margin])

      xScale = scaleLinear()
        .domain(xExtent)
        .range([margin, width - margin]) // TODO: use of margin here makes little sense?
      
      // let bw = xScale.bandwidth()
      if (data.length > 1) {
        bpbw = data[1].start - data[0].start
        bw = xScale(data[1].start) - xScale(data[0].start)
      }

      yScale = scaleLinear()
        .domain(yExtent)
        .range([0, height - margin*2]) // TODO: use of margin here makes little sense?

      ctx.clearRect(0, 0, width, height);
      ctx.fillStyle = "black"
      ctx.globalCompositeOperation='destination-over';

      // draw a vertical line at the selected point
      let tx = xScale(hit.start) // + bw/2
      ctx.fillRect(tx, 0, 1, height - margin)

      // draw a black triangle at the top of the selected point
      ctx.beginPath();
      ctx.moveTo(tx, margin);
      ctx.lineTo(tx - 5, 0);
      ctx.lineTo(tx + 5, 0);
      ctx.closePath();
      ctx.fill();
      // draw a black triangle at the bottom of selected point
      ctx.beginPath();
      ctx.moveTo(tx, height - margin*2);
      ctx.lineTo(tx - 5, height - margin);
      ctx.lineTo(tx + 5, height - margin);
      ctx.closePath();
      ctx.fill();

      track.forEach(d => {
        if(!d) return
        const sample = fieldChoice(d);
        // bar chart version
        // if(sample) {
        //   let h = yScale(sample.value)
        //   let x = xScale(d.i)
        //   let y = height-margin-h
        //   ctx.fillStyle = fieldColor(sample.field)
        //   ctx.fillRect(x, y, bw, h)
        // }
        // Opacity heatmap version
        if(sample) {
          // let x = xScale(d.i)
          let x = xScale(d.start)
          let y = 0
          ctx.globalAlpha = Math.min(1, 0.5 + 0.8 * sample.value / yExtent[1])
          ctx.fillStyle = fieldColor(sample.field)
          ctx.fillRect(x, y - margin, bw, height)
        }
      })

    }
  }
  
  let handleMouseMove = useCallback((event) => {
    if(canvasRef.current) {
      const rect = canvasRef.current.getBoundingClientRect();
      const x = event.clientX - rect.left;
      // let index = invertScaleBand(xScale, x, bw, bpbw)
      let startbp = invertScaleLinear(xScale, x, bw, bpbw)
      // if(index >= 0) {
      if(startbp) {
        // let hit = track.find(d => d.i == index)
        let hit = track.find(d => d.start == startbp)
        // let hit = track[index]
        if(hit) {
          setHovered(hit)
        }
      }
    }
  },[setHovered, track, xScale, canvasRef]);
 
  return (
      <canvas 
        className="linear-track-canvas"
        width={width + "px"}
        height={height-margin + "px"}
        ref={canvasRef}
        onMouseMove={handleMouseMove}
      />
  )
};

export default LinearTrack;