// function to generate simsearch results for a provided region with Genomic Narration tool. 
import axios from "axios";
import allFactors from './SimSearchFactors.json'

export default function SimSearchByFactor(factors, order, layer, setSimSearchMethod) {
  const maxSimSearchOrder = 11
  if(factors && order) {
    if((order <= maxSimSearchOrder) && (factors.length > 0)) {
      const simSearchFactors = allFactors['DHS'].concat(allFactors['Chromatin States'])
      // console.log(factors)
      const numRegions = 20
      const regionMethod = 'hilbert_sfc'

      let url = "https://explore.altius.org:5001/search_by_factor"

      const postBody = {
        factors: JSON.stringify(factors),
        scale: order,
        numRegions: numRegions,
        regionMethod: regionMethod,
      };
      // const determineInitialDetailLevel = (data) => {
      //   const prodRanks = data.map((d) => {
      //     return d[0].prod_rank
      //   })
      //   let initialDetailLevel = 1
      //   let maxProdRank = prodRanks[0]
      //   prodRanks.map((d, i) => {
      //     if(Math.max(d, maxProdRank) !== maxProdRank) {
      //       maxProdRank = d
      //       initialDetailLevel = i + 1
      //     }
      //   })
      //   return initialDetailLevel
      // }
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
          return {simSearch: fullData, factors: simSearchFactors, initialDetailLevel: null, method: "SBF"}
        } else {
          return {simSearch: null, factors: null, initialDetailLevel: null, method: null}
        }
      })
      .catch((err) => {
        console.error(`error:     ${JSON.stringify(err)}`);
        console.error(`post body: ${JSON.stringify(postBody)}`);
        // alert('Query Failed: Try another region.');
      });

      return simSearch
    } else {
      const simSearch = {simSearch: null, factors: null, initialDetailLevel: null, method: null}
      return Promise.resolve(simSearch)
    }
  }
}