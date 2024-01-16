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
      // if the segment is hovered in the similar regions list, darken color
      // let hoverColorAdjust = checkRanges(range, similarRegionListHover) ? "dark" : ""
      // return SVGSelected({ hit: range, stroke: checkRanges(range, selectedRegion) ? hoverColorAdjust + clickedColor : hoverColorAdjust + color, strokeWidthMultiplier: width, showGenes })
      return SVGSelected({ hit: range, stroke: color, strokeWidthMultiplier: width, showGenes })
    })

    return SVGExampleArr
  } else {
    return ([null])
  }
}

export default DisplayedExampleRegions