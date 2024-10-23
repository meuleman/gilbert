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
import DHS_OE_Chi from './dhs_oe_chi'
// import DHS_Components_Sfc from './dhs_components_sfc'  // removed from s3
import DHS_Components_Sfc_max from './dhs_components_sfc_max'
import DHS_OCC from './dhs_occ'
import DHS_rank_OCC from './dhs_rank_occ'
import DHS_enr from './dhs_components_enr'
import DHS_enr_max from './dhs_components_enr_max'
import DHS_enr_counts from './dhs_components_enr_counts'
import DHS_Mean_Signal from './dhs_meansignal'
import DHS_Density from './dhs_density'
// import Chromatin_OE_Chi from './chromatin_oe_chi'
// import Chromatin_States_Sfc from './chromatin_states_sfc'  // removed from s3
import Chromatin_States_Sfc_max from './chromatin_states_sfc_max'
import chromatin_states_occ from './chromatin_states_occ'
import chromatin_states_rank_occ from './chromatin_states_rank_occ'
import chromatin_states_enr from './chromatin_states_enr'
import chromatin_states_enr_max from './chromatin_states_enr_max'
import chromatin_states_enr_counts from './chromatin_states_enr_counts'
// import TF_Motifs_OE_Chi from './tf_motifs_oe_chi'
// import TF_Motifs_Sfc from './tf_motifs_sfc'  // removed from s3
import TF_Motifs_Sfc_max from './tf_motifs_sfc_max'
// import tf_motifs_occ from './tf_motifs_occ'  // removed from s3
// import tf_motifs_rank_occ from './tf_motifs_rank_occ'  // removed from s3
// import tf_motifs_enr from './tf_motifs_enr'  // removed from s3
// import tf_motifs_enr_max from './tf_motifs_enr_max'  // removed from s3
// import tf_motifs_enr_counts from './tf_motifs_enr_counts'
// import tf_motifs_enr_top10 from './tf_motifs_enr_top10'
import tf_motifs_1en6_enr from './tf_motifs_1en6_enr'
import tf_motifs_1en6_enr_max from './tf_motifs_1en6_enr_max'
import tf_motifs_1en6_enr_counts from './tf_motifs_1en6_enr_counts'
import tf_motifs_1en6_enr_top10 from './tf_motifs_1en6_enr_top10'
import tf_motifs_1en6_occ from './tf_motifs_1en6_occ'
import tf_motifs_1en6_rank_occ from './tf_motifs_1en6_rank_occ'
// import DHS_mapped_TF_motifs_sfc from './dhs_mapped_tf_motifs_sfc'  // removed from s3
// import DHS_mapped_TF_motifs_sfc_max from './dhs_mapped_tf_motifs_sfc_max'  // removed from s3
// import UKBB from './ukbb'
// import UKBB_Counts from './ukbb_counts'
// import Repeats_Sfc from './repeats_sfc'  // removed from s3
// import Repeats_Sfc_max from './repeats_sfc_max'  // removed from s3
import Repeats_enr from './repeats_enr'
import Repeats_enr_max from './repeats_enr_max'
import Repeats_enr_counts from './repeats_enr_counts'
import Repeats_occ from './repeats_occ'
import Repeats_rank_occ from './repeats_rank_occ'
// import CpG_Island_Density from './cpg_islands_density'  // removed from s3
import ENCSR000EOT from './encode_ENCSR000EOT_max'
import CD3 from './encode_CD3_D2_Stim_AG90658_output_2.5.1_max'
import CD3Fiberseq from './fiberseq_CD3_HAP1d2stim_mean'
// import LADs from './lads'  // removed from s3
// import LADs_new from './lads_new'  // removed from s3
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
  // DHS_OE_Chi,
  // DHS_Components_Sfc,
  // DHS_Components_Sfc_max,
  DHS_OCC,
  DHS_rank_OCC,
  DHS_enr,
  DHS_enr_max,
  DHS_enr_counts,
  DHS_Mean_Signal,
  DHS_Density,
  // DHS_Coreg_2500,
  // DHS_Coreg_Multiscale,
  // DHS_Coreg_Best_Scale_max,
  // Chromatin_OE_Chi,
  // Chromatin_States_Sfc,
  // Chromatin_States_Sfc_max,
  chromatin_states_occ,
  chromatin_states_rank_occ,
  chromatin_states_enr,
  chromatin_states_enr_max,
  chromatin_states_enr_counts,
  // TF_Motifs_OE_Chi,
  // TF_Motifs_Sfc,
  // TF_Motifs_Sfc_max,
  // tf_motifs_occ,
  // tf_motifs_rank_occ,
  // tf_motifs_enr,
  // tf_motifs_enr_max,
  // tf_motifs_enr_counts,
  // tf_motifs_enr_top10,
  tf_motifs_1en6_enr,
  tf_motifs_1en6_enr_max,
  tf_motifs_1en6_enr_counts,
  tf_motifs_1en6_enr_top10,
  tf_motifs_1en6_occ,
  tf_motifs_1en6_rank_occ,
  // DHS_mapped_TF_motifs_sfc,
  // DHS_mapped_TF_motifs_sfc_max,
  // Repeats_Sfc,
  // Repeats_Sfc_max,
  Repeats_enr,
  Repeats_enr_max,
  Repeats_enr_counts,
  Repeats_occ,
  Repeats_rank_occ,
  // UKBB,
  // UKBB_Counts,
  // CpG_Island_Density,
  ENCSR000EOT,
  CD3,
  CD3Fiberseq,
  // LADs,
  // LADs_new,
  LADs_occ,
  CSN_path_density_90,
]

