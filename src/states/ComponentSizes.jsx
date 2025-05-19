import { create } from 'zustand';

// This store manages component sizes throughout the application
const ComponentSizeStore = create((set) => {
  return {
    leftToolbarSize: { width: 0, height: 0 },
    setLeftToolbarSize: (size) => set(() => ({ leftToolbarSize: size})),
    mainMapSize: { width: 0, height: 0 },
    setMainMapSize: (size) => set(() => ({ mainMapSize: size})),
    zoomLegendSize: { width: 0, height: 0 },
    setZoomLegendSize: (size) => set(() => ({ zoomLegendSize: size})),
    powerSize: { width: 0, height: 0 },
    setPowerSize: (size) => set(() => ({ powerSize: size})),
    csnSize: { width: 0, height: 0 },
    setCsnSize: (size) => set(() => ({ csnSize: size})),
    activeRegionSetModalSize: { width: 0, height: 0 },
    setActiveRegionSetModalSize: (size) => set(() => ({ activeRegionSetModalSize: size})),
}})

export default ComponentSizeStore;