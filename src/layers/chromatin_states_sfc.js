
import { scaleOrdinal } from "d3-scale";
import CanvasScaledValue from "../components/CanvasScaledValue";
import * as constants from "../lib/constants";

export default {
  name: "Chromatin States (Full)",
  datasetName: "cs_sfc",
  // baseURL: "https://storage.googleapis.com/fun-data/hilbert/chromosomes_new",
  baseURL: `${constants.baseURLPrefix}/20230622`,
  orders: [4,11],
  renderer: CanvasScaledValue,
  fieldChoice: topValue,
  fieldColor: scaleOrdinal()
    .domain(["Active TSS","Flanking TSS","Flanking TSS Upstream","Flanking TSS Downstream","Strong transcription","Weak transcription","Genic Enhancer 1","Genic Enhancer 2","Active Enhancer 1","Active Enhancer 2","Weak Enhancer","ZNF genes + repeats","Heterochromatin","Bivalent/Poised TSS","Bivalent Enhancer","Repressed PolyComb","Weak Repressed PolyComb","Quiescent/Low"])
    .range(["#ff0000","#ff4500","#ff4500","#ff4500","#008000","#006400","#c2e105","#c2e105","#ffc34d","#ffc34d","#ffff00","#66cdaa","#8a91d0","#cd5c5c","#bdb76b","#808080","#c0c0c0","#eeeeee"]) //temp change white to gray-white
    .unknown("#eee"),
  // used for the base canvas rendering
  strokeWidthMultiplier: 0.05,
  stroke: "gray",
  fill: "white"
}


// this function chooses the top value for a data point
function topValue(d) {
  let data = d.data
  if(!data) return { field: "", value: null }
  let top = Object.keys(data).map((f) => ({
    field: f,
    value: data[f]
  }))
  .sort((a,b) => b.value - a.value)[0]
  if(top.value <= 0) return { field: "", value: null }
  return top
}