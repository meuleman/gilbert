import { useState, memo, useMemo } from 'react';

import { AutoComplete } from 'antd';

import { allFactorFilterFields } from '../layers'

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
        {f.layer.labelName}s
      </div>
    </div>
  )
}

const FactorSearch = memo(({
  onSelect = () => { },
  onBlur = () => { },
}) => {

  const [searchValue, setSearchValue] = useState('');
  const [inputValue, setInputValue] = useState('');

  const filteredOptions = useMemo(() => {
    // find the genes that match the input
    const factorOptions = allFactorFilterFields.filter(f => {
      return f.field.toLowerCase().includes(searchValue.toLowerCase())
    }).map(f => ({
      value: f.label,
      label: factorLabel(f),
      factor: f,
    }))
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
    setInputValue(selectedOption.label);
  };

  const handleClear = () => {
    onSelect(null);
    setInputValue('');
  };

  return (
    <AutoComplete
      autoFocus
      options={filteredOptions}
      value={inputValue}
      onBlur={onBlur}
      onSearch={handleSearch}
      onSelect={handleSelect}
      placeholder="Search for a dataset factor"
      style={{ width: '100%' }}
    />
  )
})
FactorSearch.displayName = 'FactorSearch';
export default FactorSearch

