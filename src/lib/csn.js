import Data from './data';
import axios from "axios";
import { range } from 'd3-array';
import { baseAPIUrl, fetchGWASforPositions, fetchPartialPathsForRegions } from './apiService';

import { fullList as layers, countLayers, fullDataLayers, rehydrate, csnLayerList } from '../layers'

import calculateCrossScaleNarration from './calculateCSN'
import { HilbertChromosome, hilbertPosToOrder } from "./HilbertChromosome";


const getRange = (region, order) => {
  const hilbert = HilbertChromosome(order)
  let range = hilbert.fromRegion(region.chromosome, region.start, region.end-1)
  return range
}

// sets preferential factors in path with full data
function fillNarration(csn) {
  if (csn?.path) {
    // pull out full data
    let full = csn.path.flatMap(d => 
      Object.keys(d.fullData).map(k => {
        let [layerIndex, index] = k.split(",")
        let layer = csnLayerList[+layerIndex]
        let field = layer.fieldColor.domain()[+index]
        let color = layer.fieldColor(field)
        let value = d.fullData[k]
        let count = (d.counts && (d.counts[layerIndex]?.length)) ? d.counts[layerIndex][index] : null
        return { order: d.order, factor: k, value, layer: layer, field: {field, count, color, index: parseInt(index), value} }
      })
    ).sort((a,b) => b.value - a.value)

    // update path preferential factors with full data
    while (full.length > 0) {
      let factor = full[0]
      let p = csn.path.find(d => d.order === factor.order)
      // update segment preferential factor
      p['field'] = factor.field
      p.region['field'] = factor.field
      p['layer'] = factor.layer
      // filter out used factors and orders
      full = full.filter(f => f.factor !== factor.factor && f.order !== factor.order)
    }
  }
}

function retrieveFullDataForCSN(csn) {//, layers, countLayers) {
  const fetchData = Data({debug: false}).fetchData
  let countLayerNames = countLayers.map(d => d.datasetName)  // so we can track counts vs full data

  let singleBPRegion = csn.path.filter(d => d.region.order === 14)[0]?.region
  let timings = {}
  let csnWithFull = Promise.all(csn.path.map(p => {
    if(p.fullData) {
      console.log("CSN path already has full data at order", p.order)
      return
    }
    let order = p.order
    let fullData = {}
    let counts = {}
    let data = {}

    console.log("Retrieving full data for CSN path at order", p.order)
    let orderAcrossLayers = Promise.all(fullDataLayers.map((layer, l) => {
      // if the layer includes current order
      if((layer.orders[0] <= order) && (layer.orders[1] >= order)) {
        // get hilbert ranges
        // const orderRange = getRange(singleBPRegion, order)
        const orderRange = [csn.path.find(d => d.order === order)?.region]
        timings[`${layer.datasetName}-${order}`] = { start: +Date.now() }
        // console.log("FETCH", layer.datasetName, order, orderRange)
        return fetchData(layer, order, orderRange)
          .then((response) => {
            let timing = timings[`${layer.datasetName}-${order}`]
            timing.end = +Date.now()
            timing.duration = (timing.end - timing.start) / 1000
            
            data[l] = response[0]  // save data
            let meta = response.metas[0]
            let bytesData = response[0]?.bytes
            if(!bytesData) return
            if(countLayerNames.includes(layer.datasetName)) {  // count layer
              let layerIndex = countLayerNames.indexOf(layer.datasetName)
              counts[layerIndex] = bytesData
            } else if((meta.fields[0] === 'top_fields') && (meta.fields[1] === 'top_values')) {  // top x layer
              for(let i = 0; i < bytesData.length; i+=2) {
                let index = bytesData[i]
                let value = bytesData[i+1]
                value > 0 ? fullData[`${l},${index}`] = value : null
              }
            } else if((meta.fields[0] === 'max_field') && (meta.fields[1] === 'max_value')) {  // max layer
              let index = bytesData[0]
              let value = bytesData[1]
              value > 0 ? fullData[`${l},${index}`] = value : null

            } else {  // full layer
              bytesData.forEach((value, index) => {
                value > 0 ? fullData[`${l},${index}`] = value : null
              })
            }
            return
          })
          .catch((error) => {
            console.error(`Error fetching CSN data: ${error}`);
            return
          })
      } else {
        return
      }
    }))
    return orderAcrossLayers.then((response) => {
      p['fullData'] = fullData
      p['counts'] = counts
      if(p.field && !p.field.value) {
        // set the value from the fullData
        let li = fullDataLayers.indexOf(p.layer)
        p.field.value = fullData[`${li},${p.field.index}`]
      }
      // p['data'] = data
      return
    })
  }))

  return csnWithFull.then(() => {
    // console.log("TIMINGS", timings)
    return csn
  })
}



