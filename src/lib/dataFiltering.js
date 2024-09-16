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

  const url = "https://explore.altius.org:5001/api/dataFiltering/data_filtering"
  // const postBody = N ? {filters, N} : {filters}
  const postBody = {
    filters,
    ...(N && { N }),
    ...(regions && { regions })
  };
  console.log("POST BODY", postBody)
  return axios({
    method: 'POST',
    url: url,
    data: postBody
  }).then(response => {
    console.log("DATA", response.data)
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
function fetchFilterPreview(filtersMap, newFilterFull) {
  const filters = getFilters(filtersMap)
  const newFilters = [{"dataset_name": newFilterFull.layer.datasetName, "index": newFilterFull.index}]

  const url = "https://explore.altius.org:5001/api/dataFiltering/preview_filter"
  const postBody = {filters, newFilters}
  console.log("POST BODY", postBody)
  return axios({
    method: 'POST',
    url: url,
    data: postBody
  }).then(response => {
    console.log("FILTER PREVIEW DATA", response.data)
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
function fetchOrderPreview(filtersMap, newFiltersList, orders) {
  const filters = getFilters(filtersMap)
  const newFilters = newFiltersList.map(d => {
    return {"dataset_name": d.layer.datasetName, "index": d.index}
  })

  const url = "https://explore.altius.org:5001/api/dataFiltering/preview_filter"
  const postBody = {filters, newFilters, orders, normalize: false}
  console.log("POST BODY", postBody)
  return axios({
    method: 'POST',
    url: url,
    data: postBody
  }).then(response => {
    console.log("FILTER PREVIEW DATA", response.data)
    return response.data
  }).catch(error => {
    console.error(`error:     ${JSON.stringify(error)}`);
    console.error(`post body: ${JSON.stringify(postBody)}`);
    return null
  })
}


export {
  fetchFilterSegments,
  fetchFilterPreview,
  fetchOrderPreview,
}