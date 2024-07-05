import { useState, useCallback, useEffect, useContext } from 'react'
import FiltersContext from './FiltersContext'
import Selects from './Selects'

import { calculateOrderSums, filterIndices } from '../../lib/filters'
import { showInt } from '../../lib/display'

import { fetchTopCSNs } from '../../lib/csn'

import './Modal.css'


const FilterModal = ({
  orderMargin = 0,
  show=true,
  onFilters = () => {},
  onIndices = () => {},
  onClose = () => {}
} = {}) => {

  const { filters } = useContext(FiltersContext);
  // const [minimized, setMinimized] = useState(false)
  // const onMinimize = useCallback(() => {
  //   setMinimized(!minimized)
  // }, [minimized, setMinimized])

  const [orderSums, setOrderSums] = useState([])
  useEffect(() => { 
    const orderSums = calculateOrderSums() 
    console.log("orderSums", orderSums)
    setOrderSums(orderSums)
  }, [])

  const [filterLoadingMessage, setFilterLoadingMessage] = useState("")
  const [filteredPathCount, setFilteredPathCount] = useState(0)
  const [filteredIndices, setFilteredIndices] = useState([]) // the indices for each chromosome at highest order
  useEffect(() => {

    console.log("filters changed in modal!", filters)
    console.log("SKIPPING CLIENT SIDE")
    return;

    let totalIndices = 0
    let indexCount = 0
    let loadingMessage = ""
    filterIndices(filters, function(state, value) {
      // console.log("progress", state, value)
      if(state == "loading_filters_start") {
        loadingMessage = "Loading filters..."
      }
      else if(state == "grouped_selects") {
        totalIndices = value.flatMap(d => d[1].map(a => a)).length
        loadingMessage = `Loading filters 0/${totalIndices}`
      } else if(state == "got_index"){
        indexCount += 1
        loadingMessage = `Loading filters ${indexCount}/${totalIndices}`
      } else if(state == "filtering_start") {
        loadingMessage = "Filtering..."
      } else if(state == "filtering_end") {
        loadingMessage = "Filtering Complete"
      }
      setFilterLoadingMessage(loadingMessage)

    }, function(results) {
      const { filteredIndices, pathCount} = results
      if(results.filteredIndices.length > 0) {
        setFilterLoadingMessage("")
        setFilteredIndices(filteredIndices)
        setFilteredPathCount(pathCount)
      } else {
        setFilterLoadingMessage("")
        setFilteredIndices([])
        setFilteredPathCount(0)
      }
    })
  }, [filters])

  useEffect(() => {
    onIndices(filteredIndices)
  }, [filteredIndices])
  
  return (
    <div className={`filter-modal ${show ? "show" : "hide"}`}>
      {/* <div className="header">
        FILTERS
      </div> */}
      <div className="filter-results">
        {filterLoadingMessage ? filterLoadingMessage : <div>
          {showInt(filteredPathCount)} ({(filteredPathCount/orderSums[4]?.totalPaths*100).toFixed(2)}%) paths found
        </div>}
      </div>
      <div>
        <div className="filter-inputs">
          <Selects
            orderSums={orderSums} 
            showNone={false} 
            showUniquePaths={true}
            activeWidth={585}
            restingWidth={65}
            orderMargin={orderMargin}
            // the current set of filter indices for percentages
            filteredIndices={filteredIndices}
          />
      </div> 
    </div>
  </div>
  )
}
export default FilterModal
