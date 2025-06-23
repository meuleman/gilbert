import fieldMapping from './field_mapping.json'

import Bands from './bands'
import GCContent from './gc_content'
import GeneCounts from './gene_counts'
import Nucleotides from './nucleotides'
import Variants_cat from './variants_categorical'
import Variants_cat_rank from './variants_rank_categorical'
import Variants_aPC from './variants_apc'
import Variants_aPC_rank from './variants_rank_apc'
import Variants_GWAS from './variants_gwas'
import Variants_GWAS_rank from './variants_rank_gwas'
import variants_ukbb_94 from './variants_ukbb_94'
import DHS_OCC from './dhs_occ'
import DHS_rank_OCC from './dhs_rank_occ'
import DHS_enr from './dhs_components_enr'
import DHS_enr_max from './dhs_components_enr_max'
import DHS_enr_counts from './dhs_components_enr_counts'
import DHS_Mean_Signal from './dhs_meansignal'
import DHS_Density from './dhs_density'
import chromatin_states_occ from './chromatin_states_occ'
import chromatin_states_rank_occ from './chromatin_states_rank_occ'
import chromatin_states_enr from './chromatin_states_enr'
import chromatin_states_enr_max from './chromatin_states_enr_max'
import chromatin_states_enr_counts from './chromatin_states_enr_counts'
import tf_motifs_1en6_enr_max from './tf_motifs_1en6_enr_max'
import tf_motifs_1en6_enr_top10 from './tf_motifs_1en6_enr_top10'
import tf_motifs_1en6_enr_top10_counts from './tf_motifs_1en6_enr_top10_counts'
import tf_motifs_1en6_occ from './tf_motifs_1en6_occ'
import tf_motifs_1en6_rank_occ from './tf_motifs_1en6_rank_occ'
import Repeats_enr from './repeats_enr'
import Repeats_enr_max from './repeats_enr_max'
import Repeats_enr_counts from './repeats_enr_counts'
import Repeats_occ from './repeats_occ'
import Repeats_rank_occ from './repeats_rank_occ'
import ENCSR000EOT from './encode_ENCSR000EOT_max'
import CD3 from './encode_CD3_D2_Stim_AG90658_output_2.5.1_max'
import CD3Fiberseq from './fiberseq_CD3_HAP1d2stim_mean'
import LADs_occ from './lads_occ'
import NucleotideBadges from './order_14'
import CSN_path_density_90 from './csn_path_density.90th_percentile'


const fullList = [
  Bands,
  GeneCounts,
  GCContent,
  NucleotideBadges,
  Nucleotides,
  Variants_cat,
  Variants_cat_rank,
  Variants_aPC,
  Variants_aPC_rank,
  Variants_GWAS,
  Variants_GWAS_rank,
  variants_ukbb_94,
  DHS_OCC,
  DHS_rank_OCC,
  DHS_enr,
  DHS_enr_max,
  DHS_enr_counts,
  DHS_Mean_Signal,
  DHS_Density,
  chromatin_states_occ,
  chromatin_states_rank_occ,
  chromatin_states_enr,
  chromatin_states_enr_max,
  chromatin_states_enr_counts,
  tf_motifs_1en6_enr_max,
  tf_motifs_1en6_enr_top10,
  tf_motifs_1en6_enr_top10_counts,
  tf_motifs_1en6_occ,
  tf_motifs_1en6_rank_occ,
  Repeats_enr,
  Repeats_enr_max,
  Repeats_enr_counts,
  Repeats_occ,
  Repeats_rank_occ,
  ENCSR000EOT,
  CD3,
  CD3Fiberseq,
  LADs_occ,
  CSN_path_density_90,
]

// list for dropdown menu
const dropdownList = [
  Bands,
  GeneCounts,
  GCContent,
  NucleotideBadges,
  Nucleotides,
  Variants_cat,
  Variants_aPC,
  variants_ukbb_94,
  DHS_OCC,
  DHS_enr_max,
  DHS_Mean_Signal,
  DHS_Density,
  chromatin_states_occ,
  chromatin_states_enr_max,
  tf_motifs_1en6_enr_max,
  tf_motifs_1en6_occ,
  Repeats_enr_max,
  Repeats_occ,
  ENCSR000EOT,
  CD3,
  CD3Fiberseq,
  LADs_occ,
  CSN_path_density_90,
]

