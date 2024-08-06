import React from 'react';

const FiltersContext = React.createContext({
  filters: {},
  setFilters: () => {},
  handleFilter: () => {},
  clearFilters: () => {}
});

export default FiltersContext;