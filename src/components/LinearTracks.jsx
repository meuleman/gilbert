import { useEffect, useCallback, useRef } from 'react';
import { scaleLinear, scaleBand } from 'd3-scale';
import { extent, range } from 'd3-array';

import './LinearTracks.css';

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

const LinearTracks = ({
  width = 640,
  height = 50,
  margin = 5,
  state = null,
  hovered = null,
  selected = null,
  setHovered = () => {},
} = {}) => {
  const canvasRef = useRef(null);

  // if(!state) return null;

  let hit, coordExtent;
  let xScale, yScale, track;
   // when mouse over update the hovered point
  //  let handleMouseMove = useCallback((event) => {
  //   // const rect = canvasRef.current.getBoundingClientRect();
  //   console.log("event", event.clientX, event.clientY)
  // }, [])




  if(canvasRef.current) {
    const ctx = canvasRef.current.getContext('2d');
    // {data, meta} = state
    let data = state.data
    let meta = state.meta
    // if(!points || !data || !meta) return;

    // console.log("selected, hovered", selected, hovered)
    let hit
    if(selected) {
    // if selected, pick out the continuous data centered on the selected point
      hit = selected
    } else if (hovered) {
    // if not selected and hovered, center on hovered point
      hit = hovered
    } else {
    // if neither, don't render anything
      // return;
    }
    if(data && meta && hit && ctx) {

      let { fieldChoice, fieldColor} = state.layer
      let fields = meta["fields"]
      let nonzero_min = meta["nonzero_min"]
      let min = nonzero_min ? nonzero_min : meta["min"]
      if(!min.length && min < 0) min = 0;
      let max = meta["max"]
      let yExtent = [min,max]


      // the 1D coordinates are d.i
      track = data.filter(d => d.chromosome == hit.chromosome)
      let xExtent = extent(track, d => d.i)
      xScale = scaleBand()
        .domain(range(xExtent[0], xExtent[1]))
        .range([margin, width - margin])

      yScale = scaleLinear()
        .domain(yExtent)
        .range([0, height - margin*2])

      // console.log("track", track)

      ctx.clearRect(0, 0, width, height);
      ctx.fillStyle = "black"
      ctx.fillRect(xScale(hit.i), margin, 1, height - margin*2)
      // draw a black triangle at the top of the selected point
      ctx.beginPath();
      ctx.moveTo(xScale(hit.i), margin);
      ctx.lineTo(xScale(hit.i) - 5, 0);
      ctx.lineTo(xScale(hit.i) + 5, 0);
      ctx.closePath();
      ctx.fill();
      // draw a black triangle at the bottom of selected point
      ctx.beginPath();
      ctx.moveTo(xScale(hit.i), height - margin);
      ctx.lineTo(xScale(hit.i) - 5, height);
      ctx.lineTo(xScale(hit.i) + 5, height);
      ctx.closePath();
      ctx.fill();


      track.forEach(d => {
        const sample = fieldChoice(d);
        if(sample) {
          if(min.length) {
            let fi = fields.indexOf(sample.field)
            yExtent = [min[fi] < 0 ? 0 : min[fi], max[fi]]
            yScale.domain(yExtent)
          }
          let h = yScale(sample.value)
          let x = xScale(d.i)
          let y = height-margin-h
          ctx.fillStyle = fieldColor(sample.field)
          ctx.fillRect(x, y, xScale.bandwidth(), h)
        }
      })

      coordExtent = extent(track, d => d.start)
    }
  }

  
  let handleMouseMove = useCallback((event) => {
    if(canvasRef.current) {
      const rect = canvasRef.current.getBoundingClientRect();
      const x = event.clientX - rect.left;
      // const y = event.clientY - rect.top;
      // console.log("x,y", x,y)
      let index = invertScaleBand(xScale, x)
      // console.log("i", index)
      if(index >= 0) {
        let hit = track[index]
        // console.log("hit", hit)
        if(hit) {
          setHovered(hit)
        }
      }
    }
  },[setHovered, track, xScale, canvasRef]);
 
  return (
    <div className="linear-tracks">
      <canvas 
        className="linear-genome-canvas"
        width={width + "px"}
        height={height + "px"}
        ref={canvasRef}
        onMouseMove={handleMouseMove}
      />
      {hit &&  <div className="annotations">
          <div className="start">{hit.chromosome}:{coordExtent[0]} </div>
          {/* TODO: add a 1 hilbert cell of coords to the end */}
          <div className="end">{hit.chromosome}:{coordExtent[1]}</div>
        </div>
      }
    </div>
  )
};

export default LinearTracks;