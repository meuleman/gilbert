import { scaleOrdinal } from "d3-scale";
import Badge from "../components/Tooltips/Badge";

const decoder = new TextDecoder('ascii');

import nucleotides from "./nucleotides"
import variants_apc from "./variants_apc"
import variants_ukbb_94 from "./variants_ukbb_94"
import variants_categorical from "./variants_categorical"

let layers = [
  nucleotides,
  variants_categorical,
  variants_apc,
  variants_ukbb_94,
]

function getProteinFunction(d) {
  if(d["SIFT: deleterious"]) return 3
  if(d["PolyPhen: probably damaging"]) return 2
  if(d["PolyPhen: possibly damaging"]) return 1
  return 0
}
function getClinVarSig(d) {
  let keys = Object.keys(d)
  for(let i = 0; i < keys.length; i++) {
    let k = keys[i]
    if((k.indexOf("ClinVar Sig") >= 0) && d[k]) {
      return d[k]
    }
  }
  return 0
}
function getConservation(d) {
  return d["apc_conservation_v2"]
}
function getGWAS(d) {
  return d["max_value"]
}



export default {
  name: "Nucleotide Badges",
  datasetName: "badges",
  baseURL: "https://storage.googleapis.com/fun-data/hilbert/chromosomes_new",
  orders: [14,14],
  renderer: "CanvasOrder14",    
  tooltip: Badge,
  // this is a combination layer that will fetch data from multiple layers
  layers,
  // combine the data we want into a single data element
  combiner: (datasets) => {
    let combined = datasets[0].map(d => ({
      ...d,
      data: {...d.data, nucleotide: decoder.decode(d.bytes)[0] }
    }))
    datasets.slice(1).forEach((dataset, l) => {
      let layer = layers[l+1]
      return dataset.forEach((d,i) => {
        let retdata = Object.assign(combined[i].data, d.data)
        if(layer.datasetName == "variants_favor_categorical") {
          retdata.protein_function = getProteinFunction(d.data)
          retdata.clinvar_sig =  getClinVarSig(d.data)
        } else if(layer.datasetName == "variants_favor_apc"){
          retdata.conservation = getConservation(d.data)
        } else if(layer.datasetName == "ukbb_94_traits"){
          retdata.gwas = getGWAS(d.data)
        }
        combined[i].data = retdata
      })
    })
    return combined
  },
  fieldChoice: d => ({ field: "badge", value: true }),
  nucleotideColor: scaleOrdinal()
    .domain(['A', 'C', 'G', 'T'])
    .range([
      "#ddd", // "steelblue", 
      "#ccc", // "orange", 
      "#ccc", // "darkorange", 
      "#ddd" // "cornflowerblue"
    ])
    .unknown("gray"),
  fieldColor: scaleOrdinal()
    .domain([
      "Protein Function", 
      "ClinVar Sig", 
      "Conservation", 
      "GWAS"
    ])
    .range([
      "#D34747",
      "#D38647",
      "#2B7E7E",
      "#39A939"
    ])
    .unknown("gray"),
  // used for the base canvas rendering
  strokeWidthMultiplier: 0.05,
  stroke: "gray",
  fill: "white",
}