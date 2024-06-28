import { useState, useEffect, useCallback, useContext } from 'react';
import { range } from 'd3-array';
import FiltersContext from './FiltersContext'

import FactorSelect from './FactorSelect';
import OrderSelect from './OrderSelect';

import './Selects.css';

const Selects = ({
  orderSums, 
  layers, 
  showNone, 
  showUniquePaths, 
  activeWidth = 585,
  restingWidth = 585,
  orderMargin = 0,
  filteredIndices,
} = {}) => {
  const orders = range(4, 15)
  const { filters, handleFilter } = useContext(FiltersContext);

  useEffect(() => {
    console.log("filters changed in selects!", filters)
  }, [filters])

  const [previewField, setPreviewField] = useState(null)

  return (
    <div className="selects">
      <div className="select-factor">
        <FactorSelect
          layers={layers}
          selected={previewField}
          activeWidth={activeWidth + 85}
          restingWidth={restingWidth + 165}
          onSelect={(field) => {
            console.log("field", field)
            setPreviewField(field)
          }} 
        />
        <div className="preview">
        </div>
      </div>

      {orders.map(order => (
        <OrderSelect key={order} 
          orderMargin={orderMargin}
          order={order} 
          orderSums={orderSums} 
          layers={layers}
          previewField={previewField}
          activeWidth={activeWidth}
          restingWidth={restingWidth}
          showNone={showNone} 
          showUniquePaths={showUniquePaths}
          selected={filters[order]}
          onSelect={(field) => {
            console.log("selected onselect!", field, order)
            handleFilter(field, order)
          }} 
          filteredIndices={filteredIndices}
        />
      ))}
    </div>
  )
}

export default Selects

