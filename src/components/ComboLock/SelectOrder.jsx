import { useState, useEffect, useCallback, useContext } from 'react';
import Select from 'react-select';
import chroma from 'chroma-js';
import { groups } from 'd3-array';
import { showFloat, showInt, showKb } from '../../lib/display';
import { fields } from '../../layers'
import {Tooltip} from 'react-tooltip';
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
  control: (styles ) => ({ 
    ...styles, 
    backgroundColor: 'white', 
    width: isActive ? activeWidth + "px" : restingWidth + "px",
    // transition: 'translate 2s ease',
    transition: 'transform 0.1s ease',
    transform: isActive ? `translateX(-${activeWidth - restingWidth - 20}px)` : 'translateX(0)',
  }),
  container: (provided) => ({
    ...provided,
    position: 'relative',
    transition: 'width 0s ease',
    // width: 200,
  }),
  option: (styles, { data, isDisabled, isFocused, isSelected }) => {
    const color = chroma(data.color);
    return {
      ...styles,
      // transition: 'all 2s ease',
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
  input: (styles) => ({ 
    ...styles, 
    ...dot(), 
    width: isActive ? activeWidth + "px" : '10px', 
  }),
  placeholder: (styles) => ({ ...styles, ...dot('#ccc') }),
  singleValue: (styles, { data }) => ({ 
    ...styles, 
    ...dot(data.color), 
    // TODO uncomment this if want mini lock ui
    // color: isActive ? 'black' : 'transparent', 
    overflow: 'visible',
  }),
  // for moving the menu to the side
  
  menu: (provided) => ({
    ...provided,
    // width: 300,
    right: isActive ? (activeWidth - restingWidth - 20) + "px": "0",
    // transition: 'right 2s ease',
    // transform: isActive ? `translateX(-${activeWidth - restingWidth}px)`: 'translateX(0)',
  }),
  // menuList: (provided) => ({
  //   ...provided,
  //   // transition: 'none',
  //   // transition: 'all 0.3s ease',
  //   transition: 'right 2s ease',
  //   // transform: isActive ? 'translateX(0)' : `translateX(${activeWidth - restingWidth}px)`,
  // }),
  
});

const SelectOrder = ({
  order, 
  orderSums, 
  previewField, 
  previewValues,
  showNone, 
  showUniquePaths, 
  disabled, 
  activeWidth, 
  restingWidth, 
  orderMargin = 0,
}) => {
  const [selectedField, setSelectedField] = useState(null)
  const [allFieldsGrouped, setAllFieldsGrouped] = useState([])
  const [fieldMap, setFieldMap] = useState({})

  const { filters, handleFilter } = useContext(FiltersContext);

  useEffect(() => {
    // console.log("filters", filters)
    if(filters[order]) {
      const sf = fieldMap[filters[order].id]
      if(sf) setSelectedField(sf)
    } else {
      setSelectedField(null)
    }
  }, [filters, order, fieldMap])

  const handleChange = useCallback((selectedOption) => {
    handleFilter(selectedOption, order)
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
    let allFields = fields.map(f => {
      let layer = f.layer
      let oc = orderSums.find(o => o.order == order)
      let counts = null
      if(oc) {
        counts = oc.counts[layer.datasetName]
      }
      return {
        ...f,
        order,
        count: counts ? counts[f.index] : "?",
      }
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


  useEffect(() => {
    if(previewField && previewValues) {
      let matchingField = {...previewField}
      matchingField['order'] = order
      matchingField['percent'] = previewValues[order] * 100
      const maxPreviewValue = Math.max(...Object.values(previewValues));
      matchingField['maxPercent'] = maxPreviewValue * 100;
      console.log("matchingField", matchingField)
      if(previewValues[order] > 0) setPreviewBar(matchingField)
    } else {
      setPreviewBar(null) 
    }
  }, [previewField, previewValues, order])

  return (
    <div className="filter-order" style={{ 
        marginBottom: order == 14 ? "0px" : orderMargin + "px",
        marginTop: order == 4 ? orderMargin/2 + "px" : 0
      }}>
      {/* <span className="order-label">
        {showKb(Math.pow(4, 14 - order))}
      </span>  */}
      <div className="button-column">
      {disabled ? <div className="disabled" data-tooltip-id="higher-filter">🚫</div> : null}
        <Tooltip id="higher-filter" place="right" effect="solid">
           Disabled
        </Tooltip>
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
      { previewBar ? 
      <div>
        <button 
            className="select" 
            data-tooltip-id={"select"+order} 
            style={{opacity: previewBar.percent/previewBar.maxPercent + 0.25}}
            onClick={() => handleChange(previewBar)}
            >✅</button>
        <Tooltip id={"select"+order} place="top" effect="solid" className="tooltip-custom">
          Select {previewBar.label} at {showKb(Math.pow(4, 14 - previewBar.order))}: {previewBar.percent.toFixed(2)}%
        </Tooltip>
      </div>
      // <div className="preview-bar-container">
      //     <div
      //       className="preview-bar"
      //       style={{
      //         width: `${previewBar.percent}%`,
      //         backgroundColor: chroma(previewBar.color).alpha(0.5).css(),
      //         height: '20px',
      //         marginTop: '10px'
      //       }}
      //     >
      //     <span>{showFloat(previewBar.percent)}%</span>
      //     </div>
      //   </div>
      : null}
      </div>

      <div className="filter-group">
        <Select
          options={allFieldsGrouped}
          styles={colourStyles(isActive, restingWidth, activeWidth)}
          value={selectedField}
          isDisabled={disabled}
          // menuPortalTarget={document.body}
          onChange={handleChange}
          onFocus={() => setIsActive(true)}
          onBlur={() => setIsActive(false)}
          // onMenuClose={() => setIsActive(false)}
          placeholder={<div></div>}
          menuPlacement="auto"
          formatOptionLabel={formatLabel}
          formatGroupLabel={data => (
            <div style={{ fontWeight: 'bold' }}>
              {data.label}
            </div>
          )}
        />
      </div>


        
    </div>
  )
}

export default SelectOrder
