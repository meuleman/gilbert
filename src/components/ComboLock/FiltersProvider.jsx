import { useState, useCallback } from 'react';
import FiltersContext from './FiltersContext';

const FiltersProvider = ({ children }) => {
  const [filters, setFilters] = useState({});

  const handleFilter = useCallback((field, order) => {
    setFilters(prevFilters => {
      // console.log("set filters", field, order)
      if (!field) {
        const newFilters = { ...prevFilters };
        delete newFilters[order];
        return newFilters;
      } else {
        // console.log("prevfilters", prevFilters, order, field)
        return { ...prevFilters, [order]: field };
      }
    });
  }, []);
  
  return (
    <FiltersContext.Provider value={{ filters, handleFilter}}>
      {children}
    </FiltersContext.Provider>
  );
};

export default FiltersProvider;