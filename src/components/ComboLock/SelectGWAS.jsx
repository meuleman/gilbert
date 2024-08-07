import { useState, useEffect, useCallback, useContext } from 'react';
// TODO: warning in console about defaultProps comes from this component
// If we upgrade to react 18 it will break
import Select from 'react-select-virtualized';

import chroma from 'chroma-js';
import {Tooltip} from 'react-tooltip';

import FiltersContext from './FiltersContext'
import { makeField } from '../../layers'
import variants_gwas_rank from '../../layers/variants_rank_gwas'
import gwas from '../../layers/variants_gwas_fields.json'


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
  control: (styles) => ({ ...styles, backgroundColor: 'white', width: isActive ? activeWidth + "px" : restingWidth + "px"  }),
  option: (styles, { data, isDisabled, isFocused, isSelected }) => {
    const color = chroma(data.color);
    return {
      ...styles,
      backgroundColor: isDisabled
        ? undefined
        : isSelected
        ? "white"
        : isFocused
        ? color.alpha(0.1).css()
        : "white",
      color: isDisabled
        ? '#ccc'
        : isSelected
        // ? chroma.contrast(color, 'white') > 2
          ? 'white'
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

const SelectGWAS = ({
  selected = null, 
  activeWidth = 570, 
  restingWidth = 65, 
  onSelect = () => {}
}) => {
  const [selectedField, setSelectedField] = useState(null)

  const [isActive, setIsActive] = useState(false);

  const { filters, handleFilter } = useContext(FiltersContext);

  useEffect(() => {
    console.log("selected", selected)
    setSelectedField(selected || null)
  }, [selected])

  const [disabled, setDisabled] = useState(false)
  useEffect(() => {
    // console.log("filters")
    const o14 = filters[14]
    if(o14 && o14.layer != variants_gwas_rank) {
      // console.log("DOESNT MATCH", o14)
      setDisabled(true)
    } else {
      setDisabled(false)
    }
  }, [filters])

  const [allFields, setAllFields] = useState(gwas.fields.map((f,i) => {
    let field = makeField(variants_gwas_rank, f, 14)
    field.i = i
    field.count = gwas.counts[i]
    return field
  }).sort((a,b) => b.count - a.count))

  const formatLabel = useCallback((option) => {
  //   console.log("OPTION", option)
    return (
      <div>
        <span>{option.label} </span>
        <span style={{color: "gray"}}>{option.count}</span>
      </div>
    );
  }, []);

  // const formatGroupLabel = useCallback((data) => {
  //   // console.log("DATA group label", data)
  //   return (
  //     <div style={{ fontWeight: 'bold' }}>
  //       {data.label}
  //       </div>
  //     )
  // }, [])

  
  useEffect(() => {
    onSelect(selectedField)
    handleFilter(selectedField, 14)
  }, [selectedField])

  return (
    <div className="filter-fields">
      <div className="filter-group">
        <Select
          options={allFields}
          styles={colourStyles(isActive, restingWidth, activeWidth)}
          value={selectedField}
          onChange={(selectedOption) => {
            console.log("selected!", selectedOption)
            setSelectedField(selectedOption)
          }}
          onFocus={() => setIsActive(true)}
          onBlur={() => setIsActive(false)}
          placeholder={<div>Select GWAS</div>}
          menuPlacement="top"
          formatOptionLabel={formatLabel}
          getOptionValue={(option) => option.index} 
          disabled={disabled}
          // formatGroupLabel={formatGroupLabel}
        />
      </div>
      {disabled ? <div className="disabled" data-tooltip-id="higher-filter">🚫</div> : null}
        <Tooltip id="higher-filter" place="right" effect="solid">
           Disabled
        </Tooltip>
    </div>
  )
}

export default SelectGWAS;