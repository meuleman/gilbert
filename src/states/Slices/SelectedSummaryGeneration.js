const SelectedSummaryGeneration = (set, get) => {
  // generates summary for selected region
  const generateSummary = (region, providedPrompt = null) => {
    const { createKey, updateSnapshotAndState, generateSummaryFromQuery } = get();
    const regionKey = createKey(region);
    updateSnapshotAndState(regionKey, { 
      summaryLoading: true, 
      regionSummary: "", 
      abstracts: [] 
    })

    generateSummaryFromQuery(providedPrompt).then(data => {
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

  // generates query for selected region
  const generateQuery = (region, narration) => {
    const { createKey, updateSnapshotAndState, generateQueryFromNarration } = get();
    const regionKey = createKey(region);
    updateSnapshotAndState(regionKey, { query: "" });

    const generatedQuery = generateQueryFromNarration(narration);
    updateSnapshotAndState(regionKey, { query: generatedQuery });
    if(!generatedQuery) {
      updateSnapshotAndState(regionKey, { regionSummary: null });
    }
  }

  return {
    generateSummary,
    generateQuery
  }
}

export default SelectedSummaryGeneration;