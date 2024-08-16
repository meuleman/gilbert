import { useState, useEffect, useCallback, useMemo, useContext } from 'react';
import { range } from 'd3-array';
import FiltersContext from './FiltersContext'

import SelectOrder from './SelectOrder';
import SelectGWAS from './SelectGWAS';

import './FilterSelects.css';

const Selects = ({
  show = false,
  orderSums, 
  previewField,
  previewValues,
  showNone = false, 
  activeWidth = 585,
  restingWidth = 585,
  orderMargin = 0,
} = {}) => {
  const orders = range(4, 14)
  // const { filters, clearFilters } = useContext(FiltersContext);
  // const [selectedGWAS, setSelectedGWAS] = useState(null)
  // const hasFilters = useMemo(() => Object.keys(filters).length > 0, [filters])

  return (
    <div className={`filter-selects ${show ? 'show' : 'hide'}`}>
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
        />
      ))}

        <SelectGWAS
          orderSums={orderSums}
          activeWidth={activeWidth}
          restingWidth={restingWidth}
          previewField={previewField}
          previewValues={previewValues}
        />
    </div>
  )
}

export default Selects

