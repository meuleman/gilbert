// function to generate cross scale narrations for a provided region.
import Data from '../../lib/data';
import { HilbertChromosome, hilbertPosToOrder, checkRanges } from '../../lib/HilbertChromosome'

export default async function CrossScaleNarration(selected, fetchLayerData, layers) {
  const fetchData = Data({debug: false}).fetchData;
  
  let orders = Array.from({length: 11}, (a, i) => i + 4);

  const getRange = (selected, order) => {
    const hilbert = HilbertChromosome(order)
    const chrm = selected.chromosome
    const start = selected.start
    const stop = start + 4 ** (14 - selected.order)
    let range = hilbert.fromRegion(chrm, start, stop-1)
    return range
  }

  if(selected) {
    let topFieldsAcrossOrders = Promise.all(orders.map((order) => {
      let topFieldsAcrossLayers = Promise.all(layers.map((layer) => {
        if((layer.orders[0] <= order) && (layer.orders[1] >= order)) {
          const orderRange = getRange(selected, order)
          return fetchData(layer, order, orderRange).then((response) => {
            const topFields = response.map(d => layer.fieldChoice(d))
            const topField = topFields.sort((a,b) => {return b.value - a.value})[0]
            topField.layer = layer.name
            return topField
          })
        } else {
          return Promise.resolve(null)
        }
      }))
      return topFieldsAcrossLayers.then((response) => {
        let fields = response.filter(d => d !== null)
        if(fields.length > 0) {
          const topField = fields.sort((a,b) => {return b.value - a.value})[0]
          topField.order = order
          return topField
        } else {
          return null
        }
      })
    }))

    return topFieldsAcrossOrders
    // return topFieldsAcrossOrders.then((response) => {
    //   return response
    // })
  }
}