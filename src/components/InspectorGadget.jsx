import React, { useState, useCallback, useEffect, useContext, useMemo, useRef } from 'react'
import FiltersContext from './ComboLock/FiltersContext'
import { useZoom } from '../contexts/ZoomContext'
import SelectedStatesStore from '../states/SelectedStates'
import { Link } from 'react-router-dom'
import { urlify } from '../lib/regions'
import { getPositionText, showKbOrder, showPosition } from '../lib/display'
import RegionAISummary from './Narration/RegionAISummary'
import ZoomLine from './Narration/ZoomLine'
import ScoreBars from './Narration/ScoreBars'
import SubPaths from './Narration/SubPaths'
import ZoomInspector from './ZoomInspector'
import Power from './Narration/Power'
import Loading from './Loading'
import { scaleLinear } from 'd3-scale'
import { makeField } from '../layers'
import { csnLayerList } from '../layers'
import styles from './InspectorGadget.module.css'

/*
  InspectorGadget explains an analysis of a CSN.
  It receives narration data and (optionally) subpath data and renders various
  UI pieces (summary, power, zoom inspector). It also manages internal state:
    • the current zoom order,
    • the enriched narration data,
    • and some state for handling factor-based subpath selections.
*/

const InspectorGadget = ({
  mapWidth,
  mapHeight,
  onClose = () => { },
  // Note: Removed unused props (e.g., children, modalPosition, layers, onCSNIndex, onZoom)
}) => {

  const { 
    selected, selectedNarration, loadingSelectedCSN, setFullNarration, setLoadingFullNarration,
  } = SelectedStatesStore()

  const { setSelectedZoomOrder: setZoomOrder } = useZoom()
  
  // -----------------------
  // Component State
  // -----------------------

  // Add a ref for the power container
  const powerContainerRef = useRef(null);
  // Add state for the power width
  const [powerWidth, setPowerWidth] = useState(300);

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

  // When narration changes, reset the enriched narration data while new data loads.
  useEffect(() => {
    setFullNarration(selectedNarration);
    setLoadingFullNarration(true);
  }, [selectedNarration]);

  // Add useEffect to update power width when container size changes
  useEffect(() => {
    if (!powerContainerRef.current) return;

    const updateWidth = () => {
      setPowerWidth(powerContainerRef.current.offsetWidth - 24);
    };

    // Initial width set
    updateWidth();

    // Create ResizeObserver to watch for container size changes
    const observer = new ResizeObserver(updateWidth);
    observer.observe(powerContainerRef.current);

    return () => observer.disconnect();
  }, [selectedNarration]);

  return (
    <>
      {selected && (
        <div
          className={styles.powerOverlay}
          style={{
            position: "absolute",
            top: 5,
            right: 10,
            height: `${mapHeight - 10}px`
          }}
        >

          <div className={styles.content}>
            {loadingSelectedCSN ? (
              <div style={{ height: `${powerWidth}px` }}>
                <Loading text="Loading CSN..." />
              </div>
            ) : (
              selected && selectedNarration && (
                <div className={styles.csn}>
                  <div className={styles.summaryContainer}>

                    <div className={styles.header}>
                      <div className={styles.powerModalSelected}>
                        {selectedNarration?.region && showPosition(selectedNarration.region)}
                      </div>
                      <div className={styles.headerButtons}>
                        <div className={styles.close} onClick={onClose}>x</div>
                      </div>
                    </div>

                    <RegionAISummary />
                  </div>
                  <div className={styles.powerContainer} ref={powerContainerRef}>
                    <Power
                      width={powerWidth}
                      height={powerWidth}
                    />
                  </div>
                  <div className={styles.zoomInspectorContainer}>
                    <ZoomInspector
                      zoomHeight={mapHeight - 20}
                    />
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

export default InspectorGadget;
