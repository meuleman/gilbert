import Data from './data';
import axios from "axios";
import { range } from 'd3-array';
import { baseAPIUrl } from './apiService';

import { fullList as layers, countLayers, fullDataLayers, rehydrate, csnLayerList } from '../layers'

import calculateCrossScaleNarration from './calculateCSN'
import { HilbertChromosome, hilbertPosToOrder } from "./HilbertChromosome";
import { fetchGenes } from './genesForRegions'
import { fetchGWASforPositions } from "./gwas";


// * ================================================================
// * Server side API calls
// * ================================================================

/*
Converts filtersMap to a list of filters
*/
function getFilters(filtersMap, region) {
  if (Object.keys(filtersMap).length === 0 && !region) {
    return Promise.resolve([]);
  }
  // order, index, dataset_name
  const filters = Object.keys(filtersMap).map(o => {
    let f = filtersMap[o]
    return {
      order: +o,
      index: f.index,
      dataset_name: f.layer.datasetName
    }
  })
  return filters
}


/*
Get the top N paths filtered by filters and regions
filters: [{order, field}, ...]
region: {order, chromosome, index}
scoreType: "full", "factor"
diversity: true | false
N: number of paths to return

Returns:
[ { baseRegion, path: [{order, field, region}, ...]}, ...]

region (and baseRegion): {order, chromosome, index}
*/
function fetchTopCSNs(filtersMap, region, scoreType, diversity, N) {
  const filters = getFilters(filtersMap, region)

  const url = `${baseAPIUrl}/api/csns/top_paths`
  const postBody = {filters, scoreType, region, diversity, N}
  // console.log("CSN POST BODY", postBody)
  return axios({
    method: 'POST',
    url: url,
    data: postBody
  }).then(response => {
    // console.log("CSN DATA", response.data)
    return response.data
  }).catch(error => {
    console.error(`error:     ${JSON.stringify(error)}`);
    console.error(`post body: ${JSON.stringify(postBody)}`);
    return null
  })
}

/*
Get the preview overlap fractions for a new filter at each order based on available regions from current filters
filters: [{order, field, dataset_name}, ...]
region: {order, chromosome, index}
newFilterFull: {field, dataset_name}

Returns:
{ preview_fractions: { order: fraction, ...} }
*/
function fetchFilterPreview(filtersMap, region, newFilterFull) {
  const filters = getFilters(filtersMap, region)
  const newFilter = {"dataset_name": newFilterFull.layer.datasetName, "index": newFilterFull.index}

  const url = `${baseAPIUrl}/api/csns/preview_filter`
  const postBody = {filters, region, newFilter}
  // console.log("FILTER PREVIEW POST BODY", postBody)
  return axios({
    method: 'POST',
    url: url,
    data: postBody
  }).then(response => {
    // console.log("FILTER PREVIEW DATA", response.data)
    return response.data
  }).catch(error => {
    console.error(`error:     ${JSON.stringify(error)}`);
    console.error(`post body: ${JSON.stringify(postBody)}`);
    return null
  })
}


/*
Collects the top N paths for each region in regions
region: [{chromosome, start, end}, ...]
N: number of paths to return per region

Returns:
{ regions: [{ chromosome, start, end, top_scores, top_positions, dehydrated_paths }, ...] }
*/
function fetchTopPathsForRegions(regions, N) {
  if(regions.length === 0) return Promise.resolve({regions: []})
  const url = `${baseAPIUrl}/api/csns/top_paths_for_regions`
  const postBody = {regions, N}
  // console.log("TOP PATHS POST BODY", postBody)
  return axios({
    method: 'POST',
    url: url,
    data: postBody
  }).then(response => {
    // console.log("TOP PATHS FOR REGIONS DATA", response.data)
    return response.data
  }).catch(error => {
    console.error(`error:     ${JSON.stringify(error)}`);
    console.error(`post body: ${JSON.stringify(postBody)}`);
    return null
  })
}


