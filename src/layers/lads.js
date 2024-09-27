
import { scaleOrdinal } from "d3-scale";
import * as constants from "../lib/constants";

export default {
  name: "LADs",
  datasetName: "aggregated_LADs",
  baseURL: `${constants.baseURLPrefix}/20231030`,  // removed from s3
  orders: [4,8],
  renderer: "CanvasSimpleValue",    
  fieldChoice: bandsValue,
  fieldColor: scaleOrdinal()
    .domain(["Constitutive", "Constitutive_Inter", "Facultative"])
    .range(["#D82A2A", "blue", "#A0A0A0"])
    .unknown("white"),
  // used for the base canvas rendering
  strokeWidthMultiplier: 0.05,
  stroke: "gray",
  fill: "white"
}

function bandsValue(d) {
  let data = d.data
  if(!data) return { field: "", value: 0 }
  // the order in which we check matters a lot here.
  if(data.Constitutive) return { field: "Constitutive", value: data.Constitutive }
  if(data.Constitutive_Inter) return { field: "Constitutive_Inter", value: data.Constitutive_Inter }
  if(data.Facultative) return { field: "Facultative", value: data.Facultative }
  return { field: "", value: 0 }
}