import { useEffect, useCallback, useRef } from 'react';
import { scaleLinear, scaleBand } from 'd3-scale';
import { extent, max } from 'd3-array';
import LinearTrack from './LinearTrack';

import './TrackPyramid.css';

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

const TrackPyramid = ({
  width = 640,
  height = 50,
  margin = 5,
  state = null,
  tracks = [], // data from other orders
  hovered = null,
  selected = null,
  baseData=null,
  segment=true,
  // xExtentForTracks=[],
  setHovered = () => {},
} = {}) => {
  const canvasRef = useRef(null);
  let hit 
  let track, yMax, yExtent;
  let segments, widths, xExtents, xScales;
  let xScale
  let bw, bpSize

  if(canvasRef.current) {
    const ctx = canvasRef.current.getContext('2d');
    if(state) {
      let data = state.data

      if(selected) {
        // if selected, pick out the continuous data centered on the selected point
        hit = selected
      } else if (hovered) {
        // if not selected and hovered, center on hovered point
        hit = hovered
      } else {
        // if neither, don't render anything
      }
      if(data && hit) {

        // the 1D coordinates are d.i
        // track = data.filter(d => d.chromosome == hit.chromosome && d.inview)
        track = data.filter(d => d.chromosome == hit.chromosome)
        // console.log("track", track)
        let { fieldChoice, fieldColor } = state.layer
        yMax = max(track, d => fieldChoice(d)?.value)
        yExtent = [0, yMax]


        let xExtent = extent(track, d => d.start)
        bpSize = track[1].start - track[0].start
        xExtent[1] += bpSize
        // let xExtent = extent(track, d => d.i)
        // xExtent[1] += 1

        xScale = scaleLinear()
        .domain(xExtent)
        .range([margin, width - margin])

        if (data.length > 1) {
          bw = xScale(track[1].start) - xScale(track[0].start)
        }

        // gapsize determines how big a gap is allowed between points
        // TODO: figure out why 0.01 didn't work well at order 4 but worked great at higher orders
        let gapsize = Math.round((xExtent[1] - xExtent[0]) * .05)

        segments = []
        // if(segment) {
          // split track into continuous segments based on d.start
          let last = track[0]
          let current = [last]
          for(let i = 1; i < track.length; i++) {
            let d = track[i]
            // if(d.i - last.i < gapsize) {
            if(d.start - last.start < gapsize) {
              current.push(d)
            } else {
              segments.push(current)
              current = [d]
            }
            last = d
          }
          if(segments[segments.length -1] !== current) segments.push(current)
        // } else {
        //   segments = [track]
        // }

        // for each track in the segments, calculate the xExtent
        xExtents = segments.map(track => extent(track, d => d?.start))
        // add up the lengths of the segments
        const totalLength = xExtents.reduce((a, b) => a + (b[1] - b[0]), 0)
        widths = xExtents.map(xExtent => (xExtent[1] - xExtent[0]) / totalLength * (width - segments.length * 4))

        let lastW = 0
        xScales = widths.map((w,i) => {
          let scale = scaleLinear()
            .domain(xExtents[i])
            .range([lastW, lastW + w])
          lastW += w
          return scale
        })

        /*
        ====================================
        Rendering 
        ====================================
        */ 
        let trackHeight = height / (tracks.length + 1)

        ctx.clearRect(0, 0, width, height);
        // ctx.globalCompositeOperation='destination-over';

        if(segment) {
          // if we are removing gaps, each segment of the track needs to be rendered with its corresponding xscale
          segments.forEach((seg, si) => {
            let sbw = xScales[si](seg[1].start) - xScales[si](seg[0].start)
            // render the current order
            seg.forEach(d => {
              if(!d) return
              const sample = fieldChoice(d);
              if(sample) {
                let x = xScales[si](d.start)
                let y = 0
                ctx.globalAlpha = Math.min(1, 0.5 + 0.8 * sample.value / yExtent[1])
                ctx.fillStyle = fieldColor(sample.field)
                ctx.fillRect(x, y - margin, sbw, trackHeight)
              }
            })

            // render the tracks from other orders
            tracks.forEach((t, i) => {
              // we filter out any points not within the current segment
              // TODO: is the filtering logic correct? are we cutting too much?
              let orderTrack = t.data.filter(d => d.chromosome == hit.chromosome && d.start >= xExtents[si][0] && d.start <= xExtents[si][1])
              if(!orderTrack[0] || !orderTrack[1]) return
              let orderBw = xScales[si](orderTrack[1].start) - xScales[si](orderTrack[0].start)
              orderTrack.forEach(d => {
                if(!d) return
                const sample = fieldChoice(d);
                if(sample) {
                  let x = xScales[si](d.start)
                  let y = 0
                  ctx.globalAlpha = Math.min(1, 0.5 + 0.8 * sample.value / yExtent[1])
                  ctx.fillStyle = fieldColor(sample.field)
                  ctx.fillRect(x, y - margin + height - ((i+1) * trackHeight), orderBw, trackHeight)
                }
              })
            })
          })
        } else {
          // if we aren't removing gaps we only have to render each individual track
          track.forEach(d => {
            if(!d) return
            const sample = fieldChoice(d);
            if(sample) {
              let x = xScale(d.start)
              let y = 0
              ctx.globalAlpha = Math.min(1, 0.5 + 0.8 * sample.value / yExtent[1])
              ctx.fillStyle = fieldColor(sample.field)
              ctx.fillRect(x, y - margin, bw, trackHeight)
            }
          })
          tracks.forEach((t, i) => {
            let orderTrack = t.data.filter(d => d.chromosome == hit.chromosome)
            let orderBw = xScale(orderTrack[1].start) - xScale(orderTrack[0].start)
            orderTrack.forEach(d => {
              if(!d) return
              const sample = fieldChoice(d);
              if(sample) {
                let x = xScale(d.start)
                let y = 0
                ctx.globalAlpha = Math.min(1, 0.5 + 0.8 * sample.value / yExtent[1])
                ctx.fillStyle = fieldColor(sample.field)
                ctx.fillRect(x, y - margin + height - ((i+1) * trackHeight), orderBw, trackHeight)
              }
            })
          })

        }

        ctx.fillStyle = "black"
        ctx.globalAlpha = 1.0
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

        // debugging: this renders a start and end line for each segment
        // TODO: render little triangles indicating the close of a gap?
        segments.forEach((seg,si) =>{
          ctx.fillStyle = "purple"
          let xs = xScale
          if(segment) {
            xs = xScales[si]
          }
          tx = xs(xExtents[si][0])
          // console.log("tx", tx, si, xExtents[si])
          ctx.fillRect(tx, 0, 2, height - margin)
          ctx.fillStyle = "blue"
          tx = xs(xExtents[si][1])
          ctx.fillRect(tx, 0, 2, height - margin)
        })

      }
    }
  }

  let handleMouseMove = useCallback((event) => {
    if(canvasRef.current) {
      const rect = canvasRef.current.getBoundingClientRect();
      const x = event.clientX - rect.left;
      // first figure out which segment we are in
      let xs = xScale;
      let xbw = bw;
      let si = 0;

      if(segment) {
        xScales.forEach((xs,i) => {
          let we = xs.range()
          if(x >= we[0] && x <= we[1]) {
            si = i
          }
        })
        xs = xScales[si]
        xbw = xs(segments[si][1].start) - xs(segments[si][0].start)
      }
      // console.log(bw, xbw)
      let startbp = invertScaleLinear(xs, x, xbw, bpSize)
      console.log("x", x, "segment index", si, "x scale range", xs.range(), "result bp", startbp)
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
  },[setHovered, bw, bpSize, xScale, canvasRef, segment, xScales, segments, xExtents, track]);
 
  return (
    <div className="track-pyramid">
      <canvas 
        className="track-pyramid-canvas"
        width={width + "px"}
        height={height + "px"}
        ref={canvasRef}
        onMouseMove={handleMouseMove}
      />     
      <div className="annotations">order: {state?.order}</div>
       {/* {hit && coordExtent &&  <div className="annotations">
          <div className="start">{hit.chromosome}:{coordExtent[0]} </div>
          <div className="end">{hit.chromosome}:{coordExtent[1]}</div>
        </div>
       */}
          {/* TODO: add a 1 hilbert cell of coords to the end */}
    </div>
  )
};

export default TrackPyramid;