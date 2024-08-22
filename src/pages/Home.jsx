import {useEffect, useState, useRef, useCallback, useMemo, useContext } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'

// import FiltersProvider from '../components/ComboLock/FiltersProvider'
import FiltersContext from '../components/ComboLock/FiltersContext'

import Data from '../lib/data';
import { urlify, jsonify, fromPosition, fromCoordinates } from '../lib/regions'
import { HilbertChromosome, checkRanges, hilbertPosToOrder } from '../lib/HilbertChromosome'
import { debounceNamed, debouncerTimed } from '../lib/debounce'
import { fetchTopCSNs, rehydrateCSN, calculateCrossScaleNarrationInWorker, narrateRegion, retrieveFullDataForCSN } from '../lib/csn'
import { fetchFilterSegments } from '../lib/dataFiltering';
import { calculateOrderSums, urlifyFilters, parseFilters } from '../lib/filters'
import { range, groups, group } from 'd3-array'

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
// import FilterModal from '../components/ComboLock/FilterModal'
import SelectFactorPreview from '../components/ComboLock/SelectFactorPreview'
import FilterSelects from '../components/ComboLock/FilterSelects'

import SankeyModal from '../components/Narration/SankeyModal';

// layer configurations
import { fullList as layers, csnLayers, variantLayers, countLayers } from '../layers'

import RegionFilesSelect from '../components/Regions/RegionFilesSelect'
// autocomplete
import Autocomplete from '../components/Autocomplete/Autocomplete'


// region SimSearch
import SimSearchRegion from '../components/SimSearch/SimSearchRegion'
import SimSearchByFactor from '../components/SimSearch/SimSearchByFactor'

import DisplaySimSearchRegions from '../components/SimSearch/DisplaySimSearchRegions'
import DisplayExampleRegions from '../components/ExampleRegions/DisplayExampleRegions';
import DisplayFilteredRegions from '../components/ComboLock/DisplayFilteredRegions';
import useCanvasFilteredRegions from '../components/ComboLock/CanvasFilteredRegions';

