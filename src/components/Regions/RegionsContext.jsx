import React from 'react';

const RegionsContext = React.createContext({
  sets: [],
  activeSet: null,
  activeState: null,
  activeRegions: [],
  activePaths: [],
  activeGenesetEnrichment: [],
  selectedGenesetMembership: [],
  numTopRegions: 10,
  setNumTopRegions: () => {},
  saveSet: () => {},
  deleteSet: () => {},
  setActiveSet: () => {},
  clearActive: () => {},
  setSelectedGenesetMembership: () => {},  // temperary?
});

export default RegionsContext;