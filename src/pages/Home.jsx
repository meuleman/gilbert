import {useEffect, useState, useRef, useCallback, useMemo} from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'

import Data from '../lib/data';
import { urlify, jsonify, fromPosition, fromCoordinates } from '../lib/regions'
import { HilbertChromosome, checkRanges } from '../lib/HilbertChromosome'
import { debounceNamed, debouncerTimed } from '../lib/debounce'
import { calculateCrossScaleNarration, narrateRegion } from '../lib/csn'
import { range } from 'd3-array'

import './Home.css'

import LogoNav from '../components/LogoNav';
// base component
import HilbertGenome from '../components/HilbertGenome'
// rendering components
import SVGHilbertPaths from '../components/SVGHilbertPaths'
import SVGGenePaths from '../components/SVGGenePaths'
import ZoomLegend from '../components/ZoomLegend'
// import LinearTracks from '../components/LinearTracks'
// import TrackPyramid from '../components/TrackPyramid'
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
import layers from '../layers'
// CSN layers
import DHS_Components_Sfc_max from '../layers/dhs_components_sfc_max'
import Chromatin_States_Sfc_max from '../layers/chromatin_states_sfc_max';
import TF_Motifs_Sfc_max from '../layers/tf_motifs_sfc_max'
import Repeats_Sfc_max from '../layers/repeats_sfc_max'
import Variants_Categorical from '../layers/variants_categorical'

import RegionFilesSelect from '../components/Regions/RegionFilesSelect'
// autocomplete
import Autocomplete from '../components/Autocomplete/Autocomplete'


// region SimSearch
import SimSearchRegion from '../components/SimSearch/SimSearchRegion'
import SimSearchByFactor from '../components/SimSearch/SimSearchByFactor'

import DisplaySimSearchRegions from '../components/SimSearch/DisplaySimSearchRegions'
import DisplayedExampleRegions from '../components/ExampleRegions/DisplayExampleRegions';

import { getSet } from '../components/Regions/localstorage'
import SelectedModal from '../components/SelectedModal'
import SimSearchResultList from '../components/SimSearch/ResultList'
import GenesetEnrichment from '../components/SimSearch/GenesetEnrichment';
// import Spectrum from '../components/Spectrum';

