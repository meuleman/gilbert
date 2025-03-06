import React, { useState, useCallback, useEffect, useContext, useMemo, useRef } from 'react'
import FiltersContext from './ComboLock/FiltersContext'
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
  mapWidth,
  mapHeight,
  onClose = () => { },
  determineFactorExclusion = () => { }
  // Note: Removed unused props (e.g., children, modalPosition, layers, onCSNIndex, onZoom)
}) => {

  const {
    activeSet,
    activeFilters
  } = useContext(RegionsContext)

  const { 
    selected, findSubpaths, subpaths, setSubpaths, selectedNarration, setSelectedNarration,
    loadingSelectedCSN, fullNarration, setFullNarration, loadingFullNarration, setLoadingFullNarration,
    narrationPreview, slicedNarrationPreview, setSlicedNarrationPreview, handleNarrationPreview,
    removeNarrationPreview, subpathCollection, setSubpathCollection, narrationCollection, setNarrationCollection,
    subpathGoBack, setFactorSelection
  } = SelectedStatesStore()
  
  // -----------------------
  // Component State
  // -----------------------

  // Controls the current zoom order (numeric display level)
  const [zOrder, setZoomOrder] = useState(4 + 0.5);

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
      retrieveFullDataForCSN(selectedNarration),
    ];
    if (selectedNarration.region.order === 14) {
      promises.push(
        fetchGWASforPositions([{
          chromosome: selectedNarration.region.chromosome,
          index: selectedNarration.region.i
        }])
      );
    }

    const responses = await Promise.all(promises);
    const fullDataResponse = responses[0];
    const gwasResponse = selectedNarration.region.order === 14 ? responses[1] : null;

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

  // return (
  //   <div className="min-h-full pl-3 pr-6 py-2.5 border-r-separator border-r-1 w-dvw max-w-100 overflow-auto text-sm flex flex-col gap-6">
  //     <div>
  //       <p><strong className="text-bodyMuted">Region:</strong></p>
  //       <p className="font-mono">
  //         {selectedNarration?.region && getPositionText(selectedNarration.region, true, false)}
  //       </p>
  //     </div>
  //     <div>
  //       <p><strong className="text-bodyMuted">Initial BP view:</strong></p>
  //       <p className="font-mono">
  //         16 Kbp
  //       </p>
  //     </div>
  //     <div>
  //       <p><strong className="text-bodyMuted">AI Summary:</strong></p>
  //       <p className="font-sans">The presence of enriched placental and trophoblast DHS at 16kbp suggests a regulatory role for nearby genes CLEC11A, GPR32, and ACP4, while also indicating potential contributions of satellite repeats and critical transcription factor motifs within the region.</p>
  //     </div>
  //     <div className="flex items-center gap-6">
  //       <div>Regenerate</div>
  //       <div className="flex items-center gap-2.5">
  //         <span>how did our AI do?</span>
  //         <div className="flex">
  //           <span>👍🏽</span>
  //           <span>👎</span>
  //         </div>
  //       </div>
  //     </div>
  //     <div>
  //       <p><strong className="text-bodyMuted">Supporting documentation:</strong></p>
  //       <div className="pt-3">
  //         <strong>10 PubMed articles:</strong>
  //       </div>
  //       <ol className="underline [&>li]:my-3 list-decimal ml-4">
  //         <li>
  //           <a href="#externalLink">Link text here</a>
  //         </li>
  //         <li>
  //           <a href="#externalLink">Link text here</a>
  //         </li>
  //         <li>
  //           <a href="#externalLink">Link text here</a>
  //         </li>
  //       </ol>
  //     </div>
  //     <div>
  //       <div className="pt-3">
  //         <strong>10 PubMed articles:</strong>
  //       </div>
  //       <ol className="underline [&>li]:my-3 list-decimal ml-4">
  //         <li>
  //           <a href="#externalLink">Link text here</a>
  //         </li>
  //         <li>
  //           <a href="#externalLink">Link text here</a>
  //         </li>
  //         <li>
  //           <a href="#externalLink">Link text here</a>
  //         </li>
  //       </ol>
  //     </div>
  //   </div>
  // )

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

                    <RegionAISummary narration={selectedNarration} />
                  </div>
                  <div className={styles.powerContainer} ref={powerContainerRef}>
                    <Power
                      csn={narrationPreview ? narrationPreview : loadingFullNarration ? selectedNarration : fullNarration}
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
                      order={zOrder}
                      zoomHeight={mapHeight - 20}
                      onHover={handleZoom}
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
