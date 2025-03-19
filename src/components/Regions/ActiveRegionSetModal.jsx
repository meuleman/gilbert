import { useState, useCallback, useEffect, useContext, memo, useRef } from 'react'

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

import styles from './ActiveRegionSetModal.module.css'

// const FILTER_MAX_REGIONS = 1000

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
    regionSetNarration,
    regionSetNarrationLoading,
    regionSetArticles,
    activeGenesetEnrichment
  } = useContext(RegionsContext)
  
  const { showActiveRegionSet } = RegionSetModalStatesStore()
  const { selected, setSelected, setRegion } = SelectedStatesStore()
  const containerRef = useRef(null)
  const [width, height] = useContainerSize(containerRef, [activeGenesetEnrichment]);
  const [showMinimap, setShowMinimap] = useState(true)

  const handleShowMinimap = useCallback(() => {
    setShowMinimap(!showMinimap)
  }, [showMinimap])

  const handleSelectActiveRegionSet = useCallback((region) => {
    setSelected(region?.subregion || region)  // set selected with implied region
    setRegion(region)  // set region (zoom) with original region
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

  return (
    // TODO: remove hardcoded width
    <div className="flex-1 pl-1 min-h-0 max-h-full w-[24rem] text-xs overflow-hidden flex flex-col" ref={containerRef}>
      <div className="h-1/2">
        <div className="pt-4">
        {(regionSetNarration || regionSetNarrationLoading) ? <h3 className="text-sm text-gray-500">
          AI Summary:
        </h3> : null}
        <p className="mb-4 text-sm text-black font-medium">
          {regionSetNarrationLoading ? "loading..." : regionSetNarration}
        </p>
        </div>
        <div className="grow-0">
          {activeGenesetEnrichment && (
            <div className="relative h-28">
              <div className="absolute top-0 left-0 w-full overflow-hidden">
                <Spectrum
                  show
                  width={width - 24}
                  height={90}
                  windowSize={30}
                />
              </div>
            </div>
          )}
        </div>
      </div>
      <div className="relative h-1/2 flex flex-col">
        {activeSet ? <button className="absolute top-[-30px] right-0 mb-2 p-1 z-10 border rounded-md bg-white hover:bg-gray-100 px-1.5 py-1 text-sm" onClick={handleShowMinimap}>
          {showMinimap ? "Show Region List" : "Show Minimap"}
        </button> : null}
        {showMinimap ? <Minimap 
          width={width}
          height={height / 2}
        />
        :
        <div className="pt-1 flex-1 text-xs flex flex-col overflow-hidden">
          <div className="px-1.5 pb-2.75">
            <strong>{(() => {
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
              // Return the full string
              return `${regionCount} selected ${regionText}${filterInfo}`;
            })()}</strong>
          </div>
          <div className="border-t-1 border-t-separator flex-1 flex flex-col overflow-hidden">
            <div className="grid grid-cols-regionSet gap-y-1.5 py-2.75">
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
              {regions.map((region) => {
                const regionKey = `${region.order}:${region.chromosome}:${region.i}`
                return (
                  <div className="grid grid-cols-subgrid col-start-1 col-end-4 border-t-separator border-t-1 pt-1.5 gap-y-1.5" key={regionKey}>
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
        </div>}
      </div>
    </div>
  )
}
export default memo(ActiveRegionSetModal)
