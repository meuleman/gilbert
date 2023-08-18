import SVGSelected from '../SVGSelected'
import { HilbertChromosome } from '../../lib/HilbertChromosome'

function checkRanges(a, b) {
  if(!a || !b) return false
  if(a.start == b.start && a.end == b.end && a.chromosome == b.chromosome) {
    return true
  }
  return false
}

const DisplayedSimSearchRegions = ({
  simSearch,
  detailLevel,
  selectedRegion,
  order,
  color = "green",
  width = 0.4,
  showGenes = false
} = {}) => {
  if(simSearch) {
    // showGenes=false
    let hilbert = new HilbertChromosome(order)

    const similarRegions = simSearch[detailLevel - 1].slice(1)
    const similarRanges = similarRegions.map((d) => {
      const coords = d.coordinates
      const chrm = coords.split(':')[0]
      const start = coords.split(':')[1].split('-')[0]
      const stop = coords.split(':')[1].split('-')[1]
      let range = hilbert.fromRegion(chrm, start, stop-1)[0]
      range.end = stop
      return range
    })

    // const match = similarRanges.filter((range) => { return checkRanges(range, selectedRegion) })
    // console.log("ranges", selectedRegion, similarRanges, match)

    const SVGSelectedArr = similarRanges.map((range) => {
      return SVGSelected({ hit: range, stroke: checkRanges(range, selectedRegion) ? "red" : color, strokeWidthMultiplier: width, showGenes })
    })

    return SVGSelectedArr
  } else {
    return ([null])
  }
}

export default DisplayedSimSearchRegions