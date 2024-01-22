// function to generate cross scale narrations for a provided region.
import Data from '../../lib/data';
import { HilbertChromosome, hilbertPosToOrder, checkRanges } from '../../lib/HilbertChromosome'

export default async function CrossScaleNarration(selected, fetchLayerData, layers) {
  const fetchData = Data({debug: false}).fetchData;
  
  let orders = Array.from({length: 11}, (a, i) => i + 4);

  // get hilbert ranges for the selected genomic region
  const getRange = (selected, order) => {
    const hilbert = HilbertChromosome(order)
    const chrm = selected.chromosome
    const start = selected.start
    const stop = start + 4 ** (14 - selected.order)
    let range = hilbert.fromRegion(chrm, start, stop-1)
    return range
  }

  if(selected) {
    // get the top field within each order
    let topFieldsAcrossOrders = Promise.all(orders.map((order) => {
      // get the top field within each layer for all overlapping segments
      let topFieldsAcrossLayers = Promise.all(layers.map((layer) => {
        // if the layer includes current order
        if((layer.orders[0] <= order) && (layer.orders[1] >= order)) {
          // get hilbert ranges
          const orderRange = getRange(selected, order)
          // fetch data for collected hilbert segments
          return fetchData(layer, order, orderRange)
            .then((response) => {
              // top field per segment
              const topFields = response.map(d => layer.fieldChoice(d))
              // top field across segments
              const topField = topFields.sort((a,b) => {return b.value - a.value})[0]
              if(topField.value !== null) {
                // color for subway station
                topField.color = layer.fieldColor(topField.field)
                return {field: topField, layer: layer}
              } else {
                return null
              }
            })
            .catch((error) => {
              console.error(`Error fetching CSN data: ${error}`);
              return null
            })
        } else {
          return Promise.resolve(null)
        }
      }))
      return topFieldsAcrossLayers.then((response) => {
        // remove layers with no significant data
        let fields = response.filter(d => d !== null)
        if(fields.length > 0) {
          // compare fields across layers for order
          const topField = fields.sort((a,b) => {return b.field.value - a.field.value})[0]
          topField.order = order
          return topField
        } else {
          return {field: null, value: null, order: order, color: null, layer: null}
        }
      })
    }))

    return topFieldsAcrossOrders
  }
}