// * ================================================================
// * Client-side version below
// * ================================================================



const layersMap = layers.reduce((acc, layer) => {
  acc[layer.datasetName] = layer
  return acc
}, {})

function createWorker() {
  return new Worker(new URL('./csnWorker.js', import.meta.url), { type: 'module' });
}

const workerPool = [];
const maxWorkers = 1; // Adjust the number of workers as needed

// Initialize the worker pool
for (let i = 0; i < maxWorkers; i++) {
  workerPool.push(createWorker());
}

// Function to get an available worker from the pool
function getAvailableWorker() {
  return new Promise((resolve) => {
    const checkWorker = () => {
      for (const worker of workerPool) {
        if (!worker.busy) {
          worker.busy = true;
          return resolve(worker);
        }
      }
      setTimeout(checkWorker, 100); // Check again after a short delay if no worker is available
    };
    checkWorker();
  });
}

// Function to call the Web Worker
async function calculateCrossScaleNarrationInWorker(selected, csnMethod, enrThreshold, layers, variantLayers, countLayers, filters) {
  // const worker = new Worker(csnWorker, { type: 'module' });
  // const worker = createWorker()
  const worker = await getAvailableWorker()
  return new Promise((resolve, reject) => {
    worker.onmessage = function(e) {
      // console.log("RECEIVED DATA", e)
      // worker.terminate()
      e.data.paths.forEach(d => {
        d.path.forEach(p => p.layer = layersMap[p.layerDataset])
        d.variants?.forEach(p => p.layer = layersMap[p.layerDataset])
      })
      worker.busy = false
      resolve(e.data);
    };

    worker.onerror = function(e) {
      // console.log("worker error:", e)
      worker.terminate()
      reject(e);
    };

    function serializeLayer (l) {
      return l.datasetName
    }

    const lyrs = layers.map(serializeLayer)
    const vlyrs = variantLayers.map(serializeLayer)
    const clyrs = countLayers.map(serializeLayer)
    let fltrs = null
    if(filters) {
      fltrs = Object.keys(filters).filter(k => k !== "userTriggered").map(k => {
        return {
          ...filters[k],
          layer: serializeLayer(filters[k].layer)
        }
      })
    }
  
    // console.log("SENDING MESSAGE")
    worker.postMessage({ selected , csnMethod , enrThreshold , layers:lyrs, variantLayers:vlyrs, countLayers:clyrs, filters:fltrs });
    // worker.postMessage({ selected, csnMethod, layers, variantLayers, occScore, variantScore, filters });
  });
}



const getDehydrated = (regions, paths) => {
  return paths.flatMap((r, ri) => r.dehydrated_paths.map((dp, i) => {
    return {
      ...r,
      i: r.top_positions[0], // hydrating assumes order 14 position
      factors: r.top_factor_scores[0],
      score: r.top_path_scores[0],
      genes: r.genes[0]?.genes,
      scoreType: "full",
      path: dp,
      region: regions[ri]
    }
  }))
}

function rehydrateCSN(csn, layers) {
  const hydrated = range(0, 11).map(i => {
    const order = i + 4
    // const l = rehydrate(csn.csn[i], layers)
    const l = rehydrate(csn.path[i], layers)
    const hilbert = new HilbertChromosome(order)
    const pos = hilbertPosToOrder(csn.i, {from: 14, to: order})
    const region = hilbert.fromRange(csn.chromosome, pos, pos+1)[0]
    let field = null
    if(l) {
      field = {
        field: l.fieldName,
        index: l.fieldIndex,
        color: l.layer.fieldColor(l.fieldName),
        value: csn.factors?.[i]
      }
      region.field = field
    }
    return {
      field,
      layer: l?.layer,
      order,
      region
    }
  })
  return {
    ...csn,
    path: hydrated,
  }
}


// rehydrate a partial csn path
function rehydratePartialCSN(r, layers) {
  const hydrated = r?.path_factors.map((d, i) => {
    let segmentOrder = 4 + i
    const l = rehydrate(d, layers)
    const hilbert = new HilbertChromosome(segmentOrder)
    const pos = hilbertPosToOrder(r.i, {from: r.order, to: segmentOrder})
    const region = hilbert.fromRange(r.chromosome, pos, pos+1)[0]
    let field = null
    if(l) {
      field = {
        field: l.fieldName,
        index: l.fieldIndex,
        color: l.layer.fieldColor(l.fieldName),
        value: r.factor_scores[i]
      }
      region.field = field
    }
    return {
      field,
      layer: l?.layer,
      order: segmentOrder,
      region
    }
  })
  return {
    ...r,
    path: hydrated,
  }
}

