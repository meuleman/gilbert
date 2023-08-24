import { min, max } from 'd3-array'

export function createSegments(points) {
  // split an array of points into its continuous segments
  let segments = [[points[0]]]
  let si = 0
  let i, p;
  for(i = 1; i < points.length; i++) {
    p = points[i]
    if(
      p.i == points[i-1].i + 1  // continuous is based on hilbert index, provided by the Hilbert class when points are made
        // we could also split the segments by chromosome, which makes sense aesthetically but not necessary data wise
    ) {
      segments[si].push(p)
    } else {
      si += 1
      segments.push([p])
    }
  }
  return segments
}

export function joinSegments(segments, segmentThreshold = 100) {
  // first we find the distances between each of the segments
  let dists = segments.map((s,i) => {
    if(i == 0) return 0
    let sp = segments[i - 1]
    return { dist: s[0].i - sp[sp.length-1].i, segment: s, i }
  }).filter(d => !!d)

  // then we go through the distances and concatenate segments that are within the segment threshold
  let joined = [
    segments[0].map(d => d)
  ]
  let si = 0;
  dists.forEach(d => {
    if(d.dist < segmentThreshold) {
      // we want to add this to the current segment
      joined[si] = joined[si].concat(d.segment)
    } else {
      joined.push(d.segment.map(d => d))
      si += 1
    }
  })
  // now lets get the extent of each segment
  // instead of keeping track of individual points we are 
  return joined.map(s => {
    let start = min(s, d => d.i)
    let stop = max(s, d => d.i) + 1
    let length = stop - start
    return {
      length,
      start,
      stop,
      segments: s
    }
  })
}



export function getOffsets(d, p, rw, srw) {
  // figure out which of the 4 directions the previous point is from this one
  // and draw a rectangle offset in that direction
  let dx = d.x - p.x
  let dy = d.y - p.y
  let dir = 0
  if(dx > 0 && dy == 0) dir = 1
  if(dx < 0 && dy == 0) dir = 2
  if(dx == 0 && dy > 0) dir = 3
  if(dx == 0 && dy < 0) dir = 4
  let xoff = 0
  let yoff = 0
  let w = 0
  let h = 0
  if(dir == 1) { // previous point to the left
    xoff = -rw/2
    yoff = -srw/2
    w = (rw-srw)/2
    h = srw
  }
  if(dir == 2) { // previous point to the right
    xoff = srw/2
    yoff = -srw/2
    w = (rw-srw)/2
    h = srw
  }
  if(dir == 3) { // previous point above
    xoff = -srw/2
    yoff = -rw/2
    h = (rw-srw)/2
    w = srw
  }
  if(dir == 4) { // previous point below
    xoff = -srw/2
    yoff = srw/2
    h = (rw-srw)/2
    w = srw
  }
  return { xoff, yoff, h, w }

}