import { create } from 'zustand';
import RegionSelection from './Slices/RegionSelection'
import SnapshotManagement from './Slices/snapshotManagement'
import SummaryGeneration from './Slices/SummaryGeneration'
import CSN from './Slices/CSN'
import Power from './Slices/Power'
import SpawningRegions from './Slices/SpawningRegions';


const SelectedStatesStore = create((set, get) => {

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
    ...RegionSelection(set, get),
    ...SnapshotManagement(set, get),
    ...SummaryGeneration(set, get),
    ...CSN(set, get),
    ...Power(set, get),
    ...SpawningRegions(set, get),

    generateSummary,
    generateQuery
}})

export default SelectedStatesStore;