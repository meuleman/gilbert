import axios from "axios";

// * ================================================================
// * Server side API calls
// * ================================================================


/*
Get the geneset enrichments for set of genes calculated by the api
genes: [gene1, gene2, ...]
threshold: float (optional, default=0.05)

Returns: [{geneset, p-value}, ...]
*/
function fetchGenesetEnrichment(genes) {

  const url = "https://explore.altius.org:5001/api/genesetEnrichment/geneset_enrichment"
  const postBody = {genes}
  // console.log("GENESET POST BODY", postBody)
  return axios({
    method: 'POST',
    url: url,
    data: postBody
  }).then(response => {
    // console.log("GENESET ENRICHMENTS", response.data)
    return response.data
  }).catch(error => {
    console.error(`error:     ${JSON.stringify(error)}`);
    console.error(`post body: ${JSON.stringify(postBody)}`);
    return null
  })
}


export {
  fetchGenesetEnrichment
}