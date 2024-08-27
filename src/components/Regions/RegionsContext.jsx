import React from 'react';

const RegionsContext = React.createContext({
  sets: [],
  activeSet: null,
  saveSet: () => {},
  deleteSet: () => {},
  setActiveSet: () => {},
});

export default RegionsContext;