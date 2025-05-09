import { retrieveFullDataForCSN, fetchCombinedPathsAndGWAS } from '../../lib/csn'
import { 
  fetchSingleRegionFactorOverlap 
} from '../../lib/apiService';
import { csnLayerList as layers } from '../../layers'
import { createSubregionPaths } from '../../lib/subregionPaths'

const CSN = (set, get) => {

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
    const { selectedNarration, narrationPreview, handleSlicedNarrationPreview } = get();
    const newNarration = { ...selectedNarration };
    let newPath = factor.path.path;
    if (newNarration?.path?.length && newPath?.length) {
      newNarration.path = newPath;
      if (JSON.stringify(newNarration) !== JSON.stringify(narrationPreview)) {
        set({ narrationPreview: newNarration });
        handleSlicedNarrationPreview(newNarration)
      }
    }
  };

  const removeNarrationPreview = () => {
    set({ narrationPreview: null, slicedNarrationPreview: null })
  }

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
  
  return {
    findSubpaths,
    collectPathsForSelected,
    collectFullData,
    handleNarrationPreview,
    removeNarrationPreview,
    handleSlicedNarrationPreview,
    determineFactorExclusion,
    recalculatePreferred,
    slicedNarrationPreview: null,
    setSlicedNarrationPreview: (preview) => set({ slicedNarrationPreview: preview }),
    handleSlicedNarrationPreview,
    loadingRegionCSNS: false,
    setLoadingRegionCSNS: (loading) => set({ loadingRegionCSNS: loading }),
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
    selectedGenesetMembership: [],
    setSelectedGenesetMembership: (genesets) => set({ selectedGenesetMembership: genesets }),
    currentPreferred: null,
    setCurrentPreferred: (preferred) => set({ currentPreferred: preferred }),
  }
}
  
export default CSN;