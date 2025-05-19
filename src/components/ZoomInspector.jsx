import React, { useCallback, useEffect, useState, useContext, useRef } from 'react';
import ZoomLine from './Narration/ZoomLine';
import ScoreBars from './Narration/ScoreBars';
import SubPaths from './Narration/SubPaths';
import SelectedStatesStore from '../states/SelectedStates';
import RegionsContext from './Regions/RegionsContext'
import { useZoom } from '../contexts/ZoomContext';

/**
 * ZoomInspector consolidates the ZoomLine, ScoreBars, and SubPaths
 * into one component. It uses flex layout to determine component sizes
 * based on the container dimensions automatically.
 *
 * Props:
 *   - maxPathScore:         Maximum score value (number) used by the children.
 *   - onClick:              (Optional) Function callback for click events.
 */
function ZoomInspector({
  maxPathScore = null,
  providedNarration = null,
  providedScoreBarWidth = null,
  providedSideBarWidth = null,
  onClick = (c) => { console.log("narration", c); },
}) {
  // zoom order
  const { selectedZoomOrder: order, handleSelectedZoom: onHover } = useZoom();

  const { 
    activeSet,
    activeFilters,
  } = useContext(RegionsContext)

  const { 
    selectedNarration, fullNarration, loadingFullNarration,
    narrationPreview, slicedNarrationPreview, collectFullData, 
    setFullNarration, setLoadingFullNarration,
    powerDataLoaded, setPowerDataLoaded,
    spawnRegionBacktrack, setFactorSelection, selected
  } = SelectedStatesStore();

  const selectedRef = useRef(null);
  useEffect(() => {
    selectedRef.current = selected;
  }, [selected]);

  const [csn, setCsn] = useState(selectedNarration);
  useEffect(() => {
    setCsn(providedNarration ? providedNarration : loadingFullNarration ? selectedNarration : fullNarration);
  }, [loadingFullNarration, selectedNarration, fullNarration, providedNarration]);

  // When narration changes, reset the enriched narration data while new data loads.
  useEffect(() => {
    setFullNarration(providedNarration ? providedNarration : selectedNarration);
  }, [selectedNarration, providedNarration]);

  useEffect(() => {
    if(!providedNarration && powerDataLoaded) {
      setLoadingFullNarration(true);
      collectFullData(selectedRef.current, selectedNarration);
      setPowerDataLoaded(false); // reset this so we dont eagerly collect full data next selected narration change
    }
  }, [selectedNarration, powerDataLoaded, collectFullData])

  const regionBacktrack = useCallback((order) => {
    spawnRegionBacktrack(order, activeSet, activeFilters)
  }, [selected, activeSet, activeFilters]);

  const subpathSelection = useCallback((factor) => {
    setFactorSelection(factor, activeSet, activeFilters);
  }, [selected, setFactorSelection, activeSet, activeFilters]);

  const tipOrientation = "left";
  const sidebarWidth = providedSideBarWidth || 30;
  const scoreBarWidth = providedScoreBarWidth || 150;

  return (
    <div className="flex h-full flex-row relative">
      {/* ZoomLine component - fixed width */}
      <div className="h-full flex-none" style={{ width: `${sidebarWidth + 4}px` }}>
        <ZoomLine 
          csn={narrationPreview ? narrationPreview : csn} 
          order={!providedNarration ? order : null}
          showOrderLine={!providedNarration}
          maxPathScore={maxPathScore}
          highlight={true}
          selected={true}
          text={true}
          loadingFullNarration={loadingFullNarration}
          width={sidebarWidth + 4}
          height="100%"
          offsetX={0}
          tipOrientation={tipOrientation}
          onHover={!providedNarration ? onHover : () => {}}
          showScore={false}
          onClick={onClick || ((c) => { console.log("ZoomLine clicked:", c); })}
          backtrack={regionBacktrack}
        />
      </div>
      
      {/* ScoreBars component wrapper with SubPaths positioned over it */}
      <div className="h-full flex-none relative" style={{ width: `${scoreBarWidth}px` }}>
        <ScoreBars
          csn={slicedNarrationPreview ? slicedNarrationPreview : csn} 
          order={!providedNarration ? order : null}
          showOrderLine={!providedNarration}
          highlight={true}
          selected={true}
          text={true}
          loadingFullNarration={loadingFullNarration}
          width={scoreBarWidth}
          height="100%"
          offsetX={sidebarWidth}
          tipOrientation={tipOrientation}
          onHover={!providedNarration ? onHover : () => {}}
          showScore={false}
          onClick={onClick || ((c) => { console.log("ScoreBars clicked:", c); })}
          allowViewingSecondaryFactors={!providedNarration}
          backtrack={regionBacktrack}
        />
        
        {/* SubPaths positioned absolutely over ScoreBars */}
        {!providedNarration ? 
          <div className="absolute top-0 left-0 h-full w-full pointer-events-none">
            <SubPaths 
              csn={csn}
              preview={slicedNarrationPreview}
              order={order}
              maxPathScore={maxPathScore}
              highlight={true}
              selected={true}
              text={true}
              width={scoreBarWidth}
              height="100%"
              offsetX={0}
              tipOrientation={tipOrientation}
              onHover={onHover}
              showScore={false}
              selectSubpath={subpathSelection}
            />
          </div> : null
        }
      </div>
    </div>
  );
}

export default ZoomInspector;