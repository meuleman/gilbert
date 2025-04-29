import { create } from 'zustand';
import { 
  baseAPIUrl, 
  fetchSingleRegionFactorOverlap 
} from '../lib/apiService';
import { fetchCombinedPathsAndGWAS } from '../lib/csn'
import { 
  generateQuery, 
  createGenerateSummary, 
  defaultPrompt, 
  url, 
  url_feedback
} from './StateTools'

const HoverStatesStore = create((set, get) => {

  const collectPathForHover = (hover) => {
    if(hover) {
      set({
        loadingHoverCSN: true,
        hoverNarration: null
      });
      fetchCombinedPathsAndGWAS([hover], true).then((response) => {
        if(!response) { 
          set({
            hoverNarration: null,
            loadingHoverCSN: false,
          });
          return null
        } else {
          let rehydrated = response.rehydrated[0]
          rehydrated["region"] = hover
          set({
            hoverNarration: rehydrated,
            loadingHoverCSN: false,
          });
          return rehydrated
        }
      }).catch((e) => {
        console.log("error creating top paths for hover region", e)
        set({
          hoverNarration: null,
          loadingHoverCSN: false
        });
        return null
      })
    }
  };

  const clearSelected = (callback) => {
    set({ 
    }, false, { type: 'selected/clear' });

    // Execute the callback function if provided
    if (callback && typeof callback === 'function') {
      callback();
    }
  }

  return {
    // hover
    hover: null,
    setHover: (hover) => set({ hover: hover }),

    // genes
    genesInside: [],
    setGenesInside: (genes) => set({ genesInside: genes }),
    genesOutside: [],
    setGenesOutside: (genes) => set({ genesOutside: genes }),

    // csn
    loadingHoverCSN: false,
    setLoadingHoverCSN: (loading) => set({ loadingHoverCSN: loading }),
    hoverNarration: null,
    setHoverNarration: (narration) => set({ hoverNarration: narration }),
    collectPathForHover,


    // summary  
    url,
    url_feedback,  
    query: "",
    setQuery: (query) => set({ query }),
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
    abstractsIncluded: true,
    setAbstractsIncluded: (included) => set({ abstractsIncluded: included }),
    generateQuery,
    generateSummary: createGenerateSummary({ set, get }),
    // feedback,
    // toggleIncludeAbstracts: createToggleIncludeAbstracts({ set, get }),

    // clear selected
    clearSelected,
}})

export default HoverStatesStore;