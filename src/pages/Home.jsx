import {useEffect, useState, useRef, useCallback, useMemo} from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'

import Data from '../lib/data';
import { urlify, jsonify, fromPosition } from '../lib/regions'
import { HilbertChromosome, hilbertPosToOrder, checkRanges } from '../lib/HilbertChromosome'
import { debounceNamed, debouncerTimed } from '../lib/debounce'
import { range } from 'd3-array'

import './Home.css'

// base component
import HilbertGenome from '../components/HilbertGenome'
// rendering components
import SVGHilbertPaths from '../components/SVGHilbertPaths'
import SVGGenePaths from '../components/SVGGenePaths'
import ZoomLegend from '../components/ZoomLegend'
// import LinearTracks from '../components/LinearTracks'
import TrackPyramid from '../components/TrackPyramid'
import LayerDropdown from '../components/LayerDropdown'
import StatusBar from '../components/StatusBar'
import SettingsPanel from '../components/SettingsPanel';
//import SelectedModal from '../components/SelectedModal'
import LensModal from '../components/LensModal'
import LayerLegend from '../components/LayerLegend'
import SVGSelected from '../components/SVGSelected'
import RegionMask from '../components/RegionMask'
import SVGChromosomeNames from '../components/SVGChromosomeNames'
// import SVGBBox from '../components/SVGBBox'

// layer configurations
import Bands from '../layers/bands'
import GCContent from '../layers/gc_content'
import GeneCounts from '../layers/gene_counts'
import Nucleotides from '../layers/nucleotides'
import DHS_OE_Chi from '../layers/dhs_oe_chi'
import DHS_Components_Sfc from '../layers/dhs_components_sfc'
import DHS_Components_Sfc_max from '../layers/dhs_components_sfc_max'
import DHS_Mean_Signal from '../layers/dhs_meansignal'
import DHS_Density from '../layers/dhs_density'
// import Chromatin_OE_Chi from '../layers/chromatin_oe_chi'
import Chromatin_States_Sfc from '../layers/chromatin_states_sfc'
import Chromatin_States_Sfc_max from '../layers/chromatin_states_sfc_max';
// import TF_Motifs_OE_Chi from '../layers/tf_motifs_oe_chi'
import TF_Motifs_Sfc from '../layers/tf_motifs_sfc'
import TF_Motifs_Sfc_max from '../layers/tf_motifs_sfc_max'
import DHS_mapped_TF_motifs_sfc from '../layers/dhs_mapped_tf_motifs_sfc'
import DHS_mapped_TF_motifs_sfc_max from '../layers/dhs_mapped_tf_motifs_sfc_max'
import UKBB from '../layers/ukbb'
import UKBB_Counts from '../layers/ukbb_counts'
import Repeats_Sfc from '../layers/repeats_sfc'
import Repeats_Sfc_max from '../layers/repeats_sfc_max'
import CpG_Island_Density from '../layers/cpg_islands_density'
import ENCSR000EOT from '../layers/encode_ENCSR000EOT_max'
import CD3 from '../layers/encode_CD3_D2_Stim_AG90658_output_2.5.1_max'
import CD3Fiberseq from '../layers/fiberseq_CD3_HAP1d2stim_mean'
import LADs from '../layers/lads'
// import DHS_Coreg_2500 from '../layers/dhs_coreg_2500'
// import DHS_Coreg_Multiscale from '../layers/dhs_coregMultiscale'
// import DHS_Coreg_Best_Scale_max from '../layers/dhs_coregBestScale_max'
// autocomplete
import Autocomplete from '../components/Autocomplete/Autocomplete'
// region SimSearch
import SimSearchRegion from '../components/SimSearch/SimSearchRegion'
import SimSearchByFactor from '../components/SimSearch/SimSearchByFactor'

import DisplaySimSearchRegions from '../components/SimSearch/DisplaySimSearchRegions'
import DisplayedExampleRegions from '../components/ExampleRegions/DisplayExampleRegions';

import { getSet } from '../components/Regions/localstorage'
import RegionFilesSelect from '../components/Regions/RegionFilesSelect'
import SelectedModal from '../components/SelectedModal'
import SelectedModalSimSearch from '../components/SimSearch/SelectedModalSimSearch'
import NarrateRegion from '../components/Narration/NarrateRegion'
import CrossScaleNarration from '../components/Narration/CrossScaleNarration'
import LayerSuggestion from '../components/Narration/LayerSuggestion'
import SelectedModalNarration from '../components/Narration/SelectedModalNarration'
import GenesetEnrichment from '../components/SimSearch/GenesetEnrichment';
import Spectrum from '../components/Spectrum';

