import SVGSelected from '../SVGSelected'
import { HilbertChromosome } from '../../lib/HilbertChromosome'


const DisplayedNarratedRegions = ({
  narrations,
  detailLevel,
  order,
  color = "green",
  width = 0.4,
  showGenes = false
} = {}) => {
  if(narrations) {
    // showGenes=false
    let hilbert = new HilbertChromosome(order)

    const similarRegions = narrations[detailLevel - 1].slice(1)
    const similarRanges = similarRegions.map((d) => {
      const coords = d.coordinates
      const chrm = coords.split(':')[0]
      const start = coords.split(':')[1].split('-')[0]
      const stop = coords.split(':')[1].split('-')[1]
      let range = hilbert.fromRegion(chrm, start, stop-1)[0]
      return range
    })

    const SVGSelectedArr = similarRanges.map((range) => {
      return SVGSelected({ hit: range, stroke: color, strokeWidthMultiplier: width, showGenes })
    })

    return SVGSelectedArr
  } else {
    return ([null])
  }
}

export default DisplayedNarratedRegions