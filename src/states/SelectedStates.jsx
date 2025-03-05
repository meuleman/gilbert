import { create } from 'zustand';

const SelectedStatesStore = create((set) => ({
  selected: null,
  setSelected: (selected) => set({ selected: selected }),
}))

export default SelectedStatesStore;