import { create } from 'zustand';
import SummaryGeneration from './Slices/SummaryGeneration'
import Hover from './Slices/Hover'
import HoverSummaryGeneration from './Slices/HoverSummaryGeneration';


// This store manages the state of hover regions and their associated data.
const HoverStatesStore = create((set, get) => {
  return {
    ...SummaryGeneration(set, get),
    ...Hover(set, get),
    ...HoverSummaryGeneration(set, get),
}})

export default HoverStatesStore;