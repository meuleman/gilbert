
import { scaleOrdinal } from "d3-scale";
import { schemeTableau10 } from "d3-scale-chromatic";
import * as constants from "../lib/constants";

export default {
  name: "Gene Density",
  datasetName: "gene_density",
  baseURL: `${constants.baseURLPrefix}/20250612`,
  orders: [4,9],
  renderer: "CanvasOpacityValue",    
  fieldChoice: d => ({ field: "protein_coding", value: d.data?.protein_coding}),
  fieldColor: scaleOrdinal()
    .domain(["protein_coding", "lncRNA", "processed_pseudogene", "unprocessed_pseudogene", "miRNA", "snRNA", "misc_RNA", "TEC"])
    .range(schemeTableau10)
    .unknown("white"),
  // used for the base canvas rendering
  strokeWidthMultiplier: 0.05,
  stroke: "gray",
  fill: "white"
}