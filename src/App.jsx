import './App.css'

import {useEffect, useState, useRef, useCallback, useMemo} from 'react'

import Data from './lib/data';
import { HilbertChromosome } from './lib/HilbertChromosome'
import { debounceNamed } from './lib/debounce'
import { extent, range } from 'd3-array'


// base component
import HilbertGenome from './components/HilbertGenome'
// rendering components
import SVGHilbertPaths from './components/SVGHilbertPaths'
import SVGGenePaths from './components/SVGGenePaths'
import ZoomLegend from './components/ZoomLegend'
// import LinearTracks from './components/LinearTracks'
import TrackPyramid from './components/TrackPyramid'
import StatusBar from './components/StatusBar'
import SelectedModal from './components/SelectedModal'
import LensModal from './components/LensModal'
import LayerLegend from './components/LayerLegend'
import SVGSelected from './components/SVGSelected'
import RegionMask from './components/RegionMask'
import SVGChromosomeNames from './components/SVGChromosomeNames'
// import SVGBBox from './components/SVGBBox'
// layer configurations
import Bands from './layers/bands'
import GCContent from './layers/gc_content'
import GeneCounts from './layers/gene_counts'
import Nucleotides from './layers/nucleotides'
import DHS_OE_Chi from './layers/dhs_oe_chi'
import DHS_Components_Sfc from './layers/dhs_components_sfc'
import DHS_Mean_Signal from './layers/dhs_meansignal'
import DHS_Density from './layers/dhs_density'
// import Chromatin_OE_Chi from './layers/chromatin_oe_chi'
import Chromatin_States_Sfc from './layers/chromatin_states_sfc'
// import TF_Motifs_OE_Chi from './layers/tf_motifs_oe_chi'
import TF_Motifs_Sfc from './layers/tf_motifs_sfc'
import DHS_mapped_TF_motifs_sfc from './layers/dhs_mapped_tf_motifs_sfc'
import UKBB from './layers/ukbb'
import UKBB_Counts from './layers/ukbb_counts'
import Repeats_Sfc from './layers/repeats_sfc'
import CpG_Island_Density from './layers/cpg_islands_density'
import ENCSR000EOT from './layers/encode_ENCSR000EOT_max'
// import DHS_Coreg_2500 from './layers/dhs_coreg_2500'
// import DHS_Coreg_Multiscale from './layers/dhs_coregMultiscale'
// import DHS_Coreg_Best_Scale_max from './layers/dhs_coregBestScale_max'
// autocomplete
import Autocomplete from './components/Autocomplete/Autocomplete'
// region SimSearch
import SimSearchRegion from './components/SimSearch/SimSearchRegion'
import SimSearchByFactor from './components/SimSearch/SimSearchByFactor'
import DisplaySimSearchRegions from './components/SimSearch/DisplaySimSearchRegions'
import SelectedModalSimSearch from './components/SimSearch/SelectedModalSimSearch'
import NarrateRegion from './components/Narration/NarrateRegion'
import SelectedModalNarration from './components/Narration/SelectedModalNarration'
import GenesetEnrichment from './components/SimSearch/GenesetEnrichment';
import Spectrum from './components/Spectrum';

const layers = [
  Bands,
  GeneCounts,
  GCContent,
  Nucleotides,
  DHS_OE_Chi,
  DHS_Components_Sfc,
  DHS_Mean_Signal,
  DHS_Density,
  // DHS_Coreg_2500,
  // DHS_Coreg_Multiscale,
  // DHS_Coreg_Best_Scale_max,
  // Chromatin_OE_Chi,
  Chromatin_States_Sfc,
  // TF_Motifs_OE_Chi,
  TF_Motifs_Sfc,
  DHS_mapped_TF_motifs_sfc,
  Repeats_Sfc,
  UKBB,
  UKBB_Counts,
  CpG_Island_Density,
  ENCSR000EOT
]

// const initialLayerOrder = {
//   4: Bands,
//   5: DHS_Components_Sfc,
//   6: DHS_Components_Sfc,
//   7: Chromatin_States_Sfc,
//   8: Chromatin_States_Sfc,
//   9: TF_Motifs_OE_Chi,
//   10: TF_Motifs_OE_Chi,
//   11: GCContent,
//   12: GCContent,
//   13: GCContent,
//   14: Nucleotides,
// }


