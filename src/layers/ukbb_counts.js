
import { scaleOrdinal } from "d3-scale";
import { schemeTableau10 } from "d3-scale-chromatic";
import CanvasOpacityValue from "../components/CanvasOpacityValue";


export default {
  name: "UKBB Counts",
  datasetName: "ukbb_gwas_counts",
  baseURL: "https://storage.googleapis.com/fun-data/hilbert/chromosomes_new",
  orders: [4,10],
  renderer: CanvasOpacityValue,    
  fieldChoice: d => ({ field: "count", value: d.data?.count}),
  fieldColor: scaleOrdinal()
    .domain(["count"])
    .range(schemeTableau10)
    .unknown("white"),
  // used for the base canvas rendering
  strokeWidthMultiplier: 0.05,
  stroke: "gray",
  fill: "white"
}