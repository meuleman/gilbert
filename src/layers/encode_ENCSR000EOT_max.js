import { scaleOrdinal } from "d3-scale";
// import { d3Interpolate } from 'd3-interpolate';
import { schemeTableau10 } from "d3-scale-chromatic";
import CanvasOpacityValue from "../components/CanvasOpacityValue";

export default {
  name: "ENCODE (ENCSR000EOT) Max",
  datasetName: "encode_ENCSR000EOT_max",
  baseURL: `https://altius-gilbert.s3.us-west-2.amazonaws.com/20230727`,
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