function App() {
  const orderDomain = [4, 14]
  const zoomExtent = [0.85, 4000]

  const containerRef = useRef()

  const [layerOrder, setLayerOrder] = useState(null)

  // let's fill the container and update the width and height if window resizes
  const [width, height] = useWindowSize();
  function useWindowSize() {
    const [size, setSize] = useState([800, 800]);
    useEffect(() => {
      function updateSize() {
        if(!containerRef.current) return
        //let { height } = containerRef.current.getBoundingClientRect()
        let height = window.innerHeight - 270;
        // account for the zoom legend (30) and padding (48)
        let w = window.innerWidth - 30 - 24 - 500
        // console.log("sup", window.innerWidth, w, width)
        setSize([w, height]);
      }
      window.addEventListener('resize', updateSize);
      updateSize();
      return () => window.removeEventListener('resize', updateSize);
    }, []);
    return size;
  }

  const [layerLock, setLayerLock] = useState(false)
  const [layerLockFromIcon, setLayerLockFromIcon] = useState(null)
  const handleChangeLayerLock = (e) => {
    setLayerLock(!layerLock)
  }

  const [layer, setLayer] = useState(Bands)
  function handleLayer(l) {
    setLayer(l)
    setLayerLock(true)
    setLayerLockFromIcon(false)
    setSelected(selected)
    setSelectedOrder(selectedOrder)
    setSimSearch(simSearch)
    setSearchByFactorInds([])
  }


  // TODO: handleData, and pass data to the subcomponents
  // TODO: they can do their own data lookup based on layer and the hilbert point

  // We want to keep track of the zoom state
  const [zoom, setZoom] = useState({order: 4, points: [], bbox: {}, transform: {}})
  const handleZoom = useCallback((newZoom) => {
    if(zoom.order !== newZoom.order && !layerLock) {
      setLayer(layerOrder[newZoom.order])
    }  
    setZoom(newZoom)
  }, [zoom, layerLock])
  // function handleZoom(zoom) {
  //   setZoom(zoom)
  //   setLayer(layerOrder[zoom.order])
  // } 
  
  // the hover can be null or the data in a hilbert cell
  const [hover, setHover] = useState(null)
  // for when a region is hovered in the similar region list
  const [similarRegionListHover, setSimilarRegionListHover] = useState(null)
  function handleHover(hit, similarRegionList=false) {
    setHover(hit)
    if(similarRegionList) {
      setSimilarRegionListHover(hit)
    }
  }

  // function handleDetailLevelChange(detailLevel) {
  //   setSimSearchDetailLevel(detailLevel)
  //   processSimSearchResults(simSearch, detailLevel)
  // }

  // selected powers the sidebar modal and the 1D track
  const [selected, setSelected] = useState(null)
  const [selectedOrder, setSelectedOrder] = useState(null)
  const [simSearch, setSimSearch] = useState(null)
  const [similarRegions, setSimilarRegions] = useState([])
  // const [simSearchDetailLevel, setSimSearchDetailLevel] = useState(null)
  const [simSearchMethod, setSimSearchMethod] = useState(null)
  const [selectedNarration, setSelectedNarration] = useState(null)
  const [genesetEnrichment, setGenesetEnrichment] = useState(null)
  function handleClick(hit, order, double) {
    // console.log("app click handler", hit, order, double)
    try {
      if(hit === selected) {
        setSelected(null) 
        setSelectedOrder(null)
        setSimSearch(null)
      } else if(hit) {
        setSelected(hit)
        setSelectedOrder(order)
        // Region SimSearch
        SimSearchRegion(hit, order, layer, setSearchByFactorInds, []).then((regionResult) => {
          if(!regionResult || !regionResult.simSearch) return;
          processSimSearchResults(regionResult)
          GenesetEnrichment(regionResult.simSearch.slice(1), order).then((enrichmentResult) => {
            setGenesetEnrichment(enrichmentResult)
          })
          setSimSearchMethod("Region")
        })
        NarrateRegion(hit, order).then((narrationResult) => {
          setSelectedNarration(narrationResult.narrationRanks)
        })
      }
    } catch(e) {
      console.log("caught error in click", e)
    }
  }

  function processSimSearchResults(result) {
    setSimSearch(result)
    let hilbert = HilbertChromosome(zoom.order)
    let similarRegions = result?.simSearch
    if(similarRegions && similarRegions.length)  {
      const similarRanges = similarRegions.map((d) => {
        const coords = d.coordinates
        const chrm = coords.split(':')[0]
        const start = coords.split(':')[1].split('-')[0]
        const stop = coords.split(':')[1].split('-')[1]
        let range = hilbert.fromRegion(chrm, start, stop-1)[0]
        range.end = +stop
        return range
      })

      setSimilarRegions(similarRanges)
    } else {
      setSimilarRegions([])
      setSelected(null)
    }
  }

 
  const [searchByFactorInds, setSearchByFactorInds] = useState([])
  function handleFactorClick(newSearchByFactorInds) {
    setSearchByFactorInds(newSearchByFactorInds)
    if(newSearchByFactorInds.length > 0) {
      if(simSearchMethod != "Region") {
        SimSearchByFactor(newSearchByFactorInds, zoom.order, layer).then((SBFResult) => {
          setSelected(null)
          setSelectedNarration(null)
          setSelectedOrder(zoom.order)
          processSimSearchResults(SBFResult)
          setSimSearchMethod("SBF")
          GenesetEnrichment(SBFResult.simSearch, zoom.order).then((enrichmentResult) => {
            setGenesetEnrichment(enrichmentResult)
          })
        })
      } else if(simSearchMethod == "Region") {
        SimSearchRegion(selected, zoom.order, layer, setSearchByFactorInds, newSearchByFactorInds, simSearchMethod).then((regionResult) => {
          processSimSearchResults(regionResult)
          GenesetEnrichment(regionResult.simSearch.slice(1), zoom.order).then((enrichmentResult) => {
            setGenesetEnrichment(enrichmentResult)
          })
        })
      }
    } else {
      processSimSearchResults({simSearch: null, factors: null, method: null, layer: null})
      setSimSearchMethod(null)
    }
  }

  // keybinding that closes the modal on escape
  useEffect(() => {
    function handleKeyDown(e) {
      if(e.key === "Escape") {
        handleModalClose()
      }
    }
    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    }
  }, [])

  function handleModalClose() {
    setRegion(null)
    setSelected(null)
    setSelectedOrder(null)
    setSimSearch(null)
    setSearchByFactorInds([])
    setSimilarRegions([])
    setSelectedNarration(null)
    setSimSearchMethod(null)
    setGenesetEnrichment(null)
  }

  const [showHilbert, setShowHilbert] = useState(false)
  const handleChangeShowHilbert = (e) => {
    setShowHilbert(!showHilbert)
  }
  const [showDebug, setShowDebug] = useState(true)
  const handleChangeShowDebug = (e) => {
    setShowDebug(!showDebug)
  }
  
  const [showGenes, setShowGenes] = useState(true)
  const handleChangeShowGenes = (e) => {
    setShowGenes(!showGenes)
  }

  const [showGaps, setShowGaps] = useState(true)
  const handleChangeShowGaps = (e) => {
    setShowGaps(!showGaps)
  }

  // changing the region changes the zoom and will also highlight on the map
  const [region, setRegion] = useState(null)

  function handleChangeLocationViaAutocomplete(autocompleteRegion) {
    if (!autocompleteRegion) return
    console.log(`autocompleteRegion ${JSON.stringify(autocompleteRegion)}`);
    setRegion({
      chromosome: autocompleteRegion.chrom, 
      start: autocompleteRegion.start, 
      end: autocompleteRegion.stop 
      // order: ...
    })
  }

  // number state for orderOffset
  const [orderOffset, setOrderOffset] = useState(0)

  const [data, setData] = useState(null)
  function onData(payload) {
    // console.log("got some data", payload)
    setData(payload)
  }

  const [tracks, setTracks] = useState([])
  // setter for tracks array

  // console.log("tracks?", trackMinus1, trackPlus1)

  // this debounced function fetches the data and updates the state
  const fetchData = useMemo(() => {
    const dataClient = Data({ 
      debug: false
    })
    return (layer, order, bbox, setter) => {
      // we dont want to fetch data if the order is not within the layer order range
      if (order < layer.orders[0] || order > layer.orders[1]) return;

      let hilbert = HilbertChromosome(order, { padding: 2 })
      // let bbox = getBboxDomain(transform, xScale, yScale, width, height)    
      let points = hilbert.fromBbox(bbox) 

      // console.log("fetching layer", layer)
      let myPromise = dataClient.fetchData(layer, order, points)
      let myCallback = (data) => {
        if(data) {
          // console.log("GOT DATA", data, layer, order)
          setter({ data, layer, order})
          // setLayerData(layer, data, zoom.order)
          // dispatch({ type: actions.SET_DATA, payload: { data, order: zoom.order } });
        }
      }
      // debounce a function call with a name
      debounceNamed(myPromise, myCallback, 150, layer.name+order) // layer.name + order makes unique call 
    }
  }, []);

  useEffect(() => {
    // setTracks(prevArray => {
    //   let newArray = [...prevArray].map((t, i) => (i < zoom.order) ? t : null);
    //   return newArray
    // });
    // fetchData as promises for orders greater than 4 and resolve when they are all done

    let promises = range(4, zoom.order).map(order => {
      return new Promise((resolve) => {
        fetchData(layer, order, zoom.bbox, (response) => {
          resolve(response)
        })
      })
    })
    Promise.all(promises).then((responses) => {
      setTracks(responses)
    })
  }, [layer, zoom, selected, fetchData])

  // compares two hilbert segments to see if they are equal
  function checkRanges(a, b) {
    if(!a || !b) return false
    if(a.i == b.i && a.chromosome == b.chromosome && a.order == b.order) {
      return true
    }
    return false
  }

  // calculates the bp start and end position extents for 1D tracks
  let xExtentForTracks = useMemo(() => {
    let xExtentForTracks
    if(data?.data){

      let currentOrderTrackData = [];
      if(selected) {
        currentOrderTrackData = data.data.filter(d => d.chromosome == selected.chromosome)
      } else if(hover) {
        currentOrderTrackData = data.data.filter(d => d.chromosome == hover.chromosome)
      }
      if(currentOrderTrackData.length > 2) {
        const segmentSize = currentOrderTrackData[1].start - currentOrderTrackData[0].start
        xExtentForTracks = extent(currentOrderTrackData, d => d.start)
        xExtentForTracks[1] += segmentSize
      }
    }
    return xExtentForTracks
  }, [data, selected, hover])

  return (
    <>
      <div className="header">
        <div className="header-panel title">gilbert</div>

        <div className="header-panel narration">
          <SelectedModalNarration
            selectedNarration={selectedNarration}
          />
        </div>

        <div className="header-panel zoomto">
          <Autocomplete onChangeLocation={handleChangeLocationViaAutocomplete} />
        </div>

      </div>

      <div className="panels">
        <div ref={containerRef} className="hilbert-container">
          <HilbertGenome 
            orderMin={orderDomain[0]}
            orderMax={orderDomain[1]}
            zoomMin={zoomExtent[0]}
            zoomMax={zoomExtent[1]}
            width={width} 
            height={height}
            zoomToRegion={region}
            zoomDuration={1000}
            activeLayer={layer}
            orderOffset={orderOffset}
            // pinOrder={region?.order}
            layers={layers}
            SVGRenderers={[
              SVGChromosomeNames({ }),
              showHilbert && SVGHilbertPaths({ stroke: "black", strokeWidthMultiplier: 0.1, opacity: 0.5}),
              RegionMask({ regions: [selected, ...similarRegions]}),
              SVGSelected({ hit: hover, stroke: "black", highlightPath: true, strokeWidthMultiplier: 0.1, showGenes }),
              (
                (checkRanges(selected, similarRegionListHover)) ? 
                SVGSelected({ hit: selected, stroke: "darkgold", strokeWidthMultiplier: 0.05, showGenes: false })
                : SVGSelected({ hit: selected, stroke: "gold", strokeWidthMultiplier: 0.35, showGenes: false })
              ),
              // TODO: highlight search region (from autocomplete)
              // SVGSelected({ hit: region, stroke: "gray", strokeWidthMultiplier: 0.4, showGenes: false }),
              ...DisplaySimSearchRegions({ 
                similarRegions: similarRegions,
                // simSearch: simSearch, 
                // detailLevel: simSearchDetailLevel, 
                selectedRegion: region,
                // order: selectedOrder, 
                color: "gray", 
                clickedColor: "red",
                checkRanges: checkRanges,
                similarRegionListHover: similarRegionListHover,
                width: 0.05, 
                showGenes: false 
              }),
              showGenes && SVGGenePaths({ stroke: "black", strokeWidthMultiplier: 0.1, opacity: 0.25}),
            ]}
            onZoom={handleZoom}
            onHover={handleHover}
            onClick={handleClick}
            onData={onData}
            // onLayer={handleLayer}
            debug={showDebug}
          />
        </div>
        <LensModal
          layers={layers}
          currentLayer={layer}
          setLayerOrder={setLayerOrder}
          setLayer={setLayer}
          setLayerLock={setLayerLock}
          layerLock={layerLock}
          setLayerLockFromIcon={setLayerLockFromIcon}
          layerLockFromIcon={layerLockFromIcon}
          setSearchByFactorInds={setSearchByFactorInds}
          order={zoom.order}
        />
        <LayerLegend 
          data={data}
          hover={hover}
          selected={selected}
          handleFactorClick={handleFactorClick}
          searchByFactorInds={searchByFactorInds}
        />
        <SelectedModalSimSearch
          simSearch={simSearch}
          searchByFactorInds={searchByFactorInds}
          handleFactorClick={handleFactorClick}
          selectedOrder={selectedOrder}
          setRegion={setRegion}
          setHover={setHover}
        />
        <ZoomLegend 
          k={zoom.transform.k} 
          height={height} 
          effectiveOrder={zoom.order}
          orderDomain={orderDomain} 
          zoomExtent={zoomExtent} />
        <SelectedModal
          width={480}
          height={height} 
          selected={selected} // currently selected cell
          selectedOrder={selectedOrder} 
          layer={layer} 
          zoom={zoom} 
          onClose={handleModalClose} />
        {/* <Spectrum
          width={400}
          height={300} 
          genesetEnrichment={genesetEnrichment}
        /> */}
      </div>
      <div className='footer'>
        <div className='linear-tracks'>
          <TrackPyramid
            state={data} 
            tracks={tracks}
            width={width}
            height={100}
            segment={!showGaps}
            hovered={hover} 
            selected={selected} 
            setHovered={handleHover} 
          ></TrackPyramid>

        </div>
        <StatusBar 
          width={width + 500 + 12 + 30} 
          hover={hover} // the information about the cell the mouse is over
          layer={layer} 
          zoom={zoom} 
          onLayer={handleLayer}
          layers={layers} />
        <div className="footer-panel">
          <div className="footer-panel-left">
            <label>
              <input type="checkbox" checked={showDebug} onChange={handleChangeShowDebug} />
              Debug
            </label>
            <label>
              <input type="checkbox" checked={showHilbert} onChange={handleChangeShowHilbert} />
              Show Hilbert Curve
            </label>
            <label>
              <input type="checkbox" checked={showGenes} onChange={handleChangeShowGenes} />
              Show Gene Overlays
            </label>
            <label>
              <input type="checkbox" checked={showGaps} onChange={handleChangeShowGaps} />
              Show gaps
            </label>
            {/* <label>
              <input type="checkbox" checked={layerLock} onChange={handleChangeLayerLock} />
              Layer lock
            </label> */}
          </div>
          <div className="footer-panel-right">
            {/* this is an input that adds or subtracts to the calculated order */}
            <label>
              Order Offset ({orderOffset}, effective order {zoom.order})
              <input type="range" min={-2} max={2} value={orderOffset} onChange={(e) => setOrderOffset(+e.target.value)} />
            </label>
          </div>
        </div>
      </div>
    </>
  )
}

export default App
