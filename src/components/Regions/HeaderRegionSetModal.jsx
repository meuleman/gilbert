import { useState, useCallback, useEffect, useRef, useMemo, useContext } from 'react'
import { groups } from 'd3-array'

import FactorSearch from '../FactorSearch'
import RegionsContext from './RegionsContext'
import { allFactorFilterFields } from '../../layers'
import { fetchRegionSetFromFactor } from '../../lib/apiService'
import { download, parseBED } from '../../lib/regionsets'
import { fromIndex } from '../../lib/regions'
import { Tooltip } from 'react-tooltip';
import CloseIcon from "@/assets/close.svg?react"
import DownloadIcon from "@/assets/download.svg?react"
import UpDownChevronIcon from "@/assets/up-down-chevron.svg?react"
import './HeaderRegionSetModal.css'
import { X } from "lucide-react";

const HeaderRegionSetModal = ({
} = {}) => {
  const { sets, activeSet, activeRegions, setActiveSet, setNumTopRegions, clearActive, saveSet, deleteSet } = useContext(RegionsContext)
  // const { setFilters } = useContext(FiltersContext)
  const [searchShowing, setSearchShowing] = useState(false)
  const [expandedGroups, setExpandedGroups] = useState({});
  const toggleRef = useRef(null);
  const dropdownRef = useRef(null);

  function calculateCount(num, order) {
    let obp = Math.pow(4, 14 - order)
    let tbp = num * obp
    let percent = tbp / 3088269856 * 100
    return {
      num,
      obp,
      tbp,
      percent
    }
  }

  const handleDownload = useCallback((set) => {
    download(set.regions, set.name)
  }, [])

  const handleNumTopRegions = useCallback((e) => {
    setNumTopRegions(+e.target.value)
  }, [setNumTopRegions])

  const handleDeselect = useCallback(() => {
    clearActive()
    // setFilters({})
  }, [clearActive])

  const handleSelect = useCallback((set) => {
    setSearchShowing(false)
    setExpandedGroups({})
    setActiveSet(set)
    // if(set?.type !== "filter") {
    //   setFilters({})
    // }
  }, [setActiveSet])

  const handleFileChange = useCallback((event) => {
    setSearchShowing(false)
    setExpandedGroups({})
    const file = event.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = function (e) {
        const content = e.target.result;
        // Process file content into an array
        const data = parseBED(content);
        // Store in local storage
        // setFilters({})
        saveSet(file.name, data, {type: "file", activate: true})
      };
      reader.readAsText(file);
    }
  }, [saveSet]);

  const handleSelectFactor = useCallback((selected) => {
    setSearchShowing(false)
    setExpandedGroups({})
    if (!selected) return
    if (selected.factor) {
      // query for the paths for the factor
      let f = selected.factor
      fetchRegionSetFromFactor({ factor: f.index, dataset: f.layer.regionSetName || f.layer.datasetName }, null)
        .then((response) => {
          let regions = response.regions.map(r => {
            return { ...fromIndex(r.chromosome, r.i, r.order), score: r.score }
          })
          saveSet(`${selected.factor.field} ${selected.factor.layer.labelName}`, regions, { activate: true, type: "search", factor: selected.factor })
        })
    } 
  }, [saveSet, setSearchShowing])

  // TODO: having issues with this useEffect and FactorSearch dropdown, the return function runs instead of the factor being selected
  // useEffect(() => {
  //   if (!searchShowing) return;
  //   function handleClickOutside(event) {
  //     // Only close if click is outside both dropdown AND toggle button
  //     if (
  //       dropdownRef.current && 
  //       !dropdownRef.current.contains(event.target) &&
  //       !toggleRef.current.contains(event.target)
  //     ) {
  //       setSearchShowing(false);
  //     }
  //   }

  //   document.addEventListener('mousedown', handleClickOutside, true);
  //   return () => document.removeEventListener('mousedown', handleClickOutside, true);
  // }, [searchShowing]);

  const datasetGroups = useMemo(() => {
    let dropdownDatasets = ["UKBB Variants", "DHS Domains", "Chromatin State Domains"]
    let nameConversion = {
      "UKBB Variants": "GWAS"
    }
    let dGroups = groups(
      allFactorFilterFields.filter(d => dropdownDatasets.includes(d.layer.labelName)), // filter to only show featured datasets
      d => d.layer.labelName
    )
    let dGroupsSorted = dGroups.sort((a, b) => dropdownDatasets.indexOf(a[0]) - dropdownDatasets.indexOf(b[0]))
      .map(g => [nameConversion[g[0]] || g[0], g[1]])
    return dGroupsSorted
  }, [allFactorFilterFields])

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
          {f.layer.labelName}
        </div>
      </div>
    )
  }

  return (
    <div className="relative">
      <div className="relative h-globalMenuBar flex items-center min-w-80">
        <div
          ref={toggleRef} 
          className="px-3.5 flex-1 flex items-center" 
          role="button" 
          onClick={() => setSearchShowing(!searchShowing)}
        >
          <div className="flex-1">
            <div className="text-bodyMuted">Active region set</div>
            <div>{activeSet?.name ?? "None selected"}</div>
          </div>
          <div className="ml-9 group">
            <UpDownChevronIcon />
          </div>
        </div>
        {activeSet && (
          <>
            <div className="h-2/5 w-px bg-separator" />
            <div className="h-globalMenuBar aspect-square flex items-center justify-center group">
              <X 
                data-tooltip-id="header-active-deselect" 
                width="18"
                role="button" 
                onClick={handleDeselect} 
                className="group-hover:[&_path]:stroke-red-500"
              />
              <Tooltip id="header-active-deselect" className="z-10">
                Clear active region set
              </Tooltip>
            </div>
            <div className="h-2/5 w-px bg-separator" />
            <div className="h-globalMenuBar aspect-square flex items-center justify-center group">
              <DownloadIcon 
                data-tooltip-id="header-download-regions" 
                role="button" 
                onClick={() => handleDownload(activeSet)} 
                className="[&_path]:fill-black group-hover:[&_path]:fill-red-500"
              />
              <Tooltip id="header-download-regions" className="z-10">
                Download {activeRegions?.length} regions to a BED file
              </Tooltip>
            </div>
            {/* <div className="h-2/5 w-px bg-separator" />
            <div className="h-globalMenuBar aspect-square flex items-center justify-center">
              <UploadIcon />
            </div> */}
          </>
        )}
      </div>
      <div>
        {searchShowing && (
          <div>
            {/* 4rem represents the heights of the status bar and the header combined */}
            <div 
              className="absolute z-20 top-full left-0 right-0 border border-separator bg-white p-3 max-h-[calc(100vh-4rem)] overflow-y-auto rounded-b-lg"
              tabIndex={0}
              ref={dropdownRef}
            >
              <div className="flex flex-col space-y-4">
                <div>
                  <h3 className="font-medium mb-2">Upload BED file</h3>
                  <div className="px-4 py-3 bg-gray-50 rounded-md">
                    <input type="file" onChange={handleFileChange} />
                  </div>
                </div>
                <div>
                  <h3 className="font-medium mb-2">Search</h3>
                  <FactorSearch onSelect={handleSelectFactor} />
                </div>

                <div>
                  <div className="flex justify-between mb-2">
                    <h3 className="font-medium">Browse by category</h3>
                    <button 
                      className="text-sm text-blue-600 hover:underline"
                      onClick={() => setExpandedGroups({})}
                    >
                      Collapse all
                    </button>
                  </div>
                  
                  {datasetGroups.map(([groupName, factors]) => (
                    <div key={groupName} className="mb-2 border border-gray-200 rounded-md overflow-hidden">
                      <div 
                        className="bg-gray-50 px-4 py-2 font-medium cursor-pointer flex justify-between items-center"
                        onClick={() => setExpandedGroups(prev => ({
                          ...prev,
                          [groupName]: !prev[groupName]
                        }))}
                      >
                        <span>{groupName}</span>
                        <span className="text-gray-500">
                          {expandedGroups[groupName] ? '▼' : '►'}
                        </span>
                      </div>
                      
                      {expandedGroups[groupName] && (
                        <div className="p-2 max-h-40 overflow-y-auto">
                          {factors.map((factor, idx) => (
                            <div 
                              key={idx}
                              className="cursor-pointer px-3 py-2 hover:bg-blue-50 text-sm"
                              onClick={() => handleSelectFactor({factor})}
                            >
                              {factorLabel(factor)}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  ))}
                </div>

                <div>
                  <h3 className="font-medium mb-2">Saved Region Sets</h3>
                  <table>
                    <tbody>
                      {sets.map((set, index) => (
                      <tr key={index} className="hover:bg-gray-50">
                        <td className="py-1 px-2 group align-middle text-center">
                          {activeSet?.name == set.name 
                          ?
                          <X 
                            role="button" 
                            onClick={() => handleSelect(null)}
                            width="18"
                            className="inline-block [&_path]:origin-center group-hover:[&_path]:stroke-red-500"
                          />
                          : <button 
                              className="text-black hover:text-red-500" 
                              onClick={() => handleSelect(set)}
                            >Select</button>
                          }
                          </td>
                        <td className="py-1 px-2">{set.name}</td>
                        <td className="py-1 px-2">{set.regions?.length} regions</td> 
                        <td className="py-1 px-2 group">
                          <DownloadIcon 
                            data-tooltip-id={`download-regions-${index}`}
                            role="button" 
                            onClick={() => handleDownload(set)} 
                            className="group-hover:[&_path]:fill-red-500"
                          />
                          <Tooltip id={`download-regions-${index}`}>
                            Download {set.name} ({set.regions?.length} regions) to a BED file
                          </Tooltip>
                        </td>
                        <td className="py-1 px-2">
                          <button onClick={() => {
                            setActiveSet(null)
                            deleteSet(set.name)
                          }} disabled={set.example}>🗑️</button> 
                        </td>
                      </tr>
                      ))}
                    </tbody>
                  </table>
                </div> 
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
export default HeaderRegionSetModal
