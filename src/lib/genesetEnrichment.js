import axios from "axios";
import { baseAPIUrl } from './apiService';
// * ================================================================
// * Server side API calls
// * ================================================================


/*
Get the geneset enrichments for set of genes calculated by the api. If membership=true,
then the genesets in which the genes are members are returned.
genes: [gene1, gene2, ...]
threshold: float (optional, default=0.05)

Returns: [{geneset, p-value}, ...] if membership=false
Returns: [{geneset}, ...] if membership=true
*/
function fetchGenesetEnrichment(genes, membership=false) {

  const url = `${baseAPIUrl}/api/genesetEnrichment/geneset_enrichment`
  const postBody = {genes, threshold: 0.01, membership}
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