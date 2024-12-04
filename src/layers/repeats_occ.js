import { scaleOrdinal } from "d3-scale";
import * as constants from "../lib/constants";

// const fullFields = ["DNA", "DNA?", "LINE",  "LTR", "LTR?", "Low_complexity", "RC", "RC?", "RNA", "Retroposon", "SINE", "SINE?", "Satellite", "Simple_repeat", "Unknown", "rRNA", "scRNA", "snRNA", "srpRNA", "tRNA"]
// const repeatsColors = [ "#FF0000",  "#FF0000",  "#00FF00",  "#0000FF",  "#0000FF",  "#FFA500", "#FF00FF",  "#FF00FF",  "#E8E802",  "#0000FF",  "#00FFFF", "#00FFFF", "#800080", "#008000", "#FFC0CB", "#E8E802", "#E8E802", "#E8E802", "#E8E802", "#E8E802"]


export default {
  name: "Repeats (OCC)",
  datasetName: "repeats_occ",
  baseURL: `${constants.baseS3URLPrefix}/20241204`,
  orders: [4,14],
  renderer: "CanvasScaledValue",
  fieldChoice: decodeValue,
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
  fill: "white",
  topValues: true,
}


function decodeValue(d) {
  const fullFields = ["DNA", "DNA?", "LINE",  "LTR", "LTR?", "Low_complexity", "RC", "RC?", "RNA", "Retroposon", "SINE", "SINE?", "Satellite", "Simple_repeat", "Unknown", "rRNA", "scRNA", "snRNA", "srpRNA", "tRNA"];
  let data = d.data;
  if(!data) return { field: "", value: null }
  let top = {
    field: fullFields[data.max_field],
    value: data.max_value
  }
  // let top = Object.keys(data).map((f) => ({
  //   field: f,
  //   value: data[f]
  // })).sort((a,b) => b.value - a.value)[0]
  if(!top) return { field: "", value: null }
  if(top.value <= 0) return { field: "", value: null }
  return top
}