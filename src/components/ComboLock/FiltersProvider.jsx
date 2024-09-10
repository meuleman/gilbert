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

  const hasFilters = useCallback(() => Object.keys(filters).filter(k => k !== "userTriggered").length > 0, [filters])
  
  return (
    <FiltersContext.Provider value={{ filters, handleFilter, setFilters, clearFilters, hasFilters}}>
      {children}
    </FiltersContext.Provider>
  );
};

export default FiltersProvider;