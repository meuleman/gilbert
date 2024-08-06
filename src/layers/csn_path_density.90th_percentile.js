import { scaleOrdinal } from "d3-scale";
import { schemeTableau10 } from "d3-scale-chromatic";
import * as constants from "../lib/constants";

export default {
  name: "CSN Path Density (90th Percentile)",
  datasetName: "precomputed_csn_path_density_above_90th_percentile",
  baseURL: `${constants.baseURLPrefix}/20240806`,
  orders: [4,11],
  renderer: "CanvasOpacityValue",
  fieldChoice: d => ({ 
    field: "fraction_of_paths", 
    value: d.data?.fraction_of_paths
  }),
  fieldColor: scaleOrdinal()
    .domain(["fraction_of_paths"])
    .range(schemeTableau10)
    .unknown("white"),
  // used for the base canvas rendering
  strokeWidthMultiplier: 0.05,
  stroke: "gray",
  fill: "white"
}