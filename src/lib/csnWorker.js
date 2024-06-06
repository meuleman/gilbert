
import calculateCrossScaleNarration from './calculateCSN'

import dhs_components_enr from "../layers/dhs_components_enr";
import chromatin_states_enr from "../layers/chromatin_states_enr";
import tf_motifs_enr_top10 from "../layers/tf_motifs_enr_top10";
import repeats_enr from "../layers/repeats_enr";
import dhs_rank_occ from "../layers/dhs_rank_occ";
import chromatin_states_rank_occ from "../layers/chromatin_states_rank_occ";
import tf_motifs_rank_occ from "../layers/tf_motifs_rank_occ";
import repeats_rank_occ from "../layers/repeats_rank_occ";
import variants_rank_categorical from "../layers/variants_rank_categorical";
import variants_rank_apc from "../layers/variants_rank_apc";
import variants_rank_gwas from "../layers/variants_rank_gwas";
import dhs_components_enr_counts from '../layers/dhs_components_enr_counts';
import chromatin_states_enr_counts from '../layers/chromatin_states_enr_counts';
import tf_motifs_enr_counts from '../layers/tf_motifs_enr_counts';
import repeats_enr_counts from '../layers/repeats_enr_counts';

const referenceLayers = [
  dhs_components_enr,
  chromatin_states_enr,
  tf_motifs_enr_top10,
  repeats_enr,
  dhs_rank_occ,
  chromatin_states_rank_occ,
  tf_motifs_rank_occ,
  repeats_rank_occ,
  dhs_components_enr_counts,
  chromatin_states_enr_counts,
  tf_motifs_enr_counts,
  repeats_enr_counts,
  variants_rank_categorical,
  variants_rank_apc,
  variants_rank_gwas,
]

onmessage = async function(e) {
  console.log("GOT THE MESSAGE", e)
  const { selected, csnMethod, layers, variantLayers, countLayers, filters } = e.data;

  function deserializeLayer(l) {
    return referenceLayers.find(d => d.datasetName == l)
  }
  const lyrs = layers.map(deserializeLayer)
  const vlyrs = variantLayers.map(deserializeLayer)
  const clyrs = countLayers.map(deserializeLayer)
  let fltrs = null
  if(filters) {
    fltrs = Object.keys(filters).map(k => {
      return {
        ...filters[k],
        layer: deserializeLayer(filters[k].layer)
      }
    })
  }

  console.log("WEB WORKER WORKING")
  const result = await calculateCrossScaleNarration(selected, csnMethod, lyrs, vlyrs, clyrs, fltrs);
  console.log("RESULT", result)
  postMessage(result)
  // const unique = findUniquePaths(result.paths).uniquePaths
  // console.log("UNIQUE", unique)
  // postMessage(unique);
};


// subset our CSN results to just unique paths
function findUniquePaths(paths) {
  let uniquePaths = []
  let uniquePathMemberships = []
  const seenPaths = new Map()

  // initialize each order to null
  let initialEmptyPathObj = {}
  const orders = [4, 14]
  for (let i = orders[0]; i <= orders[1]; i++) initialEmptyPathObj[i] = null;
  
  // filter paths
  paths.forEach(path => {
    // Convert path to a string to use as a map key
    let pathStripped = { ...initialEmptyPathObj }
    path.path.forEach((d) => {if(d !== null) pathStripped[d.order] = d.field.field})
    const pathKey = JSON.stringify(pathStripped)
    if (!seenPaths.has(pathKey)) {
      seenPaths.set(pathKey, uniquePaths.length)
      uniquePaths.push(path)
      uniquePathMemberships.push([path])
    } else {
      let pathInd = seenPaths.get(pathKey)
      uniquePathMemberships[pathInd].push(path)
    }
  })
  if(uniquePaths.length < 1) {
    uniquePaths = paths
    uniquePathMemberships = paths.map(d => [d])
  }
  uniquePathMemberships.forEach((u,i) => {
    uniquePaths[i].members = u.length
  })
  return {'uniquePaths': uniquePaths, 'uniquePathMemberships': uniquePathMemberships}
}



onerror = function(e) {
  console.error("Error inside worker:", e.message, e.filename, e.lineno, e.colno);
  console.error("Error event:", e);
};