import { scaleOrdinal } from "d3-scale";
import { color as d3Color } from 'd3-color';
import { hsv as d3Hsv } from 'd3-hsv';
import * as constants from "../lib/constants";

// const repeatsFields = ["DNA", "DNA?", "LINE",  "LTR", "LTR?", "Low_complexity", "RC", "RC?", "RNA", "Retroposon", "SINE", "SINE?", "Satellite", "Simple_repeat", "Unknown", "rRNA", "scRNA", "snRNA", "srpRNA", "tRNA"]
// const repeatsColors = [ "#FF0000",  "#FF0000",  "#00FF00",  "#0000FF",  "#0000FF",  "#FFA500", "#FF00FF",  "#FF00FF",  "#E8E802",  "#0000FF",  "#00FFFF", "#00FFFF", "#800080", "#008000", "#FFC0CB", "#E8E802", "#E8E802", "#E8E802", "#E8E802", "#E8E802"]

export default {
  name: "Repeats (ENR, Full)",
  datasetName: "repeats_enr",
  labelName: "Repeat Domain",
  baseURL: `${constants.baseS3URLPrefix}/20240327`,
  orders: [4,13],
  filterOrders: [8,13], // super long repeats can happen at order 4
  renderer: "CanvasScaledValue",
  fieldChoice: topValue,
  fieldColor: scaleOrdinal()
    .domain(
      ["DNA", "DNA?", "LINE",  "LTR", "LTR?", "Low_complexity", "RC", "RC?", "RNA", "Retroposon", "SINE", "SINE?", "Satellite", "Simple_repeat", "Unknown", "rRNA", "scRNA", "snRNA", "srpRNA", "tRNA"]
      )
    .range(
      [ "#FF0000",  "#FF0000",  "#00FF00",  "#0000FF",  "#0000FF",  "#FFA500", "#FF00FF",  "#FF00FF",  "#E8E802",  "#0000FF",  "#00FFFF", "#00FFFF", "#800080", "#008000", "#FFC0CB", "#E8E802", "#E8E802", "#E8E802", "#E8E802", "#E8E802"]
      )
    .unknown("#eee"),
  // used for the base canvas rendering
  strokeWidthMultiplier: 0.05,
  stroke: "gray",
  fill: "white"
}


// this function chooses the top value for a data point
function topValue(d) {
  let data = d.data
  data?.Count && delete data.Count
  if(!data) return { field: "", value: null }
  let top = Object.keys(data).map((f) => ({
    field: f,
    value: data[f]
  }))
  .sort((a,b) => b.value - a.value)[0]
  if(!top || top.value <= 0) return { field: "", value: null }
  return top
}