import RegionStrip from '../components/RegionStrip'


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

  const [layerOrderNatural, setLayerOrderNatural] = useState(null)
  const [layerOrder, setLayerOrder] = useState(null)
  const layerOrderRef = useRef(layerOrder)
  useEffect(() => {
    if(layerOrderNatural){
      setLayerOrder(layerOrderNatural)
      layerOrderRef.current = layerOrderNatural
    }
  }, [layerOrderNatural])
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
  const [layer, setLayer] = useState(layers[0])
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
  }, [setZoom, setLayer])


    // selected powers the sidebar modal and the 1D track
  const [selected, setSelected] = useState(jsonify(initialSelectedRegion))
  const [selectedOrder, setSelectedOrder] = useState(selected?.order)
  const [simSearch, setSimSearch] = useState(null)
  const [similarRegions, setSimilarRegions] = useState([])
  // const [simSearchDetailLevel, setSimSearchDetailLevel] = useState(null)
  const [simSearchMethod, setSimSearchMethod] = useState(null)
  const [selectedNarration, setSelectedNarration] = useState(null)
  const [crossScaleNarration, setCrossScaleNarration] = useState(new Array(1).fill({'path': []}))
  const [crossScaleNarrationIndex, setCrossScaleNarrationIndex] = useState(0)
  const [csnMethod, setCsnMethod] = useState("sum")
  const [genesetEnrichment, setGenesetEnrichment] = useState(null)

  const selectedRef = useRef(selected);
  useEffect(() => {
    selectedRef.current = selected;
  }, [selected]);

  useEffect(() => {
    if(!initialSelectedRegion) {
      // TODO: need a reliable way to clear state when deselecting a region
      setSelected(null)
      setSimilarRegions([])
      setGenesetEnrichment(null)
      setCrossScaleNarration([])
    }
  }, [initialSelectedRegion])

   // the hover can be null or the data in a hilbert cell
  const [hover, setHover] = useState(null)
  const [lastHover, setLastHover] = useState(null)
  // for when a region is hovered in the similar region list
  const [similarRegionListHover, setSimilarRegionListHover] = useState(null)

  // changing the region changes the zoom and will also highlight on the map
  const [region, setRegion] = useState(jsonify(initialSelectedRegion))
  // number state for orderOffset
  const [orderOffset, setOrderOffset] = useState(0)

  const [data, setData] = useState(null)
  const dataRef = useRef(data)
  useEffect(() => {
    dataRef.current = data
  }, [data])

  const [trackState, setTrackState] = useState(data)
  const [tracks, setTracks] = useState([])
  const [tracksLoading, setTracksLoading] = useState(false)

  const [searchByFactorInds, setSearchByFactorInds] = useState([])

  const processSimSearchResults = useCallback((order, result) => {
    setSimSearch(result)
    let similarRegions = result?.simSearch
    if(similarRegions && similarRegions.length)  {
      const similarRanges = similarRegions.map((d) => {
        return fromCoordinates(d.coordinates)
      })
      // console.log("similar regions", similarRegions)
      // console.log("similar ranges", similarRanges)

      setSimilarRegions(similarRanges)
    } else {
      setSimilarRegions([])
      setSelected(null)
    }
  }, [setSimSearch, setSimilarRegions, setSelected])

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


  const handleClick = useCallback((hit, order, double) => {
    // console.log("app click handler", hit, order, double)
    try {
      if(hit === selected) {
        setSelected(null) 
        setSelectedOrder(null)
        setSimSearch(null)
      } else if(hit) {
        console.log("setting selected from click", hit)
        setSelected(hit)
        setSelectedOrder(order)
      }
    } catch(e) {
      console.log("caught error in click", e)
    }
  }, [selected, setSelected, setSelectedOrder, setSimSearch])

  // do a sim search if selected changes
  useEffect(() => {
    if(selected){
      // console.log("selected changed", selected, layer.name)
      SimSearchRegion(selected, selected.order, layer, setSearchByFactorInds, []).then((regionResult) => {
        // console.log("sim searchregion results", selected, layer.name, regionResult)
        if(!regionResult || !regionResult.simSearch) return;
        processSimSearchResults(selected.order, regionResult)
        GenesetEnrichment(regionResult.simSearch.slice(1), selected.order).then((enrichmentResult) => {
          setGenesetEnrichment(enrichmentResult)
        })
        setSimSearchMethod("Region")
      }).catch(e => {
        console.log("caught error in sim search", e)
        setSimSearch(null)
        setSimilarRegions([])
      })
      narrateRegion(selected, selected.order).then((narrationResult) => {
        narrationResult && setSelectedNarration(narrationResult.narrationRanks)
      })
    }
  }, [selected, layer, setSearchByFactorInds, processSimSearchResults, setGenesetEnrichment, setSimSearchMethod, setSelectedNarration])

  

  const updateUrlParams = useCallback((newRegionSet, newSelected) => {
    const params = new URLSearchParams();
    if (newRegionSet) params.set('regionset', newRegionSet);
    if (newSelected) params.set('region', urlify(newSelected));
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

  // cross scale narration
  const handleChangeCSNIndex = (e) => setCrossScaleNarrationIndex(e.target.value)
  // function to handle the change of the method in which CSN paths are scored
  const handleCsnMethodChange = (e) => setCsnMethod(e.target.value)
  // function to subset our CSN results to just unique paths
  function findUniquePaths(paths) {
    const uniquePaths = []
    const seenPaths = new Map()

    // initialize each order to null
    let initialEmptyPathObj = {}
    const orders = [4, 14]
    for (let i = orders[0]; i <= orders[1]; i++) initialEmptyPathObj[i] = null;
    
    // filter paths
    paths.forEach(path => {
      // Convert path to a string to use as a map key
      let pathStripped = { ...initialEmptyPathObj }
      path.path.forEach((d) => {if(d !== null) pathStripped[d.order] = d.field.field})
      const pathKey = JSON.stringify(pathStripped)
      if (!seenPaths.has(pathKey)) {
        uniquePaths.push(path)
        seenPaths.set(pathKey, true)
      }
    })
    return uniquePaths
  }
  useEffect(() => {
    setCrossScaleNarrationIndex(0)
    if(selected){
      calculateCrossScaleNarration(selected, csnMethod, [
        DHS_Components_Sfc_max,
        Chromatin_States_Sfc_max,
        TF_Motifs_Sfc_max,
        Repeats_Sfc_max,
      ], [Variants_Categorical]).then(crossScaleResponse => {
        // filter to just unique paths
        const filteredPaths = findUniquePaths(crossScaleResponse.paths).slice(0, 100)
        setCrossScaleNarration(filteredPaths)
      })
    } else {
      // we set the layer order back to non-CSN if no selected region
      if(layerOrderNatural && layerOrderNatural[zoomRef.current.order]) {
        setLayerOrder(layerOrderNatural)
        setLayer(layerOrderNatural[zoomRef.current.order])
      }
    }
  }, [selected, csnMethod])  // layerOrderNatural

  const [csn, setCsn] = useState([])
  useEffect(() => {
    if(crossScaleNarration?.length) {
      let newCsn = crossScaleNarration[crossScaleNarrationIndex]
      newCsn.path = newCsn.path.filter(d => !!d).sort((a,b) => a.order - b.order)
      setCsn(newCsn)
      // we update the layer order and layer
      if(selected) {
        let newLayerOrder = Object.assign({}, layerOrderRef.current)
        newCsn.path.forEach(d => {
          newLayerOrder[d?.order] = d?.layer
        })
        if(newLayerOrder[selected.order] && !layerLockRef.current){
          layerOrderRef.current = newLayerOrder // this is so that handleZoom uses most up to date in race condition
          setLayerOrder(newLayerOrder)
          setLayer(newLayerOrder[selected.order])
        }
      }
    }
  }, [selected, crossScaleNarrationIndex, crossScaleNarration])

  
  const handleHover = useCallback((hit, similarRegionList=false) => {
    // if(hit && !selectedRef.current) {}
    if(similarRegionList) {
      setSimilarRegionListHover(hit)
    }
    setHover(hit)
    if(hit) setLastHover(hit)
  }, [setSimilarRegionListHover, setHover])


 
  const handleFactorClick = useCallback((newSearchByFactorInds) => {
    console.log("HANDLE FACTOR CLICK", newSearchByFactorInds, simSearchMethod)
    setSearchByFactorInds(newSearchByFactorInds)
    if(newSearchByFactorInds.length > 0) {
      if(simSearchMethod != "Region") {
        SimSearchByFactor(newSearchByFactorInds, zoom.order, layer).then((SBFResult) => {
          setSelected(null)
          setSelectedNarration(null)
          setSelectedOrder(zoom.order)
          processSimSearchResults(zoom.order, SBFResult)
          setSimSearchMethod("SBF")
          GenesetEnrichment(SBFResult.simSearch, zoom.order).then((enrichmentResult) => {
            setGenesetEnrichment(enrichmentResult)
          })
        })
      } else if(simSearchMethod == "Region") {
        SimSearchRegion(selected, selected.order, layer, setSearchByFactorInds, newSearchByFactorInds, simSearchMethod).then((regionResult) => {
          processSimSearchResults(selected.order, regionResult)
          console.log("REGION RESULT", regionResult)
          GenesetEnrichment(regionResult.simSearch.slice(1), zoom.order).then((enrichmentResult) => {
            setGenesetEnrichment(enrichmentResult)
          })
        })
      }
    } else {
      // clear the sim search
      processSimSearchResults(zoom.order, {simSearch: null, factors: null, method: null, layer: null})
      setSimSearchMethod(null)
    }
  }, [selected, zoom, setSearchByFactorInds, processSimSearchResults, setGenesetEnrichment, simSearchMethod, setSelected, setSelectedNarration, setSelectedOrder, layer])

  const handleModalClose = useCallback(() => {
    setRegion(null)
    setSelected(null)
    setSelectedOrder(null)
    setSimSearch(null)
    setSearchByFactorInds([])
    setSimilarRegions([])
    setSelectedNarration(null)
    setSimSearchMethod(null)
    setGenesetEnrichment(null)
    setCrossScaleNarrationIndex(0)
    setCrossScaleNarration(new Array(1).fill({'path': []}))
  }, [setRegion, setSelected, setSelectedOrder, setSimSearch, setSearchByFactorInds, setSimilarRegions, setSelectedNarration, setSimSearchMethod, setGenesetEnrichment, setCrossScaleNarration])

  const autocompleteRef = useRef(null)
  // keybinding that closes the modal on escape
  useEffect(() => {
    function handleKeyDown(e) {
      if(e.key === "Escape") {
        handleModalClose()
      }
      if(e.key == "/") {
        if(autocompleteRef.current) {
          autocompleteRef.current.applyFocus()
        }
      }
    }
    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    }
  }, [handleModalClose])

  
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

  

  const handleChangeLocationViaAutocomplete = useCallback((autocompleteRegion) => {
    if (!autocompleteRegion) return
    // console.log(`autocompleteRegion ${JSON.stringify(autocompleteRegion)}`);
    console.log("autocomplete", autocompleteRegion)

    const hit = fromPosition(autocompleteRegion.chrom, autocompleteRegion.start, autocompleteRegion.stop)
    hit.data = {}
    hit.description = {
      type: autocompleteRegion.type,
      name: autocompleteRegion.name
    }
    console.log("autocomplete hilbert region", hit)
    setRegion(hit)
    setSelected(hit)
  }, [setRegion, setSelected])

  
  const onData = useCallback((payload) => {
    setData(payload)
  }, [setData])

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


 // setter for tracks array

  // console.log("tracks?", trackMinus1, trackPlus1)

  



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

  return (
    <>
      <div className="primary-grid">
        {/* header row */}
        <div className="header">
          <div className="header--brand">
            <LogoNav/>
          </div>
          <div className="header--region-list">
            <RegionFilesSelect selected={regionset} onSelect={(name, set) => {
              if(set) { setRegionSet(name) } else { setRegionSet('') }
            }} />
          </div>
          <div className="header--search">
            <Autocomplete
              ref={autocompleteRef}
              onChangeLocation={handleChangeLocationViaAutocomplete}
            />
          </div>
        </div>
        <div className="lensmode">
          <LensModal
              layers={layers}
              currentLayer={layer}
              setLayerOrder={useCallback((lo) => {
                console.log("LO lensmodal ", lo)
                setLayerOrderNatural(lo)
              }, [setLayerOrderNatural])}
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
                csn={csn}
                onZoom={(region) => { setRegion(null); setRegion(region)}}
                onClose={handleModalClose}
                >
                  <SimSearchResultList
                    simSearch={simSearch}
                    zoomRegion={region}
                    searchByFactorInds={searchByFactorInds}
                    onFactorClick={handleFactorClick}
                    onZoom={(region) => { 
                      const hit = fromPosition(region.chromosome, region.start, region.end)
                      setRegion(null); 
                      setRegion(hit)}}
                    onHover={setHover}
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
                    SVGSelected({ hit: hover, dataOrder: zoom.order, stroke: "black", highlightPath: true, type: "hover", strokeWidthMultiplier: 0.1, showGenes }),
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
                    selected={selected}
                    hovered={hover}
                    crossScaleNarration={csn}
                    onZoom={(region) => { 
                      setRegion(null); 
                      const hit = fromPosition(region.chromosome, region.start, region.end)
                      setRegion(hit)
                      // setSelected(hit)
                    }}
                  />
                )}
            </div>
          </div>
        </div>
        <div className='footer'>
          <div className='footer-row'>
            <div className='linear-tracks'>
              {selected  && <RegionStrip region={selected} segments={100} layer={layer} width={width} height={40} /> }
              {hover && <RegionStrip region={hover} segments={100} layer={layer} width={width} height={40} /> }
              {/* <TrackPyramid
                state={trackState} 
                tracks={tracks}
                tracksLoading={isZooming || tracksLoading}
                width={width * 1.0}
                height={100}
                segment={!showGaps}
                hovered={lastHover} 
                selected={selected} 
                setHovered={handleHover} 
              ></TrackPyramid> */}
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
            layers={layers} 
            onDebug={handleChangeShowDebug}
            onSettings={handleChangeShowSettings}
            onOrderOffset={setOrderOffset}
          />
          { showSettings ? <SettingsPanel 
            showHilbert={showHilbert}
            showGenes={showGenes}
            duration={duration}
            onShowHilbertChange={handleChangeShowHilbert}
            onShowGenesChange={handleChangeShowGenes}
            onDurationChange={handleChangeDuration}
            handleChangeCSNIndex={handleChangeCSNIndex}
            maxCSNIndex={crossScaleNarration.length - 1}
            crossScaleNarrationIndex={crossScaleNarrationIndex}
            csnMethod={csnMethod}
            handleCsnMethodChange={handleCsnMethodChange}
          /> : null }
        </div>
      </div>
    </>
  )
}

export default Home
