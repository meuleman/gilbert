
import { scaleOrdinal } from "d3-scale";
import CanvasSimpleValue from "../components/CanvasSimpleValue";

export default {
  name: "Bands",
  datasetName: "bands",
  aggregateName: "bands",
  orders: [4,7],
  renderer: CanvasSimpleValue,    
  fieldChoice: bandsValue,
  fieldColor: scaleOrdinal()
    .domain(["gpos25", "gpos50", "gpos75", "gpos100", "gneg", "acen"])
    .range(["#ccc", "#aaa", "#999", "#666", "white", "pink"])
    .unknown("white"),
  stroke: "gray",
  fill: "white",
  strokeWidthMultiplier: 0.05
}

function bandsValue(data) {
  // the order in which we check matters a lot here.
  if(data.acen) return { field: "acen", value: data.acen }
  if(data.gpos100) return { field: "gpos100", value: data.gpos100 }
  if(data.gpos75) return { field: "gpos75", value: data.gpos75 }
  if(data.gpos50) return { field: "gpos50", value: data.gpos50 }
  if(data.gpos25) return { field: "gpos25", value: data.gpos25 }
  return { field: "", value: 0 }
}