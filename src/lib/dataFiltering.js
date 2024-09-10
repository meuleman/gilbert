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
function fetchFilterSegments(filtersMap, N) {
  const filters = getFilters(filtersMap)

  const url = "https://explore.altius.org:5001/api/dataFiltering/data_filtering"
  const postBody = N ? {filters, N} : {filters}
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
  console.log(filtersMap)
  const newFilter = {"dataset_name": newFilterFull.layer.datasetName, "index": newFilterFull.index}

  const url = "https://explore.altius.org:5001/api/dataFiltering/preview_filter"
  const postBody = {filters, newFilter}
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
  fetchFilterPreview
}