
import { scaleOrdinal } from "d3-scale";
import CanvasOpacityValue from "../components/CanvasOpacityValue";


export default {
  name: "GC Content",
  datasetName: "gc_content",
  aggregateName: "sum",
  orders: [4,13],
  renderer: CanvasOpacityValue,    
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