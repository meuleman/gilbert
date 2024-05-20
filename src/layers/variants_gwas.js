import { scaleOrdinal } from "d3-scale";
import * as constants from "../lib/constants";
import fields from "./variants_gwas_fields.json";

export default {
  name: "Variants (GWAS)",
  datasetName: "variants_gwas",
  // baseURL: "https://storage.googleapis.com/fun-data/hilbert/chromosomes_new",
  baseURL: `${constants.baseURLPrefix}/20240327`,
  orders: [14,14],
  renderer: "CanvasSimpleValue",
  fieldChoice: decodeValue,
  fieldColor: scaleOrdinal()
    .domain(fields.fields)
    .range(fields.fields.map(d => "#39A939"))
    .unknown("#eee"),
  // used for the base canvas rendering
  strokeWidthMultiplier: 0.05,
  stroke: "gray",
  fill: "white"
}


// this function chooses the top value for a data point
function decodeValue(d) {
  let data = d.data;
  if(!data) return { field: "", value: null }
  let top = {
    field: fields.fields[data.max_field],
    value: data.max_value
  }
  if(top.value <= 0) return { field: "", value: null }
  return top
}