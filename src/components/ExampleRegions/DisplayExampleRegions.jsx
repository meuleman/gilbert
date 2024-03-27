import SVGSelected from '../SVGSelected'
import { HilbertChromosome, checkRanges } from '../../lib/HilbertChromosome'

const DisplayExampleRegions = ({
  exampleRegions,
  order,
  // selectedRegion,
  color = "green",
  clickedColor  = "red",
  width = 0.4,
  showGenes = false,
  numRegions,
  radiusMultiplier=0.125,
} = {}) => {
  if(exampleRegions.length) {
    if(numRegions) {
      exampleRegions = exampleRegions.slice(0, numRegions)
    }
    const hilbert = HilbertChromosome(order)
    const exampleRanges = exampleRegions.map(r => {
      // TODO: we should have a Region class that standardizes the fields
      let chrm = r.chr || r.chromosome
      if(!chrm.includes('chr')) {
        chrm = 'chr' + chrm
      }
      const start = r.start
      const stop = r.stop || r.end

      let range = hilbert.fromRegion(chrm, start, stop)[0]
      return range
    })

    const SVGExampleArr = exampleRanges.map((range) => { 
      return SVGSelected({ hit: range, stroke: color, strokeWidthMultiplier: width, showGenes: showGenes, radiusMultiplier: radiusMultiplier })
    })

    return SVGExampleArr
  } else {
    return ([null])
  }
}

export default DisplayExampleRegions