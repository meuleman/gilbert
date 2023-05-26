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
    let start = d3.min(s, d => d.i)
    let stop = d3.max(s, d => d.i) + 1
    let length = stop - start
    return {
      length,
      start,
      stop,
      segments: s
    }
  })
  return joined
  
}