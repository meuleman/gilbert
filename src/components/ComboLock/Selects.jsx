import { useState, useEffect, useCallback, useMemo, useContext } from 'react';
import { range } from 'd3-array';
import FiltersContext from './FiltersContext'

import SelectFactor from './SelectFactor';
import SelectOrder from './SelectOrder';
import SelectGWAS from './SelectGWAS';
import Loading from '../Loading';
import { fetchFilterPreview } from '../../lib/csn'

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
  const { filters, clearFilters } = useContext(FiltersContext);

  useEffect(() => {
    setPreviewField(null)
  }, [filters])

  const [loadingPreview, setLoadingPreview] = useState(false)
  const [previewField, setPreviewField] = useState(null)
  const [previewValues, setPreviewValues] = useState(null)
  const [selectedGWAS, setSelectedGWAS] = useState(null)
  
  useEffect(() => {
    if(previewField) {
      setPreviewValues(null)
      setLoadingPreview(true)
      fetchFilterPreview(filters, null, previewField).then((preview) => {
        setPreviewValues(preview.preview_fractions)
        setLoadingPreview(false)
      })
    }
  }, [previewField])

  const hasFilters = useMemo(() => Object.keys(filters).length > 0, [filters])

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
      {loadingPreview ? <Loading text="Loading..."> </Loading> : null}
      {hasFilters ? <button className="clear-filters" onClick={clearFilters}>❌ Clear Filters</button> : null}

      {orders.map(order => (
        <SelectOrder key={order} 
          orderMargin={orderMargin}
          order={order} 
          orderSums={orderSums} 
          previewField={previewField}
          previewValues={previewValues}
          setPreviewValues={setPreviewValues}
          activeWidth={activeWidth}
          restingWidth={restingWidth}
          showNone={showNone} 
          showUniquePaths={showUniquePaths}
          filteredIndices={filteredIndices}
          disabled={order == 14 && selectedGWAS ? true : false}
        />
      ))}

      <div className="select-gwas">
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
      </div>
    </div>
  )
}

export default Selects

