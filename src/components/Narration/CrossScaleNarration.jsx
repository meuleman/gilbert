// function to generate cross scale narrations for a provided region.
import Data from '../../lib/data';
import { HilbertChromosome, hilbertPosToOrder, checkRanges } from '../../lib/HilbertChromosome'

export default async function CrossScaleNarration(selected, fetchLayerData, layers, method='path') {
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

  if(selected && method == 'drill') {
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

  // path based approach where the each suggested segment is within the one an order below it
  if(selected && method == 'path') {
    // get the top field within each layer for all overlapping segments
    let topFieldsAllLayers = Promise.all(layers.map((layer, i) => {
      // from order of selected segment to 14...
      let ordersUp = orders.slice(selected.order - Math.min(...orders))
      // ... find the top field within each segment for each layer
      let topFieldsAllOrders = Promise.all(ordersUp.map((order) => {
        // if the layer includes current order
        if((layer.orders[0] <= order) && (layer.orders[1] >= order)) {
          // get hilbert ranges
          const orderRange = getRange(selected, order)
          // fetch data for collected hilbert segments
          return fetchData(layer, order, orderRange)
            .then((response) => {
              // top field per segment
              const topFields = response.map(d => {
                let topField = layer.fieldChoice(d)
                // store layer as integer
                d.layer = i
                d.topField = topField
                return d
              })
              return topFields
            })
            .catch((error) => {
              console.error(`Error fetching CSN data: ${error}`);
              return null
            })
        } else {
          return Promise.resolve(null)
        }
      }))
      return topFieldsAllOrders.then((response) => {
        // flatten for easy lookup in following steps
        return response.filter(d => d !== null).flat()
      })
    }))

    // find the best score for each segment across layers
    let topFieldsAcrossLayers = topFieldsAllLayers.then((response) => {
      let layerData = response
      // the most segments in any layer
      let numSegments = Math.max(...layerData.map(d => d.length))
      let topFieldsAcrossLayers = new Array(numSegments).fill(null)
      // find the layer with the max score for each segment
      for(let i = 0; i < numSegments; i++) {
        let topLayerForSegment = layerData.map(d => d[i]).sort((a,b) => {return b.topField.value - a.topField.value})[0]
        // replace integer with layer info
        topLayerForSegment.layer = layers[topLayerForSegment.layer]
        topFieldsAcrossLayers[i] = topLayerForSegment
      }
      return topFieldsAcrossLayers
    })

    let bestPath = topFieldsAcrossLayers.then((response) => {
      let segmentData = response
      // create tree
      let numSegments = segmentData.length
      let tree = new Array(numSegments).fill(null).map(d => [])
      let scoresThroughNode = new Array(numSegments).fill(0)
      let bestPathThroughNode = new Array(numSegments).fill(null).map(d => [])
      for(let c = 1; c < numSegments; c++) {
        let p = Math.floor((c - 1) / 4)
        tree[p].push(c)
        tree[c].push(p)
      }

      // function to traverse the tree and find the best path
      let searchTree = (segmentData, tree, i, parent) => { 
        scoresThroughNode[i] = segmentData[i].topField.value
        var maxScore = 0; 
        for(var child of tree[i]) { 
          // move on if no new nodes
          if (child == parent){
            continue
          }
          // go deeper into the tree 
          searchTree(segmentData, tree, child, i)
          // update max score and path
          if(scoresThroughNode[child] > maxScore) {
            maxScore = scoresThroughNode[child]
            if(bestPathThroughNode[child].length == 0) {
              bestPathThroughNode[child].push(segmentData[child])
            }
            bestPathThroughNode[i] = [segmentData[i], ...bestPathThroughNode[child]]
          }
        } 
        // add score through current node
        scoresThroughNode[i] += maxScore
      }
      // find best path
      searchTree(segmentData, tree, 0, -1)
      console.log("best path", bestPathThroughNode[0])
      let bestPath = bestPathThroughNode[0].map(d => {
        let field = d.topField
        // only keep stations with significant scores
        if(field.value !== null) {
          field.color = d.layer.fieldColor(field.field)
          return {
            order: d.order,
            layer: d.layer,
            field: field,
          }
        } else {
          return null
        }
      })
      return bestPath
    })
    return bestPath
  }
}