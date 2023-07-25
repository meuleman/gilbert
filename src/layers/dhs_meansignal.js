import { scaleOrdinal } from "d3-scale";
import { schemeTableau10 } from "d3-scale-chromatic";
import CanvasOpacityValue from "../components/CanvasOpacityValue";

export default {
  name: "DHS Mean Signal",
  datasetName: "dhs_meansignal",
  baseURL: `https://altius-gilbert.s3.us-west-2.amazonaws.com/20230724`,
  orders: [4,13],
  renderer: CanvasOpacityValue,
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