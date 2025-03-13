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
      {selected && (
        <div
          className="absolute inset-0 bg-white bg-opacity-90 flex flex-col"
        >
          <div className="w-full h-full overflow-auto p-4">
            {loadingSelectedCSN ? (
              <div style={{ height: `${powerWidth}px` }}>
                <Loading text="Loading CSN..." />
              </div>
            ) : (
              selected && selectedNarration && (
                <div className="w-full flex flex-col">
                  <div className="w-full mb-4">
                    <div className="flex justify-between items-center mb-3 border-b pb-2">
                      <div className="font-medium text-md">
                        {selectedNarration?.region && showPosition(selectedNarration.region)}
                      </div>
                      <div className="flex items-center">
                        <button 
                          className="rounded-md flex items-center justify-center border border-gray-400 hover:bg-gray-100 text-red-500 px-1 py-1 text-sm" 
                          onClick={onClose}
                        >
                          Close X
                        </button>
                      </div>
                    </div>

                    <RegionAISummary />
                  </div>
                </div>
              )
            )}
          </div>
        </div>
      )}
    </>
  );
};

export default SelectedRegionSummary;