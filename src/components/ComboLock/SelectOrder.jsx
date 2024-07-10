import { useState, useEffect, useCallback, useContext } from 'react';
import Select from 'react-select';
import chroma from 'chroma-js';
import { groups } from 'd3-array';
import { showFloat, showInt, showKb } from '../../lib/display';
import { fields } from '../../layers'
import {Tooltip} from 'react-tooltip';
import { intersectIndices14, filterIndices } from '../../lib/filters';
import FiltersContext from './FiltersContext'

const dot = (color = 'transparent') => ({
  alignItems: 'center',
  display: 'flex',

  ':before': {
    backgroundColor: color,
    borderRadius: 2,
    content: '" "',
    display: 'block',
    marginRight: 8,
    height: 10,
    width: 10,
  },
});

const colourStyles = (isActive, restingWidth = 65, activeWidth = 570) => ({
  // TODO: make 2nd options 70px if want to make short again
  control: (styles) => ({ ...styles, backgroundColor: 'white', width: isActive ? activeWidth + "px" : restingWidth + "px"  }),
  option: (styles, { data, isDisabled, isFocused, isSelected }) => {
    const color = chroma(data.color);
    return {
      ...styles,
      backgroundColor: isDisabled
        ? undefined
        // : isSelected
        // ? data.color
        : isFocused
        ? color.alpha(0.1).css()
        : undefined,
      color: isDisabled
        ? '#ccc'
        // : isSelected
        // ? chroma.contrast(color, 'white') > 2
        //   ? 'white'
          : 'black',
        // : data.color,
      cursor: isDisabled ? 'not-allowed' : 'default',

      ':active': {
        ...styles[':active'],
        backgroundColor: !isDisabled
          ? isSelected
            ? data.color
            : color.alpha(0.3).css()
          : undefined,
      },
      ...dot(data.color)
    };
  },
  // TODO: change 2nd option to 10px to make short again
  input: (styles) => ({ ...styles, ...dot(), width: isActive ? activeWidth + "px" : '10px' }),
  placeholder: (styles) => ({ ...styles, ...dot('#ccc') }),
  singleValue: (styles, { data }) => ({ 
    ...styles, 
    ...dot(data.color), 
    // TODO uncomment this if want mini lock ui
    // color: isActive ? 'black' : 'transparent', 
    overflow: 'visible',
  }),
});

