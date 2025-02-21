import axios from "axios";

// * ================================================================
// * Server side API calls
// * ================================================================

/*
Fetches factor bp coverage log2(obs/exp) enrichments within region set.
regions: [{chromosome, i, order}, ...]
N: number of factors to return (defulat 10)
factorExclusion: list of factors to exclude from the results [{dataset, factor}, ...]

Returns:
[{factor, enrichment}, ...]
*/
function fetchRegionSetEnrichments({regions, N = null, factorExclusion = []}) {
  const url = "https://explore.altius.org:5001/api/regionSetEnrichment/region_set_enrichment"
  const postBody = {regions, factor_exclusion: factorExclusion}
  N && (postBody.N = N)
  console.log("REGION SET ENRICHMENT POST BODY", postBody)
  return axios({
    method: 'POST',
    url: url,
    data: postBody
  }).then(response => {
    console.log("REGION SET ENRICHMENTS", response.data)
    return response.data
  }).catch(error => {
    console.error(`error:     ${JSON.stringify(error)}`);
    console.error(`post body: ${JSON.stringify(postBody)}`);
    return null
  })
}


/*
Fetches segments across factors overlapping a single region. 
region: {chromosome, i, order}
factorExclusion: list of factors to exclude from the results [{dataset, factor}, ...]

Returns:
[{dataset, factor, segments: [{order, chromosome, i, score}, ...]}, ...]
*/
function fetchSingleRegionFactorOverlap({region, factorExclusion = []}) {
  const url = "https://explore.altius.org:5001/api/regionSetEnrichment/single_region_factor_query"
  const postBody = {region, factor_exclusion: factorExclusion}
  console.log("SINGLE REGION FACTOR OVERLAP POST BODY", postBody)
  return axios({
    method: 'POST',
    url: url,
    data: postBody
  }).then(response => {
    // console.log("SINGLE REGION FACTOR OVERLAP", response.data)
    return response.data
  }).catch(error => {
    console.error(`error:     ${JSON.stringify(error)}`);
    console.error(`post body: ${JSON.stringify(postBody)}`);
    return null
  })
}


export {
  fetchRegionSetEnrichments,
  fetchSingleRegionFactorOverlap
}