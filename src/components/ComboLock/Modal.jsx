import { useState, useCallback, useEffect } from 'react'
import Selects from './Selects'

import { calculateOrderSums } from '../../lib/filters'

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
        RESULTS
      </div>
      </div>
  </div>
  )
}
export default FilterModal
