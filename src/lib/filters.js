
import { range, groups, sum } from 'd3-array';
import Data from './data'
import { createSegments, joinSegments } from "./segments.js"
import { HilbertChromosome, hilbertPosToOrder } from './HilbertChromosome';

import counts_native from "../data/counts.native_order_resolution.json"
import counts_order14 from "../data/counts.order_14_resolution.json"

function calculateOrderSums() {
  const orderSums = Object.keys(counts_order14).map(o => {
    let chrms = Object.keys(counts_order14[o])//.map(chrm => counts[o][chrm])
    // combine each of the objects in each key in the chrms array
    let total = 0
    let total_segments_found = 0
    let layer_total = {}
    let layer_total_segments = {}
    let ret = {}
    let uret = {}
    let maxf = { value: 0 }
    chrms.forEach(c => {
      if(c == "totalSegmentCount") return
      const chrm = counts_order14[o][c]
      const layers = Object.keys(chrm)
      layers.forEach(l => {
        if(!ret[l]) {
          ret[l] = {}
          layer_total[l] = 0
          Object.keys(chrm[l]).forEach(k => {
            ret[l][k] = 0
          })
        }
        Object.keys(chrm[l]).forEach(k => {
          ret[l][k] += chrm[l][k]
          total += chrm[l][k]
          layer_total[l] += chrm[l][k]
          if(chrm[l][k] > maxf.value){
            maxf.value = chrm[l][k]
            maxf.layer = l
            maxf.field = k
          }
        })
      })
      // get the unique counts
      const uchrm = counts_native[o][c]
      layers.forEach(l => {
        if(!uret[l]) {
          uret[l] = {}
          layer_total_segments[l] = 0
          Object.keys(uchrm[l]).forEach(k => {
            uret[l][k] = 0
          })
        }
        Object.keys(uchrm[l]).forEach(k => {
          uret[l][k] += uchrm[l][k]
          layer_total_segments[l] += uchrm[l][k]
          total_segments_found += uchrm[l][k]
        })
      })
    })
    return { 
      order: o, 
      counts: ret, 
      total, 
      totalPaths: counts_order14[o].totalSegmentCount, 
      totalSegments: counts_native[o].totalSegmentCount, 
      total_segments_found,
      layer_total, 
      layer_total_segments, 
      unique_counts: uret, 
      maxField: maxf 
    }
  })
  return orderSums
}


// intersect a pair of indices arrays {order, indices}
// this version of the function expects the indices to be in native order
// that is: each index is in the order given by the orderSelects
const intersectIndices = (lower, higher) => {
  const stride = Math.pow(4, higher.order - lower.order)
  // turn the lower.indices into ranges to intersect
  const ranges = lower.indices.map(i => ({start: i*stride, end: (i+1)*stride}))
  // console.log(lower, higher, stride, ranges)
  // we filter the higher indices to only keep the ones that are in a range
  return { order: higher.order, chromosome: higher.chromosome, indices: higher.indices.filter(i => {
    return ranges.some(r => r.start <= i && r.end >= i)
  })}
}

// this version of the intersection function expects the indices to be order 14
// this means we can directly compare the indices without converting them to ranges
const intersectIndices14 = (lower, higher) => {
  const lowerSet = new Set(lower.indices);
  const commonIndices = higher.indices.filter(index => lowerSet.has(index));
  return { order: higher.order, chromosome: higher.chromosome, indices: commonIndices };
}


// fetch the index files for the selected order filters
function fetchIndices(filteredGroupedSelects, progressCb) {
  return Promise.all(filteredGroupedSelects.map(g => {
    return Promise.all(g[1].map(os => {
      const base = `https://altius-gilbert.s3.us-west-2.amazonaws.com/20240703/csn_index_files`
      let dsName = os.layer.datasetName
      const url = `${base}/${os.order}.${os.chromosome}.${dsName}.${os.index}.order_14_resolution.indices.int32.bytes`
      return fetch(url)
        .then(r => r.arrayBuffer())
        .then(buffer => {
          const int32Array = new Int32Array(buffer);
          progressCb("got_index", os)
          return {...os, indices: Array.from(int32Array)};
        })
        .catch(error => {
          console.error('Error fetching indices:', error);
          progressCb("got_index", os)
          return {...os, indices: []};
        });
    }))
  }));
}

