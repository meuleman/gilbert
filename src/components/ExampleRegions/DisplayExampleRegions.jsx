import SVGSelected from '../SVGSelected'

const DisplayedExampleRegions = ({
  exampleRegions,
  hilbert,
  // selectedRegion,
  checkRanges,
  color = "green",
  clickedColor  = "red",
  width = 0.4,
  showGenes = false,
  numRegions,
  radisMultiplier=0.125,
} = {}) => {
  if(exampleRegions.length) {
    if(numRegions) {
      exampleRegions = exampleRegions.slice(0, numRegions)
    }
    const exampleRanges = exampleRegions.map(r => {
      let chrm = r.chr
      if(!chrm.includes('chr')) {
        chrm = 'chr' + chrm
      }
      const start = r.start
      const stop = r.stop

      let range = hilbert.fromRegion(chrm, start, stop)[0]
      return range
    })

    const SVGExampleArr = exampleRanges.map((range) => { 
      return SVGSelected({ hit: range, stroke: color, strokeWidthMultiplier: width, showGenes: showGenes, radiusMultiplier: radisMultiplier })
    })

    return SVGExampleArr
  } else {
    return ([null])
  }
}

export default DisplayedExampleRegions