const datasetMapping = {
  'DHS': {
    'ENR': {
      'layers': {
        'default': fullList.find(d => d.name == "DHS Components (ENR, Full)"),
        'max': fullList.find(d => d.name == "DHS Components (ENR)"),
        'counts': fullList.find(d => d.name == "DHS Components (ENR, Counts)"),
      },
      'filtering': fullList.find(d => d.name == "DHS Components (ENR, Full)"),
      'narration': fullList.find(d => d.name == "DHS Components (ENR, Full)")
    },
    'OCC': {
      'layers': {
        'default': fullList.find(d => d.name == "DHS Components (OCC)"),
        'rank': fullList.find(d => d.name == "DHS Components (OCC, Ranked)"),
      },
      'filtering': fullList.find(d => d.name == "DHS Components (OCC, Ranked)"),
      'narration': fullList.find(d => d.name == "DHS Components (OCC, Ranked)")
    }
  },
  'chromatinStates': {
    'ENR': {
      'layers': {
        'default': fullList.find(d => d.name == "Chromatin States (ENR, Full)"),
        'max': fullList.find(d => d.name == "Chromatin States (ENR)"),
        'counts': fullList.find(d => d.name == "Chromatin States (ENR, Counts)"),
      },
      'filtering': fullList.find(d => d.name == "Chromatin States (ENR, Full)"),
      'narration': fullList.find(d => d.name == "Chromatin States (ENR, Full)")
    },
    'OCC': {
      'layers': {
        'default': fullList.find(d => d.name == "Chromatin States (OCC)"),
        'rank': fullList.find(d => d.name == "Chromatin States (OCC, Ranked)"),
      },
      'filtering': fullList.find(d => d.name == "Chromatin States (OCC, Ranked)"),
      'narration': fullList.find(d => d.name == "Chromatin States (OCC, Ranked)")
    },
  },
  'tfMotifs': {
    'ENR': {
      'layers': {
        'default': fullList.find(d => d.name == "TF Motifs (1e-6, ENR, Full)"),
        'max': fullList.find(d => d.name == "TF Motifs (1e-6, ENR)"),
        'counts': fullList.find(d => d.name == "TF Motifs (1e-6, ENR, Counts)"),
        'top10': fullList.find(d => d.name == "TF Motifs (1e-6, ENR, Top 10)"),
      },
      'filtering': fullList.find(d => d.name == "TF Motifs (1e-6, ENR, Full)"),
      'narration': fullList.find(d => d.name == "TF Motifs (1e-6, ENR, Top 10)")
    },
    'OCC': {
      'layers': {
        'default': fullList.find(d => d.name == "TF Motifs (1e-6, OCC)"),
        'rank': fullList.find(d => d.name == "TF Motifs (1e-6, OCC, Ranked)"),
      },
      'filtering': fullList.find(d => d.name == "TF Motifs (1e-6, OCC, Ranked)"),
      'narration': fullList.find(d => d.name == "TF Motifs (1e-6, OCC, Ranked)")
    },
  },
  'repeats': {
    'ENR': {
      'layers': {
        'default': fullList.find(d => d.name == "Repeats (ENR, Full)"),
        'max': fullList.find(d => d.name == "Repeats (ENR)"),
        'counts': fullList.find(d => d.name == "Repeats (ENR, Counts)"),
      },
      'filtering': fullList.find(d => d.name == "Repeats (ENR, Full)"),
      'narration': fullList.find(d => d.name == "Repeats (ENR, Full)")
    },
    'OCC': {
      'layers': {
        'default': fullList.find(d => d.name == "Repeats (OCC)"),
        'rank': fullList.find(d => d.name == "Repeats (OCC, Ranked)"),
      },
      'filtering': fullList.find(d => d.name == "Repeats (OCC, Ranked)"),
      'narration': fullList.find(d => d.name == "Repeats (OCC, Ranked)")
    },
  },
  'GWAS': {
    'variant': {
      'layers': {
        'default': fullList.find(d => d.name == "Variants (GWAS)"),
        'rank': fullList.find(d => d.name == "Variants (GWAS, Ranked)"),
      },
      'filtering': fullList.find(d => d.name == "Variants (GWAS, Ranked)"), // change to full dataset/not a layer
      'narration': fullList.find(d => d.name == "Variants (GWAS, Ranked)"), // 
    },
  },
  'categorical': {
    'variant' : {
      'layers': {
        'default': fullList.find(d => d.name == "Variants (Categorical)"),
        'rank': fullList.find(d => d.name == "Variants (Categorical, Ranked)"),
      },
      'filtering': fullList.find(d => d.name == "Variants (Categorical, Ranked)"),
      'narration': fullList.find(d => d.name == "Variants (Categorical, Ranked)"),
    },
  },
  'aPC': {
    'variant': {
      'layers': {
        'default': fullList.find(d => d.name == "Variants (aPC)"),
        'rank': fullList.find(d => d.name == "Variants (aPC, Ranked)"),
      },
      'filtering': fullList.find(d => d.name == "Variants (aPC, Ranked)"),
      'narration': fullList.find(d => d.name == "Variants (aPC, Ranked)"),
    }
  }
}

