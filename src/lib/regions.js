import { HilbertChromosome, hilbertPosToOrder } from './HilbertChromosome'
// TODO should orderDomain just be part of HilbertChromosome? we wont ever change it
const orderDomain = [4, 14]
// convert a genome region to a gilbert region
// This will calculate the nearest order 
export function fromPosition(chromosome, start, end) {
  start = +start;
  end = +end;
  const length = end - start
  // figure out the appropriate order to zoom to
  // we want to zoom in quite a bit to the region if it hasn't specified its order
  let order = orderDomain[1];
  while(length > hilbertPosToOrder(1, { from: order, to: orderDomain[1] })) {
    order--;
    if(order == orderDomain[0]) break;
  }
  let pos = hilbertPosToOrder(start + (end - start)/2, { from: orderDomain[1], to: order })
  let hilbert = HilbertChromosome(order, { padding: 2 })
  let hit = hilbert.get2DPoint(pos, chromosome)
  // preserve the hilbert start and end
  hit.hstart = hit.start
  hit.hend = hit.end
  // input start and end are preserved
  hit.start = start
  hit.end = end
  return hit
}

export function urlify(region) {
  if(region) {
    // We only keep the core identifying information about the region
    // As well as if its a hilbert segment (if it has an i and order)
    let json = {
      chromosome: region.chromosome,
      start: region.start,
      end: region.end,
      i: region.i,
      order: region.order,
      x: region.x,
      y: region.y
    }
    return encodeURIComponent(JSON.stringify(json))
  }
  return ''
}

export function jsonify(region) {
  if(region) {
    return JSON.parse(decodeURIComponent(region))
  }
  return null
}