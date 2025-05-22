import { useState, useCallback, useEffect, useContext, memo, useRef, useMemo } from 'react'

import { showPosition, showKbOrder } from '../../lib/display'
import { Tooltip } from 'react-tooltip';
import { download } from '../../lib/regionsets'
import { useContainerSize } from '../../lib/utils';
import RegionsContext from './RegionsContext'
import RegionSetModalStatesStore from '../../states/RegionSetModalStates'
import SelectedStatesStore from '../../states/SelectedStates'
import ComponentSizeStore from '../../states/ComponentSizes';
import FactorSearch from '../FactorSearch';
import Loading from '../Loading';
import AccordionArrow from '@/assets/accordion-circle-arrow.svg?react';
import Spectrum from '../../components/Narration/Spectrum/Spectrum';
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


const ActiveRegionSetModal = () => {

  const { 
    activeSet,
    activeRegions, 
    activeFilters,
    filteredActiveRegions,
    setActiveSet,
    setActiveFilters,
    regionSetNarration: regionSetSummary,
    regionSetAbstracts,
    activeGenesetEnrichment,
    prompt: regionSetPrompt,
    generateRegionSetNarration,
  } = useContext(RegionsContext)
  
  const { showActiveRegionSet } = RegionSetModalStatesStore()
  const { 
    selected, setSelected, setRegion, regionSummary,
    generateSummary: generateSelectedSummary, feedback: selectedFeedback, 
    abstracts: selectedAbstracts, prompt: selectedPrompt
  } = SelectedStatesStore()
  const { setActiveRegionSetModalSize } = ComponentSizeStore()

  const containerRef = useRef(null)
  const selectedRef = useRef(null);
  const selectedRegionRef = useRef(null);
  const minimapContainerRef = useRef(null)
  const [regionSetView, setRegionSetView] = useState("minimap");

  const [minimapHeight, setMinimapHeight] = useState(1);
  const [width, setWidth] = useState(1);
  const minimapContainerSize = useContainerSize(minimapContainerRef)
  const containerSize = useContainerSize(containerRef);

  useEffect(() => {
    setWidth(containerSize.width)
    setActiveRegionSetModalSize(containerSize)
  }, [containerSize, setActiveRegionSetModalSize, setWidth])

  useEffect(() => {
    setMinimapHeight(minimapContainerSize.height)
  }, [minimapContainerSize, setMinimapHeight])

  useEffect(() => {
    selectedRef.current = selected;
  }, [selected])

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

  const selectedInList = useMemo(() => {
    if(!selected || !regions) return null
    let inList = !!regions.find(d => (d.chromosome === selected.chromosome && d.i === selected.i && d.order === selected.order))
    // check for subregion selection
    if(!inList) {
      inList = !!regions.find(d => (d.subregion?.chromosome === selected.chromosome && d.subregion?.i === selected.i && d.subregion?.order === selected.order))
    }
    return inList
  }, [selected, regions])
  
  const listRegions = useMemo(() => {
    if (!regions?.length) return [];
    let newList = regions.map(d => ({...d, selected: false}))
    if(selectedInList) {
      let sil = newList.find(d => (d.chromosome === selected.chromosome && d.i === selected.i && d.order === selected.order))
      // check for subregion selection
      if(!sil) {
        sil = newList.find(d => (d.subregion?.chromosome === selected.chromosome && d.subregion?.i === selected.i && d.subregion?.order === selected.order))
      }
      sil.selected = true
    } 
    return newList
  }, [regions, selected, selectedInList]);

  // scroll to selected item when view changes
  useEffect(() => {
    if (regionSetView === "list" && selectedRegionRef.current) {
      // wait for DOM to fully render
      setTimeout(() => {
        selectedRegionRef.current.scrollIntoView({
          behavior: 'auto',
          block: 'center'  // Centers the element in the viewport
        });
      }, 150);
    }
  }, [regionSetView, selected]);

  const [manuallyAddedRegion, setManuallyAddedRegion] = useState(false)
  useEffect(() => {
    if(selectedInList !== null) {
      setManuallyAddedRegion(!selectedInList)
    } else {
      setManuallyAddedRegion(false)
    }
  }, [setManuallyAddedRegion, selectedInList])

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
  const [showPromptEditor, setShowPromptEditor] = useState(false)
  const handleShowAbstracts = useCallback(() => {
    setShowAbstracts(!showAbstracts)
    setShowPromptEditor(false)
  }, [setShowAbstracts, showAbstracts, setShowPromptEditor])

  const [abstracts, setAbstracts] = useState([])
  useEffect(() => {
    setAbstracts(summaryToShow === "regionSet" ? regionSetAbstracts : selectedAbstracts)
  }, [regionSetAbstracts, selectedAbstracts, setAbstracts, summaryToShow])

  const handleShowPromptEditor = useCallback(() => {
    setShowPromptEditor(!showPromptEditor)
    setShowAbstracts(false)
  }, [setShowPromptEditor, showPromptEditor, setShowAbstracts])

  const [prompt, setPrompt] = useState("")
  useEffect(() => {
    setPrompt(summaryToShow === "regionSet" ? regionSetPrompt : selectedPrompt)
  }, [selectedPrompt, summaryToShow, setPrompt])

  const handlePrompt = useCallback((prompt) => {
    setPrompt(prompt)
  }, [setPrompt])

  const generate = useCallback(() => {
    summaryToShow === "regionSet" ? generateRegionSetNarration(prompt) : generateSelectedSummary(selectedRef.current, prompt)
  }, [summaryToShow, generateRegionSetNarration, generateSelectedSummary, prompt])

  const handleFeedback = useCallback((feedback) => {
    if(summaryToShow === "regionSet") {
      // TODO: send region set feedback, api endpoint should be available
      console.log("Feedback for region set:", feedback)
    } else {
      selectedFeedback(feedback)
      console.log("Feedback for selected region:", feedback)
    }
  }, [selectedFeedback, summaryToShow])

  const handleRegionSetView = useCallback((view) => {
    setRegionSetView(view);
  }, [setRegionSetView]);

  useEffect(() => {
    if(!activeSet) setRegionSetView("minimap")
  }, [activeSet, setRegionSetView])

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
                          ? "bg-gray-400 text-white font-medium shadow-sm" 
                          : "bg-transparent text-black hover:text-red-500"
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
                          ? "bg-gray-400 text-white font-medium shadow-sm" 
                          : "bg-transparent text-black hover:text-red-500"
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
              {(summaryToShow === "regionSet" ? regionSetSummary === "" : regionSummary === "") ? // if regionSummary = null, no narration available
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
                  <span className="text-base flex justify-end pr-4 gap-2 text-xs">
                    <button 
                      className="p-1 hover:bg-gray-100 hover:text-red-500 rounded min-w-[130px] text-center"
                      onClick={handleShowPromptEditor}
                    >
                      {showPromptEditor ? "Hide Prompt Editor" : "Show Prompt Editor"}
                    </button>
                    <button
                      className="p-1 hover:bg-gray-100 hover:text-red-500 rounded min-w-[100px] text-center"
                      onClick={handleShowAbstracts}
                    >
                      {showAbstracts ? "Hide Abstracts" : "Show Abstracts"}
                    </button>
                    <button className="p-1 hover:bg-gray-100 rounded" onClick={() => handleFeedback("👍")}>👍</button>
                    <button className="p-1 hover:bg-gray-100 rounded" onClick={() => handleFeedback("👎")}>👎</button>
                  </span>
                )}
              </p>
              {abstracts && showAbstracts && (
                <div className="relative">
                  <div className="absolute z-10 left-0 right-0 bg-white border border-gray-300 rounded-md shadow-lg">
                    <div className="flex justify-between items-center p-2 border-b border-gray-200 sticky top-0 bg-white">
                      <h3 className="text-sm">
                        {abstracts.length} PubMed Abstracts Used
                      </h3>
                    </div>
                    <div className="max-h-[250px] overflow-y-auto">
                      <ul className="text-xs divide-y divide-gray-100">
                        {abstracts.map((a, i) => (
                          <li key={a.pmc} className="p-2 hover:bg-gray-50">
                            <div className="flex">
                              <span className="text-gray-500 min-w-4 mr-1.5 text-right">{i + 1}.</span>
                              <a
                                className="text-blue-600 hover:underline"
                                href={`https://pmc.ncbi.nlm.nih.gov/articles/${a.pmc}/`}
                                target="_blank"
                                rel="noreferrer"
                              >
                                {a.full_title}
                              </a>
                            </div>
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>
                </div>
              )}
              {showPromptEditor && (
                <div className="relative">
                  <div className="absolute z-10 left-0 right-0 bg-white border border-gray-300 rounded-md shadow-lg">
                    <div className="border border-gray-200 rounded-md p-2 mb-4">
                      <textarea
                        value={prompt}
                        onChange={(e) => handlePrompt(e.target.value)}
                        rows={10}
                        className="w-full p-2 border border-gray-200 rounded"
                      />
                      <button 
                        className="px-3 py-1 text-sm border rounded hover:bg-blue-100 mt-2"
                        onClick={generate} 
                        // disabled={loading}
                      >
                        Regenerate with New Prompt
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          ) : null}
        </div>
        <div className="grow-0 h-1/4 flex flex-col">
          {activeSet && (
            <div className="flex flex-col flex-1 px-2 pt-1">
              {/* <h3 className="text-sm text-gray-500">
                Spectrum:
              </h3> */}
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
      <div className="relative h-1/2 flex flex-col pt-1">
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
        </div>
        <div className="flex flex-row justify-between items-center">
          <div className="flex items-center px-2 pt-1 w-full">
            <div className="flex p-0.5 rounded-full bg-gray-100 border border-gray-300 text-xs gap-1 w-full">
              {/* Minimap Tab */}
              <button 
                className={`py-1 px-3 transition-colors rounded-full flex-1 text-center ${
                  regionSetView === "minimap"
                    ? "bg-gray-400 text-white font-medium shadow-sm" 
                    : "bg-transparent text-black hover:text-red-500"
                }`}
                onClick={() => handleRegionSetView('minimap')}
              >
                Minimap
              </button>
              
              {/* Listview Tab */}
              <button 
                className={`py-1 px-3 transition-colors rounded-full flex-1 text-center ${
                  regionSetView === "list"
                    ? "bg-gray-400 text-white font-medium shadow-sm" 
                    : "bg-transparent text-black hover:text-red-500"
                } ${!activeSet ? "opacity-50 pointer-events-none" : ""}`}
                onClick={() => handleRegionSetView('list')}
                disabled={!activeSet}
              >
                Listview
              </button>
            </div>
          </div>
        </div>
        {
          regionSetView === "minimap" ? (
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
                  <div className="col-span-2 pl-3">
                    <strong>Position</strong>
                  </div>
                  <div className="col-start-3 col-end-4 mr-2">
                    <strong>Score</strong>
                  </div>
                </div>
              </div>
              <div className="flex-1 overflow-auto">
                <div className="grid grid-cols-regionSet gap-y-1.5">
                {listRegions.map((region) => {
                  const regionKey = `${region.order}:${region.chromosome}:${region.i}`
                  return (
                    <div 
                      className="relative grid grid-cols-subgrid col-start-1 col-end-4 border-t-separator border-t-1 pt-1.5 gap-y-1.5 hover:text-red-500"
                      key={regionKey}
                      ref={region.selected ? selectedRegionRef : null}
                    > 
                      <div className="relative pl-3 col-span-2 underline">
                        {region.selected ? <div className="absolute left-0 top-0 text-black">▶</div> : null}
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
