import { useState, useEffect, useCallback, useContext } from 'react';
import { range } from 'd3-array';
import FiltersContext from './FiltersContext'

import SelectFactor from './SelectFactor';
import SelectOrder from './SelectOrder';

import './Selects.css';

const Selects = ({
  orderSums, 
  showNone, 
  showUniquePaths, 
  activeWidth = 585,
  restingWidth = 585,
  orderMargin = 0,
  filteredIndices,
} = {}) => {
  const orders = range(4, 15)
  const { filters } = useContext(FiltersContext);

  useEffect(() => {
    console.log("filters changed in selects!", filters)
    setPreviewField(null)
  }, [filters])

  const [previewField, setPreviewField] = useState(null)

  return (
    <div className="selects">
      <div className="select-factor">
        <SelectFactor
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
        <SelectOrder key={order} 
          orderMargin={orderMargin}
          order={order} 
          orderSums={orderSums} 
          previewField={previewField}
          activeWidth={activeWidth}
          restingWidth={restingWidth}
          showNone={showNone} 
          showUniquePaths={showUniquePaths}
          filteredIndices={filteredIndices}
        />
      ))}
    </div>
  )
}

export default Selects

