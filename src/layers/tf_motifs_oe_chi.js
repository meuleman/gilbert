
import { scaleOrdinal } from "d3-scale";
import CanvasScaledValue from "../components/CanvasScaledValue";

const tfFields = ["AHR","AIRE","AP1/1","AP1/2","ARI5A","ARI5B","BATF","BCL6/1","BCL6/2","CCAAT/CEBP","CENBP","CPEB1","CREB/ATF/1","CREB/ATF/2","CREB/ATF/3","CREB3/XBP1","CTCF","CUX/1","CUX/2","CUX/3","CUX/4","DDIT3+CEBPA","DMRT1","DMRT3","E2F/1","E2F/2","E2F/3","E2F/4","EBF1","EGR","ETS/1","ETS/2","EVI1/MECOM","EWSR1/FLI1","Ebox/CACCTG","Ebox/CACGTG/1","Ebox/CACGTG/2","Ebox/CAGATGG","Ebox/CAGCTG","Ebox/CATATG","FEZF1","FOX/1","FOX/2","FOX/3","FOX/4","FOX/5","FOX/6","FOX/7","FOX/8","FOX/9","GATA","GC-tract","GCM","GFI","GLI","GLIS","GMEB2/1","GMEB2/2","GMEB2/3","GRHL","HAND1","HD/1","HD/10","HD/11","HD/12","HD/13","HD/14","HD/15","HD/16","HD/17","HD/18","HD/19","HD/2","HD/20","HD/21","HD/22","HD/23","HD/24","HD/25","HD/3","HD/4","HD/5","HD/6","HD/7","HD/8","HD/9","HEN1","HIC/1","HIC/2","HIF","HINFP1/1","HINFP1/2","HINFP1/3","HLTF","HOMEZ","HSF","HSFY2","INSM1","IRF/1","IRF/2","IRF/3","IRF/4","KAISO","KLF/SP/1","KLF/SP/2","KLF/SP/3","LEF1","LIN54","MAF","MBD2","MECP2","MEF2","MFZ1","MIES","MTF1","MYB/1","MYB/2","MYB/3","MYB/4","MYB/5","MZF1","NFAC/2","NFAT/1","NFAT/2","NFAT/3","NFAT/4","NFI/1","NFI/2","NFI/3","NFKB/1","NFKB/2","NFKB/3","NFY","NR/1","NR/10","NR/11","NR/12","NR/13","NR/14","NR/15","NR/16","NR/17","NR/18","NR/19","NR/2","NR/20","NR/3","NR/4","NR/5","NR/6","NR/7","NR/8","NR/9","NR2E3","NRF1","OCT4+SOX2","OSR2","OVOL1","P53-like/1","P53-like/2","P53-like/3","PAX-halfsite","PAX/1","PAX/2","PLAG1","POU/1","POU/2","POU/3","PRDM1","PRDM14","PRDM16","PRDM4","PRDM5","PRDM9","PROX1","RBPJ","REL-halfsite","REST/NRSF","RFX/1","RFX/2","RFX/3","RUNX/1","RUNX/2","SCRT1","SIX/1","SIX/2","SMAD","SMARCA1","SMARCA5","SNAI2","SOX/1","SOX/2","SOX/3","SOX/4","SOX/5","SOX/6","SOX/7","SOX/8","SPDEF/1","SPDEF/2","SPI","SPZ1","SREBF1","SRF","STAT/1","STAT/2","TATA","TBX/1","TBX/2","TBX/3","TBX/4","TCF/LEF","TEAD","TFAP2/1","TFAP2/2","TFCP2","THAP1","YY1","ZBED1","ZBTB14","ZBTB48","ZBTB49","ZBTB6","ZBTB7A","ZFN121","ZFX","ZIC","ZIC/2","ZIM3","ZKSCAN1","ZNF134","ZNF136","ZNF140","ZNF143","ZNF146","ZNF232","ZNF24","ZNF250","ZNF257","ZNF274","ZNF28","ZNF282","ZNF306","ZNF317","ZNF320","ZNF324","ZNF329","ZNF331","ZNF332","ZNF335","ZNF354","ZNF382","ZNF384/1","ZNF384/2","ZNF41","ZNF410","ZNF418","ZNF423","ZNF431","ZNF435","ZNF436","ZNF449","ZNF490","ZNF524","ZNF528","ZNF53","ZNF547","ZNF549","ZNF554","ZNF563","ZNF57","ZNF586","ZNF652","ZNF667","ZNF680","ZNF708","ZNF713","ZNF768","ZNF784","ZNF85","ZSCAN3","ZSCAN4"];
const tfColors = ["#23171b","#362357","#433087","#433087","#493dac","#493dac","#433087","#4b4bc9","#4b4bc9","#433087","#4959de","#4568ed","#433087","#433087","#433087","#433087","#4b4bc9","#4076f5","#4076f5","#4076f5","#4076f5","#433087","#3a84f9","#3a84f9","#3492f8","#3492f8","#3492f8","#3492f8","#2ea0f4","#4b4bc9","#2aaded","#2aaded","#4b4bc9","#2aaded","#23171b","#23171b","#23171b","#23171b","#23171b","#23171b","#4b4bc9","#26b9e4","#26b9e4","#26b9e4","#26b9e4","#26b9e4","#26b9e4","#26b9e4","#26b9e4","#26b9e4","#4b4bc9","#4b4bc9","#25c5d9","#4b4bc9","#4b4bc9","#4b4bc9","#26d0cd","#26d0cd","#26d0cd","#28dac0","#23171b","#2ce2b3","#2ce2b3","#2ce2b3","#2ce2b3","#2ce2b3","#2ce2b3","#2ce2b3","#2ce2b3","#2ce2b3","#2ce2b3","#2ce2b3","#2ce2b3","#2ce2b3","#2ce2b3","#2ce2b3","#2ce2b3","#2ce2b3","#2ce2b3","#2ce2b3","#2ce2b3","#2ce2b3","#2ce2b3","#2ce2b3","#2ce2b3","#2ce2b3","#23171b","#4b4bc9","#4b4bc9","#23171b","#4b4bc9","#4b4bc9","#4b4bc9","#33eaa5","#3bf098","#46f68b","#46f68b","#4b4bc9","#52fa7f","#52fa7f","#52fa7f","#52fa7f","#4b4bc9","#4b4bc9","#4b4bc9","#4b4bc9","#5ffc73","#6dfe68","#433087","#7dfd5e","#7dfd5e","#8cfc55","#4b4bc9","#9df94d","#4b4bc9","#adf545","#adf545","#adf545","#adf545","#adf545","#4b4bc9","#bcef3f","#bcef3f","#bcef3f","#bcef3f","#bcef3f","#cbe839","#cbe839","#cbe839","#bcef3f","#bcef3f","#bcef3f","#d9e034","#e5d730","#e5d730","#e5d730","#e5d730","#e5d730","#e5d730","#e5d730","#e5d730","#e5d730","#e5d730","#e5d730","#e5d730","#e5d730","#e5d730","#e5d730","#e5d730","#e5d730","#e5d730","#e5d730","#e5d730","#e5d730","#f0cd2c","#f9c229","#4b4bc9","#4b4bc9","#ffb526","#ffb526","#ffb526","#ffa824","#ffa824","#ffa824","#4b4bc9","#f9c229","#f9c229","#f9c229","#4b4bc9","#4b4bc9","#4b4bc9","#4b4bc9","#4b4bc9","#4b4bc9","#ff9b21","#ff8d1f","#bcef3f","#4b4bc9","#ff7e1d","#ff7e1d","#ff7e1d","#ff701a","#ff701a","#4b4bc9","#f76218","#f76218","#ee5315","#e34613","#e34613","#4b4bc9","#5ffc73","#5ffc73","#5ffc73","#5ffc73","#5ffc73","#5ffc73","#5ffc73","#5ffc73","#2aaded","#2aaded","#2aaded","#d6390f","#d6390f","#8cfc55","#c92d0c","#c92d0c","#bb2309","#ae1a05","#ae1a05","#ae1a05","#ae1a05","#5ffc73","#a21302","#990e00","#990e00","#28dac0","#920c00","#4b4bc9","#4b4bc9","#4b4bc9","#4b4bc9","#4b4bc9","#4b4bc9","#4b4bc9","#4b4bc9","#4b4bc9","#4b4bc9","#4b4bc9","#4b4bc9","#4b4bc9","#4b4bc9","#4b4bc9","#4b4bc9","#4b4bc9","#4b4bc9","#4b4bc9","#4b4bc9","#4b4bc9","#4b4bc9","#4b4bc9","#4b4bc9","#4b4bc9","#4b4bc9","#4b4bc9","#4b4bc9","#4b4bc9","#4b4bc9","#4b4bc9","#4b4bc9","#4b4bc9","#4b4bc9","#4b4bc9","#4b4bc9","#4b4bc9","#4b4bc9","#4b4bc9","#4b4bc9","#4b4bc9","#4b4bc9","#4b4bc9","#4b4bc9","#4b4bc9","#4b4bc9","#4b4bc9","#4b4bc9","#4b4bc9","#4b4bc9","#4b4bc9","#4b4bc9","#4b4bc9","#4b4bc9","#4b4bc9","#4b4bc9","#4b4bc9","#4b4bc9","#4b4bc9","#4b4bc9","#4b4bc9","#4b4bc9","#4b4bc9","#4b4bc9","#4b4bc9"]

export default {
  name: "TF Motifs OE Chi",
  datasetName: "tf_motifs_oe_chi",
  baseURL: "https://storage.googleapis.com/fun-data/hilbert/chromosomes_new",
  orders: [4,10],
  renderer: CanvasScaledValue,
  fieldChoice: topValue,
  fieldColor: scaleOrdinal()
    .domain(tfFields)
    .range(tfColors)
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