// fetch the index files for the selected order filters and calculate intersections
// the resulting data structure is an array with an object per chromosome
// containing an array of indices 
function filterIndices(orderSelects, progressCb, resultsCb, regionsThreshold = 100, attachRegions = true) {
  let chromosomes = Object.keys(counts_order14[4]).filter(d => d !== "totalSegmentCount")
  const orders = Object.keys(orderSelects)
  // we turn the orderSelects into an array of selects,
  // expanded with an element per chromosome
  const selects = orders.flatMap(o => {
    let os = orderSelects[o]
    let oc = counts_order14[o]
    return chromosomes.map(c => {
      let chrm = oc[c]
      let l = os.layer.datasetName
      let i = os.index
      return {
        ...os,
        chromosome: c,
        chromosome_count: chrm[l][i]
      }
    })
    .filter(d => d?.chromosome_count > 0) // filtering this means we dont request empty index arrays that dont exist
  })
  // console.log("selects", selects)

  // group by chromosome, we only want to include chromosomes where we have at least one path across orders
  const groupedSelects = groups(selects, d => d.chromosome)
  // console.log("groupedSelects", groupedSelects)
  const filteredGroupedSelects = groupedSelects.filter(g => g[1].length == orders.length)
  // console.log("filteredGroupedSelects", filteredGroupedSelects)

  progressCb("grouped_selects", filteredGroupedSelects)

  // as long as we have more than one order, we want to do this
  if(orders.length){
    progressCb("loading_filters", true)
    fetchIndices(filteredGroupedSelects, progressCb)
    .then(groups => {
      progressCb("filtering_start")
      // loop through each group (chromosome), fetch its indices and then filter each pair of indices
      const filteredIndices = groups.map(g => {
        const indices = g.map(d => ({order: d.order, chromosome: d.chromosome, indices: d.indices }))
        // we compare each pair going down until we are left with the indices that go up all the way to the top
        let result = indices[0];
        for (let i = 0; i < indices.length - 1; i++) {
          // result = intersectIndices(result, indices[i+1])
          result = intersectIndices14(result, indices[i+1])
        }
        return result;
      })
      progressCb("filtering_end")
      // console.log("intersected indices", filteredIndices)
      if(filteredIndices.length === 0){
        progressCb("loading_filters", false)
        resultsCb({filteredIndices, segmentCount: 0, pathCount: 0})
        return
      }
      console.log("FILTERED INDICES", filteredIndices)
      // now we can count everything in a couple ways
      // 1. count the number of segments by counting the length of indices for each group
      // 2. count the number of paths by multiplying stride (4^13-order) times the count of segments
      const segmentCounts = filteredIndices.map(d => d.indices.length)
      // console.log("segment counts", segmentCounts)
      const totalSegmentCount = sum(segmentCounts)
      const pathCount = totalSegmentCount // * stride
      // console.log("totalSegmentCount", totalSegmentCount)
      // console.log("pathCount", pathCount) 
      // console.log("FILTERED INDICES", filteredIndices)

      // for the percentages and preview bars, we don't need the regions
      if(attachRegions) {
        // first we want to keep only the highest scoring indices in the highest resolution order of the filter
        // console.log("SAMPLE SCORE REGION", filteredIndices)
        const order = filteredIndices[0].order
        const hilbert = new HilbertChromosome(14)
        filteredIndices.forEach(d => {
          let seen = {}
          let seenCount = 0
          let i = 0;
          // iterate through the indices, 
          let regions = []
          let idx;
          let r;
          if(!d.indices.length) return d.regions = []
          while(seenCount < regionsThreshold && i < d.indices.length) {
            idx = d.indices[i]
            let io = hilbertPosToOrder(idx, {from: 14, to: order})
            if(!seen[io]) {
              seenCount += 1
              r = hilbert.fromRange(d.chromosome, idx, idx+1)[0]
              r.representedPaths = 1
              regions.push(r)
              seen[io] = r
            } else {
              seen[io].representedPaths += 1
            }
            i += 1
          }
          d.regions = regions
        })
      }

      progressCb("loading_filters", false)
      resultsCb({filteredIndices, segmentCount: totalSegmentCount, pathCount})
    })
  } else {
    progressCb("loading_filters", false)
    resultsCb({filteredIndices: [], segmentCount: 0, pathCount: 0})
  }
}


async function throttleRequests(requests, fetchFunction, maxConcurrent = 10) {
  let activeRequests = 0;
  let index = 0;
  const results = [];

  return new Promise((resolve, reject) => {
      function next() {
          if (index >= requests.length) {
              if (activeRequests === 0) {
                  resolve(results);
              }
              return;
          }

          if (activeRequests < maxConcurrent) {
              const currentIndex = index++;
              activeRequests++;

              fetchFunction(requests[currentIndex])
                  .then(data => {
                      results[currentIndex] = data;
                      activeRequests--;
                      next();
                  })
                  .catch(error => {
                      reject(error);
                  });

              next();
          }
      }

      for (let i = 0; i < maxConcurrent; i++) {
          next();
      }
  });
}

