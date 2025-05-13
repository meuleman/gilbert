import { fetchCombinedPathsAndGWAS } from '../../lib/csn'

const Hover = (set, get) => {
  // This function collects paths for a hover region and updates the state.
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
	}
}

export default Hover;