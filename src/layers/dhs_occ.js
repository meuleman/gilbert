import { scaleOrdinal } from "d3-scale";
import CanvasScaledValue from "../components/CanvasScaledValue";
import * as constants from "../lib/constants";

const dhsFields = ["Placental / trophoblast","Lymphoid","Myeloid / erythroid","Cardiac","Musculoskeletal","Vascular / endothelial","Primitive / embryonic","Neural","Digestive","Stromal A","Stromal B","Renal / cancer","Cancer / epithelial","Pulmonary devel.","Organ devel. / renal","Tissue invariant"]
const dhsColors = ["#ffe500","#fe8102","#ff0000","#07af00","#4c7d14","#414613","#05c1d9","#0467fd","#009588","#bb2dd4","#7a00ff","#4a6876","#08245b","#b9461d","#692108","#c3c3c3"]

export default {
  name: "DHS Components (OCC)",
  datasetName: "dhs_occ",
  baseURL: `${constants.baseURLPrefix}/20240404`,
  orders: [4,14],
  renderer: CanvasScaledValue,
  fieldChoice: decodeValue,
  fieldColor: scaleOrdinal()
    .domain(dhsFields)
    .range(dhsColors)
    .unknown("#eee"),
  // used for the base canvas rendering
  strokeWidthMultiplier: 0.05,
  stroke: "gray",
  fill: "white"
}


function decodeValue(d) {
  let data = d.data;
  if(!data) return { field: "", value: null }
  let top = {
    field: dhsFields[data.max_field],
    value: data.max_value
  }
  if(top?.value <= 0) return { field: "", value: null }
  return top
}