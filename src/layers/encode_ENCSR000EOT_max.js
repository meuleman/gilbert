import { scaleOrdinal } from "d3-scale";
// import { d3Interpolate } from 'd3-interpolate';
import { schemeTableau10 } from "d3-scale-chromatic";
import CanvasOpacityValue from "../components/CanvasOpacityValue";
import * as constants from "../lib/constants";

export default {
  name: "K562 DNase-seq",
  datasetName: "encode_ENCSR000EOT_max",
  baseURL: `${constants.baseURLPrefix}/20230727`,
  orders: [4,14],
  renderer: CanvasOpacityValue,
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