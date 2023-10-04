import { useEffect, useCallback, useRef } from 'react';
import { scaleLinear, scaleBand } from 'd3-scale';
import { extent, range } from 'd3-array';

// import './LinearTrack.css';

function invertScaleBand(scale, value) {
  const domain = scale.domain();
  const paddingOuter = scale(domain[0]);
  const eachBand = scale.step();
  
  // Calculate the index based on the value
  const index = Math.floor((value - paddingOuter) / eachBand);

  // Return the corresponding domain value if index is within bounds
  if (index >= 0 && index < domain.length) {
    return domain[index];
  }

  // Return undefined if the value is outside the scale's range
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
  setHovered = () => {},
} = {}) => {
  const canvasRef = useRef(null);
  let xScale, yScale;

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

      let xExtent = extent(track, d => d?.i)
      xExtent[1] += 1

      xScale = scaleBand()
        .domain(range(xExtent[0], xExtent[1]))
        .range([margin, width - margin])

      let bw = xScale.bandwidth()

      yScale = scaleLinear()
        .domain(yExtent)
        .range([0, height - margin*2])

      ctx.clearRect(0, 0, width, height);
      ctx.fillStyle = "black"
      let tx = xScale(hit.i) + bw/2
      ctx.fillRect(tx, margin, 1, height - margin*2)
      // draw a black triangle at the top of the selected point
      ctx.beginPath();
      ctx.moveTo(tx, margin);
      ctx.lineTo(tx - 5, 0);
      ctx.lineTo(tx + 5, 0);
      ctx.closePath();
      ctx.fill();
      // draw a black triangle at the bottom of selected point
      ctx.beginPath();
      ctx.moveTo(tx, height - margin);
      ctx.lineTo(tx - 5, height);
      ctx.lineTo(tx + 5, height);
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
          let x = xScale(d.i)
          let y = 0
          ctx.globalAlpha = 0.2 + 0.8 * sample.value / yExtent[1]
          ctx.fillStyle = fieldColor(sample.field)
          ctx.fillRect(x, y, bw, height - margin)
        }
      })

    }
  }

  
  let handleMouseMove = useCallback((event) => {
    if(canvasRef.current) {
      const rect = canvasRef.current.getBoundingClientRect();
      const x = event.clientX - rect.left;
      let index = invertScaleBand(xScale, x)
      if(index >= 0) {
        let hit = track.find(d => d.i == index)
        if(hit) {
          setHovered(hit)
        }
      }
    }
  },[setHovered, track, xScale, canvasRef]);
 
  return (
    <div className="linear-track">
      <canvas 
        className="linear-genome-canvas"
        width={width + "px"}
        height={height + "px"}
        ref={canvasRef}
        onMouseMove={handleMouseMove}
      />
    </div>
  )
};

export default LinearTrack;