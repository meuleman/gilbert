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


export {
  fetchFilterSegments
}