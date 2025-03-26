import { create } from 'zustand';
import { fetchSingleRegionFactorOverlap } from '../lib/regionSetEnrichments';
import { createSubregionPaths } from '../lib/subregionPaths'
import { fullList as layers, csnLayers, variantLayers } from '../layers'
import { fetchPartialPathsForRegions, rehydratePartialCSN } from '../lib/csn'
import { fetchGWASforPositions } from '../lib/gwas'
import { retrieveFullDataForCSN } from '../lib/csn'

const SelectedStatesStore = create((set, get) => {
  const findSubpaths = (region, factorExclusion) => {
    set({ subpaths: null });
    if (region) {
      fetchSingleRegionFactorOverlap({ region, factorExclusion })
        .then((response) => {
          let topSubregionFactors = response.map(f => {
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
    };
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
        };
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

  const clearSelected = () => {
    set({ selected: null });
    set({ region: null });
    set({ selectedNarration: null });
    set({ subpaths: null });
    set({ subpathCollection: [] });
    set({ narrationCollection: [] });
    set({ narrationPreview: null });
    set({ slicedNarrationPreview: null });
    set({ loadingRegionCSNS: false });
    set({ fullNarration: null });
    set({ loadingSelectedCSN: false });
    set({ loadingFullNarration: false });
    set({ selectedGenesetMembership: [] });
    set({ query: "" });
    set({ showQuery: false });
    set({ showPromptEditor: false });
    set({ summaryLoading: false });
    set({ request_id: null });
    set({ generated: "" });
    set({ articles: [] });
    set({ prompt: "" });
    set({ articlesIncluded: true });
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
    generated: "",
    setGenerated: (generated) => set({ generated: generated }),
    articles: [],
    setArticles: (articles) => set({ articles: articles }),
    prompt: "",
    setPrompt: (prompt) => set({ prompt: prompt }),
    articlesIncluded: true,
    setArticlesIncluded: (included) => set({ articlesIncluded: included }),

    // clear selected
    clearSelected,
}})

export default SelectedStatesStore;