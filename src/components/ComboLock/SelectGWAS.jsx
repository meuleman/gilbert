import { useState, useEffect, useCallback, useContext, memo, useMemo } from 'react';
// TODO: warning in console about defaultProps comes from this component
// If we upgrade to react 18 it will break
import Select from 'react-select-virtualized';

import { groups } from 'd3-array';
import { showInt, showKb } from '../../lib/display';
import chroma from 'chroma-js';
import {Tooltip} from 'react-tooltip';

import FiltersContext from './FiltersContext'
import { makeField, filterFields } from '../../layers'
import variants_gwas_rank from '../../layers/variants_rank_gwas'
// import gwas from '../../layers/variants_gwas_fields.json'
import gwas from '../../layers/gwas_filter_traits.json'  // temporary fix until gwas layer with correct number of fields


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

const colourStyles = (isActive = false, restingWidth = 65, activeWidth = 570) => ({
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
  menu: (provided) => ({
    ...provided,
    right: isActive ? (activeWidth - restingWidth - 20) + "px": "0",
  }),
  option: (styles, { data, isDisabled, isFocused, isSelected }) => {
    const color = chroma(data.color);
    return {
      ...styles,
      backgroundColor: isDisabled
        ? undefined
        : isFocused
        ? color.alpha(0.1).css()
        : undefined,
      color: isDisabled
        ? '#ccc'
          : 'black',
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
  input: (styles) => ({ 
    ...styles, 
    ...dot(), 
    width: isActive ? activeWidth + "px" : '10px' 
  }),
  placeholder: (styles) => ({ ...styles, ...dot('#ccc') }),
  singleValue: (styles, { data }) => ({ 
    ...styles, 
    ...dot(data.color), 
    // TODO uncomment this if want mini lock ui
    // color: isActive ? 'black' : 'transparent', 
    overflow: 'visible',
  }),
});

const SelectGWAS = memo(({
  orderSums,
  previewField, 
  previewValues,
  activeWidth = 570, 
  restingWidth = 65, 
  // onSelect = () => {}
  }) => {
  const [selectedField, setSelectedField] = useState(null)

  const [isActive, setIsActive] = useState(false);

  const { filters, handleFilter } = useContext(FiltersContext);

  const allFields = useMemo(() => {
    let oc = orderSums.find(o => o.order == 14)
    let gf = gwas.fields.map((f, i) => {
      // let field = makeField(variants_gwas_rank, f, 14);  // temporary fix until gwas layer with correct number of fields
      let field = {  // temporary fix until gwas layer with correct number of fields
        id: "gwas_full_data_rank:" + i, 
        // layer: l, 
        datasetName: "gwas_full_data_rank",
        label: f + " " + "gwas_full_data_rank",
        field: f,
        index: i, 
        color: "black",
        order: 14,
      }
      field.i = i;
      // field.count = gwas.counts[i];
      field.count = oc.counts["gwas_full_data_rank"][field.index]  // temporary fix until gwas layer with correct number of fields
      if(field.field.length > 50) {
        field.label = '⚫️ ' + field.field.slice(0,50) + "..."
      } else {
        field.label = '⚫️ ' + field.field
      }
      field.label += ' (' + showInt(field.count) + " regions)"
      return field;
    }).sort((a, b) => b.count - a.count)


    let ff = filterFields.map(f => {
      let layer = f.layer
      let counts = null
      if(oc) {
        counts = oc.counts[layer.datasetName]
      }
      let count = counts ? counts[f.index] : "?"
      return {
        ...f,
        label: '⚪️ ' + f.field + " (" + showInt(count) + " regions)",
        order: 14,
        count,
      }
    }).filter(f => !!f && f.count > 0 && f.count != "?")

    return gf.concat(ff)
  }, [orderSums]);

  const allFieldsGrouped = useMemo(() => {
    const grouped = groups(allFields, f => f.layer ? f.layer.name : f.datasetName)  // temporary fix until gwas layer with correct number of fields
      .map(d => ({ label: d[0], options: d[1].sort((a,b) => b.count - a.count) }))
      .filter(d => d.options.length)
      // console.log("GROUPED", grouped)
      return grouped
  }, [allFields])

  const fieldMap = useMemo(() => {
    const fieldMap = {}
    allFields.forEach(f => {
      fieldMap[f.id] = f
    })
    return fieldMap
  }, [allFields])

  useEffect(() => {
    // console.log("filters", filters)
    if(filters[14]) {
      // console.log("FILTERS", filters[14])
      const sf = fieldMap[filters[14].id]
      // console.log("SF", sf)
      if(sf) setSelectedField(sf)
    } else {
      setSelectedField(null)
    }
  }, [filters, fieldMap])

  useEffect(() => {
    // console.log("filters", filters)
    if(filters[14]) {
      const sf = fieldMap[filters[14].id]
      if(sf) setSelectedField(sf)
    } else {
      setSelectedField(null)
    }
  }, [filters, fieldMap])

  const handleChange = useCallback((selectedOption) => {
    // console.log("SELECTED OPTION", selectedOption)
    handleFilter(selectedOption, 14, true)
    setIsActive(false)
  }, [handleFilter])

  const [previewBar, setPreviewBar] = useState(null)
  useEffect(() => {
    // console.log("GWAS PREVIEW", previewField, previewValues)
    if(previewField && previewValues) {
      let matchingField = {...previewField}
      matchingField['order'] = 14
      matchingField['percent'] = previewValues[14] * 100
      const maxPreviewValue = Math.max(...Object.values(previewValues));
      matchingField['maxPercent'] = maxPreviewValue * 100;
      console.log("matchingField", matchingField)
      if(previewValues[14] > 0) setPreviewBar(matchingField)
    } else {
      setPreviewBar(null) 
    }
  }, [previewField, previewValues])

  return (
    <div className="filter-order">
        <div className="button-column">
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
                data-tooltip-id={"select"+14} 
                style={{opacity: previewBar.percent/previewBar.maxPercent + 0.25}}
                onClick={() => handleChange(previewBar)}
                >✅</button>
            <Tooltip id={"select"+14} place="top" effect="solid" className="tooltip-custom">
              Select {previewBar.label} at {showKb(Math.pow(4, 14 - previewBar.order))}: {previewBar.percent.toFixed(2)}%
            </Tooltip>
          </div>
          : null}
        </div>
        <Select
          options={allFieldsGrouped}
          styles={colourStyles(isActive, restingWidth, activeWidth)}
          value={selectedField}
          onChange={handleChange}
          onFocus={() => setIsActive(true)}
          onBlur={() => setIsActive(false)}
          placeholder={<div></div>}
          menuPlacement="top"
          // formatOptionLabel={formatLabel}
          // formatGroupLabel={formatGroupLabel}
          getOptionValue={(option) => option.id}
          isClearable={false}
          // disabled={disabled}
          grouped
        />
      {/* {disabled ? <div className="disabled" data-tooltip-id="higher-filter">🚫</div> : null}
        <Tooltip id="higher-filter" place="right" effect="solid">
           Disabled
        </Tooltip> */}
    </div>
  )
})
SelectGWAS.displayName = 'SelectGWAS';

export default SelectGWAS;