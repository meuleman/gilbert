const HoverSummaryGeneration = (set, get) => {
  // generates summary for hover region
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

  // generates query for hover region
  const generateQuery = (narration) => {
    const {generateQueryFromNarration} = get();
    const query = generateQueryFromNarration(narration)
    return query
  }

  return {
    generateSummary,
    generateQuery
  }
}

export default HoverSummaryGeneration;