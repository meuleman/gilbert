
import { scaleOrdinal } from "d3-scale";
import CanvasOpacityValue from "../components/CanvasOpacityValue";
import CanvasScaledValue from "../components/CanvasScaledValue";

export default {
  name: "DHS OE Chi",
  datasetName: "dhs_oe_chi",
  aggregateName: "sum",
  orders: [4,9],
  // renderer: CanvasOpacityValue,
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
  return Object.keys(data).map((f) => ({
    field: f,
    value: data[f]
  }))
  .sort((a,b) => b.value - a.value)[0]
}