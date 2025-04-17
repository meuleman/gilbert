import React, { useEffect, useState } from 'react';
import ZoomLine from './Narration/ZoomLine';
import ScoreBars from './Narration/ScoreBars';
import SubPaths from './Narration/SubPaths';
import SelectedStatesStore from '../states/SelectedStates';
import { useZoom } from '../contexts/zoomContext';

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
  maxPathScore,
  onClick = (c) => { console.log("narration", c); },
}) {
  // zoom order
  const { selectedZoomOrder: order, handleSelectedZoom: onHover } = useZoom();

  const { 
    selectedNarration, fullNarration, loadingFullNarration,
    narrationPreview, slicedNarrationPreview, collectFullData, 
    setFullNarration, setLoadingFullNarration,
    powerDataLoaded, setPowerDataLoaded
  } = SelectedStatesStore();

  const [csn, setCsn] = useState(selectedNarration);
  useEffect(() => {
    setCsn(loadingFullNarration ? selectedNarration : fullNarration);
  }, [loadingFullNarration, selectedNarration, fullNarration]);

  // When narration changes, reset the enriched narration data while new data loads.
  useEffect(() => {
    setFullNarration(selectedNarration);
  }, [selectedNarration]);

  useEffect(() => {
    if(powerDataLoaded) {
      setLoadingFullNarration(true);
      collectFullData(selectedNarration);
      setPowerDataLoaded(false); // reset this so we dont eagerly collect full data next selected narration change
    }
  }, [selectedNarration, powerDataLoaded, collectFullData])

  const tipOrientation = "left";
  const sidebarWidth = 30;
  const scoreBarWidth = 150;

  return (
    <div className="flex h-full flex-row relative">
      {/* ZoomLine component - fixed width */}
      <div className="h-full flex-none" style={{ width: '34px' }}>
        <ZoomLine 
          csn={narrationPreview ? narrationPreview : csn} 
          order={order}
          maxPathScore={maxPathScore}
          highlight={true}
          selected={true}
          text={true}
          loadingFullNarration={loadingFullNarration}
          width={34}
          height="100%"
          offsetX={0}
          tipOrientation={tipOrientation}
          onHover={onHover}
          showScore={false}
          onClick={onClick || ((c) => { console.log("ZoomLine clicked:", c); })}
        />
      </div>
      
      {/* ScoreBars component wrapper with SubPaths positioned over it */}
      <div className="h-full flex-none relative" style={{ width: `${scoreBarWidth}px` }}>
        <ScoreBars
          csn={slicedNarrationPreview ? slicedNarrationPreview : csn} 
          order={order}
          highlight={true}
          selected={true}
          text={true}
          loadingFullNarration={loadingFullNarration}
          width={scoreBarWidth}
          height="100%"
          offsetX={sidebarWidth}
          tipOrientation={tipOrientation}
          onHover={onHover}
          showScore={false}
          onClick={onClick || ((c) => { console.log("ScoreBars clicked:", c); })}
        />
        
        {/* SubPaths positioned absolutely over ScoreBars */}
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
          />
        </div>
      </div>
    </div>
  );
}

export default ZoomInspector;