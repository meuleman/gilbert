// function to narrate a provided region with Genomic Narration tool. 
import axios from "axios";

export default function NarrateRegion(selected, order) {
  if(selected) {
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

    const narration = axios({
      method: 'POST',
      url: url,
      data: postBody
    }).then((response) => {
      const fullData = response.data;
      return fullData
    })
    .catch((err) => {
      console.error(`error:     ${JSON.stringify(err)}`);
      console.error(`post body: ${JSON.stringify(postBody)}`);
      // alert('Query Failed: Try another region.');
    });

    return narration
  }
}