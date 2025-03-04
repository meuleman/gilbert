import { scaleOrdinal } from "d3-scale";
import * as constants from "../lib/constants";

// const fullFields = ["Placental / trophoblast","Lymphoid","Myeloid / erythroid","Cardiac","Musculoskeletal","Vascular / endothelial","Primitive / embryonic","Neural","Digestive","Stromal A","Stromal B","Renal / cancer","Cancer / epithelial","Pulmonary devel.","Organ devel. / renal","Tissue invariant"]
// const dhsColors = ["#ffe500","#fe8102","#ff0000","#07af00","#4c7d14","#414613","#05c1d9","#0467fd","#009588","#bb2dd4","#7a00ff","#4a6876","#08245b","#b9461d","#692108","#c3c3c3"]

export default {
  name: "DHS Components (OCC)",
  datasetName: "dhs_occ",
  labelName: "DHS Occurrence",
  baseURL: `${constants.baseS3URLPrefix}/20241127`,
  orders: [4,14],
  renderer: "CanvasScaledValue",
  fieldChoice: decodeValue,
  fieldColor: scaleOrdinal()
    .domain(
      ["Placental / trophoblast","Lymphoid","Myeloid / erythroid","Cardiac","Musculoskeletal","Vascular / endothelial","Primitive / embryonic","Neural","Digestive","Stromal A","Stromal B","Renal / cancer","Cancer / epithelial","Pulmonary devel.","Organ devel. / renal","Tissue invariant"]
    )
    .range(
      ["#ffe500","#fe8102","#ff0000","#07af00","#4c7d14","#414613","#05c1d9","#0467fd","#009588","#bb2dd4","#7a00ff","#4a6876","#08245b","#b9461d","#692108","#c3c3c3"]
    )
    .unknown("#eee"),
  // used for the base canvas rendering
  strokeWidthMultiplier: 0.05,
  stroke: "gray",
  fill: "white",
  topValues: true
}


function decodeValue(d) {
  const fullFields = ["Placental / trophoblast","Lymphoid","Myeloid / erythroid","Cardiac","Musculoskeletal","Vascular / endothelial","Primitive / embryonic","Neural","Digestive","Stromal A","Stromal B","Renal / cancer","Cancer / epithelial","Pulmonary devel.","Organ devel. / renal","Tissue invariant"]
  let data = d.data;
  if(!data) return { field: "", value: null }
  let top = {
    field: fullFields[data.max_field],
    value: data.max_value
  }
  // let top = Object.keys(data).map((f) => ({
  //   field: f,
  //   value: data[f]
  // })).sort((a,b) => b.value - a.value)[0]
  if(!top) return { field: "", value: null }
  if(top.value <= 0) return { field: "", value: null }
  return top
}