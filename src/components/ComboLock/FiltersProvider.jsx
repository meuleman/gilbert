import { useState, useCallback } from 'react';
import FiltersContext from './FiltersContext';

const FiltersProvider = ({ children }) => {
  const [filters, setFilters] = useState({});

  const handleFilter = useCallback((field, order, user = false) => {
    setFilters(prevFilters => {
      // console.log("set filters", field, order)
      if (!field) {
        const newFilters = { ...prevFilters };
        delete newFilters[order];
        return { ...newFilters, userTriggered: user };
      } else {
        // console.log("prevfilters", prevFilters, order, field)
        return { ...prevFilters, [order]: field, userTriggered: user };
      }
    });
  }, []);

  const clearFilters = (user = false) => {
    setFilters({ userTriggered: user })
  }

  const listFilters = useCallback(() => Object.keys(filters).filter(k => k !== "userTriggered").map(k => filters[k]), [filters])
  const hasFilters = useCallback(() => listFilters().length > 0, [listFilters])
  
  return (
    <FiltersContext.Provider value={{ filters, handleFilter, setFilters, clearFilters, hasFilters, listFilters}}>
      {children}
    </FiltersContext.Provider>
  );
};

export default FiltersProvider;