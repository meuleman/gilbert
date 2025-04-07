import { useState, useCallback, useEffect, useContext, memo, useRef, useMemo } from 'react'

import { showPosition, showKbOrder } from '../../lib/display'
import { Tooltip } from 'react-tooltip';
import { download } from '../../lib/regionsets'
import RegionsContext from './RegionsContext'
import RegionSetModalStatesStore from '../../states/RegionSetModalStates'
import SelectedStatesStore from '../../states/SelectedStates'
import FactorSearch from '../FactorSearch';
import Loading from '../Loading';
import AccordionArrow from '@/assets/accordion-circle-arrow.svg?react';
import Spectrum from '../../components/Narration/Spectrum';
import Minimap from './Minimap';
import MinimapIcon from "@/assets/minimap.svg?react";
import ListviewIcon from "@/assets/listview.svg?react";

import styles from './ActiveRegionSetModal.module.css'

function filterMatch(f1, f2) {
  return f1.index === f2.index && f1.layer.datasetName === f2.layer.datasetName
}
function inFilters(filters, f) {
  return filters.some(filter => filterMatch(filter, f))
}

function useContainerSize(containerRef, dependencies) {
  const [size, setSize] = useState([0, 0]);  // helps with initial render

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    // Create a new ResizeObserver instance
    const resizeObserver = new ResizeObserver((entries) => {
      for (let entry of entries) {
        // The contentRect provides the new dimensions
        const { width, height } = entry.contentRect;
        setSize([width, height]);
      }
    });

    // Start observing the container element
    resizeObserver.observe(container);

    // Cleanup: unobserve the element and disconnect the observer when component unmounts
    return () => {
      resizeObserver.unobserve(container);
      resizeObserver.disconnect();
    };
  }, [containerRef, ...dependencies]);

  return size;
}


