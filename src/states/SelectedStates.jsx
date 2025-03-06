import { create } from 'zustand';
import { fetchSingleRegionFactorOverlap } from '../lib/regionSetEnrichments';
import { createSubregionPaths } from '../lib/subregionPaths'
import { fullList as layers, csnLayers, variantLayers } from '../layers'
import { fetchPartialPathsForRegions, rehydratePartialCSN } from '../lib/csn'

const SelectedStatesStore = create((set, get) => ({
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
  // State for holding enriched narration (full data) and its loading status.
  fullNarration: null,
  setFullNarration: (fullNarration) => set({ fullNarration: fullNarration }),
  loadingFullNarration: false,
  setLoadingFullNarration: (loading) => set({ loadingFullNarration: loading }),
  narrationPreview: null,
  setNarrationPreview: (preview) => set({ narrationPreview: preview }),
  slicedNarrationPreview: null,
  setSlicedNarrationPreview: (preview) => set({ slicedNarrationPreview: preview }),
  loadingRegionCSNS: false,
  setLoadingRegionCSNS: (loading) => set({ loadingRegionCSNS: loading }),
  selectedGenesetMembership: [],
  setSelectedGenesetMembership: (genesets) => set({ selectedGenesetMembership: genesets }),

  // find the subpaths for region
  findSubpaths: (region, factorExclusion) => {
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
  },

  // collect information for single region
  collectPathsForSelected: (selected, genesetScoreMapping, determineFactorExclusion) => {
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
        let factorExclusion = determineFactorExclusion(response[0] ? response[0] : null)
        // find and set subpaths
        get().findSubpaths(selected, factorExclusion)
      })
    } else {
      // selected is cleared
      set({ selectedGenesetMembership: [] })
      get().findSubpaths(null, [])
    }
  }
}))

export default SelectedStatesStore;