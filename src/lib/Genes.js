import { rollups, extent } from "d3-array"
import { HilbertChromosome, hilbertPosToOrder } from "../lib/HilbertChromosome" 

// gencode.v38.annotation.gtf.higlass-transcripts.hgnc.112322.canonical.forceHGNC.longestIsoform.txt
// gencode file processed to a simpler json format in this notebook:
// https://observablehq.com/@enjalot/genetic-datasets
import gencodeRaw from "../data/gencode.json"
// by default we filter to protein_coding genes
export const gencode = gencodeRaw.filter(d => d.type == "protein_coding")



// get all the genes that fall within this cell and are smaller than a single hilbert cell
export function getGenesInCell(hit, order) {
  // filter the genes to where the hilbert cell is overlaping with the gene
  let threshold = hilbertPosToOrder(1, {from: order, to: 14 })
  let filteredGencode = gencode.filter(d => {
    return hit.chromosome == d.chromosome 
      && d.length < threshold // gene is smaller than a single hilbert cell
      && (
        // the start of gene falls within this cell
        (d.start > hit.start && d.start < hit.start + threshold) 
        // the end of the gene falls within this cell
          || (d.end > hit.start && d.end < hit.start + threshold)
      )
  })
  return filteredGencode
}
// get all the genes that overlap with this cell and are larger than a single hilbert cell
export function getGenesOverCell(hit, order) {
  let threshold = hilbertPosToOrder(1, {from: order, to: 14 })
  // filter the genes to where the hilbert cell is overlaping with the gene
  let filteredGencode = gencode.filter(d => {
    return hit.chromosome == d.chromosome 
      && d.length > threshold // gene is bigger than a single hilbert cell
      && (
        // hilbert cell starts within the gene
        (hit.start > d.start && hit.start < d.end) 
        // hilbert cell ends within the gene
          || (hit.start + threshold > d.start && hit.start + threshold < d.end)
      )
  })
  return filteredGencode 
}
export function getRangesOverCell(hit, order, limit = 2500) {
  const genes = getGenesOverCell(hit, order)
  let hilbert = new HilbertChromosome(order)
  let threshold = hilbertPosToOrder(1, {from: order, to: 14 })
  // console.log("threshold", threshold)
  // we don't want to include the gene if its more than 1500 times the threshold
  // this is a rough heuristic to avoid rendering genes that are too large for current view
  // think of it as limiting the number of hilbert cells of a gene we can render to 1500 (similar to how many points we render usually)
  const ranges = genes.filter(d => d.length < limit * threshold )
    .map(o => {
      // console.log("length", o.length, "limit x threshold", limit * threshold, "length/threshold", o.length / threshold)
      let range = hilbert.fromRegion(o.chromosome, o.start, o.end)
      if(o.posneg == '-') range.reverse()
      return range
    })
  return ranges
}

// given a set of points, get all the genes that are within view and that are larger than a single hilbert cell
// but smaller than the threshold limit
export function getGenesInView(points, order, limit = 2500) {
  // Calculate the extents of the points in view
  let pointConstraints = rollups(points, v => extent(v, d => d.start), d => d.chromosome)
  let pointConstraintsChrs = pointConstraints.map(d => d[0])
  let pointConstraintsExtents = pointConstraints.map(d => d[1])
  let threshold = hilbertPosToOrder(1, {from: order, to: 14 })
  // filter the genes to only those that can be in view
  let filteredGencode = gencode.filter(d => {
    if(d.length < threshold) return false;
    if(d.length > limit * threshold) return false;
    let pi = pointConstraintsChrs.indexOf(d.chromosome)
    if(pi < 0) return false;
    return (d.start > pointConstraintsExtents[pi][0] && d.start < pointConstraintsExtents[pi][1])
      || (d.end > pointConstraintsExtents[pi][0] && d.end < pointConstraintsExtents[pi][1])
  })
  let hilbert = new HilbertChromosome(order)
  // filter the genes that are bigger than a single hilbert cell
  return filteredGencode.map(o => {
    let range = hilbert.fromRegion(o.chromosome, o.start, o.end)
    if(o.posneg == '-') range.reverse()
    return range
  })
}

export function getGencodesInView(points, order, limit = 2500) {
  // Calculate the extents of the points in view
  let pointConstraints = rollups(points, v => extent(v, d => d.start), d => d.chromosome)
  let pointConstraintsChrs = pointConstraints.map(d => d[0])
  let pointConstraintsExtents = pointConstraints.map(d => d[1])
  let threshold = hilbertPosToOrder(1, {from: order, to: 14 })
  // filter the genes to only those that can be in view
  let filteredGencode = gencode.filter(d => {
    // if(d.length < threshold) return false;
    if(d.length > limit * threshold) return false;
    let pi = pointConstraintsChrs.indexOf(d.chromosome)
    if(pi < 0) return false;
    // return (d.start > pointConstraintsExtents[pi][0] && d.start < pointConstraintsExtents[pi][1])
    //   || (d.end > pointConstraintsExtents[pi][0] && d.end < pointConstraintsExtents[pi][1])
    return (d.start < pointConstraintsExtents[pi][1] && d.end > pointConstraintsExtents[pi][0])
  })
  return filteredGencode
}

