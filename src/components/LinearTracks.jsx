import { useEffect, useCallback, useRef } from 'react';
import { scaleLinear, scaleBand } from 'd3-scale';
import { extent, max } from 'd3-array';
import LinearTrack from './LinearTrack';

import './LinearTracks.css';

const LinearTracks = ({
  width = 640,
  height = 50,
  margin = 0,
  state = null,
  hovered = null,
  selected = null,
  setHovered = () => {},
} = {}) => {
  let hit, coordExtent;
  let track, tracks, widths, yMax;

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
      track = data.filter(d => d.chromosome == hit.chromosome && d.inview)
      // console.log("track", track)
      let { fieldChoice } = state.layer
      yMax = max(track, d => fieldChoice(d)?.value)

      let xExtent = extent(track, d => d.i)
      xExtent[1] += 1

      // gapsize determines how big a gap is allowed between points
      // TODO: figure out why 0.01 didn't work well at order 4 but worked great at higher orders
      let gapsize = Math.round((xExtent[1] - xExtent[0]) * .05)
      tracks = []
      // split track into continuous segments based on d.i
      let last = track[0]
      let current = [last]
      for(let i = 1; i < track.length; i++) {
        let d = track[i]
        // if(d.i == last.i + 1) {
        if(d.i - last.i < gapsize) {
          current.push(d)
        } else {
          tracks.push(current)
          current = [d]
        }
        last = d
      }
      if(tracks[tracks.length -1] !== current) tracks.push(current)
      // console.log("tracks", hit, tracks)

      // for each track in the tracks, calculate the xExtent
      const xExtents = tracks.map(track => extent(track, d => d?.i))
      // add up the lengths of the tracks
      const totalLength = xExtents.reduce((a, b) => a + (b[1] - b[0]), 0)
      widths = xExtents.map(xExtent => (xExtent[1] - xExtent[0]) / totalLength * (width - tracks.length * 4))

      coordExtent = extent(track, d => d.start)
    }
  }

  
 
  return (
    <div className="linear-tracks">
      <div className="linear-tracks-canvases">
      {tracks && tracks.map((track, i) => {
        return <LinearTrack 
          key={"linear-track-" + i} 
          track={track} 
          width={widths[i]}
          yExtent={[0, yMax]}
          state={state}
          hit={hit}
          setHovered={setHovered}
          
        ></LinearTrack>
      })}
      </div>

      {/* <canvas 
        className="linear-genome-canvas"
        width={width + "px"}
        height={height + "px"}
        ref={canvasRef}
        onMouseMove={handleMouseMove}
      /> */}
      {/* {hit && coordExtent &&  <div className="annotations">
          <div className="start">{hit.chromosome}:{coordExtent[0]} </div>
          <div className="end">{hit.chromosome}:{coordExtent[1]}</div>
        </div>
       */}
          {/* TODO: add a 1 hilbert cell of coords to the end */}
    </div>
  )
};

export default LinearTracks;