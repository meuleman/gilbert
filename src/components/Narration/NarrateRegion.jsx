// function to narrate a provided region with Genomic Narration tool. 
import axios from "axios";

export default function NarrateRegion(selected, order) {
  const maxNarrationOrder = 11
  if(selected) {
    if(order <= maxNarrationOrder) {
      const factors = [...Array(34).keys()]
      const roiURL = "False"
      const queryFactorThresh = 0.5
      const numSimilarRegions = 20
      const regionMethod = 'hilbert_sfc'

      let url = "https://explore.altius.org:5001/narration"

      const chromosome = selected.chromosome
      const start = selected.start
      const stop = start + 1

      const postBody = {
        location: `${chromosome}:${start}-${stop}`,
        factors: JSON.stringify(factors),
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
        let initialDetailLevel = 1
        let maxProdRank = prodRanks[0]
        prodRanks.map((d, i) => {
          if(Math.max(d, maxProdRank) !== maxProdRank) {
            maxProdRank = d
            initialDetailLevel = i + 1
          }
        })
        return initialDetailLevel
      }

      const narration = axios({
        method: 'POST',
        url: url,
        data: postBody
      }).then((response) => {
        const fullData = response.data;
        const initialDetailLevel = determineInitialDetailLevel(fullData)
        return {narration: fullData, detailLevel: initialDetailLevel}
      })
      .catch((err) => {
        console.error(`error:     ${JSON.stringify(err)}`);
        console.error(`post body: ${JSON.stringify(postBody)}`);
        // alert('Query Failed: Try another region.');
      });

      return narration
    } else {
      const narration = {narration: null, detailLevel: null}
      return Promise.resolve(narration)
    }
  }
}