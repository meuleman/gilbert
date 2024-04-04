import { scaleOrdinal } from "d3-scale";
import { color as d3Color } from 'd3-color';
import { hsv as d3Hsv } from 'd3-hsv';
import CanvasScaledValue from "../components/CanvasScaledValue";
import * as constants from "../lib/constants";

const repeatsFields = ["DNA", "DNA?", "LINE",  "LTR", "LTR?", "Low_complexity", "RC", "RC?", "RNA", "Retroposon", "SINE", "SINE?", "Satellite", "Simple_repeat", "Unknown", "rRNA", "scRNA", "snRNA", "srpRNA", "tRNA"];
const repeatsColors = [ "#FF0000",  "#FF0000",  "#00FF00",  "#0000FF",  "#0000FF",  "#FFA500", "#FF00FF",  "#FF00FF",  "#E8E802",  "#0000FF",  "#00FFFF", "#00FFFF", "#800080", "#008000", "#FFC0CB", "#E8E802", "#E8E802", "#E8E802", "#E8E802", "#E8E802"]
const colorScaleFactor = 0.75;
let repeatsColorsReduced = repeatsColors.map(c => {
  let hsv = d3Hsv(d3Color(c));
  hsv.v *= colorScaleFactor;  // Reduce brightness
  return String(hsv);
});

export default {
  name: "Repeats (ENR)",
  datasetName: "repeats_enr_max",
  baseURL: `${constants.baseURLPrefix}/20240327`,
  orders: [4,13],
  renderer: CanvasScaledValue,
  fieldChoice: decodeValue,
  fieldColor: scaleOrdinal()
    .domain(repeatsFields)
    .range(repeatsColorsReduced)
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
    field: repeatsFields[data.max_field],
    value: data.max_value
  }
  if(top.value <= 0) return { field: "", value: null }
  return top
}