import { scaleOrdinal } from "d3-scale";
// import { d3Interpolate } from 'd3-interpolate';
import { schemeTableau10 } from "d3-scale-chromatic";
import CanvasOpacityValue from "../components/CanvasOpacityValue";
import * as constants from "../lib/constants";

export default {
  name: "CD3+ Fiber-seq",
  datasetName: "fs_CD3_HAP1d2stim_mean",
  baseURL: `${constants.baseURLPrefix}/20231101`,
  orders: [4,13],
  renderer: CanvasOpacityValue,
  fieldChoice: d => ({ field: "mean", value: d.data?.mean}),
  fieldColor: scaleOrdinal()
    .domain(["mean"])
    .range(schemeTableau10)
    .unknown("white"),
  // used for the base canvas rendering
  strokeWidthMultiplier: 0.05,
  stroke: "gray",
  fill: "white"
}