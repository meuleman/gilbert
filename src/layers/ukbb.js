
import { scaleSequential, scaleOrdinal } from "d3-scale";
import { range } from "d3-array";
import { interpolateViridis } from "d3-scale-chromatic";
import CanvasScaledValue from "../components/CanvasScaledValue";


export default {
  name: "UKBB GWAS",
  datasetName: "ukbb_gwas",
  baseURL: "https://storage.googleapis.com/fun-data/hilbert/chromosomes_new",
  orders: [12,13],
  renderer: CanvasScaledValue,    
  fieldChoice,
  fieldColor: scaleOrdinal()
    .domain(["pval"])
    .range(["steelblue"])
    .unknown("white"),
  // fieldColor: scaleSequential(interpolateViridis)
  //   .domain(range(0, 3575))
  //   .unknown("white"),
  // used for the base canvas rendering
  strokeWidthMultiplier: 0.05,
  stroke: "gray",
  fill: "white"
}

function decodeSnp(uint32) {
  return String.fromCharCode(
    (uint32 >> 24) & 0xFF,
    (uint32 >> 16) & 0xFF,
    (uint32 >> 8) & 0xFF,
    uint32 & 0xFF
);
}

function fieldChoice(d) {
  let data = d.data
  if(!data) return { field: "", value: 0 }

  return { 
    field: "pval",
    value: data.pval,
    phenotype: data.phenotype_index, 
    snp: decodeSnp(data.snp1) + decodeSnp(data.snp2) + decodeSnp(data.snp3)
  }
}