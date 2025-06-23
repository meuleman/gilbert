
import { scaleOrdinal } from "d3-scale";
import * as constants from "../lib/constants";

export default {
  name: "GC Content",
  datasetName: "gc_content",
  labelName: "GC Content",
  baseURL: `${constants.baseURLPrefix}/20250612`,
  orders: [4,13],
  renderer: "CanvasOpacityValue",    
  fieldChoice: d => ({ field: "gc_content", value: d.data?.gc_content}),
  fieldColor: scaleOrdinal()
    .domain(["gc_content"])
    .range(["black"])
    .unknown("white"),
  // used for the base canvas rendering
  strokeWidthMultiplier: 0.05,
  stroke: "gray",
  fill: "white"
}