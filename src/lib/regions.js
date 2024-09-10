import { HilbertChromosome, hilbertPosToOrder } from './HilbertChromosome'
// TODO should orderDomain just be part of HilbertChromosome? we wont ever change it
const orderDomain = [4, 14]

export function parsePosition(coords) {
  const split = coords.split(':') 
  const chromosome = split[0]
  const pos = split[1].split("-")
  const start = pos[0]
  const end = pos[1]
  return { chromosome, start, end }
}

export function toPosition(region) {
  let chromosome = region.chromosome
  let start = region.regionStart || region.start
  let end = region.regionEnd || region.end
  return `${chromosome}:${start}-${end}` 
}

export function fromRegion(region, order) {
  return fromPosition(region.chromosome, region.start, region.end, order || region.order)
}

export function fromCoordinates(coords) {
  const parsed = parsePosition(coords)
  return fromPosition(parsed.chromosome, parsed.start, parsed.end)
}

export function fromIndex(chromosome, index, order) {
  let regionSize = 4 ** (14 - order)
  let start = regionSize * index
  let end = regionSize * (index + 1)
  return fromPosition(chromosome, start, end, order)
}

// convert a genome region to a gilbert region
// This will calculate the nearest order 
// {
  // --- position is given by the user
  // chromosome
  // start
  // end
  // --- these are calculated by hilbert
  // i
  // order
  // x
  // y
// } 
export function fromPosition(chromosome, start, end, order) {
  start = +start;
  end = +end;
  if(!order) {
    const length = end - start
    // figure out the appropriate order to zoom to
    // we want to zoom in quite a bit to the region if it hasn't specified its order
    order = orderDomain[1];
    while(length > hilbertPosToOrder(1, { from: order, to: orderDomain[1] })) {
      order--;
      if(order == orderDomain[0]) break;
    }
  }
  let pos = hilbertPosToOrder(start + (end - start)/2, { from: orderDomain[1], to: order })
  let hilbert = HilbertChromosome(order, { padding: 2 })
  let hit = hilbert.get2DPoint(pos, chromosome)
  hit.start = start
  hit.end = end
  hit.regionStart = hilbertPosToOrder(hit.i, { from: order, to: 14 })
  hit.regionEnd =  hilbertPosToOrder(hit.i+1, { from: order, to: 14 })
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
      regionStart: region.regionStart,
      regionEnd: region.regionEnd,
      i: region.i,
      order: region.order,
      x: region.x,
      y: region.y,
      description: region.description
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

export function sameHilbertRegion(a, b) {
  // compare (hilber) regions
  if(a.chromosome !== b.chromosome) return false
  if(a.i !== b.i) return false
  return true
}

export function overlap(ar, br) {
  // we always want "a" to be the longer region
  let a = ar;
  let b = br;
  if(a.chromosome !== b.chromosome) return null;
  if(b.end - b.start > a.end - a.start) {
    a = br
    b = ar
  }
  if((b.start >= a.start && b.start <= a.end) || (b.end >= a.start && b.end <= a.end)) {
    // we have overlap
    return br
  }
  return null
}

export function overlaps(a, regions, accessor = r => r) {
  return regions.filter(r => overlap(a, accessor(r)))
}