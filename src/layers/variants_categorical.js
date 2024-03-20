import { scaleOrdinal } from "d3-scale";
import CanvasSimpleValue from "../components/CanvasSimpleValue";
import * as constants from "../lib/constants";

export default {
  name: "Variants (Categorical)",
  datasetName: "variants_favor_categorical",
  // baseURL: "https://storage.googleapis.com/fun-data/hilbert/chromosomes_new",
  baseURL: `${constants.baseURLPrefix}/20240320`,
  orders: [14,14],
  renderer: CanvasSimpleValue,
  fieldChoice: topValue,
  fieldColor: scaleOrdinal()
    .domain(["possibly_damaging", "probably_damaging", "deleterious", "Likely_pathogenic", "Pathogenic", "Pathogenic/Likely_pathogenic", "drug_response","protective,_risk_factor", "risk_factor", "Conflicting_interpretations_of_pathogenicity","Affects", "Affects,_association", "Conflicting_interpretations_of_pathogenicity,_other","Pathogenic,_Affects", "Pathogenic,_risk_factor", "association", "protective"])
    .range(["#000000", "#ffe500","#fe8102","#ff0000","#07af00","#4c7d14","#414613","#05c1d9","#0467fd","#009588","#bb2dd4","#7a00ff","#4a6876","#08245b","#b9461d","#692108","#c3c3c3"])
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