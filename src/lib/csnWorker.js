import axios from "axios";
import Data from './data';
import { HilbertChromosome, } from './HilbertChromosome'
import { fromRegion } from './regions'
import { min } from "d3-array";
// import * as referenceLayers from "../layers";
import dhs_components_enr from "../layers/dhs_components_enr";
import chromatin_states_enr from "../layers/chromatin_states_enr";
import tf_motifs_enr_top10 from "../layers/tf_motifs_enr_top10";
import repeats_enr from "../layers/repeats_enr";
import dhs_occ from "../layers/dhs_occ";
import chromatin_states_occ from "../layers/chromatin_states_occ";
import tf_motifs_occ from "../layers/tf_motifs_occ";
import repeats_occ from "../layers/repeats_occ";
import variants_categorical from "../layers/variants_categorical";
import variants_apc from "../layers/variants_apc";
import variants_gwas from "../layers/variants_gwas";

// import fields from "../layers/variants_gwas_fields.json";

// function gwasDecodeValue(d) {
//   let data = d.data;
//   if(!data) return { field: "", value: null }
//   let top = {
//     field: fields.fields[data.max_field],
//     value: data.max_value
//   }
//   if(top.value <= 0) return { field: "", value: null }
//   return top
// }

// function decodeValueTF(d) {
//   let data = d.data;
//   if(!data) return { field: "", value: null }
//   let top = Object.keys(data).map((f) => ({
//     field: f,
//     value: data[f]
//   })).sort((a,b) => b.value - a.value)[0]
//   if(!top || top.value <= 0) return { field: "", value: null }
//   return top
// }

const referenceLayers = [
  dhs_components_enr,
  chromatin_states_enr,
  tf_motifs_enr_top10,
  repeats_enr,
  dhs_occ,
  chromatin_states_occ,
  tf_motifs_occ,
  repeats_occ,
  variants_categorical,
  variants_apc,
  variants_gwas,
  // { ...variants_gwas, fieldChoice: gwasDecodeValue },
]

