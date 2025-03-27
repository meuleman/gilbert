import { scaleOrdinal } from "d3-scale";
import * as constants from "../lib/constants";

const csFields = ["Active TSS","Flanking TSS","Flanking TSS Upstream","Flanking TSS Downstream","Strong transcription","Weak transcription","Genic Enhancer 1","Genic Enhancer 2","Active Enhancer 1","Active Enhancer 2","Weak Enhancer","ZNF genes + repeats","Heterochromatin","Bivalent/Poised TSS","Bivalent Enhancer","Repressed PolyComb","Weak Repressed PolyComb","Quiescent/Low"]
const csColors = ["#ff0000","#ff4500","#ff4500","#ff4500","#008000","#006400","#c2e105","#c2e105","#ffc34d","#ffc34d","#ffff00","#66cdaa","#8a91d0","#cd5c5c","#bdb76b","#808080","#c0c0c0","#eeeeee"]  // temp change white to gray-white

export default {
  name: "Chromatin States",
  datasetName: "cs_sfc_max",
  // baseURL: "https://storage.googleapis.com/fun-data/hilbert/chromosomes_new",
  baseURL: `${constants.baseURLPrefix}/20240223`,
  orders: [4,13],
  renderer: "CanvasScaledValue",
  fieldChoice: decodeValue,
  fieldColor: scaleOrdinal()
    .domain(csFields)
    .range(csColors) 
    .unknown("#eee"),
  // used for the base canvas rendering
  strokeWidthMultiplier: 0.05,
  stroke: "gray",
  fill: "white"
}


function decodeValue(d) {
  let data = d.data;
  if(!data) return { field: "", value: null }
  let top = {
    field: csFields[data.max_field],
    value: data.max_value
  }
  if(!top || top?.value <= 0) return { field: "", value: null }
  return top
}