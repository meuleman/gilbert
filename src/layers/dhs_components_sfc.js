
import { scaleOrdinal } from "d3-scale";
import CanvasScaledValue from "../components/CanvasScaledValue";

export default {
  name: "DHS Components SFC",
  datasetName: "dhs_sfc",
  // baseURL: "https://storage.googleapis.com/fun-data/hilbert/chromosomes_new",
  baseURL: `https://altius-gilbert.s3.us-west-2.amazonaws.com/20230622`,
  orders: [4,12],
  renderer: CanvasScaledValue,
  fieldChoice: topValue,
  fieldColor: scaleOrdinal()
    .domain(["Placental / trophoblast","Lymphoid","Myeloid / erythroid","Cardiac","Musculoskeletal","Vascular / endothelial","Primitive / embryonic","Neural","Digestive","Stromal A","Stromal B","Renal / cancer","Cancer / epithelial","Pulmonary devel.","Organ devel. / renal","Tissue invariant"])
    .range(["#ffe500","#fe8102","#ff0000","#07af00","#4c7d14","#414613","#05c1d9","#0467fd","#009588","#bb2dd4","#7a00ff","#4a6876","#08245b","#b9461d","#692108","#c3c3c3"])
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
  if(top.value <= 0) return { field: "", value: null }
  return top
}