const SelectOrder = ({
  order, 
  orderSums, 
  previewField, 
  showNone, 
  showUniquePaths, 
  disabled, 
  activeWidth, 
  restingWidth, 
  orderMargin = 0,
  filteredIndices,
}) => {
  const [selectedField, setSelectedField] = useState(null)
  const [allFieldsGrouped, setAllFieldsGrouped] = useState([])
  const [fieldMap, setFieldMap] = useState({})

  const { filters, handleFilter } = useContext(FiltersContext);

  useEffect(() => {
    // console.log("filters", filters)
    if(filters[order]) {
      const sf = fieldMap[filters[order].id]
      console.log("setting selected filter", sf, filters[order], fieldMap)
      setSelectedField(sf)
    } else {
      setSelectedField(null)
    }
  }, [filters, order, fieldMap])


  const handleChange = useCallback((selectedOption) => {
    console.log("selected", selectedOption)
    handleFilter(selectedOption, order)
    // setSelectedField(selectedOption)
    setIsActive(false)
  }, [order, handleFilter])


  const formatLabel = useCallback((option) => {
    return (
      <div>
        <b>{option.field} </b>
        <i>{option.layer.name} </i>
        <span style={{color: "gray"}}> 
          {showUniquePaths ? " " + showInt(option.count) + " paths " : " "} 
        </span>
      </div>
    );
  }, [showUniquePaths]);

  useEffect(() => {
    // const lyrs = csnLayers.concat(variantLayers.slice(0, 1))
    let allFields = fields.map(f => {
      let layer = f.layer
      // if(layer.orders[0] >= order || layer.orders[1] <= order) return;

      let oc = orderSums.find(o => o.order == order)
      let counts = null
      // let unique_counts = null;
      
      if(oc) {
        counts = oc.counts[layer.datasetName]
        // unique_counts = oc.unique_counts[layer.datasetName]
      }
      return {
        ...f,
        order,
        count: counts ? counts[f.index] : "?",
      }
      // count: counts ? counts[i] : "?",
      // unique_count: unique_counts ? unique_counts[i] : "?",
      // unique_percent: unique_counts ? unique_counts[i] / oc.totalSegments * 100 : "?",
      // percent: counts ? counts[i] / oc.totalPaths * 100: "?",
      // layerPercent: counts ? counts[i] / oc.layer_total[layer.datasetName] * 100 : "?",
      // isDisabled: counts ? counts[i] == 0 || counts[i] == "?" : true
    }).filter(f => !!f)
    if(!showNone){
      allFields = allFields.filter(f => f.count > 0 && f.count != "?")
    }
    const grouped = groups(allFields, f => f.layer.name)
      .map(d => ({ label: d[0], options: d[1].sort((a,b) => b.count - a.count) }))
      .filter(d => d.options.length)
    setAllFieldsGrouped(grouped)
    const fieldMap = {}
    allFields.forEach(f => {
      fieldMap[f.id] = f
    })
    setFieldMap(fieldMap)

  }, [order, orderSums, showNone])



  const [isActive, setIsActive] = useState(false);

  const [previewBar, setPreviewBar] = useState(null)

  const [filterLoadingMessage, setFilterLoadingMessage] = useState("")

  // retrieve indices for a given factor and order, filters them down based on current
  // indices derived from established filters, and returns the intersection
  const getIntersectionForFactor = (factor, order) => {
    return new Promise((resolve) => {
      if((order >= factor.layer.orders[0]) && (order <= factor.layer.orders[1])) {
        let orderSelects = {[order]: factor}
        orderSelects[order]['order'] = order
        let loadingMessage = ""
        // retrieve indices for factor
        filterIndices(orderSelects, function(state, value) {
          if(state == "loading_filters_start") {
            loadingMessage = "Loading filters..."
          }
          else if(state == "grouped_selects") {
            loadingMessage = "Loading filters"
          } else if(state == "got_index"){
            loadingMessage = "Loading filters"
          } else if(state == "filtering_start") {
            loadingMessage = "Filtering..."
          } else if(state == "filtering_end") {
            loadingMessage = "Filtering Complete"
          }
          setFilterLoadingMessage(loadingMessage)
    
        }, function(results) {
          // find intersection and resolve promise
          let orderFactorIndices = results.filteredIndices
          let orderFilteredIndices = []
          if(filteredIndices.length > 0) {  // found with filters
            let filteredChromosomes = filteredIndices.map(d => d.chromosome)
            filteredChromosomes.forEach(c => {
              let chromFactorIndices = orderFactorIndices.find(d => d.chromosome == c)
              let chromFilteredIndices = filteredIndices.find(d => d.chromosome == c)
              if(chromFactorIndices) {
                let intersection = intersectIndices14(chromFilteredIndices, chromFactorIndices)
                if(intersection.indices.length > 0) {
                  orderFilteredIndices.push(intersection)
                }
              }
            })
          } else orderFilteredIndices = orderFactorIndices
          resolve(orderFilteredIndices)
        }, false)
      }
    })
  }

  useEffect(() => {
    if(previewField) {
      // console.log("previewField", previewField, order)
      let numPaths = filteredIndices.length > 0 ? filteredIndices.reduce((acc, d) => acc + d.indices.length, 0) : orderSums[0].totalPaths
      // get intersection for factor
      getIntersectionForFactor(previewField, order).then(factorIndices => {
        let numFactorPaths = factorIndices.reduce((acc, d) => acc + d.indices.length, 0)
        let matchingField = {...previewField}
        matchingField['order'] = order
        // calculate percentage of available paths that have factor at order
        matchingField['percent'] = numFactorPaths / numPaths * 100
        if(numFactorPaths > 0) setPreviewBar(matchingField)
      })

      // const matchingField = allFields.find(field => field.label === previewField.label);
      // // console.log(order, matchingField, allFields)
      // setPreviewBar(matchingField)
    } else {
      setPreviewBar(null) 
    }
  }, [previewField])

  return (
    <div className="filter-order" style={{ 
        marginBottom: order == 14 ? "0px" : orderMargin + "px",
        marginTop: order == 4 ? orderMargin/2 + "px" : 0
      }}>
      <span className="order-label">
        {/* Order {order} */} 
        {showKb(Math.pow(4, 14 - order))}
      </span> 
      <div className="button-column">
      {/* {disabled ? <div className="disabled" data-tooltip-id="higher-filter">🚫</div> : null}
        <Tooltip id="higher-filter" place="right" effect="solid">
          Select at least one higher resolution filter
        </Tooltip> */}
      {selectedField && !previewBar ? 
        <div>
          <button className="deselect" data-tooltip-id="deselect" onClick={() => handleChange()}>
            ❌
          </button>
          <Tooltip id="deselect" place="top" effect="solid" className="tooltip-custom">
            Deselect
          </Tooltip>
        </div>
      : null }
      {!disabled && previewBar ? 
      <div>
        <button className="select" data-tooltip-id={"select"+order} onClick={() => handleChange(previewBar)}>✅</button>
        <Tooltip id={"select"+order} place="top" effect="solid" className="tooltip-custom">
          Select {previewBar.label} at {showKb(Math.pow(4, 14 - previewBar.order))}
        </Tooltip>
      </div>
      : null}
      </div>

      <div className="filter-group">
        <Select
          options={allFieldsGrouped}
          styles={colourStyles(isActive, restingWidth, activeWidth)}
          value={selectedField}
          isDisabled={disabled}
          onChange={handleChange}
          onFocus={() => setIsActive(true)}
          onBlur={() => setIsActive(false)}
          placeholder={<div></div>}
          formatOptionLabel={formatLabel}
          formatGroupLabel={data => (
            <div style={{ fontWeight: 'bold' }}>
              {data.label}
            </div>
          )}
        />
      </div>

      <div className="preview-bar-container">
        {previewBar && (
          <div
            className="preview-bar"
            style={{
              width: `${previewBar.percent}%`,
              backgroundColor: chroma(previewBar.color).alpha(0.5).css(),
              height: '20px',
              marginTop: '10px'
            }}
          >

          <span>{showFloat(previewBar.percent)}%</span>
          </div>
        )}

        </div>
        
    </div>
  )
}

export default SelectOrder
