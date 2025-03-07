import React, { useEffect, useState } from 'react';
import ZoomLine from './Narration/ZoomLine';
import ScoreBars from './Narration/ScoreBars';
import SubPaths from './Narration/SubPaths';
import styles from './InspectorGadget.module.css';
import SelectedStatesStore from '../states/SelectedStates'
import { useZoom } from '../contexts/ZoomContext'

/**
 * ZoomInspector consolidates the ZoomLine, ScoreBars, and SubPaths
 * into one component. It accepts data (csn), display settings (order,
 * maxPathScore, zoomHeight, tipOrientation) and callbacks (onHover, onFactor,
 * onSubpathBack) to allow the parent (i.e. InspectorGadget) to control user
 * interactions and updates.
 *
 * Props:
 *   - csn:                  Combined narration/fullNarration data.
 *   - order:                Order value (e.g., zOrder) to determine the current zoom level.
 *   - maxPathScore:         Maximum score value (number) used by the children.
 *   - zoomHeight:           Numeric height for the zoom display area.
 *   - tipOrientation:       Orientation of the tooltips (default: "right").
 *   - onHover:              Function callback for hover events.
 *   - onClick:              (Optional) Function callback for click events.
 */
function ZoomInspector({
  maxPathScore,  // no longer used?
  zoomHeight,
  onClick = (c) => { console.log("narration", c); }, // used for both ZoomLine and ScoreBars, for example click events
}) {
  
  // zoom order
  const { selectedZoomOrder: order, handleSelectedZoom: onHover } = useZoom()

  const { 
    selectedNarration, fullNarration, loadingFullNarration,
    narrationPreview, slicedNarrationPreview, collectFullData, 
    setFullNarration, setLoadingFullNarration
  } = SelectedStatesStore()

  const [csn, setCsn] = useState(selectedNarration)
  useEffect(() => {
    setCsn(loadingFullNarration ? selectedNarration : fullNarration)
  }, [loadingFullNarration, selectedNarration, fullNarration])

  // When narration changes, reset the enriched narration data while new data loads.
  useEffect(() => {
    setFullNarration(selectedNarration);
    collectFullData(selectedNarration)
    setLoadingFullNarration(true);
  }, [selectedNarration]);

  const tipOrientation = "left"
  const sidebarWidth = 30
  const scoreBarWidth = 150
  return (
    <div className='flex h-full flex-row gap-0'>
      <ZoomLine 
        csn={narrationPreview ? narrationPreview : csn} 
        order={order}
        maxPathScore={maxPathScore}
        highlight={true}
        selected={true}
        text={true}
        width={34}
        offsetX={0}
        height={zoomHeight}
        tipOrientation={tipOrientation}
        onHover={onHover}
        showScore={false}
        onClick={onClick || ((c) => { console.log("ZoomLine clicked:", c); })}
      />
      <ScoreBars
        csn={slicedNarrationPreview ? slicedNarrationPreview : csn} 
        order={order}
        highlight={true}
        selected={true}
        text={true}
        width={scoreBarWidth}
        offsetX={sidebarWidth}
        height={zoomHeight}
        tipOrientation={tipOrientation}
        onHover={onHover}
        showScore={false}
        onClick={onClick || ((c) => { console.log("ScoreBars clicked:", c); })}
      />
      <div className='relative -left-[150px] pointer-events-none'>
        <SubPaths 
          csn={csn}
          preview={slicedNarrationPreview}
          order={order}
          maxPathScore={maxPathScore}
          highlight={true}
          selected={true}
          text={true}
          width={scoreBarWidth}
          height={zoomHeight}
          offsetX={0}
          tipOrientation={tipOrientation}
          onHover={onHover}
          showScore={false}
        />
      </div>
    </div>
  );
}

export default ZoomInspector;