import { create } from 'zustand';
import { fetchCombinedPathsAndGWAS } from '../lib/csn'
import SummaryGeneration from './Slices/SummaryGeneration'

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

  const generateSummary = () => {
    const {generateSummaryFromQuery} = get();
    set({
      regionSummary: "", 
      abstracts: [],
      summaryLoading: true
    })

    generateSummaryFromQuery().then(data => {
      if(data === null) {
        set({ summaryLoading: false })
        return;
      }
      set({
        regionSummary: data.summary.replace(/^"(.*)"$/, '$1'),
        abstracts: data.results,
        request_id: data.request_id,
        summaryLoading: false,
      })
    });
  }

  const generateQuery = (narration) => {
    const {generateQueryFromNarration} = get();
    const query = generateQueryFromNarration(narration)
    return query
  }

  return {
    ...SummaryGeneration(set, get),
    
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
    generateSummary,
    generateQuery,
}})

export default HoverStatesStore;