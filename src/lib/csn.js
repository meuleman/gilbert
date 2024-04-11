import axios from "axios";
import Data from './data';
import { HilbertChromosome, } from './HilbertChromosome'
import { fromRegion } from './regions'
import { min } from "d3-array";

// // function to generate cross scale narrations for a provided region.
// async function calculateCrossScaleNarration(selected, csnMethod='sum', layers, variantLayers=[]) {
//   const fetchData = Data({debug: false}).fetchData;
  
//   let orders = Array.from({length: 11}, (a, i) => i + 4);

//   // use standard way of getting the hilbert range for this region
//   // sometimes selected region is a gene so it is bigger or smaller than a region
//   // this will convert it to a hilbert region
//   selected = fromRegion(selected)

//   // get hilbert ranges for the selected genomic region
//   const getRange = (selected, order) => {
//     const hilbert = HilbertChromosome(order)
//     const chrm = selected.chromosome
//     const start = selected.regionStart
//     const stop = selected.regionEnd //start + 4 ** (14 - selected.order)
//     let range = hilbert.fromRegion(chrm, start, stop-1)
//     return range
//   }

//   // path based approach where the each suggested segment is within the one an order below it
//   if(selected) {
//     // determine which layers are OCC
//     const occMask = layers.map(d => d.datasetName.includes('occ'))
//     // track the orders we collect layer data from
//     let maxOrderHit = Math.min(...orders)
//     // get the top field within each layer for all overlapping segments
//     // console.log("RETRIEVE DATA")
//     let topFieldsAllLayers = Promise.all(layers.map((layer, i) => {
//       // ... find the top field within each segment for each layer
//       let topFieldsAllOrders = Promise.all(orders.map((order) => {
//         // if the layer includes current order
//         if((layer.orders[0] <= order) && (layer.orders[1] >= order)) {
//           // update ordersHit with orders we collect layer data from
//           maxOrderHit = Math.max(maxOrderHit, order)
//           // get hilbert ranges
//           const orderRange = getRange(selected, order)
//           // fetch data for collected hilbert segments
//           return fetchData(layer, order, orderRange)
//             .then((response) => {
//               // top field per segment
//               const topFields = response.map(d => {
//                 let topField = layer.fieldChoice(d)
//                 // store layer as integer
//                 d.layer = i
//                 d.topField = topField
//                 return d
//               })
//               return topFields
//             })
//             .catch((error) => {
//               console.error(`Error fetching CSN data: ${error}`);
//               return null
//             })
//         } else {
//           return Promise.resolve(null)
//         }
//       }))
//       return topFieldsAllOrders.then((response) => {
//         // flatten for easy lookup in following steps
//         return response.filter(d => d !== null).flat()
//       })
//     }))

//     // collect variant data for selected range
//     // console.log("COLLECT VARIANT DATA")
//     let variantTopFields = Promise.all(variantLayers.map((layer, i) => {
//       // get range
//       const order = 14
//       const orderRange = getRange(selected, order)
//       return fetchData(layer, order, orderRange)
//         .then((response) => {
//           // top field per segment
          
//           const topFields = response.map(d => {
//             let topField = layer.fieldChoice(d)
//             topField.color = layer.fieldColor(topField.field)
//             // store layer as integer
//             d.layer = layer
//             d.topField = topField
//             return d
//           })
//           return topFields
//         })
//         .catch((error) => {
//           console.error(`Error fetching variant data: ${error}`);
//           return null
//         })
//     }))

//     // find the best score for each segment across layers
//     // console.log("BEST SCORE FOR EACH SEGMENT ACROSS LAYERS")
//     let topFieldsAcrossLayers = topFieldsAllLayers.then((layerData) => {
//       topFieldsAllLayers = undefined
//       // the most segments in any layer
//       let numSegments = Math.max(...layerData.map(d => d.length))
//       let topFieldsAcrossLayers = new Array(numSegments).fill(null)
//       // ENR layers
//       const enrLayerData = layerData.filter((d, i) => !occMask[i])
//       const occLayerData = layerData.filter((d, i) => occMask[i])
//       console.log(layerData, enrLayerData, occLayerData, selected)
//       layerData = undefined
//       // find the layer with the max score for each segment
//       for(let i = 0; i < numSegments; i++) {
//         let topLayerForSegment = enrLayerData.map(d => d[i]).sort((a,b) => {return b.topField.value - a.topField.value})[0]
//         // if no ENR data, find OCC data
//         if(!topLayerForSegment?.topField?.value > 0) {
//           topLayerForSegment = occLayerData.map(d => d[i]).sort((a,b) => {return b.topField.value - a.topField.value})[0]
//         }
//         // console.log('TOP LAYER FOR SEGMENT', topLayerForSegment)
//         // replace integer with layer info
//         topLayerForSegment.layer = layers[topLayerForSegment.layer]
//         topFieldsAcrossLayers[i] = topLayerForSegment
//       }
//       return topFieldsAcrossLayers
//     })

