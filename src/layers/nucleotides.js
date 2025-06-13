import { scaleOrdinal } from "d3-scale";
import * as constants from "../lib/constants";

const decoder = new TextDecoder('ascii');

export default {
  name: "Nucleotides",
  datasetName: "nucleotides",
  baseURL: `${constants.baseURLPrefix}/20250612`,
  orders: [14,14],
  renderer: "CanvasTextValue",
  fieldChoice: d => ({ field: "basepair", value: decoder.decode(d.bytes)[0] }),
  fieldColor: scaleOrdinal()
    .domain(['A', 'C', 'G', 'T'])
    .range([
      "#ddd", // "steelblue", 
      "#ccc", // "orange", 
      "#ccc", // "darkorange", 
      "#ddd" // "cornflowerblue"
    ])
    .unknown("gray"),
  // used for the base canvas rendering
  strokeWidthMultiplier: 0.05,
  stroke: "gray",
  fill: "white",
}