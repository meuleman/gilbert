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
      <div className="absolute inset-0 flex flex-col">

        {/* Header with close button */}
        <div className="relative top-0 left-0 pt-4 pl-2 z-10 flex flex-row space-x-2">
          <button 
            className="rounded-md flex items-center justify-center border border-gray-400 bg-white hover:bg-gray-100 text-red-500 px-1.5 py-1 text-sm" 
            onClick={onClose}> Close X </button>
          <div className="text-lg">
            {showPosition(selected)}
          </div>
        </div>

        {/* AI Summary */}
        <div className="flex-1 px-4 py-2 flex overflow-hidden">
          <div className="w-full pr-2 overflow-auto">
            <RegionAISummary />
          </div>
        </div>
      </div>
    )}
  </>
);
};

export default SelectedRegionSummary;