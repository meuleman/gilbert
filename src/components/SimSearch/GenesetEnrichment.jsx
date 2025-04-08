// function to generate simsearch results for a provided region with Genomic Narration tool. 
import axios from "axios";
import { baseAPIUrl } from "../../lib/apiService";
export default function GenesetEnrichment(data, order) {
  if(data && order) {
    let url = `${baseAPIUrl}/geneset_enrichment`
    
    const queryData = data.map(d => {
      return {
        region_ind: d.region_ind
      }
    })

    const postBody = {
      data: queryData,
      scale: order,
    };

    const genesetEnrichment = axios({
      method: 'POST',
      url: url,
      data: postBody
    }).then((response) => {
      const data = response.data;
      return data
    })
    .catch((err) => {
      console.error(`error:     ${JSON.stringify(err)}`);
      console.error(`post body: ${JSON.stringify(postBody)}`);
      // alert('Query Failed: Try another region.');
    });
    return genesetEnrichment
  } else {
    return null
  }
}