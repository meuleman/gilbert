import { scaleOrdinal } from "d3-scale";
import { schemeTableau10 } from "d3-scale-chromatic";
import CanvasOpacityValue from "../components/CanvasOpacityValue";
import * as constants from "../lib/constants";

export default {
  name: "DHS Mean Signal",
  datasetName: "dhs_meansignal",
  baseURL: `${constants.baseURLPrefix}/20230724`,
  orders: [4,14],
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