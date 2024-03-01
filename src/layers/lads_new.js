
import { scaleOrdinal } from "d3-scale";
import CanvasSimpleValue from "../components/CanvasSimpleValue";
import * as constants from "../lib/constants";

export default {
  name: "LADs (NEW)",
  datasetName: "LADs_fract_map_named",
  // baseURL: "https://storage.googleapis.com/fun-data/hilbert/chromosomes_new",
  baseURL: `${constants.baseURLPrefix}/20240223`,
  orders: [4,11],
  renderer: CanvasSimpleValue,
  fieldChoice: topValue,
  fieldColor: scaleOrdinal()
    .domain(["Constitutive", "Constitutive_Inter", "Facultative"])
    .range(["#D82A2A", "blue", "#A0A0A0"])
    .unknown("white"),
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