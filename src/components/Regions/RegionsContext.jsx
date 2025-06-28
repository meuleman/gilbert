import React from 'react';

const RegionsContext = React.createContext({
  sets: [],
  activeSet: null,
  activeState: null,
  activeRegions: [],
  activePaths: [],
  activeGenesetEnrichment: [],
  genesetEnrichmentLoading: false,
  regionSetNarrationLoading: false,
  numTopRegions: 10,
  setNumTopRegions: () => {},
  saveSet: () => {},
  deleteSet: () => {},
  setActiveSet: () => {},
  clearActive: () => {},
});

export default RegionsContext;