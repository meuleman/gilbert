import { scaleOrdinal } from "d3-scale";
// import { d3Interpolate } from 'd3-interpolate';
import { schemeTableau10 } from "d3-scale-chromatic";
import * as constants from "../lib/constants";

export default {
  name: "K562 DNase-seq",
  datasetName: "encode_ENCSR000EOT_max",
  labelName: "K562 DNase-seq",
  baseURL: `${constants.baseURLPrefix}/20230727`,
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