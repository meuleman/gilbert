
import { range, groups, sum } from 'd3-array';
import { hilbertPosToOrder } from './HilbertChromosome';

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

// fetch the index files for the selected order filters and calculate intersections
// the resulting data structure is an array with an object per chromosome
// containing an array of indices 
function filterIndices(orderSelects, progressCb, resultsCb) {
  let chromosomes = Object.keys(counts_order14[4]).filter(d => d !== "totalSegmentCount")
  // console.log("orderSelects", orderSelects)
  const orders = Object.keys(orderSelects)
  // console.log("orders", orders)
  // we turn the orderSelects into an array of selects
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
    Promise.all(filteredGroupedSelects.map(g => {
      return Promise.all(g[1].map(os => {
        const base = `https://resources.altius.org/~ctrader/public/gilbert/data/precomputed_csn_paths/index_files`
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
            return {...os, indices: []};
          });
      }))
    }))
    .then(groups => {
      // console.log("GROUPS", groups)
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

      progressCb("loading_filters", false)
      resultsCb({filteredIndices, segmentCount: totalSegmentCount, pathCount})
    })
  } else {
    progressCb("loading_filters", false)
    resultsCb({filteredIndices: [], segmentCount: 0, pathCount: 0})
  }
}

// Given a large and potentially imbalanced list of regions by chromosome
// we want to pull samples from each chromosome, but pull more from those that have more regions
// if some chromosomes are empty or have less
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
  const chrmsMap = chrms.reduce((acc, d) => {
    acc[d.chromosome] = d
    return acc
  }, {})

  return {
    order,
    total,
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
  regionsByOrder
}

