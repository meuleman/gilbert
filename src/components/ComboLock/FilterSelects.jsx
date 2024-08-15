import { useState, useEffect, useCallback, useMemo, useContext } from 'react';
import { range } from 'd3-array';
import FiltersContext from './FiltersContext'

import SelectOrder from './SelectOrder';
import SelectGWAS from './SelectGWAS';

import './FilterSelects.css';

const Selects = ({
  orderSums, 
  previewField,
  previewValues,
  showNone, 
  showUniquePaths, 
  activeWidth = 585,
  restingWidth = 585,
  orderMargin = 0,
} = {}) => {
  const orders = range(4, 15)
  const { filters, clearFilters } = useContext(FiltersContext);

  const [selectedGWAS, setSelectedGWAS] = useState(null)
  
  const hasFilters = useMemo(() => Object.keys(filters).length > 0, [filters])

  return (
    <div className="filter-selects">
      {/* {hasFilters ? <button className="clear-filters" onClick={clearFilters}>❌ Clear Filters</button> : null} */}
      {orders.map(order => (
        <SelectOrder key={order} 
          orderMargin={orderMargin}
          order={order} 
          orderSums={orderSums} 
          previewField={previewField}
          previewValues={previewValues}
          activeWidth={activeWidth}
          restingWidth={restingWidth}
          showNone={showNone} 
          showUniquePaths={showUniquePaths}
          disabled={order == 14 && selectedGWAS ? true : false}
        />
      ))}

      {/* <div className="select-gwas">
        <SelectGWAS
          selected={selectedGWAS}
          activeWidth={activeWidth + 85}
          restingWidth={restingWidth + 165}
          onSelect={(field) => {
            console.log("gwas field", field)
            setSelectedGWAS(field)
          }} 
        />
        <div className="preview">
        </div>
      </div> */}
    </div>
  )
}

export default Selects

