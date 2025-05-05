import { create } from 'zustand';
import { 
  fetchSingleRegionFactorOverlap 
} from '../lib/apiService';
import { createSubregionPaths } from '../lib/subregionPaths'
import { fromIndex } from '../lib/regions'
import { csnLayerList as layers } from '../layers'
import { retrieveFullDataForCSN, fetchCombinedPathsAndGWAS } from '../lib/csn'
import { 
  generateQuery, 
  createGenerateSummary, 
  feedback, 
  defaultPrompt, 
  createToggleIncludeAbstracts,
  url,
  url_feedback
} from './StateTools'

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
      set({
        loadingSelectedCSN: true,
        selectedNarration: null
      });
      fetchCombinedPathsAndGWAS([selected], true).then((response) => {
        if(!response) { 
          set({
            selectedNarration: null,
            loadingSelectedCSN: false,
            loadingRegionCSNS: false,
            selectedGenesetMembership: []
          });
          return null
        } else {
          let rehydrated = response.rehydrated[0]
          rehydrated["region"] = selected
          // add scores to sort for summary
          rehydrated.genesets = rehydrated.genesets.map(g => ({...g, p: genesetScoreMapping[g.geneset]}))

          set({
            selectedNarration: rehydrated,
            selectedGenesetMembership: rehydrated.genesets,
            loadingRegionCSNS: false,
            loadingSelectedCSN: false 
          });
          return rehydrated
        }
      }).catch((e) => {
        console.log("error creating top paths for selected region", e)
        set({
          selectedNarration: null,
          loadingRegionCSNS: false
        });
        return null
      }).then((response) => {
        const { findSubpaths, subpaths } = get()
        if(!subpaths) {
          // subpath query
          let factorExclusion = determineFactorExclusion(response[0] ? response[0] : null, activeSet, activeFilters)
          // find and set subpaths
          findSubpaths(selected, factorExclusion)
        }
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
  const setFactorSelection = (f, activeSet = null, activeFilters = []) => {

    const { selected, removeNarrationPreview, clearSelected, selectedNarration } = get(); 
    if (!selectedNarration || !f?.path?.path) return;

    // create region
    let factor = f.path;
    let region = {
      ...fromIndex(factor.chromosome, factor.i, factor.order),
      ...factor,
      derivedFrom: selected,
    };

    const newNarration = JSON.parse(JSON.stringify(selectedNarration));
    let newPath = factor.path;

    // clear previous selected information set 
    clearSelected()
    removeNarrationPreview();

    // Add full data to the new path
    if (newNarration?.path?.length && newPath?.length) {

      // add previously collected fullData and counts to segments of the new path
      newNarration.path.forEach(d => {
        let correspondingSegment = newPath.find(e => e.order === d.order);
        if (!!correspondingSegment) {
          d.fullData ? correspondingSegment["fullData"] = d.fullData : null;
          d.counts ? correspondingSegment["counts"] = d.counts : null;
        }
      });
      newNarration.path = newPath;
      // Save current region and narration to collection.
      set({ selected: region, selectedNarration: newNarration });

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

    set({ loadingFullNarration: true });
    // Prepare data fetch promises; if region order is 14 then also fetch GWAS data.
    const promises = [
      retrieveFullDataForCSN(selectedNarration),
    ];

    const responses = await Promise.all(promises);
    const fullDataResponse = responses[0];

    // Set the enriched narration and mark loading as complete.
    set({
      fullNarration: fullDataResponse,
      loadingFullNarration: false 
    });
  };

  const addCurrentStateToSnapshots = () => {
    const {
      regionSnapshots,
      selected,
      selectedNarration,
      fullNarration,
      region,
      subpaths,
      narrationCollection,
      subpathCollection,
      narrationPreview,
      slicedNarrationPreview,
      currentPreferred,
      query,
      request_id,
      regionSummary,
      abstracts,
      powerData
    } = get();
    
    const snapshotKey = `${selected?.chromosome},${selected?.i},${selected?.order}`;

    // add information to snapshot
    const snapshot = {
      id: snapshotKey,
      // snapshot: regionSnapshots.length,
      selected,
      selectedNarration,
      fullNarration,
      subpaths,
      narrationCollection,
      subpathCollection,
      narrationPreview,
      slicedNarrationPreview,
      currentPreferred,
      query,
      request_id,
      regionSummary,
      abstracts,
      powerData
    };

    const existingIndex = regionSnapshots.findIndex(s => s.id === snapshotKey);

    if (existingIndex >= 0) {
      // Update existing snapshot
      const newSnapshots = [...regionSnapshots];
      newSnapshots[existingIndex] = snapshot;
      set({ regionSnapshots: newSnapshots });
      console.log("Snapshot updated:", snapshot, newSnapshots.length, newSnapshots);
    } else {
      // add snapshot to regionSnapshots
      set({ regionSnapshots: [...regionSnapshots, snapshot] });
      console.log("Snapshot added:", snapshot, [...regionSnapshots, snapshot].length, [...regionSnapshots, snapshot]);
    }
  }

  const popRegionFromSnapshots = (snapshotKey) => {
    const { selected, regionSnapshots } = get();
    // remove snapshot from regionSnapshots
    const existingIndex = regionSnapshots.findIndex(s => s.id === snapshotKey);

    if (existingIndex >= 0) {
      const selectedKey = `${selected.chromosome},${selected.i},${selected.order}`;
      if(snapshotKey === selectedKey) {
        // switch to a different snapshot
        const indexToSwitchTo = existingIndex === 0 ? 1 : existingIndex - 1;
        const snapshotToSwitchTo = regionSnapshots[indexToSwitchTo];
        switchSnapshots(snapshotToSwitchTo.id);
      }
      const newSnapshots = [...regionSnapshots];
      newSnapshots.splice(existingIndex, 1);
      set({ regionSnapshots: newSnapshots });
      console.log("Snapshot removed:", snapshotKey, newSnapshots.length, newSnapshots);
    }
  }

  const switchSnapshots = (snapshotKey) => {
    const { regionSnapshots } = get();
    const existingIndex = regionSnapshots.findIndex(s => s.id === snapshotKey);
    console.log("Switching to snapshot:", snapshotKey, existingIndex);
    if (existingIndex >= 0) {
      const snapshot = regionSnapshots[existingIndex];
      set({
        selected: snapshot.selected,
        selectedNarration: snapshot.selectedNarration,
        fullNarration: snapshot.fullNarration,
        region: snapshot.region,
        subpaths: snapshot.subpaths,
        narrationCollection: snapshot.narrationCollection,
        subpathCollection: snapshot.subpathCollection,
        narrationPreview: snapshot.narrationPreview,
        slicedNarrationPreview: snapshot.slicedNarrationPreview,
        currentPreferred: snapshot.currentPreferred,
        query: snapshot.query,
        request_id: snapshot.request_id,
        regionSummary: snapshot.regionSummary,
        abstracts: snapshot.abstracts,
        powerData: snapshot.powerData,
      });
    }
  }

  // reconstructs the preferred path based on the full data collected
  const recalculatePreferred = (path) => {
    let fullData = []
    path.forEach(d => {
      const order = d.order;
      if(d.fullData) {
        Object.entries(d.fullData).forEach(e => {
          const [key, score] = e;
          const [datasetIndex, factorIndex] = key.split(",");
          const layer = layers[datasetIndex];
          const field = layer.fieldColor.domain()[factorIndex];
          const newData = {
            order, index: factorIndex, layer,
            field, score
          };
          fullData.push(newData);
        })
      } 
    })
    fullData = fullData.sort((a, b) => b.score - a.score);
    
    let newPath = JSON.parse(JSON.stringify(path));
    
    while(fullData.length) {
      const factor = fullData.shift();
      const order = factor.order;
      // find the segment in the path
      let segment = newPath.find(d => d.order === order);

      let field = {
        color: factor.layer.fieldColor(factor.field),
        field: factor.field, 
        index: factor.index,
        value: factor.score
      }
      // add field to segment
      segment.field = field;
      segment.region.field = field;
      // add layer to segment
      segment.layer = factor.layer;

      // filter full data
      fullData = fullData.filter(d => 
        !(
          (d.order === order) || 
          (
            (d.layer.datasetName === factor.layer.datasetName) && 
            (d.index === factor.index)
          )
        )
      );
    }
    return newPath;
  }

  const spawnRegionBacktrack = (order, activeSet, activeFilters) => {

    // create new region from selectedNarration
    const { selected, selectedNarration, clearSelected } = get();
    const path = selectedNarration.path.filter(d => d.order <= order);
    const newPath = recalculatePreferred(path);
    let newRegion = {...newPath.find(d => d.order === order)?.region, derivedFrom: selected };

    const newNarration = {
      // Basic narration properties
      ...newRegion,
      path: newPath,
      region: newRegion,
      genes: selectedNarration.genes,
      genesets: selectedNarration.genesets
    };

    clearSelected()

    // set new region
    set({ selected: newRegion, selectedNarration: newNarration });
  
    // subpath query for backtracked region
    let factorExclusion = determineFactorExclusion(newNarration, activeSet, activeFilters)
    // find and set subpaths for new backtracked region
    get().findSubpaths(newRegion, factorExclusion)
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
      powerData: null,
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
    powerData: null,
    setPowerData: (powerData) => set({ powerData }),

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
    url,
    url_feedback,
    query: "",
    setQuery: (query) => set({ query }),
    showQuery: false,
    setShowQuery: (show) => set({ showQuery: show }),
    showPromptEditor: false,
    setShowPromptEditor: (show) => set({ showPromptEditor: show }),
    summaryLoading: false,
    setSummaryLoading: (loading) => set({ summaryLoading: loading }),
    request_id: null,
    setRequest_id: (id) => set({ request_id: id }),
    regionSummary: "",
    setRegionSummary: (regionSummary) => set({ regionSummary }),
    abstracts: [],
    setAbstracts: (abstracts) => set({ abstracts }),
    prompt: defaultPrompt,
    setPrompt: (prompt) => set({ prompt }),
    powerDataLoaded: false,
    setPowerDataLoaded: (loaded) => set({ powerDataLoaded: loaded }),
    abstractsIncluded: true,
    setAbstractsIncluded: (included) => set({ abstractsIncluded: included }),
    generateQuery,
    generateSummary: createGenerateSummary({ set, get }),
    feedback,
    toggleIncludeAbstracts: createToggleIncludeAbstracts({ set, get }),

    // clear selected
    clearSelected,

    // spawning new regions
    regionSnapshots: [],
    setRegionSnapshots: (snapshots) => set({ regionSnapshots: snapshots }),
    spawnRegionBacktrack,
    addCurrentStateToSnapshots,
    popRegionFromSnapshots,
    clearSnapshots: () => set({ regionSnapshots: [] }),
    switchSnapshots,
    recalculatePreferred,
}})

export default SelectedStatesStore;