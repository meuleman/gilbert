import Bands from './bands'
import GCContent from './gc_content'
import GeneCounts from './gene_counts'
import Nucleotides from './nucleotides'
import VariantsCat from './variants_categorical'
import DHS_OE_Chi from './dhs_oe_chi'
import DHS_Components_Sfc from './dhs_components_sfc'
import DHS_Components_Sfc_max from './dhs_components_sfc_max'
import DHS_Mean_Signal from './dhs_meansignal'
import DHS_Density from './dhs_density'
// import Chromatin_OE_Chi from './chromatin_oe_chi'
import Chromatin_States_Sfc from './chromatin_states_sfc'
import Chromatin_States_Sfc_max from './chromatin_states_sfc_max';
// import TF_Motifs_OE_Chi from './tf_motifs_oe_chi'
import TF_Motifs_Sfc from './tf_motifs_sfc'
import TF_Motifs_Sfc_max from './tf_motifs_sfc_max'
import DHS_mapped_TF_motifs_sfc from './dhs_mapped_tf_motifs_sfc'
import DHS_mapped_TF_motifs_sfc_max from './dhs_mapped_tf_motifs_sfc_max'
import UKBB from './ukbb'
import UKBB_Counts from './ukbb_counts'
import Repeats_Sfc from './repeats_sfc'
import Repeats_Sfc_max from './repeats_sfc_max'
import CpG_Island_Density from './cpg_islands_density'
import ENCSR000EOT from './encode_ENCSR000EOT_max'
import CD3 from './encode_CD3_D2_Stim_AG90658_output_2.5.1_max'
import CD3Fiberseq from './fiberseq_CD3_HAP1d2stim_mean'
import LADs from './lads'
import LADs_new from './lads_new'


export default [
  Bands,
  GeneCounts,
  GCContent,
  Nucleotides,
  VariantsCat,
  DHS_OE_Chi,
  DHS_Components_Sfc,
  DHS_Components_Sfc_max,
  DHS_Mean_Signal,
  DHS_Density,
  // DHS_Coreg_2500,
  // DHS_Coreg_Multiscale,
  // DHS_Coreg_Best_Scale_max,
  // Chromatin_OE_Chi,
  Chromatin_States_Sfc,
  Chromatin_States_Sfc_max,
  // TF_Motifs_OE_Chi,
  TF_Motifs_Sfc,
  TF_Motifs_Sfc_max,
  DHS_mapped_TF_motifs_sfc,
  DHS_mapped_TF_motifs_sfc_max,
  Repeats_Sfc,
  Repeats_Sfc_max,
  UKBB,
  UKBB_Counts,
  CpG_Island_Density,
  ENCSR000EOT,
  CD3,
  CD3Fiberseq,
  LADs,
  LADs_new,
]