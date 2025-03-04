import { scaleOrdinal } from "d3-scale";
import * as constants from "../lib/constants";

export default {
  name: "Variants (aPC)",
  datasetName: "variants_favor_apc",
  labelName: "aPC Variant",
  // baseURL: "https://storage.googleapis.com/fun-data/hilbert/chromosomes_new",
  baseURL: `${constants.baseS3URLPrefix}/20240321`,
  orders: [14,14],
  renderer: "CanvasSimpleValue",
  // fieldChoice: topValue,
  fieldChoice: conservation,
  fieldColor: scaleOrdinal()
    .domain([
      "apc_conservation_v2", 
      "apc_protein_function_v3", 
      "apc_proximity_to_coding", 
      "apc_transcription_factor"
    ])
    .range([
      "#2B7E7E", //"#fe8102",
      "#999", // "#ff0000",
      "#999", // "#07af00",
      "#999" // "#4c7d14"
    ])
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
  if(top?.value <= 0) return { field: "", value: null }
  return top
}

function conservation(d) {
  let data = d.data
  if(!data) return { field: "", value: null }
  return { field: "apc_conservation_v2", value: data["apc_conservation_v2"] }
}