async function sampleScoredRegions(filteredIndices, progressCb) {
  // fetch the scores via byte arrays
  // first grab the first chromosomeThreshold regions from each chromosome
  const base = `https://resources.altius.org/~ctrader/public/gilbert/data/precomputed_csn_paths/path_scores`
  let arrayType = Float32Array;
  let stride = 1
  let bpv = 4
  let count = 0
  const scored = filteredIndices.filter(d => d.regions.length).map(async d => {
    const url = `${base}/path_scores.${d.chromosome}.order_14_resolution.float32.bytes`
    // let indices = d.indices.slice(0, chromosomeThreshold).sort((a,b) => a - b).map(i => ({i}))
    let indices = d.regions.sort((a,b) => a.i - b.i)
    // const requests = indices.map(i => {
    //   return Data.fetchBytes(url, i.i*bpv*stride, (i.i+1)*bpv*stride - 1).then(buffer => {
    //     return new arrayType(buffer)[0]
    //   })
    // })
    const segments = createSegments(indices)
    const joined = joinSegments(segments)
    // console.log("SEGMENTS", joined)

    const fetchFn = (s) => {
    // const requests = joined.map(s => {
      const from = s.start
      const to = s.stop
      return Data.fetchBytes(url, from*bpv*stride, to*bpv*stride - 1).then((buffer,si) => {
        let data = new arrayType(buffer)
        return s.segments.map(p => {
          let idx = (p.i - s.start)
          return {
            ...p,
            score: data[idx]
          }
        }).filter(d => !!d.score)
      })
    // })
    }
    // const scores = await Promise.all(requests).then(scoredSegments => {
    const scores = await throttleRequests(joined, fetchFn).then(scoredSegments => {
      count +=1
      if(progressCb) progressCb(count)

      // console.log("SCORES", d, scoredSegments)
      const scores = scoredSegments.flatMap(d => d)
      // console.log("scores", d, scores)
      return {
        ...d,
        scores
      }
    })
    return scores
  })
  return Promise.all(scored)
}

// Given a large and potentially imbalanced list of regions by chromosome
// we want to pull samples from each chromosome, but pull more from those that have more regions
// if some chromosomes are empty or have less
// TODO: we aren't using this method anymore
function sampleRegions(filteredIndices, totalRegionsNeeded = 48, regionsPerElement = 2) {
  let result = [];
  let additionalRegions = [];

  // First pass: collect up to 2 regions from each element if available
  filteredIndices.forEach(item => {
    if (item.regions.length >= regionsPerElement) {
      result.push(...item.regions.slice(0, regionsPerElement));
    } else {
      result.push(...item.regions);
      // Note how many additional regions we need from this item
      for (let i = item.regions.length; i < regionsPerElement; i++) {
        additionalRegions.push(item);
      }
    }
  });

  // Calculate how many more regions are needed
  let regionsNeeded = totalRegionsNeeded - result.length;

  // Second pass: evenly distribute the extraction of additional regions
  while (regionsNeeded > 0) {
    let foundRegionsThisRound = 0;

    for (let item of filteredIndices) {
      if (item.regions.length > regionsPerElement) {
        let alreadyTaken = result.filter(r => item.regions.includes(r)).length;
        let availableRegions = item.regions.slice(alreadyTaken, alreadyTaken + 1);
        if (availableRegions.length > 0) {
          result.push(...availableRegions);
          foundRegionsThisRound += availableRegions.length;
          regionsNeeded -= availableRegions.length;
          if (regionsNeeded <= 0) break;
        }
      }
    }

    // If no regions were found in a full round, break to avoid infinite loop
    if (foundRegionsThisRound === 0) {
      break;
    }
  }

  const sample = result.slice(0, totalRegionsNeeded);
  return sample
}

function regionsByOrder(filteredIndices, order) {
  let total = 0
  let chrms = filteredIndices.map(d => {
    // let no = d.indices.map(i => ({i, oi: hilbertPosToOrder(i, {from: 14, to: order})}))
    // let nog = groups(no, i => i.oi)
    // let count = nog.length
    let no = d.indices.map(i => hilbertPosToOrder(i, {from: 14, to: order}))
    // let unique = Array.from(new Set(no))
    // let count = unique.length
    let nog = groups(no, i => i).map(i => ({i: i[0], count: i[1].length}))
    let count = nog.length
    total += count
    return { chromosome: d.chromosome, indices: nog}
  })
  let min = Infinity
  let max = 0
  const chrmsMap = chrms.reduce((acc, d) => {
    let indxs = {}
    d.indices.forEach(i => {
      indxs[i.i] = i
      if(i.count < min) min = i.count
      if(i.count > max) max = i.count
    })
    acc[d.chromosome] = indxs
    return acc
  }, {})

  return {
    order,
    total,
    min,
    max,
    chrms,
    chrmsMap
  }
}

export {
  counts_native,
  counts_order14,
  calculateOrderSums,
  filterIndices,
  sampleRegions,
  sampleScoredRegions,
  regionsByOrder,
  intersectIndices14,
}

