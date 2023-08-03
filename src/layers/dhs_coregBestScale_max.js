import { scaleOrdinal } from "d3-scale";
import { schemeTableau10 } from "d3-scale-chromatic";
import CanvasOpacityValue from "../components/CanvasOpacityValue";

export default {
  name: "DHS Coregulation (Best Scale, Max)",
  datasetName: "dhs_coreg_best_scale_max",
  baseURL: `https://altius-gilbert.s3.us-west-2.amazonaws.com/20230803`,
  orders: [4,9],
  renderer: CanvasOpacityValue,
  fieldChoice: d => ({ 
    field: "max", 
    value: d.data?.max
  }),
  fieldColor: scaleOrdinal()
    .domain(["max"])
    .range(schemeTableau10)
    .unknown("white"),
  // used for the base canvas rendering
  strokeWidthMultiplier: 0.05,
  stroke: "gray",
  fill: "white"
}