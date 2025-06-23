import { scaleOrdinal } from "d3-scale";
// import { d3Interpolate } from 'd3-interpolate';
import { schemeTableau10 } from "d3-scale-chromatic";
import * as constants from "../lib/constants";

export default {
  name: "CD3+ DNase-seq",
  datasetName: "encode_CD3_D2_Stim_AG90658_output_2.5.1_max",
  labelName: "CD3+ DNase-seq",
  baseURL: `${constants.baseURLPrefix}/20231030`,
  orders: [4,13],
  renderer: "CanvasOpacityValue",
  fieldChoice: d => ({ field: "max", value: d.data?.max}),
  fieldColor: scaleOrdinal()
    .domain(["max"])
    .range(schemeTableau10)
    .unknown("white"),
  // used for the base canvas rendering
  strokeWidthMultiplier: 0.05,
  stroke: "gray",
  fill: "white"
}