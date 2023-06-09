
import { scaleOrdinal } from "d3-scale";
import CanvasOpacityValue from "../components/CanvasOpacityValue";


export default {
  name: "GC Content",
  datasetName: "gc_content",
  baseURL: "https://storage.googleapis.com/fun-data/hilbert/chromosomes_new",
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