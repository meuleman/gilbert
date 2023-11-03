import './App.css'

import {useEffect, useState, useRef, useCallback, useMemo} from 'react'

import Data from './lib/data';
import { HilbertChromosome, hilbertPosToOrder } from './lib/HilbertChromosome'
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
import LayerDropdown from './components/LayerDropdown'
import StatusBar from './components/StatusBar'
//import SelectedModal from './components/SelectedModal'
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
import CD3 from './layers/encode_CD3_D2_Stim_AG90658_output_2.5.1_max'
import CD3Fiberseq from './layers/fiberseq_CD3_HAP1d2stim_mean'
import LADs from './layers/lads'
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
  ENCSR000EOT,
  CD3,
  CD3Fiberseq,
  LADs,
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
  const [lensHovering, setLensHovering] = useState(false)

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
        let w = window.innerWidth - 30 - 24 - 180// - 500
        // console.log("sup", window.innerWidth, w, width)
        setSize([w, height]);
      }
      window.addEventListener('resize', updateSize);
      updateSize();
      return () => window.removeEventListener('resize', updateSize);
    }, []);
    return size;
  }

  const [duration, setDuration] = useState(10000)
  const handleChangeDuration = (e) => {
    setDuration(+e.target.value)
  }

  const [layerLock, setLayerLock] = useState(false)
  const [layerLockFromIcon, setLayerLockFromIcon] = useState(null)

  const [layer, setLayer] = useState(Bands)
  function handleLayer(l) {
    setLayer(l)
    setLayerLock(true)
    setLayerLockFromIcon(false)
    setSearchByFactorInds([])
  }

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
        setStations([])
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
        updateStations(hit)
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
      setStations([])
    }
  }

 
  const [searchByFactorInds, setSearchByFactorInds] = useState([])
  function handleFactorClick(newSearchByFactorInds) {
    setSearchByFactorInds(newSearchByFactorInds)
    if(newSearchByFactorInds.length > 0) {
      if(simSearchMethod != "Region") {
        SimSearchByFactor(newSearchByFactorInds, zoom.order, layer).then((SBFResult) => {
          setSelected(null)
          setStations([])
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
    setStations([])
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

  const [showGaps, setShowGaps] = useState(false)
  const handleChangeShowGaps = (e) => {
    setShowGaps(!showGaps)
  }

  // changing the region changes the zoom and will also highlight on the map
  const [region, setRegion] = useState(null)

  function handleChangeLocationViaAutocomplete(autocompleteRegion) {
    if (!autocompleteRegion) return
    // console.log(`autocompleteRegion ${JSON.stringify(autocompleteRegion)}`);
    console.log("autocomplete", autocompleteRegion)

    const length = autocompleteRegion.stop - autocompleteRegion.start
    // figure out the appropriate order to zoom to
    // we want to zoom in quite a bit to the region if it hasn't specified its order
    let order = orderDomain[1];
    while(length > hilbertPosToOrder(1, { from: order, to: orderDomain[1] })) {
      order--;
      if(order == orderDomain[0]) break;
    }
    let pos = hilbertPosToOrder(autocompleteRegion.start + (autocompleteRegion.stop - autocompleteRegion.start)/2, { from: orderDomain[1], to: order })
    let hilbert = HilbertChromosome(order, { padding: 2 })
    let hit = hilbert.get2DPoint(pos, autocompleteRegion.chrom)
    hit.start = autocompleteRegion.start
    hit.end = autocompleteRegion.stop
    hit.data = {}
    hit.type = "autocomplete" // TODO: we can use this to determine alternative rendering
    console.log("autocomplete hilbert region", hit)
    setRegion(hit)
    setSelected(hit)
    updateStations(hit)
    
  }

  // number state for orderOffset
  const [orderOffset, setOrderOffset] = useState(0)

  const [data, setData] = useState(null)
  function onData(payload) {
    // console.log("got some data", payload)
    setData(payload)
  }

  const [tracks, setTracks] = useState([])
  const [stations, setStations] = useState([])
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
      let points = hilbert.fromBbox(bbox) 

      let myPromise = dataClient.fetchData(layer, order, points)
      let myCallback = (data) => {
        if(data) {
          setter({ data, layer, order})
        }
      }
      // debounce a function call with a name
      debounceNamed(myPromise, myCallback, 150, layer.name+order) // layer.name + order makes unique call 
    }
  }, []);

  // When data or selected changes, we want to update the tracks
  useEffect(() => {
    if(!data) return
    let promises = range(4, data.order).map(order => {
      return new Promise((resolve) => {
        fetchData(layer, order, data.bbox, (response) => {
          resolve(response)
        })
      })
    })
    Promise.all(promises).then((responses) => {
      setTracks(responses)
    })
  }, [data, selected, layerOrder, fetchData])

  // When data or selected changes, we want to update the zoom legend
  let updateStations = useCallback((hit) => {
    if(!data) return
    if(!hit) return
    let promises = range(4, data.order).map(order => {
      return new Promise((resolve) => {
        // get the layer at this order
        let orderLayer = layerOrder[order]
        // calculate the bbox from the selected hilbert cell that would fetch just the cell for the region
        let hilbert = HilbertChromosome(order, { padding: 2 })
        let step = hilbert.step
        let bbox = {
          x: hit.x - step/2,
          y: hit.y - step/2,
          width: step*2,
          height: step*2
        }
        // console.log("bbox", bbox)
        fetchData(orderLayer, order, bbox, (response) => {
          // get the appropriate datum by looking at the corresponding hilbert pos from the selected.start
          let pos = hilbertPosToOrder(hit.start, { from: orderDomain[1], to: order })
          let point = hilbert.get2DPoint(pos, hit.chromosome)
          let datum = response.data.find(d => d.i == point.i)
          // console.log("pos", pos, "point", point, "datum", datum)
          resolve({ layer: orderLayer, station: datum })
        })
      })
    })
    Promise.all(promises).then((responses) => {
      // console.log("responses", responses)
      setStations(responses)
    })
  }, [data, layerOrder, fetchData, setStations])

  useEffect(() => {
    updateStations(selected)
  }, [data, layerOrder, fetchData, setStations])



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
            activeLayer={layer}
            orderOffset={orderOffset}
            zoomDuration={duration}
            // pinOrder={region?.order}
            layers={layers}
            SVGRenderers={[
              SVGChromosomeNames({ }),
              showHilbert && SVGHilbertPaths({ stroke: "black", strokeWidthMultiplier: 0.1, opacity: 0.5}),
              RegionMask({ regions: [selected, ...similarRegions]}),
              SVGSelected({ hit: hover, stroke: "black", highlightPath: true, type: "hover", strokeWidthMultiplier: 0.1, showGenes }),
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
          setLensHovering={setLensHovering}
          lensHovering={lensHovering}
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
          zoomExtent={zoomExtent} 
          orderDomain={orderDomain} 
          layerOrder={layerOrder}
          layer={layer}
          layerLock={layerLock}
          lensHovering={lensHovering}
          stations={stations}
          selected={selected}
        />
        {/* <SelectedModal
          width={480}
          height={height} 
          selected={selected} // currently selected cell
          selectedOrder={selectedOrder} 
          layer={layer} 
          zoom={zoom} 
          onClose={handleModalClose} /> */}
        {/* <Spectrum
          width={400}
          height={300} 
          genesetEnrichment={genesetEnrichment}
        /> */}
      </div>
      <div className='footer'>
        <div className='footer-row'>
          <div className='linear-tracks'>
            <TrackPyramid
              state={data} 
              tracks={tracks}
              width={width * 0.95}
              height={100}
              segment={!showGaps}
              hovered={hover} 
              selected={selected} 
              setHovered={handleHover} 
            ></TrackPyramid>
          </div>
          <LayerDropdown 
            layers={layers} 
            activeLayer={layer} 
            onLayer={handleLayer}
            order={zoom.order}
            layerLock={layerLock}
            setLayerLock={setLayerLock}
            setLayerLockFromIcon={setLayerLockFromIcon}
          />
        </div>
        <StatusBar 
          width={width + 12 + 30} 
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
            <label>
              <input type="number" value={duration} onChange={handleChangeDuration}></input>
              Zoom duration
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
