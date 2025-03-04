import axios from "axios";
// import Data from './data';
// import { count, range } from 'd3-array';

// import { fullList as layers, countLayers, csnLayerList, rehydrate } from '../layers'

// import calculateCrossScaleNarration from './calculateCSN'
// import { HilbertChromosome, hilbertPosToOrder } from "./HilbertChromosome";



// * ================================================================
// * Server side API calls
// * ================================================================

/*
Converts filtersMap to a list of filters
*/
function getFilters(filtersMap, region) {
  let keys = Object.keys(filtersMap).filter(k => k !== "userTriggered")
  if (keys.length === 0 && !region) {
    return Promise.resolve([]);
  }
  // order, index, dataset_name
  const filters = keys.map(o => {
    let f = filtersMap[o]
    return {
      order: +o,
      index: f.index,
      dataset_name: f.layer ? f.layer.datasetName : f.datasetName // temporary fix until gwas layer with correct number of fields
    }
  })
  return filters
}

function getUniqueRegions(regions) {
  if(!regions) return null
  const seen = new Set();
  return regions
    .map(d => ({chromosome: d.chromosome, i: d.i, order: d.order}))
    .filter((region) => {
      const key = `${region.chromosome}-${region.i}-${region.order}`;
      return seen.has(key) ? false : seen.add(key);
    });
}

/*
Get the top N segments filtered by filters
filters: [{order, field}, ...]
N: number of paths to return (optional)

Returns:
[ { chromosome: chromosome, indices: [], scores: [], order: order }, ...]

region (and baseRegion): {order, chromosome, index}
*/
function fetchFilterSegments(filtersMap, regions, N) {
  const filters = getFilters(filtersMap)

  // remove duplicate regions
  let uniqueRegions = getUniqueRegions(regions)

  const url = "https://explore.altius.org:5001/api/dataFiltering/data_filtering"
  // const postBody = N ? {filters, N} : {filters}
  const postBody = {
    filters,
    ...(N && { N }),
    ...(uniqueRegions && { regions: uniqueRegions })
  };
  // console.log("POST BODY", postBody)
  return axios({
    method: 'POST',
    url: url,
    data: postBody
  }).then(response => {
    // console.log("FILTERED SEGMENTS", response.data)
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
newFilterFull: {field, dataset_name}

Returns:
{ preview_fractions: { order: fraction, ...} }
*/
function fetchFilterPreview(regions, filtersMap, newFilterFull) {
  const uniqueRegions = getUniqueRegions(regions)
  const filters = getFilters(filtersMap)
  const newFilters = [{"dataset_name": newFilterFull.layer.datasetName, "index": newFilterFull.index}]

  const url = "https://explore.altius.org:5001/api/dataFiltering/preview_filter"
  const postBody = {
    filters, 
    newFilters,
    ...(uniqueRegions && { regions: uniqueRegions })
  }
  console.log("POST BODY", postBody)
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
Get the preview overlap counts for each new filter at specified orders based on available regions from current filters
filters: [{order, field, dataset_name}, ...]
newFilters: [{field, dataset_name}, ...]
orders: [4, 5, 6...]
normalize: boolean

Returns:
{ previews: [{preview: { order: fraction, ...}, dataset_name, index}, ...] }
*/
function fetchOrderPreview(regions, newFiltersList, orders) {

  let uniqueRegions = getUniqueRegions(regions)
  const newFilters = newFiltersList.map(d => {
    return {"dataset_name": d.layer.datasetName, "index": d.index}
  })

  const url = "https://explore.altius.org:5001/api/dataFiltering/preview_filter"
  const postBody = {regions: uniqueRegions, newFilters, orders, normalize: false}
  // console.log("POST BODY", postBody)
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
Get the order agnostic filtering for a set of factors. 
filters: [{factor, dataset}, ...], where factor is the factorIndex
regions: [{chromosome, i, order}, ...] (optional)

Returns:
[{chromosome, i, order, max_score_order, csn, csn_scores}, ...]
*/
function fetchFilteringWithoutOrder(filters, regions) {
  const url = "https://explore.altius.org:5001/api/filteringWithoutOrder/filtering_without_order"
  const postBody = {filters}
  regions && (postBody.regions = regions)
  console.log("FILTER WITHOUT ORDER POST BODY", postBody)
  return axios({
    method: 'POST',
    url: url,
    data: postBody
  }).then(response => {
    response.data.regions = response.data.regions.sort((a, b) => b.max_score - a.max_score)
    // console.log("FILTER WITHOUT ORDER", response.data)
    return response.data
  }).catch(error => {
    if(error.status == 400) {
      console.error(`Too many regions to return`);
      alert('Too many regions to return. Please select a different filter factor.')
      return null
    } else {
      console.error(`error:     ${JSON.stringify(error.status)}`);
      console.error(`post body: ${JSON.stringify(postBody)}`);
      return null
    }
  })
}


/*
Get region set for a factor of interest. 
factor: {factor: factorIndex, dataset}
maxRegions: max number of regions to return (default 20000)

Returns:
[{chromosome, i, order, score}, ...]
*/
function fetchRegionSetFromFactor(factor, maxRegions=null) {
  const url = "https://explore.altius.org:5001/api/filteringWithoutOrder/generate_region_set_from_factor"
  const postBody = {factor}
  maxRegions && (postBody.max_regions = maxRegions)
  console.log("REGION SET FROM FACTOR POST BODY", postBody)
  return axios({
    method: 'POST',
    url: url,
    data: postBody
  }).then(response => {
    console.log("REGION SET FROM FACTOR", response.data)
    return response.data
  }).catch(error => {
    console.error(`error:     ${JSON.stringify(error.status)}`);
    console.error(`post body: ${JSON.stringify(postBody)}`);
    return null
  })
}


/*
Get the top N regions that adhere to filtering criteria. 
regions: [{chromosome, i, order, score}, ...]
filters: [{factor, dataset}, ...], where factor is the factorIndex
N: number of paths to return (default 100)

Returns:
[{chromosome, i, order, score, ranges, subregion}, ...]
*/
function fetchBackfillFiltering(regions, filters, N=100) {
  const url = "https://explore.altius.org:5001/api/filteringWithoutOrder/backfill_region_filtering"
  const postBody = {regions, filters, N}
  console.log("REGION BACKFILL FILTERING POST BODY", postBody)
  return axios({
    method: 'POST',
    url: url,
    data: postBody
  }).then(response => {
    // console.log("FILTER WITHOUT ORDER", response.data)
    return response.data
  }).catch(error => {
    console.error(`error:     ${JSON.stringify(error.status)}`);
    console.error(`post body: ${JSON.stringify(postBody)}`);
    return null
  })
}


export {
  fetchFilterSegments,
  fetchFilteringWithoutOrder,
  fetchRegionSetFromFactor,
  fetchBackfillFiltering,
  fetchFilterPreview,
  fetchOrderPreview,
}