// Fetches both partial paths for regions and GWAS data concurrently.
// Since partial paths are only available through order 13, order 14 segments are
// created from GWAS data
function fetchCombinedPathsAndGWAS(regions, membership = false, threshold = 0.1) {
  const regionsForGWAS = regions.map((d) => ({
    chromosome: d.chromosome, index: d.i, order: d.order
  })).filter(d => d.order === 14)
  return Promise.all([
    fetchPartialPathsForRegions(regions, membership, threshold),
    fetchGWASforPositions(regionsForGWAS)
  ]).then(([pathsResponse, gwasResponse]) => {
    // rehydrate paths
    let rehydrated = pathsResponse.regions.map(d => rehydratePartialCSN(d, csnLayerList))

    // Create an index map for quick GWAS lookup
    const gwasMap = new Map();
    gwasResponse.forEach(gwas => {
      gwasMap.set(`${gwas.chromosome}:${gwas.index}`, gwas);
    });

    rehydrated.forEach(d => {
      // add order 14 segments to rehydrated paths if necessary
      if(d.order === 14) {
        let segment = {
          field: null, 
          layer: null, 
          order: 14, 
          region: {
            chromosome: d.chromosome, 
            order: d.order, 
            start: d.start, 
            end: d.end, 
            x: d.x, 
            y: d.y, 
            i: d.i
          }
        }
        
        const regionGWAS = gwasMap.get(`${d.chromosome}:${d.i}`);

        // only GWAS can occupy order 14 segment position
        if(regionGWAS) {
          let regionGWASParsed = regionGWAS.trait_names.map((trait, i) => ({
            trait,
            score: regionGWAS.scores[i],
            layer: regionGWAS.layer
          })).sort((a, b) => b.score - a.score);

          if (regionGWASParsed.length) {
            let trait = regionGWASParsed[0]
            let field = {
              field: trait.trait,
              index: trait.layer.fieldColor.domain().indexOf(trait.trait),
              color: trait.layer.fieldColor(trait.trait),
              value: trait.score
            }
            segment.field = field
            segment.layer = trait.layer
            segment.region.field = field

            // add full set of GWAS associations to the segment
            segment.GWAS = regionGWASParsed
          }
        }
        d.path.push(segment)
      }
    })

    return {
      paths: pathsResponse,
      gwas: gwasResponse,
      rehydrated: rehydrated
    };
  }).catch(error => {
    console.error("Error fetching combined data:", error);
    return {
      paths: null,
      gwas: null
    };
  });
}

// function to generate narration results for a provided region with Genomic Narration tool. 
function narrateRegion(selected, order) {
  const maxSimSearchOrder = 11
  if(selected) {
    if(order <= maxSimSearchOrder) {
      const regionMethod = 'hilbert_sfc'
      let url = `${baseAPIUrl}/narration`

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
      // console.log("TOP UP LAYER", topUpLayer.layer)
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
    // path.path.forEach(p => !p.layer ? p.layer = layersMap[p.layerDataset] : null)
    // path.variants?.forEach(p => !p.layer ? p.layer = layersMap[p.layerDataset] : null)
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
  calculateCrossScaleNarrationInWorker,
  narrateRegion,
  layerSuggestion,
  walkTree,
  findUniquePaths,
  getDehydrated,
  rehydrateCSN,
  rehydratePartialCSN,
  retrieveFullDataForCSN,
  fetchCombinedPathsAndGWAS
}


// logic to determine which variant is the most important from a list of variants
export function variantChooser(variants) {
  let gwas = variants.filter(d => d.layer.datasetName == "ukbb_94_traits")
  if(gwas.length) return gwas.sort((a,b) => b.topField.value - a.topField.value)[0]
  let categories = variants.filter(d => d.layer.datasetName == "variants_favor_categorical_rank")
  if(categories.length) return categories.sort((a,b) => b.topField.value - a.topField.value)[0]
  let apc = variants.filter(d => d.layer.datasetName == "variants_favor_apc_rank")
  if(apc.length) return apc.sort((a,b) => b.topField.value - a.topField.value)[0]
  return null
}