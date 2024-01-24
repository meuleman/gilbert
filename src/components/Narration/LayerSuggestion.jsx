// function to generate cross scale narrations for a provided region.
import Data from '../../lib/data';
import { HilbertChromosome, hilbertPosToOrder, checkRanges } from '../../lib/HilbertChromosome'

export default async function LayerSuggestion(data, layerOrder, setLayerOrder, layers) {
  const fetchData = Data({debug: false}).fetchData;
  let orderRange = [4, 14]

  // get hilbert ranges for the genomic region
  const getRange = (segment, order) => {
    const hilbert = HilbertChromosome(order)
    const chrm = segment.chromosome
    const start = segment.start
    const stop = start + 4 ** (14 - segment.order)
    let range = hilbert.fromRegion(chrm, start, stop-1)
    return range
  }

  const inViewData = data?.data.filter(d => d.inview)
  if(inViewData?.length > 0) {
    const dataOrder = inViewData[0].order
    const orderUp = Math.min(dataOrder + 1, orderRange[1])
    const dataRangesUp = inViewData.map(d => {
      const rangeUp = getRange(d, orderUp)
      return rangeUp
    }).flat()
    
    let layerUp = Promise.all(layers.map((layer) => {
      return fetchData(layer, orderUp, dataRangesUp)
        .then((response) => {
          const topFields = response.map(d => layer.fieldChoice(d)).filter(d => typeof d.value === 'number')
          const topFieldSums = topFields.reduce((a, b) => a + b.value, 0)
          return {layer: layer, value: topFieldSums}
        })
        .catch((error) => {
          console.error(`Error fetching Layer Suggestion data: ${error}`);
          return null
        })
    }))
    layerUp.then((response) => {
      const topUpLayer = response.sort((a,b) => {return b.value - a.value})[0]
      console.log("TOP UP LAYER", topUpLayer.layer)
    })
  }
  



  return LayerSuggestion
}