/*
Collects the partial path for each region in regions
region: [{chromosome, order, i}, ...]
membership (return genesets with regional gene membership): true | false
threshold (geneset p-value threshold): float (0 < p <= 1)

Returns:
{ regions: [{ chromosome, order, i, path_factors: [], factor_scores: [] }, ...], 
  genesets: [{geneset, p (if not membership), genes (if not membership)}, ...] 
}
*/
function fetchPartialPathsForRegions(regions, membership=false, threshold=0.1) {
  const url = `${baseAPIUrl}/api/csns/paths_by_order`
  const postBody = {regions, threshold, membership}
  console.log("PARTIAL PATHS POST BODY", postBody)
  return axios({
    method: 'POST',
    url: url,
    data: postBody
  }).then(response => {
    // console.log("PARTIAL PATHS FOR REGIONS DATA", response.data)
    return response.data
  }).catch(error => {
    console.error(`error:     ${JSON.stringify(error)}`);
    console.error(`post body: ${JSON.stringify(postBody)}`);
    return null
  })
}



/*
filters: [{order, field}, ...]
order: 4-14

Returns:
[ ...]
*/
function fetchFilteredRegions(filters, order) {
  const url = `${baseAPIUrl}/csn/filtered_indices`
  const postBody = {filters, order}
  return axios({
    method: 'POST',
    url: url,
    data: postBody
  })
}

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


function createTopPathsForRegions(regions) {
  console.log("Creating CSN paths for regions", regions)
  return Promise.all(regions.map(r => {
    let pathOrders = Array.from({ length: r.order - 4 + 1 }, (_, i) => i + 4);
    let path = pathOrders.map((o) => {
      const hilbert = new HilbertChromosome(o)
      const pos = hilbertPosToOrder(r.i, {from: r.order, to: o})
      const region = hilbert.fromRange(r.chromosome, pos, pos+1)[0]
      return { order: o, region: region }
    })
    let csn = {'region': r, 'path': path}
    
    // retrieve full data and genes
    let promises = [retrieveFullDataForCSN(csn), fetchGenes([r])]
    if(r.order === 14) {
      promises.push(fetchGWASforPositions([{chromosome: r.chromosome, index: r.i}]))
    }

    return Promise.all(promises)
    .then((responses) => {
      let fullDataResponse = responses[0]
      let genesResponse = responses[1]

      let gwasResponse = r.order === 14 ? responses[2] : null
      const csnGWAS = gwasResponse ? gwasResponse[0]['trait_names'].map((trait, i) => {
        return {trait: trait, score: gwasResponse[0]['scores'][i], layer: gwasResponse[0]['layer']}
      }).sort((a,b) => b.score - a.score) : null
      // add GWAS associations to the full data response
      let csnOrder14Segment = fullDataResponse?.path.find(d => d.order === 14)
      csnOrder14Segment ? csnOrder14Segment["GWAS"] = csnGWAS : null

      fillNarration(fullDataResponse)  // not yet including GWAS in path creation
      fullDataResponse['genes'] = genesResponse[0]
      return fullDataResponse
    })
    .catch((error) => {
      console.error(`Error creating CSN path: ${error}`);
      return
    })
  }))
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




// i is the hilbert position
function fetchDehydratedCSN(r) {
  const cachebust = 1
  const burl = "https://resources.altius.org/~ctrader/public/gilbert/data/precomputed_csn_paths/paths"
  let url = `${burl}/${r.chromosome}.bytes?cachebust=${cachebust}`

  let arrayType = Int16Array;
  let stride = 11
  let bpv = 2
  const from = r.i
  const to = r.i + 1
  return Data.fetchBytes(url, from*bpv*stride, to*bpv*stride - 1).then(buffer => {
    return {
      csn: new arrayType(buffer),
      ...r,
    }
  })
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
  fetchDehydratedCSN,
  rehydrateCSN,
  rehydratePartialCSN,
  fetchTopCSNs,
  fetchPartialPathsForRegions,
  fetchTopPathsForRegions,
  createTopPathsForRegions,
  fetchFilterPreview,
  retrieveFullDataForCSN
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