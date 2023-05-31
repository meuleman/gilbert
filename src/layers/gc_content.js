
import { scaleOrdinal } from "d3-scale";
import CanvasOpacityValue from "../components/CanvasOpacityValue";


export default {
  name: "GC Content",
  datasetName: "gc_content",
  aggregateName: "sum",
  orders: [4,13],
  renderer: CanvasOpacityValue,    
  fieldChoice: d => ({ field: "gc_content", value: d.gc_content}),
  fieldColor: scaleOrdinal()
    .domain(["gc_content"])
    .range(["black"])
    .unknown("white"),
  stroke: "gray",
  fill: "white",
  strokeWidthMultiplier: 0.05
}