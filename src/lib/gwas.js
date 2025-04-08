import axios from "axios";
import { baseAPIUrl } from './apiService';
import { GWASLayer } from '../layers'

// * ================================================================
// * Server side API calls
// * ================================================================


/*
Get the full set of GWAS associations for a set of positions
positions: [{chromosome, index}, ...]

Returns:
[ { chromosome: chromosome, index: index, trait_names: [], scores: [] }, ...]
*/
function fetchGWASforPositions(positions) {
  const url = `${baseAPIUrl}/api/gwas/gwas_for_positions`
  const postBody = {'positions': positions}
  // console.log("GWAS POST BODY", postBody)
  return axios({
    method: 'POST',
    url: url,
    data: postBody
  }).then(response => {
    response.data.forEach(d => { d["layer"] = GWASLayer })
    // console.log("DATA", response.data)
    return response.data
  }).catch(error => {
    console.error(`error:     ${JSON.stringify(error)}`);
    console.error(`post body: ${JSON.stringify(postBody)}`);
    return null
  })
}

export {
  fetchGWASforPositions
}