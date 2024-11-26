import axios from "axios";

// * ================================================================
// * Server side API calls
// * ================================================================

/*
Fetches gene information for a list of regions
regions: [{chromosome, i, order}, ...]

Returns:
[{chromosome, domain_start, domain_end, name, stable_ID, strand, start, end, description, in_gene}, ...]
*/
function fetchGenes(regions) {
  const url = "https://explore.altius.org:5001/api/genes/fetch_genes"
  const postBody = {regions}
  console.log("FETCH GENES POST BODY", postBody)
  return axios({
    method: 'POST',
    url: url,
    data: postBody
  }).then(response => {
    // console.log("GENES FOR REGIONS", response.data.genes)
    return response.data.genes
  }).catch(error => {
    console.error(`error:     ${JSON.stringify(error)}`);
    console.error(`post body: ${JSON.stringify(postBody)}`);
    return null
  })
}


export {
  fetchGenes,
}