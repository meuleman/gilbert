import { scaleOrdinal } from "d3-scale";
import * as constants from "../lib/constants";

let ukbb_94_fields = ["Adult height", "Age at menarche", "Age at menopause", "Alanine aminotransferase", "Albumin", "Albumin/Globulin ratio", "Alkaline phosphatase", "Alzheimer disease (LTFH)", "Apolipoprotein A", "Apolipoprotein B", "Aspartate aminotransferase", "Asthma", "Atrial fibrillation", "Autoimmune disease (Phecode + Self-reported)", "Balding Type 4", "Basophil count", "Blood clot in the leg", "Blood clot in the lung", "Body fat percentage", "Body mass index", "Body weight", "Breast cancer", "C-reactive protein", "Calcium", "Cholelithiasis", "Colorectal cancer", "Coronary artery disease", "Diastolic blood pressure", "Eosinophil count", "Estimated glomerular filtration rate (cystain C)", "Estimated glomerular filtration rate (serum creatinine)", "Estimated heel bone mineral density", "FEV1/FVC ratio", "Fed-up feelings", "Fibroblastic disorders", "Gamma-glutamyl transferase", "Glaucoma (Phecode + Self-reported)", "Glucose", "Guilty feelings", "Hematocrit", "Hemoglobin", "Hemoglobin A1c", "High density lipoprotein cholesterol", "Hypothyroidism", "Inflammatory bowel disease", "Inguinal hernia", "Insomnia", "Insulin-like growth factor 1", "Irritability", "Lipoprotein A", "Loneliness", "Loss of Y", "Low density lipoprotein cholesterol", "Lymphocyte count", "Mean arterial pressure", "Mean corpuscular hemoglobin", "Mean corpuscular hemoglobin concentration", "Mean corpuscular volume", "Migraine (Self-reported)", "Miserableness", "Monocyte count", "Mood swings", "Morning person", "Multi-site chronic pain", "Nervous feelings", "Neuroticism", "Neutrophil count", "Platelet count", "Pluse pressure", "Prostate cancer", "Red blood cell count", "Risk taking", "Seen doctor (GP) for nerves, anxiety, tension or depression", "Sensitivity", "Sex hormone binding globulin", "Smoking (cigarettes per day)", "Smoking (ever vs never)", "Suffer from nerves", "Systolic blood pressure", "Tense", "Testosterone", "Total bilirubin", "Total cholesterol", "Total protein", "Triglyceride", "Type 2 diabetes", "Type 2 diabetes (adjusted by BMI)", "Urea", "Uric acid", "Vitamin D", "Waist-to-hip ratio (adjusted by BMI)", "White blood cell count", "Worrier", "Worry too long after embarrassment"]

export default {
  name: "Variants (UKBB, 94 Traits)",
  datasetName: "ukbb_94_traits",
  baseURL: `${constants.baseS3URLPrefix}/20241021`,
  orders: [14,14],
  renderer: "CanvasSimpleValue",
  fieldChoice: decodeValue,
  fieldColor: scaleOrdinal()
    .domain(ukbb_94_fields)
    .range(ukbb_94_fields.map(d => "#39A939"))
    .unknown("#eee"),
  // used for the base canvas rendering
  strokeWidthMultiplier: 0.05,
  stroke: "gray",
  fill: "white"
}


// this function chooses the top value for a data point
function decodeValue(d) {
  let data = d.data;
  if(!data) return { field: "", value: null }
  let top = {
    field: ukbb_94_fields[data.max_field],
    value: data.max_value
  }
  if(top.value <= 0) return { field: "", value: null }
  return top
}