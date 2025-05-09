const RegionSelection = (set, get) => {

  const setNewSelected = (selected) => {
    get().clearSelected()
    set({ regionSnapshots: [], selected: selected, preventDerivation: true })
  }

  const clearSelected = (callback) => {
    const { defaultPrompt } = get();
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
    setSelected: (selected) => setNewSelected(selected),
    region: null,
    setRegion: (region) => set({ region: region }),
    clearSelected,
  }
}

export default RegionSelection;