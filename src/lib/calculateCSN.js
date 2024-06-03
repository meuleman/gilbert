import { HilbertChromosome, } from './HilbertChromosome'
import { fromRegion } from './regions'
import Data from './data';

// function to generate cross scale narrations for a provided region.
export default async function calculateCrossScaleNarration(selected, csnMethod='sum', layers, variantLayers=[], filters=null, minEnrScore=0) {
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
  // const layerNames = layers.map(d => d.name)
  // create a mapping between enr and occ layers
  const enrInds = occMask.map((v, i) => !v ? i : -1).filter(i => i !== -1)
  // let enrOccMapping = {}
  // let occEnrMapping = {}
  // enrInds.forEach((i) => {
    // const baseName = layerNames[i].replace(' (ENR)', '').replace(' (ENR, Full)', '').replace(' (ENR, Top 10)', '')
    // const occInd = layerNames.findIndex(d => d.includes(baseName) && d.includes('OCC'))
    // enrOccMapping[i] = occInd
    // occEnrMapping[occInd] = i
  // })

  // filters
  let filtersArr = filters ? Object.values(filters) : null

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
          if(filters && filters[order]?.layer && filters[order].layer.datasetName !== layer.datasetName) {
            return Promise.resolve(null)
          }
          // get hilbert ranges
          const orderRange = getRange(selected, order)
          // fetch data for hilbert segments
          return fetchData(layer, order, orderRange)
            .then((response) => {
              // let loadDataTime = Date.now()
              // top field per segment
              const topFields = response.map(d => {
                let topField = layer.fieldChoice(d)
                if(filters && filters[order]?.field) {
                  if(topField.field !== filters[order].field) {
                    topField = {
                      field: filters[order].field, 
                      value: d.data[filters[order].field]
                    }
                  }
                }
                if(!topField) console.log("no top field", layer.name, order)
                // store layer as integer
                d.layerInd = l
                d.topValues = layer.topValues
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
            d.layerInd = l
            d.layerDataset = layer.datasetName
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

    let refactorAllFeatures = (d) => {
      let keys = Object.keys(d).filter(k => k !== 'chosen')
      // find all non-zero features for a given node across all layers
      let segmentOrder = d[keys[0]]?.order
      if(!segmentOrder) return {order: null, features: {}}
      let allFeatures = {order: segmentOrder, features: {}}
      // for each layer...
      keys.forEach(layerInd => {
        // if layer is ENR, set a threshold for the score
        let scoreThresh = enrInds.includes(parseInt(layerInd)) ? minEnrScore : 0
        let layerInfo = d[layerInd]
        // save the nonzero data for each layer
        if((layerInfo.data.max_value >= scoreThresh) && (layerInfo.data.max_value != 0)) {  // if max data and not 0
          let key = `${layerInd},${layerInfo.data.max_field}`
          let value = layerInfo.data.max_value
          allFeatures.features[key] = value
        } else if(layerInfo.topValues) {  // if top data
          let numFactors = layerInfo.bytes.length / 2
          for(let i = 0; i < numFactors; i++) {
            let index = layerInfo.bytes[2 * i]
            let value = layerInfo.bytes[(2 * i) + 1]
            if ((value >= scoreThresh) && (value != 0)) {
              let key = `${layerInd},${index}`
              allFeatures.features[key] = value
            }
          }
        } else if(!layerInfo.data.max_value) {  // full data
          // filter byte array for nonzero values and add to tracker
          [...layerInfo.bytes].forEach((value, index) => {
            if ((value >= scoreThresh) && (value != 0)) {
              let key = `${layerInd},${index}`
              allFeatures.features[key] = value
            }
          })
        }
      })
      return allFeatures
    }


    // track the ENR factors for each node in upstream segments
    let trackerPromise = topFieldsAllLayers.then(() => {
      dataTree.forEach((d) => {
        d['fullDataTracker'] = refactorAllFeatures(d.data)
      })
      return Promise.resolve(null)
    })

    // get the paths for each leaf of tree
    let topFieldsAcrossLayersTime = Date.now()
    let bestPaths = Promise.all([trackerPromise, variantTopFields]).then(() => {
      console.log("Time to load all data", Date.now() - topFieldsAcrossLayersTime, "ms")
      let bestPathTime = Date.now()
      
      // function to move through the tree and collect potential features to show for each segment
      let collectFeatures = (node, i, factors) => {
        let treeDataNode = dataTree[node]
        const fullData = treeDataNode.fullDataTracker
        if(filters && filters[fullData.order]?.field) {
          if(fullData.features[filters[fullData.order].field] !== 0) {
            let layerInd = layers.findIndex(l => l.datasetName === filters[fullData.order].layer.datasetName)
            let factorInd = filters[fullData.order].index
            factors.push({
              layerInd: layerInd, 
              factor: factorInd, 
              score: fullData.features[`${layerInd},${factorInd}`], 
              order: fullData.order, 
              node: node
            })
          }
        } else {
          const orderFactors = Object.keys(fullData.features).map(d => {
            let [layerInd, factorInd] = d.split(',').map(Number)
            return {layerInd: layerInd, factor: factorInd, score: fullData.features[d], order: fullData.order, node: node}
          })
          factors.push(...orderFactors)
        }

        if(treeDataNode.parent !== null) {
          collectFeatures(treeDataNode.parent, i, factors)
        }
      }

      // function to refactor features for a given node
      let refactorTopFeature = (hit) => {
        const treeDataNode = dataTree[hit.node]
        const layer = layers[hit.layerInd]
        const layerFactors = layer.fieldColor.domain()
        const field = {
          field: layerFactors[hit.factor], 
          value: hit.score, 
          color: layer.fieldColor(layerFactors[hit.factor])
        }
        const region = treeDataNode.data[hit.layerInd]
        const fullData = treeDataNode.fullDataTracker.features

        return { 
          region: region, order: hit.order, layerDataset: layer.datasetName, field: field, fullData: fullData
        }
      }

      let fillPath = (i, factors) => {
        // seperate factors into ENR and OCC
        let enrFactors = factors.filter(d => enrInds.includes(d.layerInd))
        let occFactors = factors.filter(d => !enrInds.includes(d.layerInd))
        // reduce OCC factors to unique, prioritizing the lowest order for each factor
        let occFactorsNative = occFactors.sort((a, b) => a.order - b.order).filter((d, i, self) => 
          i === self.findIndex((t) => t.layerInd === d.layerInd && t.factor === d.factor)
        )
        // combine OCC and ENR and sort by score
        let factorsSorted = [
          ...enrFactors,
          ...occFactorsNative
        ].sort((a, b) => b.score - a.score)
        // fill path with factors and add up scores
        let score = 0
        while ((factorsSorted.length > 0)) {
          let hit = factorsSorted[0]
          
          // score
          let hitScore = hit.score
          // if filter exists and this hit is not in the filter, set score to 0
          if((filtersArr) && (filtersArr.filter(d => ((d.layer.name === layers[hit.layerInd].name) && (d.index === hit.factor) && (d.order === hit.order))).length === 0)) {
            hitScore = 0
          }
          if(csnMethod === 'sum') score += hitScore
          else if(csnMethod === 'normalizedSum') score += Math.sqrt(hitScore)
          else if(csnMethod === 'max') score = Math.max(score, hitScore)

          // get factors
          let refactor = refactorTopFeature(hit)
          topLeafPaths[i].path.push(refactor)
          factorsSorted = factorsSorted.filter(d => (d.order !== hit.order) && !((d.factor === hit.factor) && (d.layerInd === hit.layerInd)))
        }

        // add variant data
        const nodeData = dataTree[topLeafPaths[i].node]
        if(nodeData.variants) {
          let variants = Object.values(nodeData.variants).filter(d => d.topField.value !== null && d.topField.value !== 0)
          if(variants.length > 0) {
            topLeafPaths[i]['variants'] = variants
            // increase node's score depending on chosen variant
            let categoricalVariants = variants.filter(d => d.layerDataset == "variants_favor_categorical_rank")
            let gwasVariants = variants.filter(d => d.layerDataset == "variants_gwas_rank")
            let apcVariants = variants.filter(d => d.layerDataset == "variants_favor_apc_rank")
            if(categoricalVariants.length) {
              score += categoricalVariants.sort((a,b) => b.topField.value - a.topField.value)[0].topField.value
            } else if (gwasVariants.length) {
              score += gwasVariants.sort((a,b) => b.topField.value - a.topField.value)[0].topField.value
            } else if (apcVariants.length) {
              score += apcVariants.sort((a,b) => b.topField.value - a.topField.value)[0].topField.value
            }
          }
        }
        topLeafPaths[i]['score'] = score
      }

      // parse tree and build each path
      let numLeaves = 4 ** (maxOrderHit - selectedOrder)
      let numSegments = dataTree.length
      let leafIndexOffset = numSegments - numLeaves

      // initialize path data
      let leafIndices = new Array(numLeaves).fill(null).map((d, i) => i + leafIndexOffset)
      let topLeafPaths = new Array(leafIndices.length).fill(null).map(d => ({'path': []}))

      // collect features for each path
      leafIndices.forEach((l, i) => {
        topLeafPaths[i]['node'] = l
        let factors = []
        collectFeatures(l, i, factors)
        fillPath(i, factors)
      })

      // sort paths by score
      topLeafPaths = topLeafPaths.sort((a, b) => b.score - a.score)

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

      console.log("Time to find best paths", Date.now() - bestPathTime, "ms")
      return {'paths': topLeafPaths, 'tree': returnTree}
    })
    return bestPaths
  }
}
