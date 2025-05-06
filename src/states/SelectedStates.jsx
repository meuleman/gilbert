import { create } from 'zustand';
import { 
  fetchSingleRegionFactorOverlap 
} from '../lib/apiService';
import { createSubregionPaths } from '../lib/subregionPaths'
import { fromIndex } from '../lib/regions'
import { csnLayerList as layers } from '../layers'
import { retrieveFullDataForCSN, fetchCombinedPathsAndGWAS } from '../lib/csn'
import { 
  createGenerateQuery, 
  createGenerateSummary, 
  feedback, 
  defaultPrompt, 
  createToggleIncludeAbstracts,
  url,
  url_feedback
} from './StateTools'

const SelectedStatesStore = create((set, get) => {
  const createKey = (region) => {
    if(!region) return "";
    return `${region.chromosome},${region.i},${region.order}`;
  };

  const updateSnapshotAndState = (regionKey, update, force = false) => {
    const { createKey, updateSnapshot } = get();
    updateSnapshot(regionKey, update)
    if(force || regionKey === createKey(get().selected)) set(update);
  }

  const findSubpaths = (region, factorExclusion) => {
    const { createKey, updateSnapshotAndState } = get();
    const regionKey = createKey(region);
    
    updateSnapshotAndState(regionKey, { loadingRegionCSNS: true });

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
              updateSnapshotAndState(regionKey, { subpaths: subpathResponse });
            });
        });
    }
  };

  const collectPathsForSelected = (region, genesetScoreMapping, determineFactorExclusion, activeSet, activeFilters) => {
    const { createKey, updateSnapshotAndState } = get();
    const regionKey = createKey(region);

    if(region) {
      updateSnapshotAndState(regionKey, {
        loadingSelectedCSN: true,
        selectedNarration: null
      });
      fetchCombinedPathsAndGWAS([region], true).then((response) => {
        if(!response) { 
          updateSnapshotAndState(regionKey, {
            selectedNarration: null,
            loadingSelectedCSN: false,
            loadingRegionCSNS: false,
            selectedGenesetMembership: []
          });
          return null
        } else {
          let rehydrated = response.rehydrated[0]
          rehydrated["region"] = region
          // add scores to sort for summary
          rehydrated.genesets = rehydrated.genesets.map(g => ({...g, p: genesetScoreMapping[g.geneset]}))

          updateSnapshotAndState(regionKey, {
            selectedNarration: rehydrated,
            selectedGenesetMembership: rehydrated.genesets,
            loadingRegionCSNS: false,
            loadingSelectedCSN: false 
          });
          return rehydrated
        }
      }).catch((e) => {
        console.log("error creating top paths for selected region", e)
        updateSnapshotAndState(regionKey, {
          selectedNarration: null,
          loadingRegionCSNS: false
        })
        return null
      }).then((response) => {
        const { findSubpaths, subpaths } = get()
        if(!subpaths) {
          // subpath query
          let factorExclusion = determineFactorExclusion(response[0] ? response[0] : null, activeSet, activeFilters)
          // find and set subpaths
          findSubpaths(region, factorExclusion)
        }
      })
    } else {
      // selected is cleared
      updateSnapshotAndState(regionKey, { selectedGenesetMembership: [] })
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

  // updates the narration with a factor's subpath selection.
  const setFactorSelection = (f, activeSet = null, activeFilters = []) => {

    const { selected, removeNarrationPreview, clearSelected, selectedNarration, updateSnapshotAndState } = get(); 
    if (!selectedNarration || !f?.path?.path) return;

    // create region
    let factor = f.path;
    let region = {
      ...fromIndex(factor.chromosome, factor.i, factor.order),
      ...factor,
      derivedFrom: selected,
    };

    let newPath = factor.path;

    const newNarration = {
      // Basic narration properties
      ...region,
      path: newPath,
      region,
      genes: selectedNarration.genes,
      genesets: selectedNarration.genesets
    };

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
      updateSnapshotAndState(null, { selected: region, selectedNarration: newNarration }, true);

      // Determine which factors to exclude based on the updated narration,
      // and then search for new subpaths from the latest region.
      const factorExclusion = get().determineFactorExclusion(newNarration, activeSet, activeFilters);
      get().findSubpaths(newNarration.path.slice(-1)[0].region, factorExclusion);
    }
  };

  // Called when the "power" data (enriched CSN data) is ready.
  // It updates geneset membership and merges additional data such as GWAS.
  const collectFullData = async (region, selectedNarration) => {

    const { createKey, updateSnapshotAndState } = get();
    const regionKey = createKey(region);

    updateSnapshotAndState(regionKey, { loadingFullNarration: true });
    
    // Prepare data fetch promises; if region order is 14 then also fetch GWAS data.
    const promises = [
      retrieveFullDataForCSN(selectedNarration),
    ];

    const responses = await Promise.all(promises);
    const fullDataResponse = responses[0];

    // Set the enriched narration and mark loading as complete.
    updateSnapshotAndState(regionKey, {
      fullNarration: fullDataResponse,
      loadingFullNarration: false 
    });
  };

  const updateSnapshot = (id, updateData = {}) => {
    const { regionSnapshots } = get();
    const existingIndex = regionSnapshots.findIndex(s => s.id === id);
    
    if (existingIndex >= 0) {
      // Create a copy of the snapshots array
      const newSnapshots = [...regionSnapshots];
      
      // Update only the specified fields, preserving other fields
      newSnapshots[existingIndex] = {
        ...newSnapshots[existingIndex], // Keep existing properties
        ...updateData // Overwrite with new properties
      };
      
      set({ regionSnapshots: newSnapshots });
      // console.log(`Snapshot ${id} updated with:`, updateData);
      return null;
    }
    return null;
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
      powerData,
      createKey
    } = get();
    
    const snapshotKey = createKey(selected);

    // add information to snapshot
    const snapshot = {
      id: snapshotKey,
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
    const { selected, regionSnapshots, createKey } = get();
    // remove snapshot from regionSnapshots
    const existingIndex = regionSnapshots.findIndex(s => s.id === snapshotKey);

    if (existingIndex >= 0) {
      const selectedKey = createKey(selected);
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
        currentSnapshot: snapshot
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

    // add new region to snapshot
    addCurrentStateToSnapshots()
  
    // subpath query for backtracked region
    let factorExclusion = determineFactorExclusion(newNarration, activeSet, activeFilters)
    // find and set subpaths for new backtracked region
    get().findSubpaths(newRegion, factorExclusion)
  }

  const generateSummary = (region, providedPrompt = null) => {
    const { createKey, updateSnapshotAndState } = get();
    const regionKey = createKey(region);
    updateSnapshotAndState(regionKey, { 
      summaryLoading: true, 
      regionSummary: "", 
      abstracts: [] 
    })
    const generateSummary = createGenerateSummary({ get });

    generateSummary(providedPrompt).then(data => {
      if(data === null) {
        updateSnapshotAndState(regionKey, { regionSummary: null });
        return;
      }
      updateSnapshotAndState(regionKey, { 
        summaryLoading: false, 
        request_id: data.request_id,
        regionSummary: data.summary.replace(/^"(.*)"$/, '$1'), 
        abstracts: data.results,
      })
    });
  }

  const generateQuery = (region, narration) => {
    const { createKey, updateSnapshotAndState } = get();
    const regionKey = createKey(region);
    updateSnapshotAndState(regionKey, { query: "" });
    const generateQuery = createGenerateQuery;

    const generatedQuery = generateQuery(narration);
    updateSnapshotAndState(regionKey, { query: generatedQuery });
    if(!generatedQuery) {
      updateSnapshotAndState(regionKey, { regionSummary: null });
    }
  }

  const setPowerData = (region, powerData) => {
    const { createKey, updateSnapshotAndState } = get();
    const regionKey = createKey(region);
    updateSnapshotAndState(regionKey, { powerData: powerData });
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
    setPowerData,

    // subpaths
    findSubpaths,

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
    generateSummary,
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
    updateSnapshot,
    createKey,
    updateSnapshotAndState,
}})

export default SelectedStatesStore;