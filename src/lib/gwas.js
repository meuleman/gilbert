import axios from "axios";

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
  const url = "https://explore.altius.org:5001/api/gwas/gwas_for_positions"
  const postBody = {'positions': positions}
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
  fetchGWASforPositions
}