import { create } from 'zustand';
import SummaryGeneration from './Slices/SummaryGeneration'
import Hover from './Slices/Hover'

const HoverStatesStore = create((set, get) => {

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
    ...Hover(set, get),
    
    // summary
    generateSummary,
    generateQuery,
}})

export default HoverStatesStore;