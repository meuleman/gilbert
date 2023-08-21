// function to generate narration results for a provided region with Genomic Narration tool. 
import axios from "axios";

export default function NarrateRegion(selected, order) {
  const maxSimSearchOrder = 11
  if(selected) {
    if(order <= maxSimSearchOrder) {
      const regionMethod = 'hilbert_sfc'
      let url = "https://explore.altius.org:5001/narration"

      const chromosome = selected.chromosome
      const start = selected.start
      const stop = start + 1

      const postBody = {
        location: `${chromosome}:${start}-${stop}`,
        scale: order,
        regionMethod: regionMethod,
      };

      const narration = axios({
        method: 'POST',
        url: url,
        data: postBody
      }).then((response) => {
        const data = response.data[0];
        return {narrationRanks: data.percentiles, coordinates: data.coordinates}
      })
      .catch((err) => {
        // console.error(`error:     ${JSON.stringify(err)}`);
        // console.error(`post body: ${JSON.stringify(postBody)}`);
        // alert('Query Failed: Try another region.');
      });

      return narration
    } else {
      const narration = {narrationRanks: null, coordinates: null}
      return Promise.resolve(narration)
    }
  }
}