import { getSet } from '../components/Regions/localstorage'
import SelectedModal from '../components/SelectedModal'
import InspectorGadget from '../components/InspectorGadget'
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
  const initialFilters = queryParams.get('filters')
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

  const { filters, setFilters, clearFilters } = useContext(FiltersContext);
  const initialUpdateRef = useRef(true);
  useEffect(() => {
    if(initialUpdateRef.current) {
      console.log("INITIAL FILTERS", initialFilters)
      setFilters(parseFilters(initialFilters || "[]"))
      initialUpdateRef.current = false
    }
  }, [initialFilters, setFilters])


  const [scales, setScales] = useState(null)
  const [modalPosition, setModalPosition] = useState({x: 0, y: 0})
  useEffect(() => {
    const calculateModalPosition = () => {
      if (!selected || !zoom || !zoom.transform || !scales) return { x: 0, y: 0 };

      const { k, x, y } = zoom.transform;
      const selectedX = scales.xScale(selected.x) * k + x;
      const selectedY = scales.yScale(selected.y) * k + y;

      return { x: selectedX, y: selectedY };
    };

    setModalPosition(calculateModalPosition());
    // setModalPosition(showPosition(selected))
  }, [selected, zoom, scales])


  const [simSearch, setSimSearch] = useState(null)
  const [similarRegions, setSimilarRegions] = useState([])
  // const [simSearchDetailLevel, setSimSearchDetailLevel] = useState(null)
  const [simSearchMethod, setSimSearchMethod] = useState(null)
  const [selectedNarration, setSelectedNarration] = useState(null)
  const [crossScaleNarration, setCrossScaleNarration] = useState(new Array(1).fill({'path': []}))
  const [crossScaleNarrationIndex, setCrossScaleNarrationIndex] = useState(0)
  const [csnMethod, setCsnMethod] = useState("sum")
  const [csnEnrThreshold, setCsnEnrThreshold] = useState(0)
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

  // const [trackState, setTrackState] = useState(data)
  // const [tracks, setTracks] = useState([])
  // const [tracksLoading, setTracksLoading] = useState(false)

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
  // const fetchLayerData = useMemo(() => {
  //   const dataClient = Data({ 
  //     debug: false
  //   })
  //   return (layer, order, bbox, key, setter) => {
  //     // we dont want to fetch data if the order is not within the layer order range
  //     if (order < layer.orders[0] || order > layer.orders[1]) return;

  //     let hilbert = HilbertChromosome(order, { padding: 2 })
  //     let points = hilbert.fromBbox(bbox) 

  //     let myPromise = dataClient.fetchData(layer, order, points)
  //     let myCallback = (data) => {
  //       // console.log("got data", data, order)
  //       if(data) {
  //         setter({ data, layer, order})
  //       }
  //     }
  //     // debounce a function call with a name to make sure no collisions
  //     // collision would be accidentally debouncing a different data call because we reuse this function
  //     debounceNamed(myPromise, myCallback, 50, key+":"+layer.name+":"+order) // layer.name + order makes unique call 
  //   }
  // }, []);


  

  // do a sim search if selected changes
  // useEffect(() => {
  //   if(selected){
  //     // console.log("selected changed", selected, layer.name)
  //     SimSearchRegion(selected, selected.order, layer, setSearchByFactorInds, []).then((regionResult) => {
  //       // console.log("sim searchregion results", selected, layer.name, regionResult)
  //       if(!regionResult || !regionResult.simSearch) return;
  //       processSimSearchResults(selected.order, regionResult)
  //       GenesetEnrichment(regionResult.simSearch.slice(1), selected.order).then((enrichmentResult) => {
  //         setGenesetEnrichment(enrichmentResult)
  //       })
  //       setSimSearchMethod("Region")
  //     }).catch(e => {
  //       console.log("caught error in sim search", e)
  //       setSimSearch(null)
  //       setSimilarRegions([])
  //     })
  //     narrateRegion(selected, selected.order).then((narrationResult) => {
  //       narrationResult && setSelectedNarration(narrationResult.narrationRanks)
  //     })
  //   }
  // }, [selected, layer, setSearchByFactorInds, processSimSearchResults, setGenesetEnrichment, setSimSearchMethod, setSelectedNarration])

  

  const updateUrlParams = useCallback((newRegionSet, newSelected, newFilters) => {
    const params = new URLSearchParams();
    if (newRegionSet) params.set('regionset', newRegionSet);
    if (newSelected) params.set('region', urlify(newSelected));
    if (newFilters) params.set('filters', urlifyFilters(newFilters));
    navigate({ search: params.toString() }, { replace: true });
  }, [navigate]);

  const [regionset, setRegionSet] = useState(initialRegionset)
  const [exampleRegions, setExampleRegions] = useState([])
  useEffect(() => {
    const set = getSet(regionset)
    if(set) {
      setExampleRegions(set)
    }
    if (!initialUpdateRef.current) {
      updateUrlParams(regionset, selected, filters)
    }
  }, [regionset, selected, filters, setExampleRegions, updateUrlParams])
  useEffect(() => {
    if (!initialUpdateRef.current) { // Only update URL params if not the initial update
      updateUrlParams(regionset, selected, filters);
    }
  }, [filters, regionset, selected, updateUrlParams]);

  // cross scale narration
  const handleChangeCSNIndex = (e) => setCrossScaleNarrationIndex(e.target.value)
  // function to handle the change of the method in which CSN paths are scored
  const handleCsnMethodChange = (e) => setCsnMethod(e.target.value)
  // function to change the ENR threshold for CSN
  const handleCsnEnrThresholdChange = (e) => setCsnEnrThreshold(e.target.value)

  useEffect(() => {
    // setCrossScaleNarrationIndex(0)
    
    if(selected && selected.order > 4){
      // clear the cross scale narration first
      // setCrossScaleNarration([])
      // setCsn({path: [], layers: csnLayers})
      // setLoadingCSN(true)

      // calculateCrossScaleNarrationInWorker(selected, csnMethod, csnEnrThreshold, csnLayers, variantLayers, countLayers).then(crossScaleResponse => {
      //   // filter to just unique paths
      //   const filteredPaths = findUniquePaths(crossScaleResponse.paths).slice(0, 100)
      //   console.log("CLIENT CSN: filteredPaths", filteredPaths)
      //   // setFullCSNPaths(crossScaleResponse.paths)
      //   // setCrossScaleNarration(filteredPaths)
      //   // setLoadingCSN(false)
      // })

    } else {
      // we set the layer order back to non-CSN if no selected region
      // if(layerOrderNatural && layerOrderNatural[zoomRef.current.order]) {
      //   setLayerOrder(layerOrderNatural)
      //   setLayer(layerOrderNatural[zoomRef.current.order])
      // }
      // console.log("else selected")
    }
  }, [selected, csnMethod, csnEnrThreshold])  // layerOrderNatural

  const [csn, setCsn] = useState({path: [], layers: csnLayers})
  useEffect(() => {
    if(crossScaleNarration?.length) {
      console.log("updated CSN?", crossScaleNarration)
      let newCsn = crossScaleNarration[crossScaleNarrationIndex]
      newCsn.path = newCsn.path.filter(d => !!d).sort((a,b) => a.order - b.order)
      newCsn.layers = csnLayers
      setCsn(newCsn)
      // we update the layer order and layer
      // TODO: if we want to update the layer order based on the csn, we can uncomment this
      // if(selected) {
      //   let newLayerOrder = Object.assign({}, layerOrderRef.current)
      //   newCsn.path.forEach(d => {
      //     newLayerOrder[d?.order] = d?.layer
      //   })
      //   if(newLayerOrder[selected.order] && !layerLockRef.current){
      //     layerOrderRef.current = newLayerOrder // this is so that handleZoom uses most up to date in race condition
      //     setLayerOrder(newLayerOrder)
      //     setLayer(newLayerOrder[selected.order])
      //   }
      // }
    } else {
      setCsn({path: [], layers: csnLayers})
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

  
  const [showHilbert, setShowHilbert] = useState(false)
  const handleChangeShowHilbert = (e) => {
    setShowHilbert(!showHilbert)
  }

  // const [showFilter, setShowFilter] = useState(false)
  // if we have filters in the url, show the filter modal on loading
  const anyFilters = Object.keys(parseFilters(initialFilters || "[]")).length > 0
  const [showFilter, setShowFilter] = useState(anyFilters)
  const handleChangeShowFilter = (e) => {
    setShowFilter(!showFilter)
  }


  const [showDebug, setShowDebug] = useState(false)
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
    console.log("data payload", payload)
    setData(payload)
  }, [setData])


  const [powerOrder, setPowerOrder] = useState(zoom.order + 0.5)

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
  // useEffect(() => {
  //   if(!dataRef.current) return
  //   if(isZooming) return;
  //   const minOrder = Math.max(layerRef.current.orders[0], dataRef.current.order - 5)
  //   let promises = range(minOrder, dataRef.current.order).map(order => {
  //     return new Promise((resolve) => {
  //       fetchLayerData(layerRef.current, order, dataRef.current.bbox, "pyramid", (response) => {
  //         resolve(response)
  //       })
  //     })
  //   })
  //   // if(isZooming) setTracksLoading(true)
  //   Promise.all(promises).then((responses) => {
  //     setTrackState(dataRef.current)
  //     setTracks(responses)
  //     setTracksLoading(false)
  //   })
  // // make sure this updates only when the data changes
  // // the pyramid will lag behind a little bit but wont make too many requests
  // }, [zoom, data, isZooming, fetchLayerData]) 


  // const [filters, setFilters] = useState([])


  const orderSums = useMemo(() => {
    return calculateOrderSums()
  }, [])
  const [filteredIndices, setFilteredIndices] = useState([])
  const [factorPreviewField, setFactorPreviewField] = useState(null)
  const [factorPreviewValues, setFactorPreviewValues] = useState(null)
  // const [filteredRegions, setFilteredRegions] = useState([])
  // const [rbos, setRbos] = useState({}) // regions by order
  const [numPaths, setNumPaths] = useState(100)
  const [topFullCSNS, setTopFullCSNS] = useState([])
  const [topFactorCSNS, setTopFactorCSNS] = useState([])
  const [selectedTopCSN, setSelectedTopCSN] = useState(null)
  const [csnLoading, setCSNLoading] = useState("")
  const [filterLoading, setFilterLoading] = useState("")
  const [hoveredTopCSN, setHoveredTopCSN] = useState(null)
  const [csnSort, setCSNSort] = useState("factor")
  const [regionCSNS, setRegionCSNS] = useState([])
  const [filteredSegments, setFilteredSegments] = useState([])
  const filterRequestRef = useRef(0)


  // fetch the segments with enrichments for filter factors
  useEffect(() => {
    console.log("filters changed in home!!", filters)
    filterRequestRef.current += 1
    const currentRequest = filterRequestRef.current

    let nfs = Object.keys(filters).length
    setFilterLoading("fetching")
    // Fetch the filter segments from the API
    if(nfs > 0) {
      fetchFilterSegments(filters)
        .then((response) => {
        console.log("FILTER RESPONSE", response)
        if(!response) {
          setFilterLoading("Error!")
          setFilteredSegments([])
          return
        }
        if(currentRequest == filterRequestRef.current) {
          setFilteredSegments(response.filtered_segments)
          setFilterLoading("")
        }
      }).catch((e) => {
        console.log("error fetching top factor csns", e)
        setFilterLoading("Error!")
        setFilteredSegments([])
      })
    } else {
      setFilteredSegments([])
    }
  }, [filters])

  // // fetch the top csns, both by full path score and by filtered factor scores
  // useEffect(() => {
  //   console.log("filters changed in home!!", filters)
  //   csnRequestRef.current += 1
  //   const currentRequest = csnRequestRef.current
  //   if(Object.keys(filters).length == 0 && !selected) {
  //     setTopFactorCSNS([])
  //     setTopFullCSNS([])
  //     return
  //   }
  //   // TODO: should this be more wholistically done somewhere else?
  //   if(selected) {
  //     setShowFilter(true)
  //   }

  //   let nfs = Object.keys(filters).length
  //   setCSNLoading("fetching")
  //   // Fetch the top csns from the API
  //   if(nfs > 0) {
  //     fetchTopCSNs(filters, selected, "factor", true, numPaths)
  //       .then((response) => {
  //       console.log("FACTOR RESPONSE", response)
  //       if(!response) {
  //         setCSNLoading("Error!")
  //         setTopFactorCSNS([])
  //         return
  //       }
  //       if(currentRequest == csnRequestRef.current) {
  //         let hydrated = response.csns.map(csn => rehydrateCSN(csn, [...csnLayers, ...variantLayers]))
  //         hydrated.forEach(d => d.scoreType = "factor")
  //         setTopFactorCSNS(hydrated)
  //         setCSNLoading("")
  //       }
  //     }).catch((e) => {
  //       console.log("error fetching top factor csns", e)
  //       setCSNLoading("Error!")
  //       setTopFactorCSNS([])
  //     })
  //   } else {
  //     setTopFactorCSNS([])
  //   }
  //   // for now we just pull both in parallel
  //   fetchTopCSNs(filters, selected, "full", true, numPaths)
  //     .then((response) => {
  //       console.log("FULL RESPONSE", response)
  //       if(!response) {
  //         // setCSNLoading("Error!")
  //         setTopFullCSNS([])
  //         return
  //       }
  //       if(currentRequest == csnRequestRef.current) {
  //         let hydrated = response.csns.map(csn => rehydrateCSN(csn, [...csnLayers, ...variantLayers]))
  //         hydrated.forEach(d => d.scoreType = "full")
  //         setTopFullCSNS(hydrated)
  //         setCSNLoading("")
  //       }
  //     }).catch((e) => {
  //       console.log("error fetching top full csns", e)
  //       // setCSNLoading("Error!")
  //       setTopFullCSNS([])
  //     })
  // }, [filters, numPaths, selected])

  // const [pathDiversity, setPathDiversity] = useState(true)
  // const [loadingRegionCSNS, setLoadingRegionCSNS] = useState(false)
  // // Fetch the CSNS via API for the selected region
  // useEffect(() => {
  //   if(selected){
  //     let nfs = Object.keys(filters).length
  //     setLoadingRegionCSNS(true)
  //     setRegionCSNS([])
  //     fetchTopCSNs(filters, selected, nfs ? "factor" : "full", pathDiversity, 100)
  //     .then((response) => {
  //       // console.log("top csns for selected response", selected, response)
  //       if(!response || !response?.csns?.length) {
  //         setRegionCSNS([])
  //         setLoadingRegionCSNS(false)
  //         return
  //       }
  //       let hydrated = response.csns.map(csn => rehydrateCSN(csn, [...csnLayers, ...variantLayers]))
  //       hydrated.forEach(d => d.scoreType = "factor")
  //       setRegionCSNS(hydrated)
  //       setLoadingRegionCSNS(false)
  //     })
  //   } else {
  //     setLoadingRegionCSNS(false)
  //     setRegionCSNS([])
  //   }
  // }, [filters, selected, pathDiversity])

  const [topCSNSFactorByCurrentOrder, setTopCSNSFactorByCurrentOrder] = useState(new Map())
  const [topCSNSFullByCurrentOrder, setTopCSNSFullByCurrentOrder] = useState(new Map())
  // we want to group the top csns by the current order
  useEffect(() => {
    if(topFactorCSNS.length) {
      const groupedFactor = group(topFactorCSNS, d => d.chromosome + ":" + hilbertPosToOrder(d.i, {from: 14, to: zoom.order}))
      // const groupedFull = group(topFullCSNS, d => d.chromosome + ":" + hilbertPosToOrder(d.i, {from: 14, to: zoom.order}))
      console.log("groupedFactor", groupedFactor)
      // console.log("groupedFull", groupedFull)
      setTopCSNSFactorByCurrentOrder(groupedFactor)
      // setTopCSNSFullByCurrentOrder(groupedFull)
    } else {
      setTopCSNSFactorByCurrentOrder(new Map())
    }
  }, [zoom.order, topFactorCSNS])


  const handleFactorPreview = useCallback((field, values) => {
    console.log("preview factor!", field, values)
    setFactorPreviewField(field)
    setFactorPreviewValues(values)
  }, [setFactorPreviewField, setFactorPreviewValues])

  const handleSelectedCSNSankey = useCallback((csn) => {
    let hit = csn.path.find(d => d.order == zoom.order)?.region
    if(!hit) {
      console.log("no hit?", csn)
      hit = fromPosition(csn.chromosome, csn.i, csn.i+1, zoom.order)
    }
    console.log("SELECTED SANKEY CSN", csn, hit)
    setSelected(hit)
    setRegion(hit)
    setLoadingSelectedCSN(true)
    retrieveFullDataForCSN(csn).then((response) => {
      setSelectedTopCSN(response)
      setLoadingSelectedCSN(false)
    })
  }, [zoom.order])

  const [loadingSelectedCSN, setLoadingSelectedCSN] = useState(false)
  const handleSelectedCSNSelectedModal = (csn) => {
    if(!csn) return
    setLoadingSelectedCSN(true)
    retrieveFullDataForCSN(csn).then((response) => {
      setSelectedTopCSN(response)
      console.log("full data response", response)
      setLoadingSelectedCSN(false)
    })
  }

  const handleHoveredCSN = useCallback((csn) => {
    setHoveredTopCSN(csn)
    let hit = fromPosition(csn.chromosome, csn.i, csn.i+1, zoom.order)
    // console.log("HOVERED CSN", csn, hit)
    setHover(hit)
  }, [zoom.order])

  const drawFilteredRegions = useCanvasFilteredRegions(topCSNSFactorByCurrentOrder)

  const clearSelectedState = useCallback(() => {
    console.log("CLEARING STATE")
    setRegion(null)
    setSelected(null)
    setSelectedOrder(null)
    setSimSearch(null)
    setSearchByFactorInds([])
    setSimilarRegions([])
    setSelectedNarration(null)
    setSimSearchMethod(null)
    setGenesetEnrichment(null)
    setSelectedTopCSN(null)
    setRegionCSNS([])
    // setPowerNarration(null)
  }, [setRegion, setSelected, setSelectedOrder, setSimSearch, setSearchByFactorInds, setSimilarRegions, setSelectedNarration, setSimSearchMethod, setGenesetEnrichment, setSelectedTopCSN])

  // TODO: consistent clear state
  const handleModalClose = useCallback(() => {
    clearSelectedState()
  }, [clearSelectedState])

  const handleClear = useCallback(() => {
    clearSelectedState()
    clearFilters()
    setShowFilter(false)
  }, [clearSelectedState, clearFilters, setShowFilter])

  const handleClick = useCallback((hit, order, double) => {
    // console.log("app click handler", hit, order, double)
    console.log("HANDLE CLICK", hit)
    try {
      if(hit === selected) {
        clearSelectedState()
      } else if(hit) {
        console.log("setting selected from click", hit)
        setSelectedTopCSN(null)
        setRegionCSNS([])
        // setLoadingRegionCSNS(true) // TODO: this is to avoid flashing intermediate state of selected modal
        setSelectedOrder(order)
        setSelected(hit)
      }
    } catch(e) {
      console.log("caught error in click", e)
    }
  }, [selected, setSelected, setSelectedOrder, clearSelectedState])

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

  const orderMargin = useMemo(() => {
    return (height - 11*38)/11
  }, [height])

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
            {showFilter ? 
              <SelectFactorPreview 
                activeWidth={400}
                restingWidth={400}
                onPreviewValues={handleFactorPreview}
                />
            : 
            <Autocomplete
              ref={autocompleteRef}
              onChangeLocation={handleChangeLocationViaAutocomplete}
            /> }
          </div>
        </div>
        <div className="lensmode">
          <LensModal
              layers={layers}
              currentLayer={layer}
              setLayerOrder={useCallback((lo) => {
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
          
          
          {/* {selected ? 
              <SelectedModal 
                showFilter={showFilter}
                selected={selected} 
                regionCSNS={regionCSNS}
                loadingRegionCSNS={loadingRegionCSNS}
                topCSNS={topCSNSFactorByCurrentOrder}
                // regionsByOrder={rbos}
                selectedTopCSN={selectedTopCSN}
                loadingSelectedCSN={loadingSelectedCSN}
                k={zoom.transform.k}
                diversity={pathDiversity}
                onCSNSelected={(csn) => {
                  handleSelectedCSNSelectedModal(csn)
                }}
                onZoom={(region) => { setRegion(null); setRegion(region)}}
                onClose={handleModalClose}
                // onNarration={(n) => setPowerNarration(n)}
                onZoomOrder={(n) => setPowerOrder(n)}
                onDiversity={(d) => setPathDiversity(d)}
                >
            </SelectedModal> : null} */}

            {/* <SimSearchResultList
                    simSearch={simSearch}
                    zoomRegion={region}
                    searchByFactorInds={searchByFactorInds}
                    onFactorClick={handleFactorClick}
                    onZoom={(region) => { 
                      const hit = fromPosition(region.chromosome, region.start, region.end)
                      setRegion(null); 
                      setRegion(hit)}
                    }
                    onHover={setHover}
                  /> */}

            {selected && (selectedTopCSN || loadingSelectedCSN) ? 
              <InspectorGadget 
                selected={selected} 
                zoomOrder={powerOrder}
                narration={selectedTopCSN}
                layers={csnLayers}
                loadingCSN={loadingSelectedCSN}
                mapWidth={width}
                mapHeight={height}
                modalPosition={modalPosition}
                onClose={handleModalClose}
                >
            </InspectorGadget> : null}
            
            <div>

              <FilterSelects
                show={showFilter}
                orderSums={orderSums} 
                previewField={factorPreviewField}
                previewValues={factorPreviewValues}
                showNone={false} 
                showUniquePaths={true}
                activeWidth={585}
                restingWidth={65}
                orderMargin={orderMargin}
              />

              <SankeyModal 
                show={showFilter}
                width={400} 
                height={height-10} 
                numPaths={numPaths}
                selectedRegion={selected}
                hoveredRegion={hover}
                factorCsns={topFactorCSNS}
                fullCsns={topFullCSNS}
                loading={csnLoading}
                shrinkNone={false} 
                onSelectedCSN={handleSelectedCSNSankey}
                onHoveredCSN={handleHoveredCSN}
                onSort={(sort) => {
                  setCSNSort(sort)
                }}
                onNumPaths={(n) => {
                  setNumPaths(n)
                }}
                onClearRegion={clearSelectedState}
              />
            </div>


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
                  selected={selected}
                  orderOffset={orderOffset}
                  zoomDuration={duration}
                  onScales={setScales}
                  CanvasRenderers={[
                    drawFilteredRegions,
                  ]}
                  SVGRenderers={[
                    SVGChromosomeNames({ }),
                    showHilbert && SVGHilbertPaths({ stroke: "black", strokeWidthMultiplier: 0.1, opacity: 0.5}),
                    RegionMask({ regions: [selected, ...similarRegions ]}),
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
                    ...DisplayExampleRegions({
                      exampleRegions: exampleRegions,
                      order: zoom.order,
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
                    // crossScaleNarration={csn}
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
              {!selected && hover && <RegionStrip region={hover} segments={100} layer={layer} width={width} height={40} /> }

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
            // filteredRegions={filteredRegions}
            // regionsByOrder={rbos}
            topCSNS={topCSNSFactorByCurrentOrder}
            layer={layer} 
            zoom={zoom} 
            showFilter={showFilter}
            showDebug={showDebug}
            showSettings={showSettings}
            orderOffset={orderOffset}
            layers={layers} 
            onClear={handleClear}
            onDebug={handleChangeShowDebug}
            onSettings={handleChangeShowSettings}
            onOrderOffset={setOrderOffset}
            onFilter={handleChangeShowFilter}
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
            csnEnrThreshold={csnEnrThreshold}
            handleCsnEnrThresholdChange={handleCsnEnrThresholdChange}
          /> : null }
        </div>
      </div>
    </>
  )
}

export default Home