//     let leafIndexOffset
//     let bestPaths = topFieldsAcrossLayers.then((response) => {
//       // from order of selected segment to 14...
//       let ordersUp = orders.slice(selected.order - Math.min(...orders))
//       let orderUpSegmentData = response.filter(d => ordersUp.includes(d.order))
//       let orderDownSegmentData = response.filter(d => !ordersUp.includes(d.order))

//       // create tree for orderUp data
//       // console.log("BUIDLING TREE")
//       let numSegments = orderUpSegmentData.length
//       let tree = new Array(numSegments).fill(null).map(d => [])
//       let scoresThroughNode = new Array(numSegments).fill(0)
//       // store scores through each path/leaf
//       let numLeaves = 4 ** (maxOrderHit - Math.min(...ordersUp))
//       for(let c = 1; c < numSegments; c++) {
//         let p = Math.floor((c - 1) / 4)
//         tree[p].push(c)
//         tree[c].push(p)
//       }

//       // function to sum through nodes and collect score at leaves
//       let sumTree = (scoresThroughNode) => {
//         tree.forEach((nodes, i) => {
//           let nodeValue = orderUpSegmentData[i].topField.value
//           if(csnMethod === 'sum') scoresThroughNode[i] += nodeValue
//           else if(csnMethod === 'normalizedSum') scoresThroughNode[i] += Math.sqrt(nodeValue)
//           else if(csnMethod === 'max') scoresThroughNode[i] = Math.max(scoresThroughNode[i], nodeValue)
//           // scoresThroughNode[i] += nodeValue
//           let children = nodes.slice(-4)
//           if (children.length == 4) {children.forEach(c => scoresThroughNode[c] += scoresThroughNode[i])}
//         })
//         return scoresThroughNode
//       }
//       // console.log("SCORE TREE")
//       scoresThroughNode = sumTree(scoresThroughNode)

//       // sort paths
//       // console.log("SORT PATHS")
//       leafIndexOffset = numSegments - numLeaves
//       let leafScores = scoresThroughNode.slice(-numLeaves).map((s, i) => ({score: s, i: i + leafIndexOffset}))
//       let leafScoresSorted = leafScores.sort((a, b) => b.score - a.score)

//       // collect the features for each leaf path
//       let refactorFeature = (d) => {
//         let field = d.topField
//         // only keep stations with significant scores
//         if(field.value !== null) {
//           field.color = d.layer.fieldColor(field.field)
//           return { 
//             region: d, order: d.order, layer: d.layer, field: field,
//           }
//         } else return null
//       }
//       // refactor orders below selected and add to each path
//       // console.log("REFACTOR")
//       let topLeafPaths = new Array(leafScoresSorted.length).fill(null).map(d => {return {'path': [...orderDownSegmentData.map(d => refactorFeature(d))]}})
//       // function to move through the tree and collect features for each segment
//       let collectFeatures = (node, i) => {
//         let nodeFeature = orderUpSegmentData[node]
//         topLeafPaths[i].path.push(refactorFeature(nodeFeature))
//         if(node != 0) {
//           let parent = tree[node][0]
//           collectFeatures(parent, i)
//         }
//       }
//       leafScoresSorted.forEach((d, i) => {
//         topLeafPaths[i]['score'] = d.score
//         topLeafPaths[i]['node'] = d.i
//         collectFeatures(d.i, i)
//       })
//       return {'paths': topLeafPaths, 'tree': tree}
//     })

