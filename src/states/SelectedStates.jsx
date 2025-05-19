import { create } from 'zustand';
import RegionSelection from './Slices/RegionSelection'
import SnapshotManagement from './Slices/SnapshotManagement'
import SummaryGeneration from './Slices/SummaryGeneration'
import CSN from './Slices/CSN'
import Power from './Slices/Power'
import SpawningRegions from './Slices/SpawningRegions';
import SelectedSummaryGeneration from './Slices/SelectedSummaryGeneration';


// This store manages the state of selected regions and their associated data.
const SelectedStatesStore = create((set, get) => {
  return {
    ...RegionSelection(set, get),
    ...SnapshotManagement(set, get),
    ...SummaryGeneration(set, get),
    ...CSN(set, get),
    ...Power(set, get),
    ...SpawningRegions(set, get),
    ...SelectedSummaryGeneration(set, get),
}})

export default SelectedStatesStore;