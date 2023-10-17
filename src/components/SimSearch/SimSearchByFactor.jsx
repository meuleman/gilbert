// function to generate simsearch results for a provided region with Genomic Narration tool. 
import axios from "axios";
import allFactors from './SimSearchFactors.json'

export default function SimSearchByFactor(factors, order, layer) {
  const maxSimSearchOrder = 11
  if(factors && order) {
    if((order <= maxSimSearchOrder) && (factors.length > 0)) {
      const simSearchFactors = allFactors['DHS'].concat(allFactors['Chromatin States'])
      const numRegions = 20
      const fusionWeight = 0.1
      const regionMethod = 'hilbert_sfc'

      let url = "https://explore.altius.org:5001/search_by_factor"

      const postBody = {
        factors: JSON.stringify(factors),
        scale: order,
        numRegions: numRegions,
        regionMethod: regionMethod,
        fusionWeight: fusionWeight,
      };
      const simSearch = axios({
        method: 'POST',
        url: url,
        data: postBody
      }).then((response) => {
        const fullData = response.data;
        if(fullData.length > 0) {
          // adjust the ranks by 1 position
          fullData.map(r => {
            r.rank += 1
          })
          return {simSearch: fullData, factors: simSearchFactors, method: "SBF", layer: layer.name}
        } else {
          return {simSearch: null, factors: null, method: null, layer: null}
        }
      })
      .catch((err) => {
        console.error(`error:     ${JSON.stringify(err)}`);
        console.error(`post body: ${JSON.stringify(postBody)}`);
        // alert('Query Failed: Try another region.');
      });

      return simSearch
    } else {
      const simSearch = {simSearch: null, factors: null, method: null, layer: null}
      return Promise.resolve(simSearch)
    }
  }
}