import { useState, useCallback, useEffect, useRef, useMemo, useContext } from 'react'

import { sum, max } from 'd3-array'
import Loading from '../Loading'
// import FiltersContext from '../ComboLock/FiltersContext'
import { hilbertPosToOrder } from '../../lib/HilbertChromosome'
import {showPosition, showInt, showKb} from '../../lib/display'
import { createBED } from '../../lib/regionsets'
import {Tooltip} from 'react-tooltip';
import RegionFilesSelect from './RegionFilesSelect'
import RegionFiles from './RegionFiles'
import RegionTable from './RegionTable'

import './ManageRegionSetsModal.css'


const RegionSetModal = ({
  selectedRegion = null,
  hoveredRegion = null,
  queryRegions = null,
  queryRegionsCount = null,
  queryRegionOrder = null,
  queryLoading = "",
  onNumSegments = () => {},
  onClearRegion = () => {},
} = {}) => {

  const [showControls, setShowControls] = useState(true)

  const [regionset, setRegionSet] = useState('')


  const handleNumSegments = useCallback((e) => {
    setNumSegments(+e.target.value)
  }, [onNumSegments])

  return (
    <div className={`manage-regionsets-modal`}>
      <div className={`control-buttons`}>
      </div>
      <div className={`content`}>
        <div className="loading-info">
        </div>
        {/* <RegionFilesSelect selected={regionset} onSelect={(name, set) => {
              if(set) { setRegionSet(name) } else { setRegionSet('') }
            }} /> */}
          
        <RegionFiles />
      </div>
    </div>
  )
}
export default RegionSetModal