import GilbertLogo from '../assets/gilbert-logo.svg?react'

const layers = [
  Bands,
  GeneCounts,
  GCContent,
  Nucleotides,
  DHS_OE_Chi,
  DHS_Components_Sfc,
  DHS_Components_Sfc_max,
  DHS_Mean_Signal,
  DHS_Density,
  // DHS_Coreg_2500,
  // DHS_Coreg_Multiscale,
  // DHS_Coreg_Best_Scale_max,
  // Chromatin_OE_Chi,
  Chromatin_States_Sfc,
  Chromatin_States_Sfc_max,
  // TF_Motifs_OE_Chi,
  TF_Motifs_Sfc,
  TF_Motifs_Sfc_max,
  DHS_mapped_TF_motifs_sfc,
  DHS_mapped_TF_motifs_sfc_max,
  Repeats_Sfc,
  Repeats_Sfc_max,
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

// declare globally so it isn't recreated on every render
const debounceTimed = debouncerTimed()

function Home() {
  const location = useLocation();
  const queryParams = new URLSearchParams(location.search);
  const initialRegionset = queryParams.get('regionset');
  let initialSelectedRegion = queryParams.get('region');
  const initialPosition = queryParams.get('position');
  // console.log("initial selected region", initialSelectedRegion)
  // if we have a position URL, overwrite the initial region
  // this will be converted into a selected region
  if(initialPosition) {
    const [chrom, pos] = initialPosition.split(":")
    const [start, end] = pos.split("-")
    initialSelectedRegion = JSON.stringify(fromPosition(chrom, start, end))
    // console.log("initial position", initialPosition, initialSelectedRegion)
  }

  const navigate = useNavigate();

  const orderDomain = useMemo(() => [4, 14], [])
  const zoomExtent = [0.85, 4000]

  const containerRef = useRef()

  const [layerOrder, setLayerOrder] = useState(null)
  const layerOrderRef = useRef(layerOrder)
  useEffect(() => {
    layerOrderRef.current = layerOrder
  }, [layerOrder])

  const [lensHovering, setLensHovering] = useState(false)

  // let's fill the container and update the width and height if window resizes
  const [width, height] = useWindowSize();
  function useWindowSize() {
    const [size, setSize] = useState([800, 800]);
    useEffect(() => {
      function updateSize() {
        if(!containerRef.current) return
        const { height, width } = containerRef.current.getBoundingClientRect()
        console.log(containerRef.current.getBoundingClientRect())
        console.log("width x height", width, height)
        //  let height = window.innerHeight - 270;
        //  // account for the zoom legend (30) and padding (48)
        //  let w = window.innerWidth - 30 - 24 - 180// - 500
        //  // console.log("sup", window.innerWidth, w, width)
        //  setSize([w, height]);

        setSize([width, height]);
      }
      window.addEventListener('resize', updateSize);
      updateSize();
      return () => window.removeEventListener('resize', updateSize);
    }, []);
    return size;
  }

  // Zoom duration for programmatic zoom
  const [duration, setDuration] = useState(1000)
  const handleChangeDuration = (e) => {
    setDuration(+e.target.value)
  }

  const [isZooming, setIsZooming] = useState(false)

  const [layerLock, setLayerLock] = useState(false)
  const [layerLockFromIcon, setLayerLockFromIcon] = useState(null)
  const [layer, setLayer] = useState(Bands)
  function handleLayer(l) {
    setLayer(l)
    setLayerLock(true)
    setLayerLockFromIcon(false)
    setSearchByFactorInds([])
  }

  const layerLockRef = useRef(layerLock)
  useEffect(() => {
    layerLockRef.current = layerLock
  }, [layerLock])
  const layerRef = useRef(layer)
  useEffect(() => {
    layerRef.current = layer
  }, [layer])

  // We want to keep track of the zoom state
  const [zoom, setZoom] = useState({order: 4, points: [], bbox: {}, transform: {}})
  const zoomRef = useRef(zoom)
  useEffect(() => {
    zoomRef.current = zoom
  }, [zoom])
  const handleZoom = useCallback((newZoom) => {
    if(zoomRef.current.order !== newZoom.order && !layerLockRef.current) {
      setLayer(layerOrderRef.current[newZoom.order])
    }  
    setZoom(newZoom)
  }, [zoom, layerLock, layerOrder, setZoom, setLayer])


    // selected powers the sidebar modal and the 1D track
  const [selected, setSelected] = useState(jsonify(initialSelectedRegion))
  const [selectedOrder, setSelectedOrder] = useState(null)
  const [simSearch, setSimSearch] = useState(null)
  const [similarRegions, setSimilarRegions] = useState([])
  // const [simSearchDetailLevel, setSimSearchDetailLevel] = useState(null)
  const [simSearchMethod, setSimSearchMethod] = useState(null)
  const [selectedNarration, setSelectedNarration] = useState(null)
  const [crossScaleNarration, setCrossScaleNarration] = useState(new Array(11).fill(null))
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
        console.log("setting selected from click", hit)
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
          narrationResult && setSelectedNarration(narrationResult.narrationRanks)
        })
        // console.log(pathCSN)
        // CrossScaleNarration(hit, pathCSN, [
        //   DHS_Components_Sfc_max,
        //   Chromatin_States_Sfc_max,
        //   TF_Motifs_Sfc_max,
        //   Repeats_Sfc_max
        // ]).then(crossScaleResponse => {
        //   setCrossScaleNarration(crossScaleResponse)
        // })
        updateStations(hit)
      }
    } catch(e) {
      console.log("caught error in click", e)
    }
  }

  const updateUrlParams = useCallback((newRegionSet, newSelected) => {
    const params = new URLSearchParams();
    if (newRegionSet) params.set('regionset', newRegionSet);
    if (newSelected) params.set('region', urlify(newSelected));
    console.log("update url", newRegionSet, newSelected)
    navigate({ search: params.toString() }, { replace: true });
  }, [navigate]);

  const [regionset, setRegionSet] = useState(initialRegionset)
  const [exampleRegions, setExampleRegions] = useState([])
  useEffect(() => {
    const set = getSet(regionset)
    if(set) {
      setExampleRegions(set)
    }
    updateUrlParams(regionset, selected)
  }, [regionset, selected, setExampleRegions, updateUrlParams])


  // change CSN method from path based to drill based
  const [pathCSN, setPathCSN] = useState(true)
  const handleChangePathCSN = (e) => {
    setPathCSN(!pathCSN)
  }
  useEffect(() => {
    if(selected){
      CrossScaleNarration(selected, pathCSN, [
        DHS_Components_Sfc_max,
        Chromatin_States_Sfc_max,
        TF_Motifs_Sfc_max,
        Repeats_Sfc_max
      ]).then(crossScaleResponse => {
        setCrossScaleNarration(crossScaleResponse)
      })
    }
  }, [pathCSN, selected])

  const selectedRef = useRef(selected);
  useEffect(() => {
    selectedRef.current = selected;
  }, [selected]);

  // the hover can be null or the data in a hilbert cell
  const [hover, setHover] = useState(null)
  const [lastHover, setLastHover] = useState(null)
  // for when a region is hovered in the similar region list
  const [similarRegionListHover, setSimilarRegionListHover] = useState(null)
  const handleHover = useCallback((hit, similarRegionList=false) => {
    if(hit && !selectedRef.current) {
      updateStations(hit)
    }
    if(similarRegionList) {
      setSimilarRegionListHover(hit)
    }
    setHover(hit)
    if(hit) setLastHover(hit)
  }, [setSimilarRegionListHover])



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
      console.log("similar regions", similarRegions)
      console.log("similar ranges", similarRanges)

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
    setCrossScaleNarration(new Array(11).fill(null))
  }

  const [showHilbert, setShowHilbert] = useState(false)
  const handleChangeShowHilbert = (e) => {
    setShowHilbert(!showHilbert)
  }
  const [showDebug, setShowDebug] = useState(true)
  const handleChangeShowDebug = (e) => {
    setShowDebug(!showDebug)
  }

  const [showSettings, setShowSettings] = useState(false)
  const handleChangeShowSettings = (e) => {
    setShowSettings(!showSettings)
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
  const [region, setRegion] = useState(jsonify(initialSelectedRegion))

  function handleChangeLocationViaAutocomplete(autocompleteRegion) {
    if (!autocompleteRegion) return
    // console.log(`autocompleteRegion ${JSON.stringify(autocompleteRegion)}`);
    console.log("autocomplete", autocompleteRegion)

    const hit = fromPosition(autocompleteRegion.chrom, autocompleteRegion.start, autocompleteRegion.stop)
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
  const dataRef = useRef(data)
  useEffect(() => {
    dataRef.current = data
  }, [data])

  function onData(payload) {
    setData(payload)
  }

  // // when in layer suggestion mode, this function will update the
  // // layer order based on the current viewable data
  // let LayerSuggestionMode = true
  // useMemo(() => {
  //   if(LayerSuggestionMode) {
  //     LayerSuggestion(data, layerOrder, setLayerOrder, [
  //       DHS_Components_Sfc_max,
  //       Chromatin_States_Sfc_max,
  //       TF_Motifs_Sfc_max,
  //       Repeats_Sfc_max
  //     ])
  //   }
  // }, [data])


  const [trackState, setTrackState] = useState(data)
  const [tracks, setTracks] = useState([])
  const [tracksLoading, setTracksLoading] = useState(false)
  const [stations, setStations] = useState([])
  // setter for tracks array

  // console.log("tracks?", trackMinus1, trackPlus1)

  // this debounced function fetches the data and updates the state
  const fetchLayerData = useMemo(() => {
    const dataClient = Data({ 
      debug: false
    })
    return (layer, order, bbox, key, setter) => {
      // we dont want to fetch data if the order is not within the layer order range
      if (order < layer.orders[0] || order > layer.orders[1]) return;

      let hilbert = HilbertChromosome(order, { padding: 2 })
      let points = hilbert.fromBbox(bbox) 

      let myPromise = dataClient.fetchData(layer, order, points)
      let myCallback = (data) => {
        // console.log("got data", data, order)
        if(data) {
          setter({ data, layer, order})
        }
      }
      // debounce a function call with a name to make sure no collisions
      // collision would be accidentally debouncing a different data call because we reuse this function
      debounceNamed(myPromise, myCallback, 50, key+":"+layer.name+":"+order) // layer.name + order makes unique call 
    }
  }, []);

  // When data or selected changes, we want to update the tracks
  useEffect(() => {
    if(!dataRef.current) return
    if(isZooming) return;
    const minOrder = Math.max(layerRef.current.orders[0], dataRef.current.order - 5)
    let promises = range(minOrder, dataRef.current.order).map(order => {
      return new Promise((resolve) => {
        fetchLayerData(layerRef.current, order, dataRef.current.bbox, "pyramid", (response) => {
          resolve(response)
        })
      })
    })
    // if(isZooming) setTracksLoading(true)
    Promise.all(promises).then((responses) => {
      setTrackState(dataRef.current)
      setTracks(responses)
      setTracksLoading(false)
    })
  // make sure this updates only when the data changes
  // the pyramid will lag behind a little bit but wont make too many requests
  }, [zoom, data, isZooming, fetchLayerData]) 

  // When data or selected changes, we want to update the zoom legend
  let updateStations = useCallback((hit) => {
    // console.log("updating stations", dataRef.current, hit)
    if(!dataRef.current) return
    if(!hit) return
    debounceTimed(() => { 
      // console.log("actually updating", layerLockRef.current, layerRef.current)
      let promises = range(4, dataRef.current.order).map(order => {
        return new Promise((resolve) => {
          // get the layer at this order
          let orderLayer = layerLockRef.current ? layerRef.current : layerOrderRef.current[order]
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
          fetchLayerData(orderLayer, order, bbox, "station", (response) => {
            // get the appropriate datum by looking at the corresponding hilbert pos from the selected.start
            let pos = hilbertPosToOrder(hit.start, { from: orderDomain[1], to: order })
            let point = hilbert.get2DPoint(pos, hit.chromosome)
            let datum = response.data.find(d => d.i == point.i)
            // console.log("pos", pos, "point", point, "datum", datum)
            resolve({ layer: orderLayer, station: datum })
          })
        })
      })
      return Promise.all(promises)
    }, (responses) => setStations(responses), 150)
  }, [dataRef, setStations, fetchLayerData, orderDomain])

  useEffect(() => {
    updateStations(selected)
  }, [updateStations, selected, data]) 

  return (
    <>
      <div className="primary-grid">
        {/* header row */}
        <div className="header">
          <div className="header--brand">
            <GilbertLogo height="50" width="auto" />
          </div>
          <div className="header--narration">
            <SelectedModalNarration
              selectedNarration={selectedNarration}
            />
          </div>
          <div className="header--search">
            <Autocomplete
              onChangeLocation={handleChangeLocationViaAutocomplete}
            />
          </div>
        </div>
        <div className="lensmode">
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
        {/* primary content */}
        <div className="visualization">
          <LayerLegend 
            data={data}
            hover={hover}
            selected={selected}
            handleFactorClick={handleFactorClick}
            searchByFactorInds={searchByFactorInds}
          />
          {selected ? 
              <SelectedModal 
                selected={selected} 
                onZoom={() => { setRegion(null); setRegion(selected)}}
                onClose={handleModalClose}
                >
            <SelectedModalSimSearch
              simSearch={simSearch}
              searchByFactorInds={searchByFactorInds}
              handleFactorClick={handleFactorClick}
              onZoom={(region) => { 
                setRegion(null); 
                const hit = fromPosition(region.chromosome, region.start, region.end)
                setRegion(hit)}}
              selectedOrder={selectedOrder}
              setRegion={setRegion}
              setHover={setHover}
            />
            </SelectedModal> : null}
            <div ref={containerRef} className="hilbert-container">
              {containerRef.current && ( 
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
                    ...DisplayedExampleRegions({
                      exampleRegions: exampleRegions,
                      hilbert: HilbertChromosome(zoom.order),
                      checkRanges: checkRanges,
                      width: 0.2,
                      color: "red",
                      numRegions: 100,
                    }),
                    showGenes && SVGGenePaths({ stroke: "black", strokeWidthMultiplier: 0.1, opacity: 0.25}),
                  ]}
                  onZoom={handleZoom}
                  onHover={handleHover}
                  onClick={handleClick}
                  onData={onData}
                  onZooming={(d) => setIsZooming(d.zooming)}
                  // onLayer={handleLayer}
                  debug={showDebug}
                />
              )}
            </div>
          </div>
          <div className="lenses">
            
            <div className='layer-column'>
              <div className="zoom-legend-container">
                {containerRef.current && (
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
                    selected={selected || hover}
                    crossScaleNarration={crossScaleNarration}
                    onZoom={(region) => { 
                      setRegion(null); 
                      const hit = fromPosition(region.chromosome, region.start, region.end)
                      setRegion(hit)}}
                    setLayer={setLayer}
                    setLayerOrder={setLayerOrder}
                  />
                )}
            </div>
          </div>
        </div>
        <div className='footer'>
          <div className='footer-row'>
            <div className='linear-tracks'>
              <TrackPyramid
                state={trackState} 
                tracks={tracks}
                tracksLoading={isZooming || tracksLoading}
                width={width * 1.0}
                height={100}
                segment={!showGaps}
                hovered={lastHover} 
                selected={selected} 
                setHovered={handleHover} 
              ></TrackPyramid>
            </div>
          </div>
          <StatusBar 
            width={width + 12 + 30} 
            hover={hover} // the information about the cell the mouse is over
            layer={layer} 
            zoom={zoom} 
            showDebug={showDebug}
            showSettings={showSettings}
            orderOffset={orderOffset}
            onLayer={handleLayer}
            layers={layers} 
            onDebug={handleChangeShowDebug}
            onSettings={handleChangeShowSettings}
            onOrderOffset={setOrderOffset}
          />
          { showSettings ? <SettingsPanel 
            regionset={regionset}
            showHilbert={showHilbert}
            showGenes={showGenes}
            duration={duration}
            pathCSN={pathCSN}
            onRegionSetChange={(name, set) => {
              console.log("name, set", name, set)
              if(set) {
                setRegionSet(name)
              } else {
                setRegionSet('')
              }
            }}
            onShowHilbertChange={handleChangeShowHilbert}
            onShowGenesChange={handleChangeShowGenes}
            onDurationChange={handleChangeDuration}
            onPathCSNChange={handleChangePathCSN}
          /> : null }
        </div>
      </div>
    </>
  )
}

export default Home
