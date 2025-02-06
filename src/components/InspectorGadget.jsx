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
  // Constants for dimensions of the visual components
  const { activeGenesetEnrichment, setSelectedGenesetMembership } = useContext(RegionsContext);

  // Create a mapping (object) from geneset to its score for quick lookup
  const genesetScoreMapping = useMemo(() => {
    return activeGenesetEnrichment
      ? activeGenesetEnrichment.reduce((acc, g) => {
          acc[g.geneset] = g.p;
          return acc;
        }, {})
      : {};
  }, [activeGenesetEnrichment]);

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
  const [currentFactorSubpath, setCurrentFactorSubpath] = useState(null);
  const [factorSubpathCollection, setFactorSubpathCollection] = useState([]);
  const [numFactorSelected, setNumFactorSelected] = useState(0);

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
    setSelectedGenesetMembership([]); // Reset geneset membership

    // Prepare data fetch promises; if region order is 14 then also fetch GWAS data.
    const promises = [
      retrieveFullDataForCSN(narration),
      fetchGenesetEnrichment(narration.genes.map(g => g.name), true)
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
    const genesetResponse = responses[1];
    const gwasResponse = narration.region.order === 14 ? responses[2] : null;

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

    // Process geneset memberships; if a geneset is missing a score then default to 1.
    const csnGenesets = genesetResponse.map(g => ({
      geneset: g.geneset,
      p: genesetScoreMapping[g.geneset] || 1
    }));
    fullDataResponse.genesets = csnGenesets;
    setSelectedGenesetMembership(csnGenesets);

    // Set the enriched narration and mark loading as complete.
    setFullNarration(fullDataResponse);
    setLoadingFullNarration(false);
  }, [narration, genesetScoreMapping, setSelectedGenesetMembership]);

  // Callback to update the narration with a factor's subpath selection.
  const setFactorSelection = useCallback((factor) => {
    // Capture current selection value (used to tag segments)
    const selection = numFactorSelected;
    // Map through the factor's own path to mark its segments with the selection number.
    const subpath = factor.path.path.map(d => ({ ...d, selection }));

    if (subpath?.length && narration) {
      // Clone current narration (to avoid direct state mutation) and get orders already present.
      const newNarration = { ...narration };
      const currentPathOrders = newNarration.path.map(d => d.order);
      // For each segment in the new subpath, add it only if not already present.
      subpath.forEach(s => {
        if (!currentPathOrders.includes(s.order)) {
          newNarration.path.push(s);
        }
      });

      setCurrentFactorSubpath(factor);
      setFactorSubpathCollection(prev => [...prev, factor]);
      setSubpathCollection(prev => [...prev, subpaths]);
      setNarration(newNarration);

      // Determine which factors to exclude based on the updated narration,
      // and then search for new subpaths from the latest region.
      const factorExclusion = determineFactorExclusion(newNarration);
      findSubpaths(newNarration.path.slice(-1)[0].region, factorExclusion);

      setNumFactorSelected(selection + 1);
    }
  }, [narration, subpaths, determineFactorExclusion, findSubpaths, numFactorSelected]);

  // Callback to revert the most recent factor subpath selection.
  const subpathGoBack = useCallback(() => {
    if (currentFactorSubpath?.path?.path?.length && narration) {
      const newNarration = { ...narration };
      // Remove all segments tagged with the last selection.
      newNarration.path = newNarration.path.filter(d => d?.selection !== (numFactorSelected - 1));
      setNumFactorSelected(prev => prev - 1);
      setNarration(newNarration);

      // Restore previous factor subpath and subpaths collections if available.
      setCurrentFactorSubpath(
        factorSubpathCollection.length > 1
          ? factorSubpathCollection.slice(-2, -1)[0]
          : null
      );
      setFactorSubpathCollection(prev => prev.slice(0, -1));
      setSubpaths(
        subpathCollection.length ? subpathCollection.slice(-1)[0] : null
      );
      setSubpathCollection(prev => prev.slice(0, -1));
    }
  }, [
    narration,
    currentFactorSubpath,
    factorSubpathCollection,
    numFactorSelected,
    subpathCollection,
    setSubpaths
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
                      csn={loadingFullNarration ? narration : fullNarration}
                      width={powerWidth}
                      height={powerWidth}
                      userOrder={zOrder}
                      onOrder={handleZoom}
                      onData={handlePowerData}
                    />
                  </div>
                  <div className={styles.zoomInspectorContainer}>
                    <ZoomInspector
                      csn={loadingFullNarration ? narration : fullNarration}
                      order={zOrder}
                      maxPathScore={maxPathScore}
                      zoomHeight={mapHeight - 20}
                      onHover={handleZoom}
                      onClick={(c) => { console.log("narration", c); }}
                      factors={topFactors}
                      subpathCollection={subpathCollection}
                      onFactor={setFactorSelection}
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