// console.log("DATASET MAPPING", datasetMapping)


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

const filterLayers = [
  fullList.find(d => d.name == "DHS Components (ENR, Full)"),
  fullList.find(d => d.name == "Chromatin States (ENR, Full)"),
  fullList.find(d => d.datasetName == "tf_1en6_enr"),
  fullList.find(d => d.name == "Repeats (ENR, Full)"),
  fullList.find(d => d.name == "DHS Components (OCC, Ranked)"),
  fullList.find(d => d.name == "Chromatin States (OCC, Ranked)"),
  fullList.find(d => d.datasetName == "tf_1en6_rank_occ"),
  fullList.find(d => d.name == "Repeats (OCC, Ranked)"),
  fullList.find(d => d.datasetName == "variants_favor_categorical_rank"),
  fullList.find(d => d.datasetName == "variants_favor_apc_rank"),
]

const variantLayers = [
  fullList.find(d => d.datasetName == "variants_favor_categorical_rank"),
  fullList.find(d => d.datasetName == "variants_favor_apc_rank"),
  fullList.find(d => d.datasetName == "ukbb_94_traits"),
  // fullList.find(d => d.datasetName == "grc"),
]
const countLayers = [
  fullList.find(d => d.datasetName == "dhs_enr_counts"),
  fullList.find(d => d.datasetName == "cs_enr_counts"),
  fullList.find(d => d.datasetName == "tf_1en6_enr_counts"),
  fullList.find(d => d.datasetName == "repeats_enr_counts"),
]

const csnLayerList = csnLayers.concat(variantLayers).concat(countLayers)
// we have a separate function to retrieve full GWAS data
const fullDataLayers = csnLayerList.filter(d => d.datasetName != "ukbb_94_traits")

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
    l = fullList.find(l => l.datasetName == layer)
  }
  // TODO: is this the right place to put this?
  // currently makeField is only used to make fields for filtering
  if(l.datasetName == 'tf_1en6_enr_top10') {
    l = fullList.find(l => l.datasetName == 'tf_1en6_enr')
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
const filterFields = filterLayers.flatMap(layer => {
  let fs = layer.fieldColor.domain().map((f, i) => {
    return makeField(layer, f)
  })
  return fs 
})


export {
  fullList,
  csnLayers,
  variantLayers,
  countLayers,
  csnLayerList,
  fullDataLayers,
  fieldMapping,
  rehydrate,
  fields,
  filterFields,
  makeField,
}

