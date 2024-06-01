import { useState, useEffect, useCallback } from 'react';
import {Tooltip} from 'react-tooltip';
import Select from 'react-select';
import chroma from 'chroma-js';
import { range, groups } from 'd3-array';
import { showFloat, showInt, showPosition, showKb } from '../../lib/display';


import './Selects.css';

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

const colourStyles = (isActive) => ({
  control: (styles) => ({ ...styles, backgroundColor: 'white', width: isActive ? '570px' : '70px'  }),
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
  input: (styles) => ({ ...styles, ...dot(), width: isActive ? '500px' : '10px' }),
  placeholder: (styles) => ({ ...styles, ...dot('#ccc') }),
  singleValue: (styles, { data }) => ({ 
    ...styles, 
    ...dot(data.color), 
    color: isActive ? 'black' : 'transparent', 
    overflow: 'visible',
    // width: '18px'
  }),
});

const FilterOrder = ({order, orderSums, layers, previewField, showNone, showUniquePaths, disabled, selected, onSelect}) => {
  const [selectedField, setSelectedField] = useState(null)

  useEffect(() => {
    console.log("selected", selected)
    setSelectedField(selected || null)
  }, [selected])

  const [allFields, setAllFields] = useState([])
  const [allFieldsGrouped, setAllFieldsGrouped] = useState([])

  const formatLabel = useCallback((option) => {
    return (
      <div>
        <span>{option.field} </span>
        <span> 
          {showUniquePaths ? "(" + showInt(option.unique_count) + " segments)" : ""} 
        </span>

        {/* <span> 
          {showInt(showUniquePaths ? option.unique_count : option.count)} ({showUniquePaths ? option.unique_percent?.toFixed(2) + ")% unique" : option.percent?.toFixed(2)+")%"} 
        </span> */}
        <span>[{option.layer.name}]</span>
      </div>
    );
  }, [showUniquePaths]);

  useEffect(() => {
    // const lyrs = csnLayers.concat(variantLayers.slice(0, 1))
    let newFields = layers.filter(d => d.orders[0] <= order && d.orders[1] >= order).flatMap(layer => {
      let oc = orderSums.find(o => o.order == order)
      let counts = null
      let unique_counts = null;
      let dsName = layer.datasetName
      // if(dsName.includes("rank")){
      //   dsName = dsName.replace("_rank", "")
      // }
      
      if(oc) {
        counts = oc.counts[dsName]
        unique_counts = oc.unique_counts[dsName]
      }
      
      // const counts = oc ? (showUniquePaths ? oc.unique_counts : oc.counts) : null
      // oc ? oc = counts[layer.datasetName] : oc = null
      let fields = layer.fieldColor.domain().map((f, i) => {
        return { 
          order,
          layer,
          // label: f + " (" + showInt(c) + " paths) " + layer.name, 
          label: f + " " + layer.name,
          field: f, 
          index: i, 
          color: layer.fieldColor(f), 
          count: counts ? counts[i] : "?",
          unique_count: unique_counts ? unique_counts[i] : "?",
          unique_percent: unique_counts ? unique_counts[i] / oc.totalSegments * 100 : "?",
          percent: counts ? counts[i] / oc.totalPaths * 100: "?",
          layerPercent: counts ? counts[i] / oc.layer_total[layer.datasetName] * 100 : "?",
          isDisabled: counts ? counts[i] == 0 || counts[i] == "?" : true
        }
      }).sort((a,b) => {
        return b.count - a.count
      })
      if(!showNone){
        fields = fields.filter(f => f.count > 0 && f.count != "?")
      }
      return fields
    })
    setAllFields(newFields)
    const grouped = groups(newFields, f => f.layer.name)
      .map(d => ({ label: d[0], options: d[1] }))
      .filter(d => d.options.length)
    setAllFieldsGrouped(grouped)
  }, [order, orderSums, showNone, layers])

  useEffect(() => {
    onSelect(selectedField)
  }, [selectedField])

  const [isActive, setIsActive] = useState(false);

  const [previewBar, setPreviewBar] = useState(null)
  useEffect(() => {
    if(previewField) {
      const matchingField = allFields.find(field => field.label === previewField.label);
      setPreviewBar(matchingField)
    } else {
      setPreviewBar(null)
    }
  }, [previewField])


  return (
    <div className="filter-order">
      <span className="order-label">
        {/* Order {order} */} 
        {showKb(Math.pow(4, 14 - order))}
      </span> 
      <div className="button-column">
      {disabled ? <div className="disabled" data-tooltip-id="higher-filter">🚫</div> : null}
        <Tooltip id="higher-filter" place="right" effect="solid">
          Select at least one higher resolution filter
        </Tooltip>
      {selectedField && !previewBar ? 
        <div>
          <button className="deselect" data-tooltip-id="deselect" onClick={() => setSelectedField(null)}>
            ❌
          </button>
          <Tooltip id="deselect" place="top" effect="solid">
            Deselect
          </Tooltip>
        </div>
      : null }
      {!disabled && previewBar ? 
      <div><button className="select" onClick={() => setSelectedField(previewBar)}>✅</button></div>
      : null}
      </div>

      <div className="filter-group">
        <Select
          options={allFieldsGrouped}
          styles={colourStyles(isActive)}
          value={selectedField}
          isDisabled={disabled}
          onChange={(selectedOption) => {
            setSelectedField(selectedOption)
            setIsActive(false)
          }}
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
              width: `${previewBar.layerPercent}%`,
              backgroundColor: chroma(previewBar.color).alpha(0.5).css(),
              height: '20px',
              marginTop: '10px'
            }}
          >

          <span>{showFloat(previewBar.layerPercent)}%</span>
          </div>
        )}

        </div>
        
    </div>
  )
}



