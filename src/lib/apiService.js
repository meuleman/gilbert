import axios from 'axios'

import { GWASLayer } from '../layers'

/* ================================================================ */
/* CSNs */
/* ================================================================ */

/*
Collects the partial path for each region in regions
region: [{chromosome, order, i}, ...]
membership (return genesets with regional gene membership): true | false
threshold (geneset p-value threshold): float (0 < p <= 1)

Returns:
{ regions: [{ chromosome, order, i, path_factors: [], factor_scores: [] }, ...], 
  genesets: [{geneset, p (if not membership), genes (if not membership)}, ...] 
}
*/
function fetchPartialPathsForRegions(regions, membership=false, threshold=0.1) {
  const url = `/api/csns/paths_by_order`
  const postBody = {regions, threshold, membership}
  // console.log("PARTIAL PATHS POST BODY", postBody)
  return axios({
    method: 'POST',
    url: url,
    data: postBody
  }).then(response => {
    // console.log("PARTIAL PATHS FOR REGIONS DATA", response.data)
    return response.data
  }).catch(error => {
    console.error(`error:     ${JSON.stringify(error)}`);
    console.error(`post body: ${JSON.stringify(postBody)}`);
    return null
  })
}


/*
Get the full set of GWAS associations for a set of positions
positions: [{chromosome, index}, ...]

Returns:
[ { chromosome: chromosome, index: index, trait_names: [], scores: [] }, ...]
*/
function fetchGWASforPositions(positions) {
  const url = `/api/gwas/gwas_for_positions`
  const postBody = {'positions': positions}
  // console.log("GWAS POST BODY", postBody)
  return axios({
    method: 'POST',
    url: url,
    data: postBody
  }).then(response => {
    response.data.forEach(d => { d["layer"] = GWASLayer })
    // console.log("DATA", response.data)
    return response.data
  }).catch(error => {
    console.error(`error:     ${JSON.stringify(error)}`);
    console.error(`post body: ${JSON.stringify(postBody)}`);
    return null
  })
}

/*
Fetches factor bp coverage log2(obs/exp) enrichments within region set.
regions: [{chromosome, i, order}, ...]
N: number of factors to return (defulat 10)
factorExclusion: list of factors to exclude from the results [{dataset, factor}, ...],
enrichmentThreshold: minimum enrichment for factor return (float) (default: None)

Returns:
[{dataset, factor, enrichment, count}, ...]
*/
function fetchRegionSetEnrichments({regions, N = null, factorExclusion = [], enrichmentThreshold = null}) {
  const url = `/api/regionSetEnrichment/region_set_enrichment`
  const postBody = {regions, factor_exclusion: factorExclusion}
  N && (postBody.N = N)
  enrichmentThreshold && (postBody.enrichment_threshold = enrichmentThreshold)
  // console.log("REGION SET ENRICHMENT POST BODY", postBody)
  return axios({
    method: 'POST',
    url: url,
    data: postBody
  }).then(response => {
    // console.log("REGION SET ENRICHMENTS", response.data)
    return response.data
  }).catch(error => {
    console.error(`error:     ${JSON.stringify(error)}`);
    console.error(`post body: ${JSON.stringify(postBody)}`);
    return null
  })
}

/* ================================================================ */
/* Region Sets */
/* ================================================================ */

/*
Fetches segments across factors overlapping a single region. 
region: {chromosome, i, order}
factorExclusion: list of factors to exclude from the results [{dataset, factor}, ...]

Returns:
[{dataset, factor, segments: [{order, chromosome, i, score}, ...]}, ...]
*/
function fetchSingleRegionFactorOverlap({region, factorExclusion = []}) {
  const url = `/api/regionSetEnrichment/single_region_factor_query`
  const postBody = {region, factor_exclusion: factorExclusion}
  // console.log("SINGLE REGION FACTOR OVERLAP POST BODY", postBody)
  return axios({
    method: 'POST',
    url: url,
    data: postBody
  }).then(response => {
    // console.log("SINGLE REGION FACTOR OVERLAP", response.data)
    return response.data
  }).catch(error => {
    console.error(`error:     ${JSON.stringify(error)}`);
    console.error(`post body: ${JSON.stringify(postBody)}`);
    return null
  })
}


/* ================================================================ */
/* Narrations */
/* ================================================================ */

