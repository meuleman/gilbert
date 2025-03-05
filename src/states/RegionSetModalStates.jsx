import { create } from 'zustand';

const RegionSetModalStatesStore = create((set) => ({
  showActiveRegionSet: false,
  showSummary: false,
  setShowActiveRegionSet: (show) => set({ showActiveRegionSet: show }),
  setShowSummary: (show) => set({ showSummary: show }),
}))

export default RegionSetModalStatesStore;