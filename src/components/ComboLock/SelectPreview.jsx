import { useState, useEffect, useCallback, useMemo, useContext } from 'react';
import { range } from 'd3-array';
import FiltersContext from './FiltersContext'

import SelectFactor from './SelectFactorPreview';
import Loading from '../Loading';
import { fetchFilterPreview } from '../../lib/csn'

// import './FilterSelects.css';

const SelectPreview = ({
  activeWidth = 585,
  restingWidth = 585,
  onPreviewValues = () => {},
} = {}) => {
  const { filters, clearFilters } = useContext(FiltersContext);

  useEffect(() => {
    setPreviewField(null)
  }, [filters])

  const [loadingPreview, setLoadingPreview] = useState(false)
  const [previewField, setPreviewField] = useState(null)
  // const [previewValues, setPreviewValues] = useState(null)
  
  useEffect(() => {
    if(previewField) {
      onPreviewValues(null)
      setLoadingPreview(true)
      fetchFilterPreview(filters, null, previewField).then((preview) => {
        // setPreviewValues(preview.preview_fractions)
        onPreviewValues(previewField, preview.preview_fractions)
        setLoadingPreview(false)
      })
    } else {
      onPreviewValues(null)
    }
  }, [previewField, filters])


  return (
    <div className="select-preview">
      <div className="select-factor">
        { loadingPreview ?  <Loading text="🤖"></Loading>:null }
        <SelectFactor
          selected={previewField}
          activeWidth={activeWidth + 85}
          restingWidth={restingWidth + 165}
          onSelect={(field) => {
            setPreviewField(field)
          }} 
        />
      </div>
    </div>
  )
}

export default SelectPreview

