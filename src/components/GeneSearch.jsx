import { useState, useEffect, useCallback, useContext, memo, useMemo } from 'react';

import { AutoComplete, Button } from 'antd';
import { CloseCircleOutlined } from '@ant-design/icons';

const genomicPositionRegex = /^chr(\d{1,2}|X|Y):(\d+)-(\d+)$/;

import { gencode } from '../lib/Genes';

const GeneSearch = memo(({
  onSelect = () => {},
}) => {

  const [searchValue, setSearchValue] = useState('');
  const [inputValue, setInputValue] = useState('');

  const filteredOptions = useMemo(() => {
    const geneOptions = gencode.filter(g =>
      g.hgnc.toLowerCase().includes(searchValue.toLowerCase())
    ).map(g => ({
      value: g.hgnc,
      label: (
        <div>
          <div>{g.hgnc}</div>
          <div style={{ fontSize: '0.8em', color: '#888' }}>
            {`${g.chromosome}:${g.start}-${g.end} (${g.posneg})`}
          </div>
        </div>
      ),
      gene: g,
    }))

    // Add genomic position option if the input matches the regex
    if (genomicPositionRegex.test(searchValue)) {
      return [
        {
          value: searchValue,
          label: `Genomic Position: ${searchValue}`,
          isGenomicPosition: true
        },
        ...geneOptions
      ];
    }

    return geneOptions;
  }, [searchValue]);

  const handleSearch = (value) => {
    setSearchValue(value);
    setInputValue(value);
  };

  const handleSelect = (value) => {
    console.log("SELECT", value)
    if(genomicPositionRegex.test(value)) {
      onSelect({
        value: value,
        chromosome: value.split(':')[0], 
        start: +value.split(':')[1].split('-')[0], 
        end: +value.split(':')[1].split('-')[1]
      });
      setInputValue(value);
      return;
    }
    const selectedOption = filteredOptions.find(option => option.value === value);
    console.log("gene", selectedOption)
    onSelect(selectedOption);
    setInputValue(selectedOption.label);
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
        placeholder="Search for a gene or coordinate"
        style={{ width: '300px' }}
      />
    </div>
  )
})
GeneSearch.displayName = 'GeneSearch';
export default GeneSearch

