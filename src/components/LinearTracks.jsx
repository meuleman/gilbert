import { useEffect, useRef } from 'react';
import { scaleLinear, scaleBand } from 'd3-scale';
import { extent, range } from 'd3-array';

import './LinearTracks.css';

const LinearTracks = ({
  width = 640,
  height = 50,
  margin = 5,
  state = null,
  hovered = null,
  selected = null,
} = {}) => {
  const canvasRef = useRef(null);

  if(!state) return null;

  if(canvasRef.current) {
    const ctx = canvasRef.current.getContext('2d');
    if(!ctx) return;

    let {data, points, meta, order, dataOrder} = state
    if(!points || !data || !meta) return;

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
      return;
    }

    let { fieldChoice, fieldColor} = state.layer
    let fields = meta["fields"]
    let nonzero_min = meta["nonzero_min"]
    let min = nonzero_min ? nonzero_min : meta["min"]
    if(!min.length && min < 0) min = 0;
    let max = meta["max"]
    let yExtent = [min,max]


    // the 1D coordinates are d.i
    let track = data.filter(d => d.chromosome == hit.chromosome)
    let xExtent = extent(track, d => d.i)
    let xScale = scaleBand()
      .domain(range(xExtent[0], xExtent[1]))
      .range([margin, width - margin])

    let yScale = scaleLinear()
      .domain(yExtent)
      .range([0, height - margin*2])

    // console.log("track", track)

    ctx.clearRect(0, 0, width, height);
    ctx.fillStyle = "black"
    ctx.fillRect(xScale(hit.i), margin, 1, height - margin*2)

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

  }

  return (
    <div className="linear-tracks">
      <canvas 
        className="linear-genome-canvas"
        width={width + "px"}
        height={height + "px"}
        ref={canvasRef}
      />
    </div>
  )
};

export default LinearTracks;