const ActiveRegionSetModal = () => {

  const { 
    activeSet,
    activeRegions, 
    activeFilters,
    filteredRegionsLoading,
    filteredActiveRegions,
    setActiveSet,
    setActiveFilters,
    regionSetNarration: regionSetSummary,
    regionSetNarrationLoading,
    regionSetArticles,
    activeGenesetEnrichment
  } = useContext(RegionsContext)
  
  const { showActiveRegionSet } = RegionSetModalStatesStore()
  const { 
    selected, setSelected, setRegion, regionSummary, selectedNarration, query, setQuery,
    setRegionSummary, generateQuery, generateSummary, feedback: selectedFeedback,
  } = SelectedStatesStore()

  const [showMinimap, setShowMinimap] = useState(true)

  const containerRef = useRef(null)
  const [width, height] = useContainerSize(containerRef, [activeGenesetEnrichment]);
  const minimapContainerRef = useRef(null)
  const [minimapWidth, minimapHeight] = useContainerSize(minimapContainerRef, [showMinimap]);

  const handleShowMinimap = useCallback(() => {
    setShowMinimap(!showMinimap)
  }, [showMinimap])

  const handleSelectActiveRegionSet = useCallback((region) => {
    setSelected(region?.subregion || region)  // set selected with implied region
    // setRegion(region)  // set region (zoom) with original region
  }, [setSelected, setRegion])

  const [regions, setRegions] = useState([])
  useEffect(() => {
    if (filteredActiveRegions) {
      setRegions(filteredActiveRegions)
      // } else if (activeRegions) {
      //   setRegions(activeRegions)
    } else {
      setRegions([])
    }
  }, [filteredActiveRegions])  // activeRegions

  const handleDeselect = useCallback(() => {
    setActiveSet(null)
    setActiveFilters([])
  }, [setActiveSet, setActiveFilters])

  const handleDownload = useCallback((set) => {
    download(activeRegions, set.name)
  }, [activeRegions])

  const handleFactorSelect = useCallback((f) => {
    const exists = activeFilters.some(filter =>
      filter.index === f.index &&
      filter.layer.datasetName === f.layer.datasetName
    )
    if (!exists) {
      setActiveFilters([...activeFilters, f])
    }
  }, [setActiveFilters, activeFilters])

  const [expandedRows, setExpandedRows] = useState(new Set())

  const toggleExpand = useCallback((regionKey) => {
    setExpandedRows(prev => {
      const next = new Set(prev)
      if (next.has(regionKey)) {
        next.delete(regionKey)
      } else {
        next.add(regionKey)
      }
      return next
    })
  }, [])

  const [activeTab, setActiveTab] = useState('table')

  if (!showActiveRegionSet) {
    return null
  }
  
  const listRegions = useMemo(() => {
    if (!regions?.length) return [];
    let newList = regions;
    let selectedInList = selected ? !!regions.find(d => (d.chromosome === selected.chromosome && d.i === selected.i && d.order === selected.order)) : false
    if(selectedInList) {
      // reorder list to have selected region on top
      newList = [
        {...selected, selected: true}, 
        ...regions.filter(d => !(d.chromosome === selected.chromosome && d.i === selected.i && d.order === selected.order))
      ]
    } 
    return newList
  }, [regions, selected]);

  const [manuallyAddedRegion, setManuallyAddedRegion] = useState(false)
  useEffect(() => {
    if(!!selected && !!regions) {
      const selectedInList = !!regions.find(d => (d.chromosome === selected.chromosome && d.i === selected.i && d.order === selected.order))
      if(!selectedInList) setManuallyAddedRegion(true)
      else setManuallyAddedRegion(false)
    } else {
      setManuallyAddedRegion(false)
    }
  }, [setManuallyAddedRegion, selected, regions])

  const [summaryToShowState, setSummaryToShowState] = useState("selected");
  const summaryToShow = useMemo(() => {
    if (!activeSet && !selected) return null;
    if (activeSet && !selected) return "regionSet";
    if (!activeSet && selected) return "selected";
    return summaryToShowState;
  }, [activeSet, selected, summaryToShowState]);
  
  const bothSummariesAvailable = useMemo(() => {
    return !!(activeSet && selected);
  }, [activeSet, selected]);

  useEffect(() => {
    if(selected) setSummaryToShowState("selected")
  }, [selected])

  const [showAbstracts, setShowAbstracts] = useState(false)
  const handleShowAbstracts = () => {
    setShowAbstracts(!showAbstracts)
  }

  useEffect(() => {
    if(selectedNarration) {
      let query = generateQuery(selectedNarration)
      if(!!query) setQuery(query)
      else setRegionSummary(null)
    }
  }, [selectedNarration, selectedNarration?.genesets])

  // generate summary on new query
  useEffect(() => {
    if(query !== "") {
      generateSummary()
    }
  }, [query])

  const handleFeedback = useCallback((feedback) => {
    if(summaryToShow === "regionSet") {
      // TODO: send region set feedback, api endpoint should be available
      console.log("Feedback for region set:", feedback)
    } else {
      selectedFeedback(feedback)
      console.log("Feedback for selected region:", feedback)
    }
  }, [selectedFeedback, summaryToShow])

  return (
    // TODO: remove hardcoded width
    <div className="flex-1 pl-1 min-h-0 max-h-full w-[24rem] text-xs overflow-hidden flex flex-col" ref={containerRef}>
      <div className="h-1/2 w-full">
        <div className="h-3/4 flex flex-col">
          {summaryToShow ? (
            <div className="mt-2 pt-2 mx-2 flex-1 flex flex-col min-h-0 border-1 border-gray-300 rounded-md">
              <h3 className="text-sm text-balck pl-2 pb-2">AI Summary:</h3>
              <div className="flex flex-row justify-between items-center">
                <div className="flex items-center px-2 pb-2 w-full">
                  <div className="flex p-0.5 rounded-full bg-gray-100 border border-gray-300 text-xs gap-1 w-full">
                    {/* Region Set Tab */}
                    <button 
                      className={`py-1 px-3 transition-colors rounded-full flex-1 text-center ${
                        summaryToShow === "regionSet" 
                          ? "bg-red-500 text-white font-medium shadow-sm" 
                          : "bg-transparent text-black hover:bg-gray-200"
                      } ${!bothSummariesAvailable && summaryToShow !== "regionSet" ? "opacity-50 pointer-events-none" : ""}`}
                      onClick={() => setSummaryToShowState("regionSet")}
                      disabled={!bothSummariesAvailable && summaryToShow !== "regionSet"}
                    >
                      Region Set
                    </button>
                    
                    {/* Selected Region Tab */}
                    <button 
                      className={`py-1 px-3 transition-colors rounded-full flex-1 text-center ${
                        summaryToShow === "selected" 
                          ? "bg-red-500 text-white font-medium shadow-sm" 
                          : "bg-transparent text-black hover:bg-gray-200"
                      } ${!bothSummariesAvailable && summaryToShow !== "selected" ? "opacity-50 pointer-events-none" : ""}`}
                      onClick={() => setSummaryToShowState("selected")}
                      disabled={!bothSummariesAvailable && summaryToShow !== "selected"}
                    >
                      {/* <span className={summaryToShow === "selected" ? "text-white" : "text-red-500"}>Selected Region</span> */}
                      Selected Region
                    </button>
                  </div>
                </div>
              </div>
              {(summaryToShow === "regionSet" ? !regionSetSummary : regionSummary === "") ? // if regionSummary = null, no narration available
                <div className="flex-1 flex justify-center items-center">
                  <Loading />
                </div>
              : 
                <p className="flex-1 text-base text-black font-medium overflow-auto px-2">
                  {summaryToShow === "regionSet" ? regionSetSummary : regionSummary}
                </p>
              }
              <p className="">
                {((summaryToShow === "regionSet" && regionSetSummary) || (summaryToShow === "selected" && regionSummary)) && (
                  <span className="text-base flex justify-end pr-4 gap-2">
                    <button className="p-1 hover:bg-gray-100 rounded" onClick={() => handleFeedback("👍")}>👍</button>
                    <button className="p-1 hover:bg-gray-100 rounded" onClick={() => handleFeedback("👎")}>👎</button>
                  </span>
                )}
              </p>
            </div>
          ) : null}
        </div>
        <div className="grow-0 h-1/4 flex flex-col">
          {activeSet && (
            <div className="flex flex-col flex-1 px-2">
              <h3 className="text-sm text-gray-500">
                Spectrum:
              </h3>
              {activeGenesetEnrichment ?
                <div className="flex-1 relative">
                  <div className="absolute inset-0">
                    <Spectrum
                      show
                      windowSize={30}
                    />
                  </div>
                </div>
                : 
                <div className="flex justify-center h-full">
                  <Loading />
                </div>
              }
            </div>
          )}
        </div>
      </div>
      <div className="relative h-1/2 flex flex-col pt-4">
        {/* <div className="relative w-full min-h-[25px] flex flex-row justify-between items-center mb-2 border-b-1 border-b-separator">
          {
            selected ? (
              <div className="text-sm font-medium">
                Selected: {showPosition(selected)}
              </div>
            ) : null
          }
        </div> */}
        <div className="relative border-y-1 border-y-separator flex flex-row justify-between items-start min-h-[60px]">
          <div className="text-sm mb-2 pt-2 font-medium overflow-auto max-h-[50px] h-[50px] block">
            {activeSet ? (
              (() => {
                // Get region count and text
                const regionCount = filteredActiveRegions?.length || 0;
                const regionText = regionCount === 1 ? "region" : "regions";
                
                // Build filter fields list if needed
                let filterInfo = "";
                if (!!activeSet?.factor || activeFilters?.length > 0) {
                  // Collect all fields from activeSet and activeFilters
                  const fields = [];
                  // Add activeSet factor field if it exists
                  if (activeSet?.factor?.field) fields.push(activeSet.factor.field)
                  // Add all fields from activeFilters
                  fields.push(...activeFilters.map(f => f.field));
                  filterInfo = ` showing ${fields.join(", ")}`;
                }
                let manuallyAddedText = manuallyAddedRegion ? " +1 manually selected region" : "";
                // Return the full string
                return `${regionCount} selected ${regionText}${filterInfo}${manuallyAddedText}`;
              })()
            ) : (
              null
            )}
          </div>
          <div className="flex flex-col h-full justify-center">
            <div className="flex items-center pl-2">
              <label className={`inline-flex gap-2 items-center cursor-pointer pr-2 ${!activeSet ? "opacity-50 pointer-events-none" : ""}`}>
                <ListviewIcon />
                <input
                  className="absolute -z-50 pointer-events-none opacity-0 peer"
                  type="checkbox"
                  checked={showMinimap}
                  onChange={handleShowMinimap}
                  disabled={!activeSet}
                />
                <span className="block bg-muted-foreground border-2 border-muted-foreground h-3 w-6 rounded-full after:block after:h-full after:aspect-square after:bg-white after:rounded-full peer-checked:bg-primary peer-checked:border-primary peer-checked:after:ml-[0.725rem]"></span>
                <MinimapIcon />
              </label>
            </div>
          </div>
        </div>
        {
          showMinimap ? (
            <div className="flex flex-col h-full mt-2">
              {/* <div className="min-h-[20px] pl-2 text-red-500 text-xs font-medium">
                {selected ? showPosition(selected) : null}
              </div> */}
              
              <div className="flex-1 relative" ref={minimapContainerRef}>
                <Minimap 
                  width={width}
                  height={minimapHeight}
                />
              </div>
            </div>
          )
          :
          <div className="pt-0 flex-1 text-xs flex flex-col overflow-hidden">
            <div className="flex-1 flex flex-col overflow-hidden">
              <div className="grid grid-cols-regionSet gap-y-1.5 py-1">
                <div className='grid grid-cols-subgrid col-start-1 col-end-4 [&>div:last-child]:pr-1.5'>
                  <div className="col-span-2 px-1.5">
                    <strong>Position</strong>
                  </div>
                  <div className="col-start-3 col-end-4">
                    <strong>Score</strong>
                  </div>
                </div>
              </div>
              <div className="flex-1 overflow-auto">
                <div className="grid grid-cols-regionSet gap-y-1.5">
                {listRegions.map((region) => {
                  const regionKey = `${region.order}:${region.chromosome}:${region.i}`
                  return (
                    <div className="grid grid-cols-subgrid col-start-1 col-end-4 border-t-separator border-t-1 pt-1.5 gap-y-1.5" style={{color: region.selected ? "red" : "black"}} key={regionKey}>
                      <div className="px-1.5 col-span-2 underline">
                        <a href="#gotoRegion" onClick={(event) => {
                          event.preventDefault()
                          handleSelectActiveRegionSet(region)
                        }}>
                          {showPosition(region)}
                        </a>
                      </div>
                      <div>{region.score?.toFixed(3)}</div>
                    </div>
                  )
                })}
                </div>
              </div>
            </div>
          </div>
        }
      </div>
    </div>
  )
}
export default memo(ActiveRegionSetModal)
