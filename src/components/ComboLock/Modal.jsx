import { useState, useCallback, useEffect } from 'react'
import Selects from './Selects'

import { calculateOrderSums, filterIndices } from '../../lib/filters'
import { showInt } from '../../lib/display'

import './Modal.css'

import layers from '../../layers'

const csnLayers = [
  layers.find(d => d.name == "DHS Components (ENR, Full)"),
  layers.find(d => d.name == "Chromatin States (ENR, Full)"),
  layers.find(d => d.name == "TF Motifs (ENR, Top 10)"),
  layers.find(d => d.name == "Repeats (ENR, Full)"),
  layers.find(d => d.name == "DHS Components (OCC, Ranked)"),
  layers.find(d => d.name == "Chromatin States (OCC, Ranked)"),
  layers.find(d => d.name == "TF Motifs (OCC, Ranked)"),
  layers.find(d => d.name == "Repeats (OCC, Ranked)"),
]
console.log("CSN LAYERS", csnLayers)
const variantLayers = [
  layers.find(d => d.datasetName == "variants_favor_categorical_rank"),
  layers.find(d => d.datasetName == "variants_favor_apc_rank"),
  layers.find(d => d.datasetName == "variants_gwas_rank"),
  // layers.find(d => d.datasetName == "grc"),
]
const countLayers = [
  layers.find(d => d.datasetName == "dhs_enr_counts"),
  layers.find(d => d.datasetName == "cs_enr_counts"),
  layers.find(d => d.datasetName == "tf_enr_counts"),
  layers.find(d => d.datasetName == "repeats_enr_counts"),
]

const FilterModal = ({
  onIndices = () => {},
  onClose = () => {}
} = {}) => {

  const [minimized, setMinimized] = useState(false)
  const onMinimize = useCallback(() => {
    setMinimized(!minimized)
  }, [minimized, setMinimized])

  const [orderSums, setOrderSums] = useState([])
  const [orderSelects, setOrderSelects] = useState({})
  useEffect(() => { 
    const orderSums = calculateOrderSums() 
    console.log("orderSums", orderSums)
    setOrderSums(orderSums)
  }, [])


  const [filterLoadingMessage, setFilterLoadingMessage] = useState("")
  const [filteredPathCount, setFilteredPathCount] = useState(0)
  const [filteredIndices, setFilteredIndices] = useState([]) // the indices for each chromosome at highest order
  useEffect(() => {

    let totalIndices = 0
    let indexCount = 0
    let loadingMessage = ""
    filterIndices(orderSelects, function(state, value) {
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
  }, [orderSelects])

  useEffect(() => {
    onIndices(filteredIndices)
  }, [filteredIndices])
  
  return (
    <div className="filter-modal">
      {/* <div className="header">
        FILTERS
      </div> */}
      <div className={`content ${minimized ? "minimized" : ""}`}>
        <div className="filter-inputs">
          <Selects
            selected={orderSelects}
            orderSums={orderSums} 
            layers={csnLayers.concat(variantLayers.slice(0,1))}
            showNone={false} 
            showUniquePaths={true}
            activeWidth={585}
            restingWidth={65}
            onSelect={(os) => {
              setOrderSelects(os)
            }}
          />
      </div>
      <div className="filter-results">
        <h3>Filtered paths</h3>
        {filterLoadingMessage ? filterLoadingMessage : <div>
          {showInt(filteredPathCount)} ({(filteredPathCount/orderSums[4]?.totalPaths*100).toFixed(2)}%) paths found
        </div>}
      </div>
      </div>
  </div>
  )
}
export default FilterModal
