import { scaleOrdinal } from "d3-scale";
import { schemeTableau10 } from "d3-scale-chromatic";
import CanvasOpacityValue from "../components/CanvasOpacityValue";

export default {
  name: "DHS Coregulation (Best Scale, Density)",
  datasetName: "dhs_coreg_best_scale_density",
  baseURL: `https://altius-gilbert.s3.us-west-2.amazonaws.com/20230803`,
  orders: [4,9],
  renderer: CanvasOpacityValue,
  fieldChoice: d => ({ 
    field: "count", 
    value: d.data?.count
  }),
  fieldColor: scaleOrdinal()
    .domain(["count"])
    .range(schemeTableau10)
    .unknown("white"),
  // used for the base canvas rendering
  strokeWidthMultiplier: 0.05,
  stroke: "gray",
  fill: "white"
}