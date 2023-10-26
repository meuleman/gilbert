// function to generate simsearch results for a provided region with Genomic Narration tool. 
import axios from "axios";
import allFactors from './SimSearchFactors.json'

export default function SimSearchRegion(selected, order, layer, setSearchByFactorInds, factors, simSearchMethod) {
  const maxSimSearchOrder = 11
  if(selected) {
    if(order <= maxSimSearchOrder) {
      let simSearchFactors
      if (layer.name === "DHS Components") {
        simSearchFactors = allFactors['DHS']
      } else if(layer.name === "Chromatin States") {
        simSearchFactors = allFactors['Chromatin States']
      } else {
        const simSearch = {simSearch: null, initialDetailLevel: null, factors: null, method: null, layer: null}
        return Promise.resolve(simSearch)
      }
      const includedFactors = simSearchFactors.map(f => f.ind)
      const roiURL = "False"
      const queryFactorThresh = 0.5
      const numSimilarRegions = 20
      const fusionWeight = 0.1
      const regionMethod = 'hilbert_sfc'

      let url = "https://explore.altius.org:5001/simsearch"

      const chromosome = selected.chromosome
      const start = selected.start
      const stop = start + 1

      let selectedFactors = ''
      if(simSearchMethod == "Region") {
        selectedFactors = factors.map(f => {
          return f - Math.min(...includedFactors)
        })
        selectedFactors = JSON.stringify(selectedFactors)
      }

      const postBody = {
        location: `${chromosome}:${start}-${stop}`,
        includedFactors: JSON.stringify(includedFactors),
        selectedFactors: selectedFactors,
        roiURL: roiURL,
        scale: order,
        queryFactorThresh: queryFactorThresh,
        numSimilarRegions: numSimilarRegions,
        regionMethod: regionMethod,
        fusionWeight: fusionWeight,
      };

      const simSearch = axios({
        method: 'POST',
        url: url,
        data: postBody
      }).then((response) => {
        const data = response.data;
        if(data.length > 0) {
          let selectedFactors = data[0].selected_factors
          if (factors.length == 0) {
            let selectedFactorsAdjusted = selectedFactors.map(f => {
              return f + Math.min(...includedFactors)
            })
            setSearchByFactorInds(selectedFactorsAdjusted)
          }
          return {simSearch: data, factors: simSearchFactors, method: "Region", layer: layer.name}
        } else {
          return {simSearch: null, factors: null, method: null}
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