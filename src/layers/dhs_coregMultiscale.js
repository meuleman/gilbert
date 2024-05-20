import { scaleOrdinal } from "d3-scale";
import { schemeTableau10 } from "d3-scale-chromatic";
import * as constants from "../lib/constants";

export default {
  name: "DHS Coregulation (Multiscale)",
  datasetName: "dhs_coreg_multiscale",
  baseURL: `${constants.baseURLPrefix}/20230802`,
  orders: [4,9],
  renderer: "CanvasOpacityValue",
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