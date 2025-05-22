import React, { useContext, useEffect, useRef } from 'react';
import { Tooltip } from 'react-tooltip';
import { useContainerSize } from '../lib/utils';
import RegionsContext from './Regions/RegionsContext'
import './LeftToolbar.css'; // Assuming you have a CSS file for styling
import Loading from './Loading';
import RegionSetModalStatesStore from '../states/RegionSetModalStates'
import ComponentSizeStore from '../states/ComponentSizes';
import DetailsIcon from "@/assets/details.svg?react";
import FiltersIcon from "@/assets/filters.svg?react";

const LeftToolbar = ({
  content = {},
} = {}) => {
  const containerRef = useRef(null)
  const { activeSet, topNarrations } = useContext(RegionsContext)
  const { showActiveRegionSet, showSummary, setShowActiveRegionSet, setShowSummary } = RegionSetModalStatesStore()
  const { setLeftToolbarSize } = ComponentSizeStore()
  
  const containerSize = useContainerSize(containerRef)
  useEffect(() => {
    setLeftToolbarSize(containerSize)
  }, [containerSize, setLeftToolbarSize])

  return (
    <div className="h-full w-auto max-w-[26.9375rem] max-h-full flex flex-row overflow-hidden border-r-1 border-r-separator" ref={containerRef}>
      <div className="flex-1 flex min-h-0">
        <div className="grow-0 shrink-0 w-[2.4375rem] flex justify-center p-1.5">
          <div className="w-full h-full bg-separator rounded">
            <button 
              className={`w-full aspect-square rounded flex items-center justify-center group ${showActiveRegionSet ? 'bg-gray-400' : ''}`}
              disabled={!activeSet}
              onClick={() => {
                if(!showActiveRegionSet) {
                  setShowSummary(false)
                }
                setShowActiveRegionSet(!showActiveRegionSet)
              }}
            >
              <DetailsIcon className={showActiveRegionSet ? "[&_path]:fill-white" : 'group-hover:[&_path]:fill-red-500'} />
            </button>
            <button 
              className={`w-full aspect-square rounded flex items-center justify-center group ${showSummary ? 'bg-gray-400' : ''}`}
              disabled={!topNarrations?.length}
              onClick={() => {
                if(!showSummary) {
                  setShowActiveRegionSet(false)
                }
                topNarrations?.length && setShowSummary(!showSummary)
              }}
            >
              <FiltersIcon className={showSummary ? "[&_path]:fill-white" : 'group-hover:[&_path]:fill-red-500'} />
            </button>
          </div>
        </div>
        <div className="grow flex overflow-auto">
          {showActiveRegionSet && content.activeRegionSetModal}
          {showSummary && content.regionSetSummary}
        </div>
      </div>
    </div>
  )
};

export default LeftToolbar;
