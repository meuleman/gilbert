import SVGSelected from '../SVGSelected'
import { HilbertChromosome } from '../../lib/HilbertChromosome'

// function checkRanges(a, b) {
//   if(!a || !b) return false
//   if(a.start == b.start && a.end == b.end && a.chromosome == b.chromosome) {
//     return true
//   }
//   return false
// }

const DisplayedSimSearchRegions = ({
  simSearch=null,
  detailLevel,
  selectedRegion,
  order,
  checkRanges,
  similarRegionListHover,
  color = "green",
  clickedColor  = "red",
  width = 0.4,
  showGenes = false
} = {}) => {
  if(simSearch) {
    let hilbert = new HilbertChromosome(order)

    let similarRegions
    if(detailLevel) {
      similarRegions = simSearch.simSearch[detailLevel - 1].slice(1)
    } else {
      similarRegions = simSearch.simSearch
    }

    if(similarRegions) {
      const similarRanges = similarRegions.map((d) => {
        const coords = d.coordinates
        const chrm = coords.split(':')[0]
        const start = coords.split(':')[1].split('-')[0]
        const stop = coords.split(':')[1].split('-')[1]
        let range = hilbert.fromRegion(chrm, start, stop-1)[0]
        range.end = stop
        return range
      })
  
      const SVGSelectedArr = similarRanges.map((range) => {
        // if the segment is hovered in the similar regions list, darken color
        let hoverColorAdjust = checkRanges(range, similarRegionListHover) ? "dark" : ""
        return SVGSelected({ hit: range, stroke: checkRanges(range, selectedRegion) ? hoverColorAdjust + clickedColor : hoverColorAdjust + color, strokeWidthMultiplier: width, showGenes })
      })
  
      return SVGSelectedArr
    } else {
      return ([null])
    }
    
  } else {
    return ([null])
  }
}

export default DisplayedSimSearchRegions