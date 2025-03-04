import { scaleOrdinal } from "d3-scale";
import * as constants from "../lib/constants";

export default {
  name: "Variants (Categorical)",
  datasetName: "variants_favor_categorical",
  labelName: "Categorical Variant",
  // baseURL: "https://storage.googleapis.com/fun-data/hilbert/chromosomes_new",
  baseURL: `${constants.baseS3URLPrefix}/20240325`,
  orders: [14,14],
  renderer: "CanvasSimpleValue",
  fieldChoice: topValue,
  fieldColor: scaleOrdinal()
    .domain([
      "PolyPhen: possibly damaging", 
      "PolyPhen: probably damaging", 
      "SIFT: deleterious", 
      "ClinVar Sig: Likely pathogenic", 
      "ClinVar Sig: Pathogenic", 
      "ClinVar Sig: Pathogenic/Likely pathogenic", 
      "ClinVar Sig: drug response", 
      "ClinVar Sig: protective, risk factor", 
      "ClinVar Sig: risk factor", 
      "ClinVar Sig: Conflicting interpretations of pathogenicity", 
      "ClinVar Sig: Affects", 
      "ClinVar Sig: Affects, association", 
      "ClinVar Sig: Conflicting interpretations of pathogenicity, other", 
      "ClinVar Sig: Pathogenic, Affects", 
      "ClinVar Sig: Pathogenic, risk factor", 
      "ClinVar Sig: association", 
      "ClinVar Sig: protective"
    ])
    .range([
      "#D34747", // "#ffe500",
      "#D34747",// "#fe8102",
      "#D34747",// "#ff0000",
      "#D38647", // "#000000", 
      "#D38647",// "#07af00",
      "#D38647",// "#4c7d14",
      "#D38647",// "#414613",
      "#D38647",// "#05c1d9",
      "#D38647",// "#0467fd",
      "#D38647",// "#009588",
      "#D38647",// "#bb2dd4",
      "#D38647",// "#7a00ff",
      "#D38647",// "#4a6876",
      "#D38647",// "#08245b",
      "#D38647",// "#b9461d",
      "#D38647",// "#692108",
      "#D38647"// "#c3c3c3"
    ])
    .unknown("#eee"),
  // used for the base canvas rendering
  strokeWidthMultiplier: 0.05,
  stroke: "gray",
  fill: "white"
}


// this function chooses the top value for a data point
function topValue(d) {
  let data = d.data
  if(!data) return { field: "", value: null }
  let top = Object.keys(data).map((f) => ({
    field: f,
    value: data[f]
  }))
  .sort((a,b) => b.value - a.value)[0]
  if(top?.value <= 0) return { field: "", value: null }
  return top
}