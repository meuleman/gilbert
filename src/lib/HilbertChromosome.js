
import { default as Hilbert } from 'd3-hilbert'
import { rollups } from 'd3-array';


// Custom offsets place the chromosomes in a more pleasing arrangement
// This is a JSON file that is copied from the following Observable notebook:
// https://observablehq.com/@enjalot/hilbert-chromosome-initial-layout
import customOffsetsJSON from './customOffsets.json'
export const customOffsets = customOffsetsJSON.map(d => ({...d, width: d.xMax, height: d.yMax}))
export const customOffsetsMap = new Map(customOffsets.map(c => [c.name, c]))

export const maxOrder = 14 // this will fit every basepair for each of the chromosomes

// convert a position from one order to another
export function hilbertPosToOrder(pos, {
  from = 14,
  to = 1
} = {}) {
  // we divide by 4 to the power of the difference between orders 
  return Math.floor(pos / Math.pow(4, from - to))
}

// This class allows us to calculate the points of the hilbert curve in a chromosome
// aware way. We can get the points for a chromosome at any order, and we can get
// the points only within a bounding box
export function HilbertChromosome(order, {
  padding = 3
} = {}) {
  let curve = Hilbert().order(order)
  
  // We want to offset the curves at each order so that when they stack they line up nicely
  // At each level, starting from order 2 we offset by half of the step width
  // But we need to also offset by the amount for each order lower than this one
  let offset = 0
  for(let i = 1; i < order; i++) {
    offset += Math.pow(0.5, i+1)
  }
  offset = offset / 2     // we want to offset by half the accumulated step widths
  offset = offset - 0.25  // we also offset everything by 0.25 to align the coordinate space on 0,1
  // the above forloop could be written more succinctly like this, but its harder to comment:
  //d3.range(order).slice(1).reduce((v,i) => v + Math.pow(0.5, i+1), 0) / 2 - 0.25

  // the sidescale is how much we need to scale the hilbert's width and height to get between 0 and 1
  let sidescale = Math.pow(2, order);
  // The step width is the distance in x,y space between two points for this order curve
  let step = Math.pow(0.5, order);
  
  let hilbert = {
    order,
    curve,
    offset,
    step,
    sidescale
  }

  // we use this function to get the in-view bounding box of a chromosome
  // Thanks ChatGPT!
  function getOverlappingRectangle(rect1, rect2) {
    const xOverlap = Math.max(
      0,
      Math.min(rect1.x + rect1.width, rect2.x + rect2.width) -
        Math.max(rect1.x, rect2.x)
    );
    const yOverlap = Math.max(
      0,
      Math.min(rect1.y + rect1.height, rect2.y + rect2.height) -
        Math.max(rect1.y, rect2.y)
    );
    if (xOverlap > 0 && yOverlap > 0) {
      return {
        x: Math.max(rect1.x, rect2.x),
        y: Math.max(rect1.y, rect2.y),
        width: xOverlap,
        height: yOverlap,
      };
    }
    return null;
  }

  function fromBbox(bbox) {
    // we want to see which chromosomes are overlapping with the bounding box
    // then we will create points based on the in-view chromosome boudns
    let mbbox = {
      x: bbox.x - step*padding,
      y: bbox.y - step*padding,
      width: bbox.width + step*padding*2,
      height: bbox.height + step*padding*2
    }
    let inview = customOffsets.map(c => {
      return [c, getOverlappingRectangle(c, mbbox)]
    })
    .filter(d => !!d[1])
    return inview.flatMap(d => fromBboxChromosome(d[0], d[1]))
  }

  function fromBboxChromosome(chromosome, bbox) {
    let points = [] 
    // we need to offset the bbox by the chromosome offset
    let cx = chromosome.x
    let cy = chromosome.y

    // now we get starting and ending points for x and y that we can loop over
    // these values are now in [0,1] space for interfacing with the hilbert curve
    let lx = -cx + bbox.x
    let rx = -cx + bbox.x + bbox.width
    let ly = -cy + bbox.y
    let ry = -cy + bbox.y + bbox.height

    let iMax = hilbertPosToOrder(chromosome.length, { from: maxOrder, to: order })

    // we loop over by double the amount of steps we actually need
    // this way we don't accidentally miss a row or column
    // we dedupe anyway and this will always be relatively cheap thanks to the viewbox
    let i,h,x,y;
    for(x = lx; x <= rx; x += step/2 ) {
      for(y = ly; y <= ry; y += step/2 ) {
        // get the hilbert coordinate for our 2D coordinate
        i = curve.getValAtXY(x, y);
        // we don't want any points that fall outside of our chromosome's length
        if(i < 0 || i > iMax) continue;
        // get the 2D point
        h = get2D(i)
        points.push({
          i,
          chromosome: chromosome.name,
          start: hilbertPosToOrder(i, { from: order, to: maxOrder }), // the local start position
          ...h,
          // add the chromosome's offset back to get our global x, y coordinate
          x: h.hx + chromosome.x,
          y: h.hy + chromosome.y,
          order
        })
      }
    }
    points = rollups(points, v => v[0], d => d.i).map(d => d[1]) // dedupe any points
    return points
      .sort((a,b) => a.i - b.i) // sort in ascending hilbert index order
  }
  
  hilbert.fromBbox = fromBbox
  hilbert.fromBboxChromosome = fromBboxChromosome

  hilbert.fromRegion = function(chr, start, end) {
    let chromosome = customOffsetsMap.get(chr)
    let hstart = hilbertPosToOrder(start, { from: 14, to: order})
    let hend = hilbertPosToOrder(end, { from: 14, to: order})
    let points = []
    for(let i = hstart; i <= hend; i++) {
      let h = get2D(i)
      points.push({
        i,
        chromosome: chromosome.name,
        start: hilbertPosToOrder(i, { from: order, to: maxOrder }), // the local start position
        ...h,
        // add the chromosome's offset back to get our global x, y coordinate
        x: h.hx + chromosome.x,
        y: h.hy + chromosome.y,
        order
      })
    }
    return points;
  }

  // TODO: consider making versions that are chromosome aware
  // as in they can account for the chromosome's offset
  function get2D(pos) {
    let h = curve.getXyAtVal(pos);
    return {
      hx: h[0] / sidescale - offset,
      hy: h[1] / sidescale - offset,
    }
  }
  hilbert.get2D = get2D
  
  function get2DPoint(pos, chr) {
    let h = get2D(pos);
    let chromosome = customOffsetsMap.get(chr)
    return {
      i: pos,
      chromosome: chr,
      x: h.hx + chromosome.x,
      y: h.hy + chromosome.y,
      order
    }
  }
  hilbert.get2DPoint = get2DPoint
  
  // given a point in the x,y space return the points associated with the hilbert coordinate there
  function get1D({hx,hy}) {
    let pos = curve.getValAtXY(hx,hy)
    return pos
  }
  hilbert.get1D = get1D
  
  return hilbert
}