const layerMapping = {
  'DHS': {
    'ENR': {
      'default': fullList.find(d => d.name == "DHS Components (ENR, Full)"),
      'max': fullList.find(d => d.name == "DHS Components (ENR)"),
      'counts': fullList.find(d => d.name == "DHS Components (ENR, Counts)"),
    },
    'OCC': {
      'default': fullList.find(d => d.name == "DHS Components (OCC)"),
      'rank': fullList.find(d => d.name == "DHS Components (OCC, Ranked)"),
    }
  },
  'chromatinStates': {
    'ENR': {
      'default': fullList.find(d => d.name == "Chromatin States (ENR, Full)"),
      'max': fullList.find(d => d.name == "Chromatin States (ENR)"),
      'counts': fullList.find(d => d.name == "Chromatin States (ENR, Counts)"),
    },
    'OCC': {
      'default': fullList.find(d => d.name == "Chromatin States (OCC)"),
      'rank': fullList.find(d => d.name == "Chromatin States (OCC, Ranked)"),
    },
  },
  'tfMotifs': {
    'ENR': {
      'default': fullList.find(d => d.name == "TF Motifs (ENR, Top 10)"),
      'max': fullList.find(d => d.name == "TF Motifs (ENR)"),
      'counts': fullList.find(d => d.name == "TF Motifs (ENR, Top 10, Counts)"),
    },
    'OCC': {
      'default': fullList.find(d => d.name == "TF Motifs (OCC)"),
      'rank': fullList.find(d => d.name == "TF Motifs (OCC, Ranked)"),
    },
  },
  'repeats': {
    'ENR': {
      'default': fullList.find(d => d.name == "Repeats (ENR, Full)"),
      'max': fullList.find(d => d.name == "Repeats (ENR)"),
      'counts': fullList.find(d => d.name == "Repeats (ENR, Counts)"),
    },
    'OCC': {
      'default': fullList.find(d => d.name == "Repeats (OCC)"),
      'rank': fullList.find(d => d.name == "Repeats (OCC, Ranked)"),
    },
  },
  'UKBB': {
    'variant': {
      'default': fullList.find(d => d.name == "Variants (UKBB, 94 Traits)"),
    },
  },
  'categorical': {
    'variant' : {
      'default': fullList.find(d => d.name == "Variants (Categorical)"),
      'rank': fullList.find(d => d.name == "Variants (Categorical, Ranked)"),
    },
  },
  'aPC': {
    'variant': {
      'default': fullList.find(d => d.name == "Variants (aPC)"),
      'rank': fullList.find(d => d.name == "Variants (aPC, Ranked)"),
    }
  }
}

function findLayerMappingPath(layer) {
    const layerName = layer?.name;
    
    if (!layerName) return null;
    
    for (const dataset in layerMapping) {
      for (const dataType in layerMapping[dataset]) {
        for (const layerType in layerMapping[dataset][dataType]) {
          const layer = layerMapping[dataset][dataType][layerType];
          
          if (layer && layer.name === layerName) {
            return { dataset, dataType, layerType };
          }
        }
      }
    }
    
    return null;
  }



const csnLayers = [
  fullList.find(d => d.name == "DHS Components (ENR, Full)"),
  fullList.find(d => d.name == "Chromatin States (ENR, Full)"),
  fullList.find(d => d.datasetName == "tf_1en6_enr_top10"),
  fullList.find(d => d.name == "Repeats (ENR, Full)"),
  fullList.find(d => d.name == "DHS Components (OCC, Ranked)"),
  fullList.find(d => d.name == "Chromatin States (OCC, Ranked)"),
  fullList.find(d => d.datasetName == "tf_1en6_rank_occ"),
  fullList.find(d => d.name == "Repeats (OCC, Ranked)"),
]

// includes GWAS
const allFactorFilterLayers = [
  fullList.find(d => d.name == "DHS Components (ENR, Full)"),
  fullList.find(d => d.name == "Chromatin States (ENR, Full)"),
  fullList.find(d => d.datasetName == "tf_1en6_enr_top10"),
  fullList.find(d => d.name == "Repeats (ENR, Full)"),
  fullList.find(d => d.name == "DHS Components (OCC, Ranked)"),
  fullList.find(d => d.name == "Chromatin States (OCC, Ranked)"),
  fullList.find(d => d.datasetName == "tf_1en6_rank_occ"),
  fullList.find(d => d.name == "Repeats (OCC, Ranked)"),
  fullList.find(d => d.datasetName == "variants_favor_categorical_rank"),
  fullList.find(d => d.datasetName == "variants_favor_apc_rank"),
  fullList.find(d => d.datasetName == "ukbb_94_traits"),
]

