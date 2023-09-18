// function to generate simsearch results for a provided region with Genomic Narration tool. 
import axios from "axios";
import allFactors from './SimSearchFactors.json'

export default function SimSearchRegion(selected, order, layer) {
  const maxSimSearchOrder = 11
  if(selected) {
    if(order <= maxSimSearchOrder) {
      // const allFactors = [...Array(34).keys()]
      let simSearchFactors
      if (layer.name === "DHS Components SFC") {
        simSearchFactors = allFactors['DHS']
      }
      else if(layer.name === "Chromatin States SFC") {
        simSearchFactors = allFactors['Chromatin States']
      } else {
        const simSearch = {simSearch: null, initialDetailLevel: null, factors: null, method: null}
        return Promise.resolve(simSearch)
      }
      const roiURL = "False"
      const queryFactorThresh = 0.5
      const numSimilarRegions = 20
      const regionMethod = 'hilbert_sfc'

      let url = "https://explore.altius.org:5001/simsearch"

      const chromosome = selected.chromosome
      const start = selected.start
      const stop = start + 1

      const postBody = {
        location: `${chromosome}:${start}-${stop}`,
        factors: JSON.stringify(simSearchFactors.map(f => f.ind)),
        roiURL: roiURL,
        scale: order,
        queryFactorThresh: queryFactorThresh,
        numSimilarRegions: numSimilarRegions,
        regionMethod: regionMethod,
      };
      const determineInitialDetailLevel = (data) => {
        const prodRanks = data.map((d) => {
          return d[0].prod_rank
        })
        let detailLevel = 1
        let maxProdRank = prodRanks[0]
        prodRanks.map((d, i) => {
          if(Math.max(d, maxProdRank) !== maxProdRank) {
            maxProdRank = d
            detailLevel = i + 1
          }
        })
        return detailLevel
      }

      const simSearch = axios({
        method: 'POST',
        url: url,
        data: postBody
      }).then((response) => {
        const fullData = response.data;
        if(fullData.length > 0) {
          const detailLevel = determineInitialDetailLevel(fullData)
          return {simSearch: fullData, initialDetailLevel: detailLevel, factors: simSearchFactors, method: "Region"}
        } else {
          return {simSearch: null, initialDetailLevel: null, factors: null, method: null}
        }
      })
      .catch((err) => {
        console.error(`error:     ${JSON.stringify(err)}`);
        console.error(`post body: ${JSON.stringify(postBody)}`);
        // alert('Query Failed: Try another region.');
      });

      return simSearch
    } else {
      const simSearch = {simSearch: null, initialDetailLevel: null, factors: null, method: null}
      return Promise.resolve(simSearch)
    }
  }
}