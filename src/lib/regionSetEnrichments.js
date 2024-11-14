import axios from "axios";

// * ================================================================
// * Server side API calls
// * ================================================================

/*
Fetches factor bp coverage log2(obs/exp) enrichments within region set.
regions: [{chromosome, i, order}, ...]
N: number of factors to return (defulat 10)
factorExclusion: list of factors to exclude from the results [{dataset, index}, ...]

Returns:
[{factor, enrichment}, ...]
*/
function fetchRegionSetEnrichments(regions, N=10, factorExclusion=[]) {
  const url = "https://explore.altius.org:5001/api/regionSetEnrichment/region_set_enrichment"
  const postBody = {regions, N, factorExclusion}
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


export {
  fetchRegionSetEnrichments,
}