const variantLayers = [
  fullList.find(d => d.datasetName == "variants_favor_categorical_rank"),
  fullList.find(d => d.datasetName == "variants_favor_apc_rank"),
  fullList.find(d => d.datasetName == "ukbb_94_traits"),
  // fullList.find(d => d.datasetName == "nucleotides"),
]
const countLayers = [
  fullList.find(d => d.datasetName == "dhs_enr_counts"),
  fullList.find(d => d.datasetName == "cs_enr_counts"),
  fullList.find(d => d.datasetName == "tf_1en6_enr_top10_counts"),
  fullList.find(d => d.datasetName == "repeats_enr_counts"),
]

const csnLayerList = csnLayers.concat(variantLayers).concat(countLayers)
// we have a separate function to retrieve full GWAS data
const fullDataLayers = csnLayerList.filter(d => d.datasetName != "ukbb_94_traits")
const GWASLayer = fullList.find(d => d.datasetName == "ukbb_94_traits")

function rehydrate(index, list) {
  if(index < 0) return null
  const field = fieldMapping[index]
  let layerName = field[0]
  if(layerName == "tf_motifs") {
    layerName = "tf_1en6_enr_top10"
  } else if(layerName == "tf_motifs_occ") {
    layerName = "tf_1en6_rank_occ"
  } else if(layerName == "chromatin_states") {
    layerName = "cs_enr"
  } else if(layerName == "dhs_occ") {
    layerName = "dhs_rank_occ"
  } else if(layerName == "chromatin_states_occ") {
    layerName = "cs_rank_occ"
  } else if(layerName == "repeats_occ") {
    layerName = "repeats_rank_occ"
  } else if(layerName == "variants_cat"){
    layerName = "variants_favor_categorical_rank"
  } else if(layerName == "variants_apc"){
    layerName = "variants_favor_apc_rank"
  } else if(layerName == "variants_gwas"){
    layerName = "ukbb_94_traits"
  }
  let layer = list.find(l => l.datasetName.indexOf(layerName) == 0)
  if(!layer) {
    console.log("not found", field, layerName, list)
    return null
  }
  const fieldName = field[1]
  let fieldIndex = layer.fieldColor.domain().indexOf(fieldName)
  return {layer, fieldIndex, fieldName}
}

// This can take in either a layer object or a layer datasetName
// As well as a field name or fieldIndex
// To be used for filters
function makeField(layer, fieldNameOrIndex, order) {
  let l = layer
  if(typeof layer === 'string') {
    l = fullList.find(l => l.datasetName == layer || l.regionSetName == layer)
  }
  let fieldIndex
  let fieldName
  if(typeof fieldNameOrIndex === 'number') {
    fieldIndex = fieldNameOrIndex
    fieldName = l.fieldColor.domain()[fieldNameOrIndex]
  } else {
    fieldIndex = l.fieldColor.domain().indexOf(fieldNameOrIndex)
    fieldName = fieldNameOrIndex
  }
  return { 
    id: l.name + ":" + fieldIndex, 
    layer: l, 
    label: fieldName + " " + l.name,
    field: fieldName,
    index: fieldIndex, 
    color: l.fieldColor(fieldName),
    order: order,
  }
}


const factorLayers = csnLayers.concat(variantLayers.slice(0,2))
const fields = factorLayers.flatMap(layer => {
  let fs = layer.fieldColor.domain().map((f, i) => {
    return makeField(layer, f)
  })
  return fs 
})
// includes GWAS
const allFactorFilterFields = allFactorFilterLayers.flatMap(layer => {
  let fs = layer.fieldColor.domain().map((f, i) => {
    return makeField(layer, f)
  })
  return fs 
})

// minimap layer
const minimapLayer = Bands


export {
  fullList,
  dropdownList,
  csnLayers,
  variantLayers,
  countLayers,
  csnLayerList,
  fullDataLayers,
  GWASLayer,
  minimapLayer,
  fieldMapping,
  rehydrate,
  fields,
  allFactorFilterFields,
  makeField,
  layerMapping,
  findLayerMappingPath
}

