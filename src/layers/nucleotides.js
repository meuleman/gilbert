import { scaleOrdinal } from "d3-scale";
import CanvasTextValue from "../components/CanvasTextValue";

const decoder = new TextDecoder('ascii');

export default {
  name: "Nucleotides",
  datasetName: "grc",
  orders: [14,14],
  renderer: CanvasTextValue,    
  fieldChoice: d => ({ field: "basepair", value: decoder.decode(d.bytes)[0] }),
  fieldColor: scaleOrdinal()
    .domain(['A', 'C', 'G', 'T'])
    .range(["steelblue", "orange", "darkorange", "cornflowerblue"])
    .unknown("gray"),
  // used for the base canvas rendering
  strokeWidthMultiplier: 0.05,
  stroke: "gray",
  fill: "white",
}