import axios from "axios";
import Data from './data';
import { HilbertChromosome, } from './HilbertChromosome'
import { fromRegion } from './regions'

// function to generate cross scale narrations for a provided region.
async function calculateCrossScaleNarration(selected, layers) {
  const fetchData = Data({debug: false}).fetchData;
  
  let orders = Array.from({length: 11}, (a, i) => i + 4);

  // use standard way of getting the hilbert range for this region
  // sometimes selected region is a gene so it is bigger or smaller than a region
  // this will convert it to a hilbert region
  selected = fromRegion(selected)

  // get hilbert ranges for the selected genomic region
  const getRange = (selected, order) => {
    const hilbert = HilbertChromosome(order)
    const chrm = selected.chromosome
    const start = selected.regionStart
    const stop = selected.regionEnd //start + 4 ** (14 - selected.order)
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
      let topLeafPaths = new Array(leafScoresSorted.length).fill(null).map(d => {return {'path': [...orderDownSegmentData.map(d => refactorFeature(d))]}})
      // function to move through the tree and collect features for each segment
      let collectFeatures = (node, i) => {
        let nodeFeature = orderUpSegmentData[node]
        topLeafPaths[i].path.push(refactorFeature(nodeFeature))
        if(node != 0) {
          let parent = tree[node][0]
          collectFeatures(parent, i)
        }
      }
      leafScoresSorted.forEach((d, i) => {
        topLeafPaths[i]['score'] = d.score
        topLeafPaths[i]['node'] = d.i
        collectFeatures(d.i, i)
      })
      return {'paths': topLeafPaths, 'tree': tree}
    })
    return bestPaths
  }
}


// function to generate narration results for a provided region with Genomic Narration tool. 
function narrateRegion(selected, order) {
  const maxSimSearchOrder = 11
  if(selected) {
    if(order <= maxSimSearchOrder) {
      const regionMethod = 'hilbert_sfc'
      let url = "https://explore.altius.org:5001/narration"

      const chromosome = selected.chromosome
      const start = selected.start
      const stop = start + 1

      const postBody = {
        location: `${chromosome}:${start}-${stop}`,
        scale: order,
        regionMethod: regionMethod,
      };

      const narration = axios({
        method: 'POST',
        url: url,
        data: postBody
      }).then((response) => {
        const data = response.data[0];
        return {narrationRanks: data.percentiles, coordinates: data.coordinates}
      })
      .catch((err) => {
        console.error(`error:     ${JSON.stringify(err)}`);
        console.error(`post body: ${JSON.stringify(postBody)}`);
        // alert('Query Failed: Try another region.');
        return null
      });

      return narration
    } else {
      const narration = {narrationRanks: null, coordinates: null}
      return Promise.resolve(narration)
    }
  }
}


export default async function layerSuggestion(data, layers) {
  const fetchData = Data({debug: false}).fetchData;
  let orderRange = [4, 14]

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
    return await layerUp.then((response) => {
      const topUpLayer = response.sort((a,b) => {return b.value - a.value})[0]
      console.log("TOP UP LAYER", topUpLayer.layer)
      return topUpLayer
    })
  }
  return null
}

function walkTree(tree, node, path=[]) {
  if (node === undefined || node === null || tree === undefined || tree.length === 0) {
      return path;
  }
  path.unshift(node); // Add the current node to the beginning of the path
  const parentNodeIndex = tree[node][0]; // Get the parent node index
  // console.log("parent", parentNodeIndex, "path", path)
  if (parentNodeIndex) {
      return walkTree(tree, parentNodeIndex, path); // Recursively walk up the tree
  }
  return path; // Return the accumulated path when the root is reached or if there's no parent
}

// subset our CSN results to just unique paths
function findUniquePaths(paths) {
  let uniquePaths = []
  let uniquePathMemberships = []
  const seenPaths = new Map()

  // initialize each order to null
  let initialEmptyPathObj = {}
  const orders = [4, 14]
  for (let i = orders[0]; i <= orders[1]; i++) initialEmptyPathObj[i] = null;
  
  // filter paths
  paths.forEach(path => {
    // Convert path to a string to use as a map key
    let pathStripped = { ...initialEmptyPathObj }
    path.path.forEach((d) => {if(d !== null) pathStripped[d.order] = d.field.field})
    const pathKey = JSON.stringify(pathStripped)
    if (!seenPaths.has(pathKey)) {
      seenPaths.set(pathKey, uniquePaths.length)
      uniquePaths.push(path)
      uniquePathMemberships.push([path])
    } else {
      let pathInd = seenPaths.get(pathKey)
      uniquePathMemberships[pathInd].push(path)
    }
  })
  if(uniquePaths.length < 1) {
    uniquePaths = paths
    uniquePathMemberships = paths.map(d => [d])
  }
  uniquePathMemberships.forEach((u,i) => {
    uniquePaths[i].members = u.length
  })
  return {'uniquePaths': uniquePaths, 'uniquePathMemberships': uniquePathMemberships}
}

export {
  calculateCrossScaleNarration,
  narrateRegion,
  layerSuggestion,
  walkTree,
  findUniquePaths
}