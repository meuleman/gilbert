import React from 'react';

const FiltersContext = React.createContext({
  filters: {},
  handleFilter: () => {}
});

export default FiltersContext;