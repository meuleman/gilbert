import { create } from 'zustand';
import { baseAPIUrl } from '../lib/apiService';
import { fetchSingleRegionFactorOverlap } from '../lib/regionSetEnrichments';
import { createSubregionPaths } from '../lib/subregionPaths'
import { fullList as layers, csnLayers, variantLayers } from '../layers'
import { fetchPartialPathsForRegions, rehydratePartialCSN } from '../lib/csn'
import { fetchGWASforPositions } from '../lib/gwas'
import { retrieveFullDataForCSN } from '../lib/csn'
import { showKbOrder, showKb } from '../lib/display'

const SelectedStatesStore = create((set, get) => {
  const findSubpaths = (region, factorExclusion) => {
    set({ subpaths: null });
    if (region) {
      fetchSingleRegionFactorOverlap({ region, factorExclusion })
        .then((response) => {
          // change TF full to TF top10 for faster power rendering
          // TODO: more permanent solution for this?
          const transformedResponse = response.map(f => ({
            ...f,
            dataset: f.dataset === "tf_1en6_enr" ? "tf_1en6_enr_top10" : f.dataset
          }));
          let topSubregionFactors = transformedResponse.map(f => {
            let layer = layers.find(d => d.datasetName == f.dataset);
            let factorName = layer.fieldColor.domain()[f.factor];
            return { ...f, factorName, color: layer.fieldColor(factorName), layer };
          });
          // look at the below surface segments and create subregion paths
          createSubregionPaths(topSubregionFactors, region)
            .then((subpathResponse) => {
              set({ subpaths: subpathResponse });
            });
        });
    }
  };

  const collectPathsForSelected = (selected, genesetScoreMapping, determineFactorExclusion, activeSet, activeFilters) => {
    if(selected) {
      set({ loadingSelectedCSN: true });
      set({ selectedNarration: null });
      fetchPartialPathsForRegions([selected], true).then((response) => {
        if(!response) { 
          set({ selectedNarration: null });
          set({ loadingSelectedCSN: false });
          set({ loadingRegionCSNS: false });
          set({ selectedGenesetMembership: [] })
          return null
        } else {
          let responseRegion = response.regions[0]
          let rehydrated = {
            path: rehydratePartialCSN(responseRegion, [...csnLayers, ...variantLayers]).path,
            region: selected, 
            genes: responseRegion.genes,
            genesets: responseRegion.genesets.map(g => ({...g, p: genesetScoreMapping[g.geneset]})),
          }
          set({ selectedNarration: rehydrated });
          set({ selectedGenesetMembership: rehydrated.genesets })
          set({ loadingRegionCSNS: false });
          set({ loadingSelectedCSN: false });
          return rehydrated
        }
      }).catch((e) => {
        console.log("error creating top paths for selected region", e)
        set({ selectedNarration: null });
        set({ loadingRegionCSNS: false });
        return null
      }).then((response) => {
        // subpath query
        let factorExclusion = determineFactorExclusion(response[0] ? response[0] : null, activeSet, activeFilters)
        // find and set subpaths
        get().findSubpaths(selected, factorExclusion)
      })
    } else {
      // selected is cleared
      set({ selectedGenesetMembership: [] })
      get().findSubpaths(null, [])
    }
  };

  const handleNarrationPreview = (factor) => {
    const newNarration = { ...get().selectedNarration };
    let newPath = factor.path.path;
    if (newNarration?.path?.length && newPath?.length) {
      newNarration.path = newPath;
      if (JSON.stringify(newNarration) !== JSON.stringify(get().narrationPreview)) {
        set({ narrationPreview: newNarration });
        get().handleSlicedNarrationPreview(newNarration)
      }
    }
  };

  const handleSlicedNarrationPreview = (narrationPreview) => {
    if(narrationPreview) {
      let withSlicedPath = { ...narrationPreview };
      withSlicedPath.path = narrationPreview.path.slice(0, -1);
      set({slicedNarrationPreview: withSlicedPath});
    } else {
      set({slicedNarrationPreview: narrationPreview})
    }
  };

  // determines factor exclusion for subpath query
  const determineFactorExclusion = (narration, activeSet = null, activeFilters = []) => {
    let originalFactor = activeSet?.factor
    let factorExclusion = [
      ...(originalFactor ? [{ dataset: originalFactor?.layer?.datasetName, factor: originalFactor?.index }] : []),
      ...activeFilters.map(d => ({ dataset: d.layer.datasetName, factor: d.index })),
      ...(narration ? narration.path.map(d => ({ dataset: d.layer?.datasetName, factor: d.field?.index })) : [])
    ]

    // reduce factor list to unique set
    const uniqueFactors = []
    const seen = new Set()

    factorExclusion.forEach(d => {
      const factorString = `${d.dataset?.replace("_top10", "")},${d.factor}`  // convert top10 TF dataset name
      if (d.factor && d.dataset && !seen.has(factorString)) {
        seen.add(factorString)
        uniqueFactors.push(d)
      }
    })

    return uniqueFactors
  }

  // reverts the most recent factor subpath selection.
  const subpathGoBack = () => {
    let narrationCollection = get().narrationCollection;
    let subpathCollection = get().subpathCollection;
    if (narrationCollection?.length) {
      // Restore previous factor subpaths and update subpaths collections.
      set({
        selectedNarration: narrationCollection.slice(-1)[0],
        narrationCollection: narrationCollection.slice(0, -1),
        subpaths: subpathCollection.length ? subpathCollection.slice(-1)[0] : null,
        subpathCollection: subpathCollection.slice(0, -1)
      })
    }
  };

  // updates the narration with a factor's subpath selection.
  const setFactorSelection = (factor, activeSet = null, activeFilters = []) => {

    let selectedNarration = get().selectedNarration;
    if (!selectedNarration || !factor?.path?.path) return;
    
    let subpaths = get().subpaths;
    let narrationCollection = get().narrationCollection;
    let subpathCollection = get().subpathCollection;

    // Save current narration to collection.
    set({ narrationCollection: [...narrationCollection, selectedNarration] });

    const newNarration = { ...selectedNarration };
    let newPath = factor.path.path;

    if (newNarration?.path?.length && newPath?.length) {
      // clear preview if it exists
      get().removeNarrationPreview();

      // add previously collected fullData and counts to segments of the new path
      newNarration.path.forEach(d => {
        let correspondingSegment = newPath.find(e => e.order === d.order);
        if (correspondingSegment.length === 1) {
          d.fullData ? correspondingSegment[0]["fullData"] = d.fullData : null;
          d.counts ? correspondingSegment[0]["counts"] = d.counts : null;
        }
      });
      newNarration.path = newPath;
      set({ 
        subpathCollection: [...subpathCollection, subpaths], 
        selectedNarration: newNarration 
      });

      // Determine which factors to exclude based on the updated narration,
      // and then search for new subpaths from the latest region.
      const factorExclusion = get().determineFactorExclusion(newNarration, activeSet, activeFilters);
      get().findSubpaths(newNarration.path.slice(-1)[0].region, factorExclusion);
    }
  };

  // Called when the "power" data (enriched CSN data) is ready.
  // It updates geneset membership and merges additional data such as GWAS.
  const collectFullData = async () => {

    let selectedNarration = get().selectedNarration;

    // Prepare data fetch promises; if region order is 14 then also fetch GWAS data.
    const promises = [
      retrieveFullDataForCSN(selectedNarration),
    ];
    let impliedRegion = selectedNarration?.region?.subregion || selectedNarration?.region;
    if (impliedRegion?.order === 14) {
      promises.push(
        fetchGWASforPositions([{
          chromosome: impliedRegion.chromosome,
          index: impliedRegion.i
        }])
      );
    }

    const responses = await Promise.all(promises);
    const fullDataResponse = responses[0];
    const gwasResponse = impliedRegion?.order === 14 ? responses[1] : null;

    // Process GWAS data if available and attach to the order 14 segment.
    const csnGWAS = gwasResponse
      ? gwasResponse[0].trait_names.map((trait, i) => ({
        trait,
        score: gwasResponse[0].scores[i],
        layer: gwasResponse[0].layer
      })).sort((a, b) => b.score - a.score)
      : null;
    const csnOrder14Segment = fullDataResponse?.path.find(d => d.order === 14);
    if (csnOrder14Segment) {
      csnOrder14Segment.GWAS = csnGWAS;
    }

    // Set the enriched narration and mark loading as complete.
    set({ fullNarration: fullDataResponse });
    set({ loadingFullNarration: false });
  };

  // generate query from narration for summary
  const generateQuery = (narration) => {
    let order = Math.max(...narration.path.map(d => d.order))
    let scale = showKb(4 ** (14 - order)).join("") + " SCALE"
    
    let fields = narration.path.filter(d => {
      if(d.layer?.datasetName?.indexOf("occ") > -1) {
        return d.field?.value > 0.75
      } else if(d.layer?.datasetName?.indexOf("gwas") > -1 || d.layer?.datasetName?.indexOf("ukbb_94") > -1) {
        return true
      } else {
        // return d.field?.value > 2
        return d.field?.value > 0.25
      }
    })
    .sort((a,b) => b.field?.value - a.field?.value)
    .map(d => {
      // Determine the data type based on layer name
      let prefix = ""
      if (d.layer?.datasetName?.toLowerCase().includes("tf_")) {
        prefix = "MOTIF"
      } else if (d.layer?.datasetName?.toLowerCase().includes("dhs_")) {
        prefix = "DHS"
      } else if (d.layer?.datasetName?.toLowerCase().includes("cs_")) {
        prefix = "CS"
      } else if (d.layer?.datasetName?.toLowerCase().includes("repeat")) {
        prefix = "REPEAT"
      } else if (d.layer?.datasetName?.toLowerCase().includes("ukbb")) {
        prefix = "GWAS"
      }
      let enrocc = ""
      if(d.layer?.datasetName?.toLowerCase().includes("enr")) {
        enrocc = "domain"
      } else if(d.layer?.datasetName?.toLowerCase().includes("occ")) {
        enrocc = "occurrence"
      }
      
      // Format with resolution if available
      const resolution = `@ ${showKbOrder(d.order)}`.replace(",", "")
      return `${d.field?.field} ${prefix} ${enrocc} ${resolution}`
    })

    let genes = narration.genes ? narration.genes.map(d => d.in_gene ? `GENE_OVL ${d.name}` : `GENE_ADJ ${d.name}`) : []
    
    // Sort genesets by p-value (region set p-values) and take top 3
    let filteredGenesets = narration.genesets?.filter(d => d.p).sort((a,b) => a.p - b.p)?.slice(0, 3)
    // If no genesets with p-values, take first 3 genesets
    let genesets = (filteredGenesets.length > 0 ? filteredGenesets : narration.genesets?.slice(0, 3))
      ?.map(d => {
        const term = d.geneset.split('_').slice(1).join(' ')
        return `GO ${term.toUpperCase()}`
      })
    if(!fields.length && !genesets.length && !genes.length) return null;

    // Combine all parts with semicolons
    let query = [scale, ...fields, ...genes, ...(genesets || [])].join("; ")

    return query
  }

  // generates a summary for the selected region
  const generateSummary = (providedPrompt = null) => {
    set({ regionSummary: "" })
    set({ abstracts: [] })
    let p = providedPrompt || get().prompt
    let query = get().query
    if(query !== "") {
      set({ summaryLoading: true })
      fetch(`${get().url}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          query: query,
          narration: get().selectedNarration,
          prompt: p
        })
      })
      .then(res => res.json())
      .then(data => {
        console.log("generate", data, query)
        set({ regionSummary: data.summary.replace(/^"(.*)"$/, '$1') })
        set({ abstracts: data.results })
        set({ request_id: data.request_id })
        set({ summaryLoading: false })
      })
      .catch(err => {
        console.error(err)
        set({ summaryLoading: false })
      })
    }
  }

  const feedback = (feedback) => {
    let url_feedback = get().url_feedback
    let request_id = get().request_id
    fetch(`${url_feedback}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        request_id: request_id,
        feedback: feedback,
      })
    })
      .then(res => res.json())
      .then(data => {
        console.log("feedback", data)
      })
      .catch(err => {
        console.error(err)
      })
  }
  
  const termsSection = `You are an expert genomics researcher, tasked with narrating genomic regions such that a single short sentence captures the most important information.
  You are given a query consisting of a term-wise description of a certain region of interest in the human genome.

  These terms may include things like chromatin state calls (CS), DNase I Hypersensitive Site annotations (DHS), transcription factor motif hits (MOTIF), interspersed repeats and low complexity DNA sequences (REPEAT), and Genome-Wide Association Study traits (GWAS).
  All such terms are observed at a certain genomic scale, ranging from a single basepair (1bp) to a million basepair (1Mbp).
  They are listed in the query in descending order of prominence, so make sure to take that into account in prioritizing the information to use in your narration.
  Furthermore, the genomic region of interest may directly overlap an observed term ('occurrence'), or may overlap a larger region with an abundance of that term ('domain') in which there is not necessarily a direct overlap with a single instance of the term. This is an important distinction.

  The size (SCALE) of the region the narration will be generated for is also provided, make sure to state the region's size in your summary.
  Additionally, you are provided information on any genes that directly overlap (GENE_OVL) or are adjacent to (GENE_ADJ) the region.
  To aid in functional narration, you are also provided with Gene Ontology genesets (GO) associated with the region, which may constitute important information in combination with all of the above.
  `

  const abstractsAccess = `
  You also have access to titles and abstracts of research articles that may be relevant to the query, so make sure to use these for additional context and writing style.
  `

  const tastSection = `
  Your task is to generate a helpful one-sentence summary of the query, providing a useful narrative of the genomic region.
  If any of the provided terms do not seem relevant according to literature or otherwise, feel free to skip them in the narrative.	
  `

  const examplesSection = `
  Examples
  --------
  Query: "1bp SCALE; EWSR1/FLI1 MOTIF enrichment @ 16kbp; Stromal B DHS enrichment @ 1Mbp; Atrial fibrillation GWAS occurrence @ 1bp; Musculoskeletal DHS enrichment @ 64kbp; Cardiac DHS enrichment @ 256kbp; Quiescent/Low CS occurrence @ 256bp; NTMT2 GENE; GORAB GENE; N TERMINAL PROTEIN AMINO ACID MODIFICATION GO; EPIDERMIS MORPHOGENESIS GO; POSITIVE REGULATION OF SMOOTHENED SIGNALING PATHWAY GO.",
  Summary: "This single base pair is a likely causal atrial fibrillation GWAS variant, found inside a cardiac DHS as part of a much larger cardiac and musculoskeletal DHS domain"
  Query: "1bp SCALE; PLAG1 MOTIF enrichment @ 64kbp; Satellite REPEAT enrichment @ 1Mbp; HINFP1/3 MOTIF enrichment @ 256kbp; KLF/SP/2 MOTIF enrichment @ 16kbp; Ebox/CACGTG/1 MOTIF enrichment @ 4kbp; Mean corpuscular hemoglobin GWAS occurrence @ 1bp; NKD2 GENE; SLC12A7 GENE; AMMONIUM TRANSMEMBRANE TRANSPORT GO; MONOATOMIC ANION HOMEOSTASIS GO; POSITIVE REGULATION OF PROTEIN MATURATION GO",
  Summary: "This single base pair is a likely causal red blood cell GWAS variant, found inside a myeloid/erythroid DHS contained in an active enhancer element."
  Query: "1bp SCALE; Lymphoid DHS enrichment @ 16kbp; IRF/2 MOTIF enrichment @ 4kbp; NRF1 MOTIF enrichment @ 1Mbp; ZNF320 MOTIF enrichment @ 256kbp; SREBF1 MOTIF enrichment @ 64kbp; MECP2 motif occurrence @ 1bp; TFAP2/1 MOTIF occurrence @ 16bp; KLF/SP/2 MOTIF enrichment @ 1kbp; CCDC22 GENE; FOXP3 GENE; NEGATIVE REGULATION OF NF KAPPAB TRANSCRIPTION FACTOR ACTIVITY GO; NEGATIVE REGULATION OF DNA BINDING TRANSCRIPTION FACTOR ACTIVITY GO; REGULATION OF DNA BINDING TRANSCRIPTION FACTOR ACTIVITY GO",
  Summary: "This 1bp region is characterized by a weak enhancer element harboring an AP-2 transcription factor motif, residing in a larger domain of interferon-regulatory factor (IRF) protein binding sites and lymphoid DHSs. Co-located with the FOXP3 gene, an important immune system regulator."
  `

  const abstractsSection = `
  Abstracts
  --------
  {% for abstract in abstracts %}
  Title: {{ abstract.full_title }}
  Abstract: {{ abstract.abstract }}

  {% endfor %}
  `

  const taskSection = `
  Task
  --------

  Query: {{ query}}
  Summary:
  `

  const defaultPrompt = `${termsSection}
  ${abstractsAccess}
  ${tastSection}
  ${examplesSection}
  ${abstractsSection}
  ${taskSection}
  `

  const toggleIncludeAbstracts = (include) => {
    set({ abstractsIncluded: include })
    let newPrompt = include ? 
      `${termsSection}
      ${abstractsAccess}
      ${tastSection}
      ${examplesSection}
      ${abstractsSection}
      ${taskSection}`
    : 
    `${termsSection}
      ${tastSection}
      ${examplesSection}
      ${taskSection}`
    
    set({ prompt: newPrompt })
    get().generateSummary(newPrompt)
  }

  const clearSelected = (callback) => {
    set({ 
      selected: null,
      region: null, 
      selectedNarration: null,
      subpaths: null, 
      subpathCollection: [], 
      narrationCollection: [], 
      narrationPreview: null,
      slicedNarrationPreview: null,
      loadingRegionCSNS: false,
      loadingSelectedCSN: false,
      fullNarration: null,
      loadingFullNarration: false,
      selectedGenesetMembership: [],
      query: "",
      showQuery: false,
      showPromptEditor: false,
      summaryLoading: false,
      request_id: null,
      regionSummary: "",
      abstracts: [],
      prompt: defaultPrompt,
      abstractsIncluded: true,
      currentPreferred: null,
    }, false, { type: 'selected/clear' });

    // Execute the callback function if provided
    if (callback && typeof callback === 'function') {
      callback();
    }
  }

  return {
    selected: null,
    setSelected: (selected) => set({ selected: selected }),
    region: null,
    setRegion: (region) => set({ region: region }),
    subpaths: null,
    setSubpaths: (subpaths) => set({ subpaths: subpaths }),
    loadingSelectedCSN: false,
    setLoadingSelectedCSN: (loading) => set({ loadingSelectedCSN: loading }),
    selectedNarration: null,
    setSelectedNarration: (narration) => set({ selectedNarration: narration }),
    subpathCollection: [],
    setSubpathCollection: (subpathCollection) => set({ subpathCollection: subpathCollection }),
    narrationCollection: [],
    setNarrationCollection: (narrationCollection) => set({ narrationCollection: narrationCollection }),
    // State for holding enriched narration (full data) and its loading status.
    fullNarration: null,
    setFullNarration: (fullNarration) => set({ fullNarration: fullNarration }),
    loadingFullNarration: false,
    setLoadingFullNarration: (loading) => set({ loadingFullNarration: loading }),
    narrationPreview: null,
    setNarrationPreview: (preview) => set({ narrationPreview: preview }),
    removeNarrationPreview: () => set({ narrationPreview: null, slicedNarrationPreview: null }),
    handleNarrationPreview,
    slicedNarrationPreview: null,
    setSlicedNarrationPreview: (preview) => set({ slicedNarrationPreview: preview }),
    handleSlicedNarrationPreview: handleSlicedNarrationPreview,
    loadingRegionCSNS: false,
    setLoadingRegionCSNS: (loading) => set({ loadingRegionCSNS: loading }),
    selectedGenesetMembership: [],
    setSelectedGenesetMembership: (genesets) => set({ selectedGenesetMembership: genesets }),
    currentPreferred: null,
    setCurrentPreferred: (preferred) => set({ currentPreferred: preferred }),

    // hover
    hover: null,
    setHover: (hover) => set({ hover: hover }),

    // subpaths
    findSubpaths,
    subpathGoBack,

    // collect information for single region
    determineFactorExclusion,
    setFactorSelection,
    collectPathsForSelected,

    // collect full data
    collectFullData,

    // summary
    url: `${baseAPIUrl}/api/pubmedSummary/pubmed_summary`,
    url_feedback: `${baseAPIUrl}/api/pubmedSummary/feedback`,
    query: "",
    setQuery: (query) => set({ query: query }),
    showQuery: false,
    setShowQuery: (show) => set({ showQuery: show }),
    showPromptEditor: false,
    setShowPromptEditor: (show) => set({ showPromptEditor: show }),
    summaryLoading: false,
    setSummaryLoading: (loading) => set({ summaryLoading: loading }),
    request_id: null,
    setRequest_id: (id) => set({ request_id: id }),
    regionSummary: "",
    setRegionSummary: (regionSummary) => set({ regionSummary: regionSummary }),
    abstracts: [],
    setAbstracts: (abstracts) => set({ abstracts: abstracts }),
    prompt: defaultPrompt,
    setPrompt: (prompt) => set({ prompt: prompt }),
    abstractsIncluded: true,
    setAbstractsIncluded: (included) => set({ abstractsIncluded: included }),
    generateQuery,
    generateSummary,
    feedback,
    toggleIncludeAbstracts,

    // clear selected
    clearSelected,
}})

export default SelectedStatesStore;