onmessage = async function(e) {
  console.log("GOT THE MESSAGE", e)
  const { selected, csnMethod, layers, variantLayers, occScore, variantScore, filters } = e.data;

  // function to generate cross scale narrations for a provided region.
  async function calculateCrossScaleNarration(selected, csnMethod='sum', layers, variantLayers=[], occScore=0.01, variantScore=0.1, filters=null) {
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
    let occEnrMapping = {}
    enrInds.forEach((i) => {
      const baseName = layerNames[i].replace(' (ENR)', '').replace(' (ENR, Full)', '').replace(' (ENR, Top 10)', '')
      const occInd = layerNames.findIndex(d => d.includes(baseName) && d.includes('OCC'))
      enrOccMapping[i] = occInd
      occEnrMapping[occInd] = i
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
                console.error(`Error fetching CSN data: ${error}`, layer.name, order);
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
            console.error(`Error fetching variant data: ${error}`, layer.name, order);
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
          let layerInfo = d[layerInd]
          // save the nonzero data for each layer
          if(layerInfo.data.max_value > 0) {  // if max data and not 0
            let key = `${layerInd},${layerInfo.data.max_field}`
            let value = layerInfo.data.max_value
            allFeatures.features[key] = value
          } else if(layerInfo.topValues) {  // if top data
            let numFactors = layerInfo.bytes.length / 2
            for(let i = 0; i < numFactors; i++) {
              let index = layerInfo.bytes[2 * i]
              let value = layerInfo.bytes[(2 * i) + 1]
              if (value > 0) {
                let key = `${layerInd},${index}`
                allFeatures.features[key] = value
              }
            }
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
        // let bestPathTime = performance.now()     
        
        // function to move through the tree and collect potential features to show for each segment
        let collectFeatures = (node, i, factors) => {
          let treeDataNode = dataTree[node]
          const fullData = treeDataNode.fullDataTracker
          if(filters && filters[fullData.order]?.field) {
            if(fullData.features[filters[fullData.order].field] !== 0) {
              let layerInd = layers.findIndex(l => l.datasetName === filters[fullData.order].layer.datasetName)
              let factorInd = filters[fullData.order].index
              factors.push({
                layer: layerInd, 
                factor: factorInd, 
                score: fullData.features[`${layerInd},${factorInd}`], 
                order: fullData.order, 
                node: node
              })
            }
          } else {
            const orderFactors = Object.keys(fullData.features).map(d => {
              let [layerInd, factorInd] = d.split(',').map(Number)
              return {layer: layerInd, factor: factorInd, score: fullData.features[d], order: fullData.order, node: node}
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
          const layer = layers[hit.layer]
          const layerFactors = layer.fieldColor.domain()
          const field = {
            field: layerFactors[hit.factor], 
            value: hit.score, 
            color: layer.fieldColor(layerFactors[hit.factor])
          }
          const region = treeDataNode.data[hit.layer]
          const fullData = treeDataNode.fullDataTracker.features

          return { 
            region: region, order: hit.order, layer: layer, field: field, fullData: fullData
          }
        }

        let fillPath = (i, factors) => {
          // sort by ENR layers first
          let enrFactorsSorted = factors.filter(d => enrInds.includes(d.layer)).sort((a, b) => b.score - a.score)
          let occFactors = factors.filter(d => !enrInds.includes(d.layer))//.sort((a, b) => a.order - b.order)
          let occFactorsSorted = []
          let usedEnrFactors = []
          enrFactorsSorted.forEach(d => {
            if(!usedEnrFactors.includes(`${d.layer},${d.factor}`)) {
              let occLayer = enrOccMapping[d.layer]
              let matchingOccHits = occFactors.filter(f => f.layer === occLayer && f.factor === d.factor)
              if(matchingOccHits.length > 0) {
                occFactorsSorted.push(...matchingOccHits.sort((a, b) => a.order - b.order))
              }
              usedEnrFactors.push(`${d.layer},${d.factor}`)
            }
          })
          let factorsSorted = [
            ...enrFactorsSorted,
            ...occFactorsSorted
          ]
          // fill path with factors and add up scores
          let score = 0
          while ((factorsSorted.length > 0)) {
            let hit = factorsSorted[0]
            
            // score
            let hitScore = enrInds.includes(hit.layer) ? hit.score : occScore
            if(csnMethod === 'sum') score += hitScore
            else if(csnMethod === 'normalizedSum') score += Math.sqrt(hitScore)
            else if(csnMethod === 'max') score = Math.max(score, hitScore)

            // get factors
            let refactor = refactorTopFeature(hit)
            topLeafPaths[i].path.push(refactor)
            factorsSorted = factorsSorted.filter(d => (d.order !== hit.order) && !((d.factor === hit.factor) && (d.layer === hit.layer)))
          }

          // add variant data
          const nodeData = dataTree[topLeafPaths[i].node]
          if(nodeData.variants) {
            let variants = Object.values(nodeData.variants).filter(d => d.topField.value !== null && d.topField.value !== 0)
            if(variants.length > 0) {
              topLeafPaths[i]['variants'] = variants
              // increase node's score depending on number of variants
              score += (variants.length * variantScore)
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
        // console.log("Time to find best paths", performance.now() - bestPathTime, "ms")
        return {'paths': topLeafPaths, 'tree': returnTree}
      })
      return bestPaths
    }
  }

  
  
  function deserializeLayer(l) {
    return referenceLayers.find(d => d.datasetName == l)
  }
  const lyrs = layers.map(deserializeLayer)
  const vlyrs = variantLayers.map(deserializeLayer)
  const fltrs = Object.keys(filters).map(k => {
    return {
      ...filters[k],
      layer: deserializeLayer(filters[k].layer)
    }
  })

  console.log("WEB WORKER WORKING")
  const result = await calculateCrossScaleNarration(selected, csnMethod, lyrs, vlyrs, occScore, variantScore, fltrs);
  console.log("RESULT", result)
  postMessage(result);
};



onerror = function(e) {
  console.error("Error inside worker:", e.message, e.filename, e.lineno, e.colno);
  console.error("Error event:", e);
};