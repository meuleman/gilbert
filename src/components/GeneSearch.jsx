import { useState, useEffect, memo, useMemo, useRef } from 'react';

import { AutoComplete } from 'antd';

const genomicPositionRegex = /^chr(\d{1,2}|X|Y):(\d+)-(\d+)$/;
const genomicPositionRegex2 = /^chr(\d{1,2}|X|Y)(\s+)(\d+)(\s+)(\d+)$/;

import { gencode } from '../lib/genes';

const geneLabel = (g) => {
  return (
    <div key={g.hgnc}>
      <div>
        <div style={{ display: 'inline-block', marginRight: 8 }}>
          🧬
        </div>
        {g.hgnc}
      </div>
      <div style={{ fontSize: '0.8em', color: '#888' }}>
        {`${g.chromosome}:${g.start}-${g.end} (${g.posneg})`}
      </div>
    </div>
  )
}


const GeneSearch = memo(({
  onSelect = () => { },
}) => {

  const [searchValue, setSearchValue] = useState('');
  const [inputValue, setInputValue] = useState('');

  const filteredOptions = useMemo(() => {
    // find the genes that match the input
    const geneOptions = gencode.filter(g =>
      g.hgnc.toLowerCase().includes(searchValue.toLowerCase())
    ).map(g => ({
      value: g.hgnc,
      label: geneLabel(g),
      gene: g,
    }))

    // const factorOptions = allFactorFilterFields.filter(f => {
    //   return f.field.toLowerCase().includes(searchValue.toLowerCase())
    // }).map(f => ({
    //   value: f.label,
    //   label: factorLabel(f),
    //   factor: f,
    // }))
    // console.log("factorOptions", factorOptions)

    // Add genomic position option if the input matches the regex
    // and any genes if they also match
    if (genomicPositionRegex.test(searchValue)) {
      return [
        {
          value: searchValue,
          label: `Genomic Position: ${searchValue}`,
          isGenomicPosition: true
        },
        ...geneOptions,
        // ...factorOptions
      ];
    } else if (genomicPositionRegex2.test(searchValue)) {
      return [
        {
          value: searchValue,
          label: `Genomic Position: ${searchValue}`,
          isGenomicPosition: true
        },
        ...geneOptions,
        // ...factorOptions
      ];
    }

    return [
      ...geneOptions,
      // ...factorOptions
    ];
  }, [searchValue]);

  const handleSearch = (value) => {
    setSearchValue(value);
    setInputValue(value);
  };

  const handleSelect = (value) => {
    if (genomicPositionRegex.test(value)) {
      onSelect({
        value: value,
        chromosome: value.split(':')[0],
        start: +value.split(':')[1].split('-')[0],
        end: +value.split(':')[1].split('-')[1]
      });
      setInputValue(value);
      return;
    } else if (genomicPositionRegex2.test(value)) {
      let matches = genomicPositionRegex2.exec(value)
      onSelect({
        value: value,
        chromosome: "chr" + matches[1],
        start: +matches[3],
        end: +matches[5]
      });
      setInputValue(value);
      return;
    }
    const selectedOption = filteredOptions.find(option => option.value === value);
    console.log("option", selectedOption)
    onSelect(selectedOption);
    setInputValue(selectedOption.label);
  };

  const handleClear = () => {
    onSelect(null);
    setInputValue('');
  };

  const autocompleteRef = useRef(null)
  const autocompleteWrapperRef = useRef(null)
  useEffect(() => {
    function handleKeyDown(e) {
      // Don't trigger when already in an input field
      const activeElement = document.activeElement;
      const isInputActive = activeElement.tagName === 'INPUT' || activeElement.tagName === 'TEXTAREA';
      
      if (e.key === "/" && !isInputActive) {
        // Prevent the "/" from being entered
        e.preventDefault();
        
        if (autocompleteWrapperRef.current) {
          // Get the input element
          const inputElement = autocompleteWrapperRef.current.querySelector('.ant-select-selection-search input');
          if (inputElement) {
            inputElement.focus();
            
            // Clear any existing value
            setInputValue('');
            setSearchValue('');
          }
        }
      }
    }
    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [setInputValue, setSearchValue]);


  return (
    <div ref={autocompleteWrapperRef}>
      <AutoComplete
        options={filteredOptions}
        value={inputValue}
        onSearch={handleSearch}
        onSelect={handleSelect}
        placeholder="Search for a gene or genomic coordinate"
        className="[&_input]:text-xs w-full h-full"
        variant="borderless"
        ref={autocompleteRef}
      />
    </div>
  )
})
GeneSearch.displayName = 'GeneSearch';
export default GeneSearch

