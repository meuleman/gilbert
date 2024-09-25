import React from 'react';

const RegionsContext = React.createContext({
  sets: [],
  activeSet: null,
  activeState: null,
  activeRegions: [],
  activePaths: [],
  saveSet: () => {},
  deleteSet: () => {},
  setActiveSet: () => {},
});

export default RegionsContext;