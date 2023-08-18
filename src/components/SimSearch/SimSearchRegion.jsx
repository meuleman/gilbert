// function to generate simsearch results for a provided region with Genomic Narration tool. 
import axios from "axios";

export default function SimSearchRegion(selected, order, layer, setSimSearchMethod) {
  const maxSimSearchOrder = 11
  if(selected) {
    if(order <= maxSimSearchOrder) {
      const allFactors = [...Array(34).keys()]
      let factors
      if (layer.name === "DHS Components SFC") {
        factors = allFactors.slice(0, 16)
        setSimSearchMethod("DHS Components SFC")
      }
      else if(layer.name === "Chromatin States SFC") {
        factors = allFactors.slice(16)
        setSimSearchMethod("Chromatin States SFC")
      } else {
        setSimSearchMethod(null)
        const simSearch = {simSearch: null, detailLevel: null}
        return Promise.resolve(simSearch)
      }
      console.log(layer)
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

      const simSearch = axios({
        method: 'POST',
        url: url,
        data: postBody
      }).then((response) => {
        const fullData = response.data;
        if(fullData.length > 0) {
          const initialDetailLevel = determineInitialDetailLevel(fullData)
          return {simSearch: fullData, detailLevel: initialDetailLevel}
        } else {
          return {simSearch: null, detailLevel: null}
        }
      })
      .catch((err) => {
        console.error(`error:     ${JSON.stringify(err)}`);
        console.error(`post body: ${JSON.stringify(postBody)}`);
        // alert('Query Failed: Try another region.');
      });

      return simSearch
    } else {
      const simSearch = {simSearch: null, detailLevel: null}
      return Promise.resolve(simSearch)
    }
  }
}