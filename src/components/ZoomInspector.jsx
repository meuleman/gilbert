import React from 'react';
import ZoomLine from './Narration/ZoomLine';
import ScoreBars from './Narration/ScoreBars';
import SubPaths from './Narration/SubPaths';
import styles from './InspectorGadget.module.css';

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
 *   - factors:              Array of top factors that get passed down to SubPaths.
 *   - subpathCollection:    Array from the parent state representing subpaths.
 *   - onFactor:             Function to be called when a factor is selected (passed to SubPaths).
 *   - onSubpathBack:        Function to be called as a subpath "undo" action (passed to SubPaths).
 */
function ZoomInspector({
  csn,
  previewCsn,
  slicedPreviewCsn,
  order,
  maxPathScore,  // no longer used?
  zoomHeight,
  onHover,
  onClick, // used for both ZoomLine and ScoreBars, for example click events
  factors,
  subpathCollection,
  onFactor,
  handleNarrationPreview,
  removeNarrationPreview,
  onSubpathBack,
}) {
  const tipOrientation = "left"
  const sidebarWidth = 30
  const scoreBarWidth = 150
  return (
    <div className={styles.zoomScores}>
      <ZoomLine 
        csn={previewCsn ? previewCsn : csn} 
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
        csn={slicedPreviewCsn ? slicedPreviewCsn : csn} 
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
      <div className={styles.subpath}>
        <SubPaths 
          csn={csn}
          preview={slicedPreviewCsn}
          factors={factors}
          subpathCollection={subpathCollection}
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
          onFactor={onFactor}
          handleNarrationPreview={handleNarrationPreview}
          removeNarrationPreview={removeNarrationPreview}
          onSubpathBack={onSubpathBack}
        />
      </div>
    </div>
  );
}

export default ZoomInspector;