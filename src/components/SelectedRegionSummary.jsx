import React, { useState, useCallback, useEffect, useContext, useMemo, useRef } from 'react'
import { useZoom } from '../contexts/zoomContext'
import SelectedStatesStore from '../states/SelectedStates'
import { showPosition } from '../lib/display'
import RegionAISummary from './Narration/RegionAISummary'
import Loading from './Loading'

/*
  SelectedRegionSummary explains an analysis of a CSN.
  It receives narration data and (optionally) subpath data and renders various
  UI pieces (summary, power, zoom inspector). It also manages internal state:
    • the current zoom order,
    • the enriched narration data,
    • and some state for handling factor-based subpath selections.
*/

const SelectedRegionSummary = ({
  onClose = () => { },
  // Note: Removed unused props (e.g., children, modalPosition, layers, onCSNIndex, onZoom)
}) => {

  const { 
    selected, selectedNarration, loadingSelectedCSN, setFullNarration, setLoadingFullNarration,
  } = SelectedStatesStore()

  const { setSelectedZoomOrder: setZoomOrder } = useZoom()

  // -----------------------
  // Effects & Callbacks
  // -----------------------

  // When narration data updates, recalc the zoom order.
  // (The narration region's order is increased by 0.5; but it is at least 4.)
  useEffect(() => {
    if (!selectedNarration) return;
    let newZoom = selectedNarration.region.order + 0.5;
    if (newZoom < 4) newZoom = 4;
    setZoomOrder(newZoom);
  }, [selectedNarration]);

  return (
  <>
    {selected && selectedNarration && (
      <div className="absolute inset-0 bg-white bg-opacity-90">
        {/* Header with close button */}
        <div className="absolute top-0 right-0 p-4 z-10">
          <button 
            className="rounded-md flex items-center justify-center border border-gray-400 bg-white hover:bg-gray-100 text-red-500 px-1.5 py-1 text-sm" 
            onClick={onClose}
          >
            Close X
          </button>
        </div>
        
        {/* Content with two columns */}
        <div className="w-full h-full p-4 flex">
          {/* First column - AI Summary */}
          <div className="w-1/2 pr-2 overflow-auto">
            <RegionAISummary />
          </div>
          
          {/* Second column - Region position */}
          <div className="w-1/2 pl-2">
            <div className="mb-3 pb-2">
              <h3 className="text-sm text-gray-500">
                Region:
              </h3>
              <div className="text-sm">
                {showPosition(selectedNarration.region)}
              </div>
            </div>
          </div>
        </div>
      </div>
    )}
  </>
);
};

export default SelectedRegionSummary;