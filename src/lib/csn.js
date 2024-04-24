import axios from "axios";
import Data from './data';
import { HilbertChromosome, } from './HilbertChromosome'
import { fromRegion } from './regions'
import { min } from "d3-array";
import { ConsoleLogger } from "@duckdb/duckdb-wasm";

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

  // determine which layers are OCC
  const occMask = layers.map(d => d.datasetName.includes('occ'))
  const layerNames = layers.map(d => d.name)
  // create a mapping between enr and occ layers
  const enrInds = occMask.map((v, i) => !v ? i : -1).filter(i => i !== -1)
  let enrOccMapping = {}
  enrInds.forEach((i) => {
    const baseName = layerNames[i].replace(' (ENR)', '').replace(' (ENR, Full)', '')
    const occInd = layerNames.findIndex(d => d.includes(baseName) && d.includes('OCC'))
    enrOccMapping[i] = occInd
  })

  // if a region is selected, find the possible paths for each region
  if(selected) {
    // track the orders we collect layer data from
    let maxOrderHit = 14
    let minOrderHit = 4
    let selectedOrder = selected.order

    // build tree to collect and track data
    // first, find number of nodes we have
    let numNodes = 0
    for(let o = minOrderHit; o <= maxOrderHit; o++) {numNodes += 4 ** Math.max(0, (o - selectedOrder))}
    
    // initialize tree
    let dataTree = new Array(numNodes).fill(null).map(d => ({'children': [], 'parent': null, data: {}, variants: {}, order: null}))
    
    // fill tree with parents, children, and order
    let minSelectedDiff = selectedOrder - minOrderHit
    let o = minOrderHit
    let numForOrder = Math.max(1, 4 ** (o - selectedOrder))
    let orderCount = 0
    for(let c = 0; c < numNodes; c++) {
      if(c > 0){
        let p = c <= minSelectedDiff ? c - 1 : Math.floor((c - minSelectedDiff - 1) / 4) + minSelectedDiff
        dataTree[p].children.push(c)
        dataTree[c].parent = p
      }
      // set order
      if(orderCount === numForOrder) {
        o++
        numForOrder = Math.max(1, 4 ** (o - selectedOrder))
        orderCount = 0
      }
      dataTree[c].order = o
      orderCount++
    }

    // collect data for each segment across layers and orders and 
    // find the max field for each layer x order combination
    let topFieldsAllLayers = Promise.all(layers.map((layer, l) => {
      let topFieldsAllOrders = Promise.all(orders.map((order) => {
        // if the layer includes current order
        if((layer.orders[0] <= order) && (layer.orders[1] >= order)) {
          // get hilbert ranges
          const orderRange = getRange(selected, order)
          // fetch data for hilbert segments
          return fetchData(layer, order, orderRange)
            .then((response) => {
              // let loadDataTime = Date.now()
              // top field per segment
              const topFields = response.map(d => {
                let topField = layer.fieldChoice(d)
                // store layer as integer
                d.layerInd = l
                d.topField = topField
                return d
              })
              // add data to tree
              // we need to set a subset of the dataTree
              let i = 0
              dataTree.forEach((d) => {
                if (d.order == order) {
                  if(topFields[i].topField.value > 0) d.data[l] = topFields[i]
                  i++
                }
              })
              // console.log(Date.now() - loadDataTime, "ms to load data", layer.name, order)
              Promise.resolve(null)
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
        return Promise.resolve(null)
      })
    }))

    // also collect variant data for selected range at order 14
    let variantTopFields = Promise.all(variantLayers.map((layer, l) => {
      // get range
      const order = 14
      const orderRange = getRange(selected, order)
      return fetchData(layer, order, orderRange)
        .then((response) => {
          // let variantLoadDataTime = Date.now()
          // top field per segment
          const topFields = response.map(d => {
            let topField = layer.fieldChoice(d)
            topField.color = layer.fieldColor(topField.field)
            d.layer = layer
            d.topField = topField
            return d
          })
          // add data to tree
          // we need to set a subset of the dataTree
          let i = 0
          dataTree.forEach((d) => {
            if (d.order == order) {
              if(topFields[i].topField.value > 0) d.variants[l] = topFields[i]
              i++
            }
          })
          // console.log(Date.now() - variantLoadDataTime, "ms to load variant data", layer.name, order)
          return Promise.resolve(null)
        })
        .catch((error) => {
          console.error(`Error fetching variant data: ${error}`);
          return null
        })
    }))


    // function to find upstream ENR data for a segment
    const findENRData = (nodeData) => {
      // find enr data
      let enrData = enrInds.map(d => nodeData[d])
      // for each ENR layer in node, find the factors that are enriched and add to tracker
      let tracker = {}
      enrData.forEach(d => {
        // if topField value exists, we are dealing with max data and not full data
        if(d?.topField?.value > 0) {
          let layerInd = d.layerInd
          if(d?.data?.max_field >= 0) {
            let key = `${layerInd},${d.data.max_field}`
            tracker[key] = Math.max(tracker[key] || 0, d.data.max_value)
          } else {  // full data
            // filter byte array for nonzero values and add to tracker
            [...d.bytes].forEach((value, index) => {
              if (value > 0) {
                let key = `${layerInd},${index}`
                tracker[key] = Math.max(tracker[key] || 0, value)
              }
            })
          }
        }
      })
      return tracker
    }


    // track the ENR factors for each node in upstream segments
    let trackerPromise = topFieldsAllLayers.then(() => {
      dataTree.forEach((d, i) => {
        if(d.parent !== null && dataTree[d.parent].enrTracker) {
          let parentTracker = dataTree[d.parent].enrTracker
          let tracker = findENRData(d.data)
          let consensusTracker = {...parentTracker}
          Object.keys(tracker).forEach(key => {
            consensusTracker[key] = Math.max(consensusTracker[key] || 0, tracker[key])
          })
          d['enrTracker'] = consensusTracker
        } else {
          let tracker = findENRData(d.data)
          d['enrTracker'] = tracker
        }
        d['usedOCC'] = {}
      })
      return Promise.resolve(null)
    })

    // function to move down the tree and set the used OCC for each node in a path
    const setUsedOCC = (node, i, layer, factor) => {
      // set used OCC
      node.usedOCC[`${layer},${factor}`] = i
      // find children and recrusively set used OCC
      let children = node.children
      children.forEach(c => {
        setUsedOCC(dataTree[c], i, layer, factor)
      })
      return
    }

    // find the best score for each segment across layers
    // first search for ENR scores. If they do not exist for a segment, 
    // look for OCC factors that match upstream ENR factors
    let topFieldsAcrossLayersTime = Date.now()
    let topFieldsAcrossLayers = trackerPromise.then(() => {
      console.log("Time to load all data", Date.now() - topFieldsAcrossLayersTime, "ms")

      // find the layer with the max score for each segment
      // first look for ENR, then OCC
      let totalScoreTime = Date.now()
      let totalTrackerTime = 0
      let forLoopTime = 0
      let totalSortTime = 0
      for(let i = 0; i < numNodes; i++) {
        // get node from dataTree
        let node = dataTree[i]
        let nodeData = node.data
        // first look for ENR data
        let topLayerForSegment = enrInds.map(d => nodeData[d]).sort((a,b) => {return b.topField.value - a.topField.value})[0]
        
        // if no ENR data, find OCC data
        if(!topLayerForSegment?.topField?.value > 0) {
          // move up tree and find ENR factors in this path and sort by score
          let trackerTime = window.performance.now()
          // const enrTracker = findPathENRData(i, [])
          let nodeENRTracker = node.enrTracker
          const enrTracker = Object.keys(nodeENRTracker).map(k => {
            let layerFactor = k.split(',')
            let score = nodeENRTracker[k]
            return {layer: parseInt(layerFactor[0]), factor: parseInt(layerFactor[1]), score: score}
          })//.sort((a,b) => b.score - a.score)
          totalTrackerTime += window.performance.now() - trackerTime

          let sortTime = window.performance.now()
          enrTracker.sort((a,b) => b.score - a.score)
          totalSortTime += window.performance.now() - sortTime

          // find the first ENR factor (sorted by score) with nonzero OCC scores
          let forTime = window.performance.now()
          // console.log(node, enrTracker)
          for(let e = 0; e < enrTracker.length; e++) {
            let enr = enrTracker[e]
            // if this OCC layer x factor has not been used in this path
            if(!(`${enr.layer},${enr.factor}` in node.usedOCC)) {
              // matching OCC layer for ENR layer
              let occSegmentData = nodeData[enrOccMapping[enr.layer]]
              // is the factor the same?
              if((occSegmentData?.data?.max_value > 0) && (occSegmentData?.data?.max_field === enr.factor)) {
                topLayerForSegment = occSegmentData
                // setting OCC scores to a constant low value for now
                topLayerForSegment.topField.value = 0.01
                // go through self and children and set used OCC to include this factor
                setUsedOCC(node, i, enr.layer, enr.factor)
                break
              }
            }
          }
          // console.log("Time to find OCC data", Date.now() - forTime, "ms", i)
          forLoopTime += window.performance.now() - forTime
        }
        if(topLayerForSegment) {
          // get full layer information
          topLayerForSegment.layer = layers[topLayerForSegment.layerInd]
          // our best layer x factor for segment
          dataTree[i].data['chosen'] = topLayerForSegment
        }
      }
      console.log("Time to find total scores", Date.now() - totalScoreTime, "ms")
      console.log("Time to find total tracker", totalTrackerTime, "ms")
      console.log("Time to find total for loop", forLoopTime, "ms")
      console.log("Time to find total tracker sort", totalSortTime, "ms")
      return Promise.resolve(null)
    })
    // console.log("DATATREE", dataTree)

    // get the paths for each leaf of tree
    let bestPaths = Promise.all([topFieldsAcrossLayers, variantTopFields]).then(() => {
      let bestPathTime = window.performance.now()

      // parse tree and build each path
      let numLeaves = 4 ** (maxOrderHit - selectedOrder)
      let numSegments = dataTree.length
      let leafIndexOffset = numSegments - numLeaves
      let nodeScores = new Array(numSegments).fill(0)

      // function to sum through nodes and collect score at leaves
      let sumThroughTree = (nodeScores) => {
        dataTree.forEach((d, i) => {
          // if nan, set to 0
          let nodeValue = d.data?.chosen?.topField?.value || 0
          if(csnMethod === 'sum') nodeScores[i] += nodeValue
          else if(csnMethod === 'normalizedSum') nodeScores[i] += Math.sqrt(nodeValue)
          else if(csnMethod === 'max') nodeScores[i] = Math.max(nodeScores[i], nodeValue)
          let children = d.children
          children.forEach(c => nodeScores[c] += nodeScores[i])
        })
        return nodeScores
      }
      // score each path
      nodeScores = sumThroughTree(nodeScores)
      
      // sort paths
      let leafScores = nodeScores.slice(-numLeaves).map((s, i) => ({score: s, i: i + leafIndexOffset}))
      let leafScoresSorted = leafScores.sort((a, b) => b.score - a.score)

      // function to refactor features for a given node
      let refactorTopFeature = (d) => {
        let field = d?.topField
        // only keep stations with significant scores
        if(field && field?.value !== null) {
          field.color = d.layer.fieldColor(field.field)
          return { 
            region: d, order: d.order, layer: d.layer, field: field,
          }
        } else return null
      }

      let refactorAllFeatures = (d) => {
        let keys = Object.keys(d).filter(k => k !== 'chosen')
        // find all non-zero features for a given node across all layers
        let segmentOrder = d[keys[0]]?.order
        if(!segmentOrder) return {order: null, features: {}}
        let allFeatures = {order: segmentOrder, features: {}}
        // for each layer...
        keys.forEach(layerInd => {
          let layerInfo = d[layerInd]
          // save the nonzero data for each layer
          if(layerInfo.data.max_value > 0) {  // if max data and not 0
            let key = `${layerInd},${layerInfo.data.max_field}`
            let value = layerInfo.data.max_value
            allFeatures.features[key] = value
          } else if(!layerInfo.data.max_value) {  // full data
            // filter byte array for nonzero values and add to tracker
            [...layerInfo.bytes].forEach((value, index) => {
              if (value > 0) {
                let key = `${layerInd},${index}`
                allFeatures.features[key] = value
              }
            })
          }
        })
        return allFeatures
      }

      // initialize path data
      let topLeafPaths = new Array(leafScoresSorted.length).fill(null).map(d => {
        let p = []
        p.fullData = {}
        return {'path': p}
      })

      // function to move through the tree and collect top features for each segment
      let collectFeatures = (node, i) => {
        let treeDataNode = dataTree[node]
        let nodeAllFeatures = treeDataNode.data
        const fullData = refactorAllFeatures(nodeAllFeatures)
        // console.log("features", node, i, nodeAllFeatures, fullData)
        // topLeafPaths[i].path.fullData[fullData.order] = fullData.features
        let nodeChosenFeature = nodeAllFeatures.chosen
        const refactor = refactorTopFeature(nodeChosenFeature)
        if(refactor)
          refactor.fullData = fullData.features
        topLeafPaths[i].path.push(refactor)
        // add variants
        if(treeDataNode.variants) {
          let variants = Object.values(treeDataNode.variants).filter(d => d.topField.value !== null && d.topField.value !== 0)
          if(variants.length > 0) {
            topLeafPaths[i]['variants'] ? topLeafPaths[i]['variants'].push(...variants) : topLeafPaths[i]['variants'] = variants
          }
        }
        if(treeDataNode.parent !== null) {
          collectFeatures(treeDataNode.parent, i)
        }
      }

      // collect features for each path
      leafScoresSorted.forEach((d, i) => {
        topLeafPaths[i]['score'] = d.score
        topLeafPaths[i]['node'] = d.i
        collectFeatures(d.i, i)
      })

      // adjust tree to only include selected segment and below
      let returnTree = dataTree.slice(minSelectedDiff).map(d => {
        let adjustedParent = d.parent - minSelectedDiff
        let adjustedChildren = d.children.map(c => c - minSelectedDiff)
        let adjustedNode
        (adjustedParent >= 0) ? adjustedNode = [adjustedParent, ...adjustedChildren] : adjustedNode = adjustedChildren
        return adjustedNode
      })
      // adjust path nodes to match new tree
      topLeafPaths.forEach((d) => {
        d.node -= minSelectedDiff
      })
      console.log("Time to find best paths", window.performance.now() - bestPathTime, "ms")
      return {'paths': topLeafPaths, 'tree': returnTree}
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