const FilterFields = ({layers, selected, onSelect}) => {
  const [selectedField, setSelectedField] = useState(null)

  useEffect(() => {
    console.log("selected", selected)
    setSelectedField(selected || null)
  }, [selected])

  const [allFields, setAllFields] = useState([])

  const formatLabel = useCallback((option) => {
    return (
      <div>
        <span>{option.field} </span>
        <span>[{option?.layer?.name}]</span>
      </div>
    );
  }, []);

  useEffect(() => {
    let newFields = layers.flatMap(layer => {
      let dsName = layer.datasetName
      let fields = layer.fieldColor.domain().map((f, i) => {
        return { 
          layer,
          label: f + " " + layer.name,
          field: f, 
          index: i, 
          color: layer.fieldColor(f), 
        }
      })
      return fields
    })
    const grouped = groups(newFields, f => f.layer.name)
      .map(d => ({ label: d[0], options: d[1] }))
      .filter(d => d.options.length)
    setAllFields(grouped)
  }, [layers])
  
  useEffect(() => {
    onSelect(selectedField)
  }, [selectedField])

  return (
    <div className="filter-fields">
      <div className="filter-group">
        <Select
          options={allFields}
          styles={colourStyles(true)}
          value={selectedField}
          onChange={(selectedOption) => {
            setSelectedField(selectedOption)
          }}
          placeholder={<div>Select a factor</div>}
          formatOptionLabel={formatLabel}
          formatGroupLabel={data => (
            <div style={{ fontWeight: 'bold' }}>
              {data.label}
            </div>
          )}
        />
      </div>
        {selectedField ? 
        <div>
          {/* <span className="selected-field">
            Selected: {selectedField.label}
          </span> */}
          <button onClick={() => setSelectedField(null)}>
            ❌
          </button>
        </div>
      : null}
    </div>
  )
}


const Selects = ({orderSums, layers, showNone, showUniquePaths, onSelect}) => {
  const orders = range(4, 15)
  const [orderSelects, setOrderSelects] = useState({})

  const handleOrderSelect = useCallback((field, order) => {
    if(!field) {
      delete orderSelects[order]
      const hasOrdersGreaterThanSix = Object.keys(orderSelects).some(order => +order > 6);
      if (!hasOrdersGreaterThanSix) {
        setOrderSelects({})
      } else {
        setOrderSelects({...orderSelects})
      }
    } else {
      setOrderSelects({...orderSelects, [order]: field})
      setPreviewField(null)
    }
  }, [orderSelects])

  const [selectedOrders, setSelectedOrders] = useState([])
  useEffect(() => {
    setSelectedOrders(Object.keys(orderSelects).map(d => +d))
  }, [orderSelects])

  useEffect(() => {
    onSelect(orderSelects)
  }, [orderSelects])

  const [previewField, setPreviewField] = useState(null)

  return (
    <div className="selects">
      <div className="select-factor">
        <FilterFields
          layers={layers}
          selected={previewField}
          onSelect={(field) => {
            console.log("field", field)
            setPreviewField(field)
          }} 
        />
        <div className="preview">
        </div>
      </div>

      {orders.map(order => (
        <FilterOrder key={order} 
          order={order} 
          orderSums={orderSums} 
          layers={layers}
          previewField={previewField}
          showNone={showNone} 
          showUniquePaths={showUniquePaths}
          selected={orderSelects[order]}
          disabled={order < 7 && selectedOrders.length === 0}
          onSelect={(field) => {
            handleOrderSelect(field, order)
          }} 
        />
      ))}
    </div>
  )
}

export default Selects

