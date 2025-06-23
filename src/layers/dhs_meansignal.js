import { scaleOrdinal } from "d3-scale";
import { schemeTableau10 } from "d3-scale-chromatic";
import * as constants from "../lib/constants";

export default {
  name: "DHS Mean Signal",
  datasetName: "dhs_meansignal",
  labelName: "DHS Signal",
  baseURL: `${constants.baseURLPrefix}/20230724`,
  orders: [4,13],
  renderer: "CanvasOpacityValue",
  fieldChoice: d => ({ 
    field: "mean", 
    value: d.data?.mean
  }),
  fieldColor: scaleOrdinal()
    .domain(["mean"])
    .range(schemeTableau10)
    .unknown("white"),
  // used for the base canvas rendering
  strokeWidthMultiplier: 0.05,
  stroke: "gray",
  fill: "white"
}