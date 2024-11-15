import { useState, memo, useMemo } from 'react';

import { AutoComplete } from 'antd';

import { filterFields } from '../layers'

const factorLabel = (f) => {
  return (
    <div key={f.label}>
      <div style={{ 
        display: 'inline-block',
        backgroundColor: f.color,
        borderRadius: 2,
        marginRight: 8,
        height: 10,
        width: 10,
        }} />
      <span>{f.field}</span> 
      <div style={{ fontSize: '0.8em', color: '#888' }}>
        {f.layer.name}
      </div>
    </div>
  )
}

const FactorSearch = memo(({
  onSelect = () => {},
}) => {

  const [searchValue, setSearchValue] = useState('');
  const [inputValue, setInputValue] = useState('');

  const filteredOptions = useMemo(() => {

    const factorOptions = filterFields.filter(f => {
      return f.field.toLowerCase().includes(searchValue.toLowerCase())
    }).map(f => ({
      value: f.label,
      label: factorLabel(f),
      factor: f,
    }))
    console.log("factorOptions", factorOptions)
    return factorOptions
  }, [searchValue]);

  const handleSearch = (value) => {
    setSearchValue(value);
    setInputValue(value);
  };

  const handleSelect = (value) => {
    const selectedOption = filteredOptions.find(option => option.value === value);
    console.log("option", selectedOption)
    onSelect(selectedOption);
    setInputValue("")
  };

  const handleClear = () => {
    onSelect(null);
    setInputValue('');
  };


  return (
    <div>
      <AutoComplete
        options={filteredOptions}
        value={inputValue}
        onSearch={handleSearch}
        onSelect={handleSelect}
        placeholder="Search for a factor"
        style={{ width: '400px' }}
      />
    </div>
  )
})
FactorSearch.displayName = 'FactorSearch';
export default FactorSearch

