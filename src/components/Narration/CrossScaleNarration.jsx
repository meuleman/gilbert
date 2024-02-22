// function to generate cross scale narrations for a provided region.
import Data from '../../lib/data';
import { HilbertChromosome, hilbertPosToOrder, checkRanges } from '../../lib/HilbertChromosome'

export default async function CrossScaleNarration(selected, layers, numPaths=100) {
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

  // path based approach where the each suggested segment is within the one an order below it
  if(selected) {
    // track the orders we collect layer data from
    let maxOrderHit = Math.min(...orders)
    // get the top field within each layer for all overlapping segments
    let topFieldsAllLayers = Promise.all(layers.map((layer, i) => {
      // ... find the top field within each segment for each layer
      let topFieldsAllOrders = Promise.all(orders.map((order) => {
        // if the layer includes current order
        if((layer.orders[0] <= order) && (layer.orders[1] >= order)) {
          // update ordersHit with orders we collect layer data from
          maxOrderHit = Math.max(maxOrderHit, order)
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

    let bestPaths = topFieldsAcrossLayers.then((response) => {
      // from order of selected segment to 14...
      let ordersUp = orders.slice(selected.order - Math.min(...orders))
      let orderUpSegmentData = response.filter(d => ordersUp.includes(d.order))
      let orderDownSegmentData = response.filter(d => !ordersUp.includes(d.order))

      // create tree for orderUp data
      let numSegments = orderUpSegmentData.length
      let tree = new Array(numSegments).fill(null).map(d => [])
      let scoresThroughNode = new Array(numSegments).fill(0)
      // store scores through each path/leaf
      let numLeaves = 4 ** (maxOrderHit - Math.min(...ordersUp))
      for(let c = 1; c < numSegments; c++) {
        let p = Math.floor((c - 1) / 4)
        tree[p].push(c)
        tree[c].push(p)
      }

      // function to sum through nodes and collect score at leaves
      let sumTree = (scoresThroughNode) => {
        tree.forEach((nodes, i) => {
          let nodeValue = Math.sqrt(orderUpSegmentData[i].topField.value)  // normalize score
          scoresThroughNode[i] += nodeValue
          let children = nodes.slice(-4)
          if (children.length == 4) {children.forEach(c => scoresThroughNode[c] += scoresThroughNode[i])}
        })
        return scoresThroughNode
      }
      scoresThroughNode = sumTree(scoresThroughNode)

      // sort paths
      let leafIndexOffset = numSegments - numLeaves
      let leafScores = scoresThroughNode.slice(-numLeaves).map((s, i) => ({score: s, i: i + leafIndexOffset}))
      let leafScoresSorted = leafScores.sort((a, b) => b.score - a.score)

      // collect the features for each leaf path
      let refactorFeature = (d) => {
        let field = d.topField
        // only keep stations with significant scores
        if(field.value !== null) {
          field.color = d.layer.fieldColor(field.field)
          return { 
            region: d, order: d.order, layer: d.layer, field: field,
          }
        } else return null
      }
      // refactor orders below selected and add to each path
      let topLeafPaths = new Array(leafScoresSorted.length).fill(null).map(d => [...orderDownSegmentData.map(d => refactorFeature(d))])
      // function to move through the tree and collect features for each segment
      let collectFeatures = (node, i) => {
        let nodeFeature = orderUpSegmentData[node]
        topLeafPaths[i].push(refactorFeature(nodeFeature))
        if(node != 0) {
          let parent = tree[node][0]
          collectFeatures(parent, i)
        }
      }
      leafScoresSorted.forEach((d, i) => collectFeatures(d.i, i))
      
      // subset our results to just unique paths
      function findUniquePaths(paths) {
        const uniquePaths = []
        const seenPaths = new Map()

        // create a null object for each order
        let initialEmptyPathObj = {}
        for (let i = orders[0]; i <= orders[1]; i++) {
          initialEmptyPathObj[i] = null;
        }
        
        // filter paths
        paths.forEach(path => {
          // Convert path to a string to use as a map key
          let pathStripped = { ...initialEmptyPathObj }
          path.forEach((d) => {if(d !== null) pathStripped[d.order] = d.field.field})
          const pathKey = JSON.stringify(pathStripped)
          if (!seenPaths.has(pathKey)) {
            uniquePaths.push(path)
            seenPaths.set(pathKey, true)
          }
        })
        return uniquePaths
      }
      let uniquePaths = findUniquePaths(topLeafPaths)
      return uniquePaths.slice(0, numPaths)
    })
    return bestPaths
  }
}