import React, { useState, useCallback, useEffect, useContext, useMemo, useRef } from 'react'
import FiltersContext from './ComboLock/FiltersContext'
import { Link } from 'react-router-dom'
import { urlify } from '../lib/regions'
import { showKbOrder, showPosition } from '../lib/display'
import RegionAISummary from './Narration/RegionAISummary'
import ZoomLine from './Narration/ZoomLine'
import ScoreBars from './Narration/ScoreBars'
import SubPaths from './Narration/SubPaths'
import ZoomInspector from './ZoomInspector'
import Power from './Narration/Power'
import Loading from './Loading'
import { scaleLinear } from 'd3-scale'
import { retrieveFullDataForCSN, variantChooser } from '../lib/csn'
import { fetchGWASforPositions } from '../lib/gwas'
import { fetchGenesetEnrichment } from '../lib/genesetEnrichment'
import { makeField } from '../layers'
import RegionsContext from './Regions/RegionsContext';
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
  selected = null,
  subpaths = null,
  narration = null,
  zoomOrder,
  maxPathScore,
  loadingCSN = false,
  mapWidth,
  mapHeight,
  onClose = () => {},
  setNarration = () => {},
  setSubpaths = () => {},
  findSubpaths = () => {},
  determineFactorExclusion = () => {}
  // Note: Removed unused props (e.g., children, modalPosition, layers, onCSNIndex, onZoom)
}) => {

  // -----------------------
  // Component State
  // -----------------------

  // Controls the current zoom order (numeric display level)
  const [zOrder, setZoomOrder] = useState(zoomOrder);

  // State for holding enriched narration (full data) and its loading status.
  const [fullNarration, setFullNarration] = useState(null);
  const [loadingFullNarration, setLoadingFullNarration] = useState(false);

  // State used for managing subpaths triggered by factor selections.
  const [topFactors, setTopFactors] = useState(null);
  const [subpathCollection, setSubpathCollection] = useState([]);
  const [narrationCollection, setNarrationCollection] = useState([]);

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
    if (!narration) return;
    let newZoom = narration.region.order + 0.5;
    if (newZoom < 4) newZoom = 4;
    setZoomOrder(newZoom);
  }, [narration]);

  // When narration changes, reset the enriched narration data while new data loads.
  useEffect(() => {
    setFullNarration(narration);
    setLoadingFullNarration(true);
  }, [narration]);

  // Update the top factors (from subpaths) whenever the subpaths prop changes.
  useEffect(() => {
    setTopFactors(subpaths?.topFactors ?? null);
  }, [subpaths]);

  // Callback to update the zoom order.
  // Ensures the order never goes below 4.
  const handleZoom = useCallback((order) => {
    if (order < 4) {
      order = 4;
    }
    setZoomOrder(order);
  }, []);

  // Called when the "power" data (enriched CSN data) is ready.
  // It updates geneset membership and merges additional data such as GWAS.
  const handlePowerData = useCallback(async (data) => {

    // Prepare data fetch promises; if region order is 14 then also fetch GWAS data.
    const promises = [
      retrieveFullDataForCSN(narration),
    ];
    if (narration.region.order === 14) {
      promises.push(
        fetchGWASforPositions([{
          chromosome: narration.region.chromosome,
          index: narration.region.i
        }])
      );
    }

    const responses = await Promise.all(promises);
    const fullDataResponse = responses[0];
    const gwasResponse = narration.region.order === 14 ? responses[1] : null;

    // Process GWAS data if available and attach to the order 14 segment.
    const csnGWAS = gwasResponse
      ? gwasResponse[0].trait_names.map((trait, i) => ({
          trait,
          score: gwasResponse[0].scores[i],
          layer: gwasResponse[0].layer
        })).sort((a, b) => b.score - a.score)
      : null;
    const csnOrder14Segment = fullDataResponse?.path.find(d => d.order === 14);
    if (csnOrder14Segment) {
      csnOrder14Segment.GWAS = csnGWAS;
    }

    // Set the enriched narration and mark loading as complete.
    setFullNarration(fullDataResponse);
    setLoadingFullNarration(false);
  }, [narration]);

  // Callback to update the narration with a factor's subpath selection.
  const setFactorSelection = useCallback((factor) => {
    // Save current narration to collection.
    setNarrationCollection(prev => [...prev, narration]);

    const newNarration = { ...narration };
    let newPath = factor.path.path;

    if (newNarration?.path?.length && newPath?.length) {
      // clear preview if it exists
      setNarrationPreview(null)

      // add previously collected fullData and counts to segments of the new path
      newNarration.path.forEach(d => {
        let correspondingSegment = newPath.filter(e => e.order === d.order)
        if(correspondingSegment.length === 1) {
          d.fullData ? correspondingSegment[0]["fullData"] = d.fullData : null;
          d.counts ? correspondingSegment[0]["counts"] = d.counts : null;
        }
      })
      newNarration.path = newPath;

      setSubpathCollection(prev => [...prev, subpaths]);
      setNarration(newNarration);

      // Determine which factors to exclude based on the updated narration,
      // and then search for new subpaths from the latest region.
      const factorExclusion = determineFactorExclusion(newNarration);
      findSubpaths(newNarration.path.slice(-1)[0].region, factorExclusion);
    }
  }, [
    narration, 
    subpaths, 
    determineFactorExclusion,
    findSubpaths,
    setNarrationCollection, 
    setSubpathCollection, 
    setNarration
  ]);

  // Callback previewing factor path on subpath hover
  const [narrationPreview, setNarrationPreview] = useState(null);
  const narrationPreviewRef = useRef(narrationPreview);
  const handleNarrationPreview = useCallback((factor) => {
    const newNarration = { ...narration };
    let newPath = factor.path.path;
    if (newNarration?.path?.length && newPath?.length) {
      newNarration.path = newPath;
      if (JSON.stringify(newNarration) !== JSON.stringify(narrationPreviewRef.current)) {
        setNarrationPreview(newNarration);
        narrationPreviewRef.current = newNarration;
      }
    }
  }, [narration, narrationPreview, setNarrationPreview]);

  const removeNarrationPreview = useCallback(() => {
    setNarrationPreview(null);
  }, []);

  // Callback to revert the most recent factor subpath selection.
  const subpathGoBack = useCallback(() => {
    if (narrationCollection?.length) {
      const newNarration = narrationCollection.slice(-1)[0];
      setNarration(newNarration);
      setNarrationCollection(prev => prev.slice(0, -1));

      // Restore previous factor subpaths and update subpaths collections.
      setSubpaths(
        subpathCollection.length ? subpathCollection.slice(-1)[0] : null
      );
      setSubpathCollection(prev => prev.slice(0, -1));
    }
  }, [
    narrationCollection,
    subpathCollection,
    setSubpaths,
    setSubpathCollection,
    setNarration,
    setNarrationCollection,
  ]);

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
  }, [narration]);

  // -----------------------
  // Render
  // -----------------------

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
            {loadingCSN ? (
              <div style={{ height: `${powerWidth}px` }}>
                <Loading text="Loading CSN..." />
              </div>
            ) : (
              selected && narration && (
                <div className={styles.csn}>
                  <div className={styles.summaryContainer}>

                    <div className={styles.header}>
                      <div className={styles.powerModalSelected}>
                        {narration?.region && showPosition(narration.region)}
                      </div>
                      <div className={styles.headerButtons}>
                        <div className={styles.close} onClick={onClose}>x</div>
                      </div>
                    </div>

                    <RegionAISummary narration={narration} />
                  </div>
                  <div className={styles.powerContainer} ref={powerContainerRef}>
                    <Power
                      csn={narrationPreview ? narrationPreview : loadingFullNarration ? narration : fullNarration}
                      width={powerWidth}
                      height={powerWidth}
                      userOrder={zOrder}
                      isPreview={!!narrationPreview}
                      onOrder={handleZoom}
                      onData={handlePowerData}
                    />
                  </div>
                  <div className={styles.zoomInspectorContainer}>
                    <ZoomInspector
                      csn={loadingFullNarration ? narration : fullNarration}
                      previewCsn={narrationPreview}
                      order={zOrder}
                      maxPathScore={maxPathScore}
                      zoomHeight={mapHeight - 20}
                      onHover={handleZoom}
                      onClick={(c) => { console.log("narration", c); }}
                      factors={topFactors}
                      subpathCollection={subpathCollection}
                      onFactor={setFactorSelection}
                      handleNarrationPreview={handleNarrationPreview}
                      removeNarrationPreview={removeNarrationPreview}
                      onSubpathBack={subpathGoBack}
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