const fetchRegionSetNarration = (query, prompt = null) => {
  const url = `/api/pubmedSummary/pubmed_region_set_summary`
  const postBody = {query}
  prompt && (postBody["prompt"] = prompt)
  return axios({
    method: "POST",
    url: url,
    headers: {
      "Content-Type": "application/json"
    },
    data: postBody
  }).then(response => {
    return response.data
  }).catch(error => {
    console.error(`error:     ${JSON.stringify(error)}`);
    console.error(`post body: ${JSON.stringify(postBody)}`);
    return null
  })
}


/* ================================================================ */
/* Geneset Enrichment */
/* ================================================================ */

/*
Get the geneset enrichments for set of genes calculated by the api. If membership=true,
then the genesets in which the genes are members are returned.
genes: [gene1, gene2, ...]
threshold: float (optional, default=0.05)

Returns: [{geneset, p-value}, ...] if membership=false
Returns: [{geneset}, ...] if membership=true
*/
function fetchGenesetEnrichment(genes, membership=false) {

  const url = `/api/genesetEnrichment/geneset_enrichment`
  const postBody = {genes, threshold: 0.01, membership}
  // console.log("GENESET POST BODY", postBody)
  return axios({
    method: 'POST',
    url: url,
    data: postBody
  }).then(response => {
    // console.log("GENESET ENRICHMENTS", response.data)
    return response.data
  }).catch(error => {
    console.error(`error:     ${JSON.stringify(error)}`);
    console.error(`post body: ${JSON.stringify(postBody)}`);
    return null
  })
}

/*
Fetches gene information for a list of regions
regions: [{chromosome, i, order}, ...]

Returns:
[{chromosome, domain_start, domain_end, name, stable_ID, strand, start, end, description, in_gene}, ...]
*/
function fetchGenes(regions) {
  const url = `/api/genes/fetch_genes`
  const postBody = {regions}
  // console.log("FETCH GENES POST BODY", postBody)
  return axios({
    method: 'POST',
    url: url,
    data: postBody
  }).then(response => {
    // console.log("GENES FOR REGIONS", response.data.genes)
    return response.data.genes
  }).catch(error => {
    console.error(`error:     ${JSON.stringify(error)}`);
    console.error(`post body: ${JSON.stringify(postBody)}`);
    return null
  })
}


/*
Get the top N regions that adhere to filtering criteria. 
regions: [{chromosome, i, order, score}, ...]
filters: [{factor, dataset}, ...], where factor is the factorIndex
N: number of paths to return (default 100)

Returns:
[{chromosome, i, order, score, ranges, subregion}, ...]
*/
function fetchBackfillFiltering(regions, filters, N=100) {
  const url = `/api/filteringWithoutOrder/backfill_region_filtering`
  const postBody = {regions, filters, N}
  // console.log("REGION BACKFILL FILTERING POST BODY", postBody)
  return axios({
    method: 'POST',
    url: url,
    data: postBody
  }).then(response => {
    // console.log("FILTER WITHOUT ORDER", response.data)
    return response.data
  }).catch(error => {
    console.error(`error:     ${JSON.stringify(error.status)}`);
    console.error(`post body: ${JSON.stringify(postBody)}`);
    return null
  })
}




/*
Get region set for a factor of interest. 
factor: {factor: factorIndex, dataset}
maxRegions: max number of regions to return (default 20000)

Returns:
[{chromosome, i, order, score}, ...]
*/
function fetchRegionSetFromFactor(factor, maxRegions=null) {
  const url = `/api/filteringWithoutOrder/generate_region_set_from_factor`
  const postBody = {factor}
  maxRegions && (postBody.max_regions = maxRegions)
  // console.log("REGION SET FROM FACTOR POST BODY", postBody)
  return axios({
    method: 'POST',
    url: url,
    data: postBody
  }).then(response => {
    // console.log("REGION SET FROM FACTOR", response.data)
    return response.data
  }).catch(error => {
    console.error(`error:     ${JSON.stringify(error.status)}`);
    console.error(`post body: ${JSON.stringify(postBody)}`);
    return null
  })
}


export {
  fetchGWASforPositions,
  fetchPartialPathsForRegions,
  fetchSingleRegionFactorOverlap,
  fetchRegionSetEnrichments,
  fetchRegionSetNarration,
  fetchGenesetEnrichment,
  fetchGenes,
  fetchBackfillFiltering,
  fetchRegionSetFromFactor
}