import { useState, useEffect, useCallback, useContext, useRef } from 'react';
import Select from 'react-select';
import chroma from 'chroma-js';
import { groups } from 'd3-array';

import { filterFields } from '../../layers'
import FiltersContext from './FiltersContext'
import Loading from '../Loading';
import { fetchFilterPreview } from '../../lib/dataFiltering';



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

const SelectFactor = ({
  activeWidth, 
  restingWidth, 
  onPreviewValues = () => {},
}) => {

  const [selectedField, setSelectedField] = useState(null)
  const [isActive, setIsActive] = useState(false);
  const { filters, clearFilters } = useContext(FiltersContext);

  const filtersRef = useRef(filters);
  useEffect(() => {
    filtersRef.current = filters;
    setSelectedField(null)
  }, [filters])

  const [loadingPreview, setLoadingPreview] = useState(false)
  useEffect(() => {
    console.log("selectedField kicking off preview", selectedField, filters)
    if(selectedField) {
      onPreviewValues(null)
      setLoadingPreview(true)
      fetchFilterPreview(filtersRef.current, selectedField).then((response) => {
        // setPreviewValues(response.preview_fractions)
        console.log("sending home a message", selectedField, response.previews[0].preview)
        onPreviewValues(selectedField, response.previews[0].preview)
        setLoadingPreview(false)
        // setSelectedField(null)
      })
    } else {
      onPreviewValues(null, null)
    }
  }, [selectedField])

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
    const grouped = groups(filterFields, f => f.layer.name)
      .map(d => ({ label: d[0], options: d[1] }))
      .filter(d => d.options.length)
    setAllFields(grouped)
  }, [])
   return (
    <div className="select-preview" style={{display: "flex", flexDirection:"row"}}>
        { loadingPreview ?  <Loading text="🤖" type="emoji"></Loading>:null }
        <Select
          options={allFields}
          styles={colourStyles(isActive, restingWidth, activeWidth)}
          value={selectedField}
          onChange={(selectedOption) => {
            setSelectedField(selectedOption)
          }}
          onFocus={() => setIsActive(true)}
          onBlur={() => setIsActive(false)}
          isClearable={true}
          placeholder={<div>Select a factor</div>}
          formatOptionLabel={formatLabel}
          formatGroupLabel={data => (
            <div style={{ fontWeight: 'bold' }}>
              {data.label}
            </div>
          )}
        />
    </div>
  )
}

export default SelectFactor;