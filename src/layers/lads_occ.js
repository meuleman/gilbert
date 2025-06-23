import { scaleOrdinal } from "d3-scale";
import * as constants from "../lib/constants";

const ladFields = ["Constitutive", "Constitutive_Inter", "Facultative"]
const ladColors = ["#D82A2A", "blue", "#A0A0A0"]

export default {
  name: "LADs",
  datasetName: "lads_occ",
  labelName: "LADs",
  baseURL: `${constants.baseURLPrefix}/20250116`,
  orders: [4,13],
  renderer: "CanvasSimpleValue",
  fieldChoice: decodeValue,
  fieldColor: scaleOrdinal()
    .domain(ladFields)
    .range(ladColors)
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
    field: ladFields[data.max_field],
    value: data.max_value
  }
  if(!top || top?.value <= 0) return { field: "", value: null }
  return top
}