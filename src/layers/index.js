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
import DHS_OE_Chi from './dhs_oe_chi'
import DHS_Components_Sfc from './dhs_components_sfc'
import DHS_Components_Sfc_max from './dhs_components_sfc_max'
import DHS_OCC from './dhs_occ'
import DHS_rank_OCC from './dhs_rank_occ'
import DHS_enr from './dhs_components_enr'
import DHS_enr_max from './dhs_components_enr_max'
import DHS_enr_counts from './dhs_components_enr_counts'
import DHS_Mean_Signal from './dhs_meansignal'
import DHS_Density from './dhs_density'
// import Chromatin_OE_Chi from './chromatin_oe_chi'
import Chromatin_States_Sfc from './chromatin_states_sfc'
import Chromatin_States_Sfc_max from './chromatin_states_sfc_max'
import chromatin_states_occ from './chromatin_states_occ'
import chromatin_states_rank_occ from './chromatin_states_rank_occ'
import chromatin_states_enr from './chromatin_states_enr'
import chromatin_states_enr_max from './chromatin_states_enr_max'
import chromatin_states_enr_counts from './chromatin_states_enr_counts'
// import TF_Motifs_OE_Chi from './tf_motifs_oe_chi'
import TF_Motifs_Sfc from './tf_motifs_sfc'
import TF_Motifs_Sfc_max from './tf_motifs_sfc_max'
import tf_motifs_occ from './tf_motifs_occ'
import tf_motifs_rank_occ from './tf_motifs_rank_occ'
import tf_motifs_enr from './tf_motifs_enr'
import tf_motifs_enr_max from './tf_motifs_enr_max'
import tf_motifs_enr_counts from './tf_motifs_enr_counts'
import tf_motifs_enr_top10 from './tf_motifs_enr_top10'
import DHS_mapped_TF_motifs_sfc from './dhs_mapped_tf_motifs_sfc'
import DHS_mapped_TF_motifs_sfc_max from './dhs_mapped_tf_motifs_sfc_max'
import UKBB from './ukbb'
import UKBB_Counts from './ukbb_counts'
import Repeats_Sfc from './repeats_sfc'
import Repeats_Sfc_max from './repeats_sfc_max'
import Repeats_enr from './repeats_enr'
import Repeats_enr_max from './repeats_enr_max'
import Repeats_enr_counts from './repeats_enr_counts'
import Repeats_occ from './repeats_occ'
import Repeats_rank_occ from './repeats_rank_occ'
import CpG_Island_Density from './cpg_islands_density'
import ENCSR000EOT from './encode_ENCSR000EOT_max'
import CD3 from './encode_CD3_D2_Stim_AG90658_output_2.5.1_max'
import CD3Fiberseq from './fiberseq_CD3_HAP1d2stim_mean'
import LADs from './lads'
import LADs_new from './lads_new'
import LADs_occ from './lads_occ'
import NucleotideBadges from './order_14'



export default [
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
  DHS_OE_Chi,
  DHS_Components_Sfc,
  DHS_Components_Sfc_max,
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
  Chromatin_States_Sfc,
  Chromatin_States_Sfc_max,
  chromatin_states_occ,
  chromatin_states_rank_occ,
  chromatin_states_enr,
  chromatin_states_enr_max,
  chromatin_states_enr_counts,
  // TF_Motifs_OE_Chi,
  TF_Motifs_Sfc,
  TF_Motifs_Sfc_max,
  tf_motifs_occ,
  tf_motifs_rank_occ,
  tf_motifs_enr,
  tf_motifs_enr_max,
  tf_motifs_enr_counts,
  tf_motifs_enr_top10,
  DHS_mapped_TF_motifs_sfc,
  DHS_mapped_TF_motifs_sfc_max,
  Repeats_Sfc,
  Repeats_Sfc_max,
  Repeats_enr,
  Repeats_enr_max,
  Repeats_enr_counts,
  Repeats_occ,
  Repeats_rank_occ,
  UKBB,
  UKBB_Counts,
  CpG_Island_Density,
  ENCSR000EOT,
  CD3,
  CD3Fiberseq,
  LADs,
  LADs_new,
  LADs_occ,
]