//     // find the resolution of the paths
//     let pathRes = 4 ** (14 - maxOrderHit)
//     // attach variant data to paths
//     // console.log("ATTACH VARIANT DATA TO PATHS")
//     let bestPathsWithVariants = Promise.all([bestPaths, variantTopFields]).then(([bestPathsResponse, variantTopFieldsResponse]) => {
//       if(variantTopFieldsResponse.length > 0) {
//         // only keep variants that are not null (we may want to do this earlier/when we combine variant layers)
//         const variantsFiltered = variantTopFieldsResponse.flatMap(d => d).filter(d => d.topField.value !== null && d.topField.value !== 0)
//         const pathMaping = new Map(bestPathsResponse.paths.map(path => [path.node, path]));
//         variantsFiltered.forEach(d => {
//           // find path/node it belongs to
//           let node = Math.floor((d.start - selected.start) / pathRes) + leafIndexOffset
//           let path = pathMaping.get(node)
//           if(path) path.variants ? path.variants.push(d) : path.variants = [d]
//         })
//       }
//       console.log('VARIANT MAP DONE!!!', bestPathsResponse)
//       return bestPathsResponse
//     })
//     return bestPathsWithVariants
//   }
// }

// function to generate cross scale narrations for a provided region.
async function calculateCrossScaleNarration(selected, csnMethod='sum', layers, variantLayers=[]) {
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
    // determine which layers are OCC
    const occMask = layers.map(d => d.datasetName.includes('occ'))
    const layerNames = layers.map(d => d.name)
    // create a mapping between enr and occ layers
    const enrInds = occMask.map((v, i) => !v ? i : -1).filter(i => i !== -1)
    let enrOccMapping = {}
    enrInds.forEach((i) => {
      const baseName = layerNames[i].replace(' (ENR)', '')
      const occInd = layerNames.findIndex(d => d.includes(baseName) && d.includes('OCC'))
      enrOccMapping[i] = occInd
    })

    // track the orders we collect layer data from
    let maxOrderHit = Math.min(...orders)
    let minOrderHit = Math.max(...orders)
    let selectedOrder = selected.order
    // get the top field within each layer for all overlapping segments
    // console.log("RETRIEVE DATA")
    let topFieldsAllLayers = Promise.all(layers.map((layer, i) => {
      // ... find the top field within each segment for each layer
      let topFieldsAllOrders = Promise.all(orders.map((order) => {
        // if the layer includes current order
        if((layer.orders[0] <= order) && (layer.orders[1] >= order)) {
          // update ordersHit with orders we collect layer data from
          maxOrderHit = Math.max(maxOrderHit, order)
          minOrderHit = Math.min(minOrderHit, order)
          // get hilbert ranges
          const orderRange = getRange(selected, order)
          // fetch data for collected hilbert segments
          return fetchData(layer, order, orderRange)
            .then((response) => {
              // top field per segment
              const topFields = response.map(d => {
                let topField = layer.fieldChoice(d)
                // store layer as integer
                d.layerInd = i
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

    // collect variant data for selected range
    // console.log("COLLECT VARIANT DATA")
    let variantTopFields = Promise.all(variantLayers.map((layer, i) => {
      // get range
      const order = 14
      const orderRange = getRange(selected, order)
      return fetchData(layer, order, orderRange)
        .then((response) => {
          // top field per segment
          
          const topFields = response.map(d => {
            let topField = layer.fieldChoice(d)
            topField.color = layer.fieldColor(topField.field)
            d.layer = layer
            d.topField = topField
            return d
          })
          return topFields
        })
        .catch((error) => {
          console.error(`Error fetching variant data: ${error}`);
          return null
        })
    }))

    // find the best score for each segment across layers
    // console.log("BEST SCORE FOR EACH SEGMENT ACROSS LAYERS")
    let dataTree
    let topFieldsAcrossLayers = topFieldsAllLayers.then((layerData) => {
      topFieldsAllLayers = undefined

      // build tree
      let numNodes = 0
      for(let o = minOrderHit; o <= maxOrderHit; o++) {numNodes += 4 ** Math.max(0, (o - selectedOrder))}
      dataTree = new Array(numNodes).fill(null).map(d => ({'children': [], 'parent': null, data: null}))
      // fill tree
      let p
      let minSelectedDiff = selectedOrder - minOrderHit
      for(let c = 1; c < numNodes; c++) {
        // c < minSelectedDiff ? p = c - 1 : p = Math.floor((c - 1) / 4) + minSelectedDiff - 1
        c <= minSelectedDiff ? p = c - 1 : p = Math.floor((c - minSelectedDiff - 1) / 4) + minSelectedDiff
        dataTree[p].children.push(c)
        dataTree[c].parent = p
      }

      // the most segments in any layer
      let numSegments = Math.max(...layerData.map(d => d.length))
      // ENR layers
      const enrLayerData = layerData.filter((d, i) => !occMask[i])

      // function to find upstream ENR data for a segment
      const findPathENRData = (node, factorTracker) => {
        // find parent data
        let parentData = dataTree[dataTree[node].parent].data
        // if ENR data, add to tracker
        if((enrInds.includes(parentData?.layerInd)) && (parentData?.topField?.value > 0)) {
          factorTracker.push({
            score: parentData.data.max_value,
            factor: parentData.data.max_field,
            layer: parentData.layerInd
          })
        }
        // move up the tree
        node = dataTree[node].parent
        // if new node has parent, collect information
        if(dataTree[node].parent !== null) {
          findPathENRData(node, factorTracker)
        }
        return factorTracker
      }

      // find the layer with the max score for each segment
      console.log("DATATREE", dataTree)
      for(let i = 0; i < numSegments; i++) {
        // first look for ENR data
        let topLayerForSegment = enrLayerData.map(d => d[i]).sort((a,b) => {return b.topField.value - a.topField.value})[0]
        // if no ENR data, find OCC data
        if(!topLayerForSegment?.topField?.value > 0) {
          // move up tree and find what is special about this path in ENR
          const factorTracker = findPathENRData(i, [])
          // const enrTracter = allTrackers.tracker


          // // find the layer with the max score across path
          // const layerSortOrder = enrTracter.map((v, i) => ({v, i})).sort((a,b) => {return b.v - a.v})
          // // data for segment across orders
          // const segmentData = layerData.map(d => d[i])
          // // sort layers in segment data
          // const segmentDataSorted = layerSortOrder.map(d => segmentData[enrOccMapping[d.i]])
          // // take the top layer if it has non-zero value
          // topLayerForSegment = segmentDataSorted.filter(d => d?.topField?.value > 0)[0]
          // if(!topLayerForSegment) topLayerForSegment = segmentDataSorted[0]
          

          // factor version
          const enrFactorTracker = factorTracker
          enrFactorTracker.sort((a,b) => {return b.score - a.score})
          // data for segment across orders
          const segmentData = layerData.map(d => d[i])
          
          // find the first ENR factor (sorted by score) with nonzero OCC scores
          let hasUsed = new Set();
          for(let e = 0; e < enrFactorTracker.length; e++) {
            let enr = enrFactorTracker[e]
            let key = `${enr.layer},${enr.factor}`;
            if(!hasUsed.has(key)) {
              hasUsed.add(key)
              let occSegmentData = segmentData[enrOccMapping[enr.layer]]
              if((occSegmentData?.data?.max_value > 0) && (occSegmentData?.data?.max_field === enr.factor)) {
                topLayerForSegment = occSegmentData
                // setting OCC scores to a constant low value for now
                topLayerForSegment.topField.value = 0.01
                break
              }
            }
          }
          // break // delete
          // if(!topLayerForSegment) {
          //   topLayerForSegment = segmentData[0]
          //   console.log('NO OCC DATA', i, topLayerForSegment, segmentData, occMask)
          // }
          
        }
        // add full layer info
        // console.log(topLayerForSegment, i, numSegments)
        
        if(topLayerForSegment) {
          topLayerForSegment.layer = layers[topLayerForSegment.layerInd]
          dataTree[i].data = topLayerForSegment
        }
      }
      return {dataTree: dataTree, topFieldsAcrossLayers: dataTree.map(d => d.data)}
    })

    let leafIndexOffset
    let bestPaths = topFieldsAcrossLayers.then((response) => {
      // // from order of selected segment to 14...
      // let ordersUp = orders.slice(selected.order - Math.min(...orders))
      // let orderUpSegmentData = response.topFieldsAcrossLayers.filter(d => ordersUp.includes(d.order))

      // // create tree for orderUp data
      // // console.log("BUIDLING TREE")
      // let nSegments = orderUpSegmentData.length
      // let tree = new Array(nSegments).fill(null).map(d => [])
      // for(let c = 1; c < nSegments; c++) {
      //   let p = Math.floor((c - 1) / 4)
      //   tree[p].push(c)
      //   tree[c].push(p)
      // }

      // parse tree and build each path
      let dataTree = response.dataTree
      let numLeaves = 4 ** (maxOrderHit - selectedOrder)
      let numSegments = dataTree.length
      leafIndexOffset = numSegments - numLeaves
      let nodeScores = new Array(numSegments).fill(0)
      // function to sum through nodes and collect score at leaves
      let sumThroughTree = (nodeScores) => {
        dataTree.forEach((d, i) => {
          let nodeValue = d.data?.topField?.value
          nodeValue ? nodeValue : 0
          if(csnMethod === 'sum') nodeScores[i] += nodeValue
          else if(csnMethod === 'normalizedSum') nodeScores[i] += Math.sqrt(nodeValue)
          else if(csnMethod === 'max') nodeScores[i] = Math.max(nodeScores[i], nodeValue)
          let children = d.children
          children.forEach(c => nodeScores[c] += nodeScores[i])
        })
        return nodeScores
      }
      nodeScores = sumThroughTree(nodeScores)
      
      // sort paths
      let leafScores = nodeScores.slice(-numLeaves).map((s, i) => ({score: s, i: i + leafIndexOffset}))
      let leafScoresSorted = leafScores.sort((a, b) => b.score - a.score)

      // collect the features for each leaf path
      let refactorFeature = (d) => {
        let field = d?.topField
        // only keep stations with significant scores
        if(field && field?.value !== null) {
          field.color = d.layer.fieldColor(field.field)
          return { 
            region: d, order: d.order, layer: d.layer, field: field,
          }
        } else return null
      }

      // initialize path data
      let topLeafPaths = new Array(leafScoresSorted.length).fill(null).map(d => {return {'path': []}})
      // function to move through the tree and collect features for each segment
      let collectFeatures = (node, i) => {
        let treeDataNode = dataTree[node]
        let nodeFeature = treeDataNode.data
        topLeafPaths[i].path.push(refactorFeature(nodeFeature))
        if(treeDataNode.parent !== null) {
          collectFeatures(treeDataNode.parent, i)
        }
      }
      leafScoresSorted.forEach((d, i) => {
        topLeafPaths[i]['score'] = d.score
        topLeafPaths[i]['node'] = d.i
        collectFeatures(d.i, i)
      })

      // adjust tree to only include selected segment and below
      let orderOffset = selectedOrder - minOrderHit
      let returnTree = dataTree.slice(orderOffset).map(d => {
        let adjustedParent = d.parent - orderOffset
        let adjustedChildren = d.children.map(c => c - orderOffset)
        let adjustedNode
        (adjustedParent >= 0) ? adjustedNode = [adjustedParent, ...adjustedChildren] : adjustedNode = adjustedChildren
        return adjustedNode
      })
      // adjust path nodes to match new tree
      topLeafPaths.forEach((d) => {
        d.node -= orderOffset
      })
      // console.log(Math.max(...topLeafPaths.map(d => d.node)), Math.min(...topLeafPaths.map(d => d.node)))
      // console.log('RETURN TREE', returnTree, dataTree.slice(orderOffset), dataTree)

      return {'paths': topLeafPaths, 'tree': returnTree}
    })

    // find the resolution of the paths
    let pathRes = 4 ** (14 - maxOrderHit)
    // attach variant data to paths
    // console.log("ATTACH VARIANT DATA TO PATHS")
    let bestPathsWithVariants = Promise.all([bestPaths, variantTopFields]).then(([bestPathsResponse, variantTopFieldsResponse]) => {
      // console.log('VARIANT MAP START')
      if(variantTopFieldsResponse.length > 0) {
        // console.log("WE HAVE VARIANTS")
        // only keep variants that are not null (we may want to do this earlier/when we combine variant layers)
        const variantsFiltered = variantTopFieldsResponse.flatMap(d => d).filter(d => d.topField.value !== null && d.topField.value !== 0)
        const pathMaping = new Map(bestPathsResponse.paths.map(path => [path.node, path]));
        variantsFiltered.forEach(d => {
          // console.log('VARIANT', d)
          // find path/node it belongs to
          let node = Math.floor((d.start - selected.start) / pathRes) + leafIndexOffset
          let path = pathMaping.get(node)
          if(path) path.variants ? path.variants.push(d) : path.variants = [d]
        })
      }
      console.log('VARIANT MAP DONE!!!', bestPathsResponse)
      return bestPathsResponse
    })
    return bestPathsWithVariants
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


// logic to determine which variant is the most important from a list of variants
export function variantChooser(variants) {
  let categories = variants.filter(d => d.layer.datasetName == "variants_favor_categorical")
  if(categories.length) return categories.sort((a,b) => b.topField.value - a.topField.value)[0]
  let gwas = variants.filter(d => d.layer.datasetName == "variants_gwas")
  if(gwas.length) return gwas.sort((a,b) => b.topField.value - a.topField.value)[0]
  let apc = variants.filter(d => d.layer.datasetName == "variants_favor_apc")
  if(apc.length) return apc.sort((a,b) => b.topField.value - a.topField.value)[0]
  return null
}