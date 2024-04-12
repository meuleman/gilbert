import axios from "axios";
import Data from './data';
import { HilbertChromosome, } from './HilbertChromosome'
import { fromRegion } from './regions'
import { min } from "d3-array";

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
      const baseName = layerNames[i].replace(' (ENR)', '').replace(' (ENR, Full)', '')
      const occInd = layerNames.findIndex(d => d.includes(baseName) && d.includes('OCC'))
      enrOccMapping[i] = occInd
    })

    // track the orders we collect layer data from
    // let maxOrderHit = Math.min(...orders)
    // let minOrderHit = Math.max(...orders)
    let maxOrderHit = 14
    let minOrderHit = 4
    let selectedOrder = selected.order

    // build tree to collect and track data
    let numNodes = 0
    for(let o = minOrderHit; o <= maxOrderHit; o++) {numNodes += 4 ** Math.max(0, (o - selectedOrder))}
    let dataTree = new Array(numNodes).fill(null).map(d => ({'children': [], 'parent': null, data: {}, variants: {}, order: null}))
    // fill tree
    let minSelectedDiff = selectedOrder - minOrderHit
    let p
    let o = minOrderHit
    let numForOrder = Math.max(1, 4 ** (o - selectedOrder))
    let orderCount = 0
    for(let c = 0; c < numNodes; c++) {
      if(c > 0){
        // c < minSelectedDiff ? p = c - 1 : p = Math.floor((c - 1) / 4) + minSelectedDiff - 1
        c <= minSelectedDiff ? p = c - 1 : p = Math.floor((c - minSelectedDiff - 1) / 4) + minSelectedDiff
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

    // get the top field within each layer for all overlapping segments
    let topFieldsAllLayers = Promise.all(layers.map((layer, l) => {
      // ... find the top field within each segment for each layer
      let topFieldsAllOrders = Promise.all(orders.map((order) => {
        // console.log("RETRIEVE DATA", layer, order)
        // if the layer includes current order
        if((layer.orders[0] <= order) && (layer.orders[1] >= order)) {
          // // update ordersHit with orders we collect layer data from
          // maxOrderHit = Math.max(maxOrderHit, order)
          // minOrderHit = Math.min(minOrderHit, order)
          // get hilbert ranges
          const orderRange = getRange(selected, order)
          // fetch data for collected hilbert segments
          return fetchData(layer, order, orderRange)
            .then((response) => {
              // top field per segment
              const topFields = response.map(d => {
                let topField = layer.fieldChoice(d)
                // store layer as integer
                d.layerInd = l
                d.topField = topField
                return d
              })
              // add data to tree
              let i = 0
              dataTree.forEach((d) => {
                if (d.order == order) {
                  if(topFields[i].topField.value > 0) d.data[l] = topFields[i]
                  i++
                }
              })
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
        // flatten for easy lookup in following steps
        return Promise.resolve(null)
      })
    }))
    console.log(dataTree)

    // collect variant data for selected range
    let variantTopFields = Promise.all(variantLayers.map((layer, l) => {
      console.log("COLLECT VARIANT DATA")
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
          // add data to tree
          let i = 0
          dataTree.forEach((d) => {
            if (d.order == order) {
              if(topFields[i].topField.value > 0) d.variants[l] = topFields[i]
              i++
            }
          })
          console.log("VARIANT DATA LOADED", layer)
          return Promise.resolve(null)
        })
        .catch((error) => {
          console.error(`Error fetching variant data: ${error}`);
          return null
        })
    }))

    // find the best score for each segment across layers
    let topFieldsAcrossLayers = topFieldsAllLayers.then(() => {
      console.log("BEST SCORE FOR EACH SEGMENT ACROSS LAYERS")
      // // ENR layers
      // const enrLayerData = layerData.filter((d, i) => !occMask[i])

      // function to find upstream ENR data for a segment
      const findPathENRData = (node, tracker) => {
        // find parent data
        let parentENRData = enrInds.map(d => dataTree[dataTree[node].parent].data[d])
        // console.log(parentENRData)
        parentENRData.forEach(d => {
          // if ENR data, add to tracker
          if(d?.topField?.value > 0) {
            let layerInd = d.layerInd
            if(d?.data?.max_field >= 0) {
              tracker.push({
                score: d.data.max_value,
                factor: d.data.max_field,
                layer: layerInd
              })
            }
            else {
              // full data
              // filter byte array for nonzero values and add to tracker
              [...d.bytes].forEach((value, index) => {
                if (value > 0) {
                  tracker.push({
                    score: value,
                    factor: index,
                    layer: layerInd
                  })
                }
              })
            }
          }
        })
        // move up the tree
        node = dataTree[node].parent
        // if new node has parent, collect information
        if(dataTree[node].parent !== null) {
          findPathENRData(node, tracker)
        }
        return tracker
      }

      // find the layer with the max score for each segment
      console.log("FIND THE LAYER WITH THE MAX SCORE FOR EACH SEGMENT")
      for(let i = 0; i < numNodes; i++) {
        // node
        let nodeData = dataTree[i].data
        // first look for ENR data
        let topLayerForSegment = enrInds.map(d => nodeData[d]).sort((a,b) => {return b.topField.value - a.topField.value})[0]
        // console.log(nodeData[enrInds[0]])
        // let topLayerForSegment = enrInds.reduce((max, d) => {
        //   let current = nodeData[d];
        //   return (current && (max.topField.value < current.topField.value)) ? current : max;
        // }, nodeData[enrInds[0]] );
        
        // if no ENR data, find OCC data
        if(!topLayerForSegment?.topField?.value > 0) {
          // move up tree and find what is special about this path in ENR
          const enrTracker = findPathENRData(i, [])
          enrTracker.sort((a,b) => {return b.score - a.score})
          // console.log("ENR FACTOR TRACKER", enrTracker)
          
          // find the first ENR factor (sorted by score) with nonzero OCC scores
          let hasUsed = new Set();
          // console.log("ENR TRACKER", enrTracker)
          // break
          for(let e = 0; e < enrTracker.length; e++) {
            let enr = enrTracker[e]
            let key = `${enr.layer},${enr.factor}`;
            if(!hasUsed.has(key)) {
              hasUsed.add(key)
              let occSegmentData = nodeData[enrOccMapping[enr.layer]]
              if((occSegmentData?.data?.max_value > 0) && (occSegmentData?.data?.max_field === enr.factor)) {
                topLayerForSegment = occSegmentData
                // setting OCC scores to a constant low value for now
                topLayerForSegment.topField.value = 0.01
                break
              }
            }
          }
        }
        if(topLayerForSegment) {
          topLayerForSegment.layer = layers[topLayerForSegment.layerInd]
          dataTree[i].data['chosen'] = topLayerForSegment
        }
      }
      console.log("MAX SCORE FOR EACH SEGMENT DONE")
      return Promise.resolve(null)
    })
    console.log("DATATREE", dataTree)

    let leafIndexOffset
    // let bestPaths = topFieldsAcrossLayers.then((response) => {
    let bestPaths = Promise.all([topFieldsAcrossLayers, variantTopFields]).then(() => {
      console.log("FIND THE BEST PATHS")

      // parse tree and build each path
      let numLeaves = 4 ** (maxOrderHit - selectedOrder)
      let numSegments = dataTree.length
      leafIndexOffset = numSegments - numLeaves
      let nodeScores = new Array(numSegments).fill(0)
      // function to sum through nodes and collect score at leaves
      let sumThroughTree = (nodeScores) => {
        dataTree.forEach((d, i) => {
          let nodeValue = d.data?.chosen?.topField?.value
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
        let nodeFeature = treeDataNode.data.chosen
        topLeafPaths[i].path.push(refactorFeature(nodeFeature))
        // add variants
        if(treeDataNode.variants) {
          let variants = Object.values(treeDataNode.variants).filter(d => d.topField.value !== null && d.topField.value !== 0)
          // let pathVariants = 
          if(variants.length > 0) {
            topLeafPaths[i]['variants'] ? topLeafPaths[i]['variants'].push(...variants) : topLeafPaths[i]['variants'] = variants
          }
        }
        if(treeDataNode.parent !== null) {
          collectFeatures(treeDataNode.parent, i)
        }
      }
      // leafScoresSorted.forEach((d, i) => {
      leafScoresSorted.forEach((d, i) => {
        topLeafPaths[i]['score'] = d.score
        topLeafPaths[i]['node'] = d.i
        collectFeatures(d.i, i)
      })
      console.log("TOP LEAF PATHS", topLeafPaths) 

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
      // console.log(Math.max(...topLeafPaths.map(d => d.node)), Math.min(...topLeafPaths.map(d => d.node)))
      // console.log('RETURN TREE', returnTree, dataTree.slice(minSelectedDiff), dataTree)

      return {'paths': topLeafPaths, 'tree': returnTree}
    })
    console.log("BEST PATHS", bestPaths)
    return bestPaths

    // find the resolution of the paths
    // let pathRes = 4 ** (14 - maxOrderHit)
    // attach variant data to paths
    // console.log("ATTACH VARIANT DATA TO PATHS")
    // let bestPathsWithVariants = Promise.all([bestPaths, variantTopFields]).then(([bestPathsResponse, variantTopFieldsResponse]) => {
      // console.log("VARIANTS", dataTree.map(d => d.variants).filter(d => Object.keys(d).length > 0))
      // console.log('VARIANT MAP START')
      // if(variantTopFieldsResponse.length > 0) {
      //   // console.log("WE HAVE VARIANTS")
      //   // only keep variants that are not null (we may want to do this earlier/when we combine variant layers)
      //   const variantsFiltered = variantTopFieldsResponse.flatMap(d => d).filter(d => d.topField.value !== null && d.topField.value !== 0)
      //   const pathMaping = new Map(bestPathsResponse.paths.map(path => [path.node, path]));
      //   variantsFiltered.forEach(d => {
      //     // console.log('VARIANT', d)
      //     // find path/node it belongs to
      //     let node = Math.floor((d.start - selected.start) / pathRes) + leafIndexOffset
      //     let path = pathMaping.get(node)
      //     if(path) path.variants ? path.variants.push(d) : path.variants = [d]
      //   })
      // }
      // console.log('VARIANT MAP DONE!!!', bestPathsResponse)
      // return bestPathsResponse
    // })
    // return bestPathsWithVariants
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