import { scaleOrdinal } from "d3-scale";
import { schemeTableau10 } from "d3-scale-chromatic";
import * as constants from "../lib/constants";

export default {
  name: "DHS Density",
  datasetName: "dhs_density",
  baseURL: `${constants.baseURLPrefix}/20230724`,
  orders: [4,13],
  renderer: "CanvasOpacityValue",
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