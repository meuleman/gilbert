
import { scaleSequential, scaleOrdinal } from "d3-scale";
import { range } from "d3-array";
import { interpolateViridis } from "d3-scale-chromatic";
import { csv } from "d3-fetch";
import CanvasScaledValue from "../components/CanvasScaledValue";

let phenotypes = (await csv("src/data/phenotypes.csv")).map(d => d.phenotype)

export default {
  name: "UKBB GWAS",
  datasetName: "ukbb_gwas",
  baseURL: "https://storage.googleapis.com/fun-data/hilbert/chromosomes_new",
  orders: [12,13],
  renderer: CanvasScaledValue,    
  fieldChoice,
  fieldSummary,
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
    (uint32) & 0xFF,
    (uint32 >> 8) & 0xFF,
    (uint32 >> 16) & 0xFF,
    (uint32 >> 24) & 0xFF
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

function fieldSummary(d) {
  let sample = fieldChoice(d);
  let pval = Math.pow(10, -1*sample.value/100000)
  let summary = `${phenotypes[sample.phenotype]}:\n(SNP: ${sample.snp})\n${sample.field}: ${pval}`
  return summary;
}