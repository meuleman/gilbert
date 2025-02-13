import { useEffect, useState, useRef, useCallback, useMemo, useContext } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'

import { FilterOutlined } from '@ant-design/icons';


// import FiltersProvider from '../components/ComboLock/FiltersProvider'
import FiltersContext from '../components/ComboLock/FiltersContext'
import { useZoom } from '../contexts/zoomContext';

import { urlify, jsonify, fromPosition, fromRange, fromCoordinates, toPosition, fromIndex, overlaps } from '../lib/regions'
import { hilbertPosToOrder } from '../lib/HilbertChromosome'
import { debouncerTimed } from '../lib/debounce'

import { fetchFilteringWithoutOrder } from '../lib/dataFiltering';
import { fetchPartialPathsForRegions, rehydratePartialCSN } from '../lib/csn'
import { calculateSegmentOrderSums, urlifyFilters, parseFilters } from '../lib/filters'
import { gencode, getRangesOverCell } from '../lib/Genes'
import { range, group } from 'd3-array'
import { Tooltip } from 'react-tooltip'
import { createSubregionPaths } from '../lib/subregionPaths'

import './Home.css'

import LogoNav from '../components/LogoNav';
// base component
import HilbertGenome from '../components/HilbertGenome'
import LinearGenome from '../components/LinearGenome'
// rendering components
import SVGHilbertPaths from '../components/SVGHilbertPaths'
import SVGGenePaths from '../components/SVGGenePaths'
import ZoomLegend from '../components/ZoomLegend'
// import LinearTracks from '../components/LinearTracks'
// import TrackPyramid from '../components/TrackPyramid'
import LayerDropdown from '../components/LayerDropdown'
import StatusBar from '../components/StatusBar'
import LeftToolbar from '../components/LeftToolbar'
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

import RegionsContext from '../components/Regions/RegionsContext';

import SankeyModal from '../components/Narration/SankeyModal';
import HeaderRegionSetModal from '../components/Regions/HeaderRegionSetModal';
import ManageRegionSetsModal from '../components/Regions/ManageRegionSetsModal'
import ActiveRegionSetModal from '../components/Regions/ActiveRegionSetModal'
import SummarizePaths from '../components/Narration/SummarizePaths'

import Spectrum from '../components/Narration/Spectrum';


// layer configurations
import { fullList as layers, dropdownList, csnLayers, variantLayers, countLayers } from '../layers'

// import RegionFilesSelect from '../components/Regions/RegionFilesSelect'
// autocomplete
// import Autocomplete from '../components/Autocomplete/Autocomplete'
import GeneSearch from '../components/GeneSearch'

// region SimSearch
import SimSearchRegion from '../components/SimSearch/SimSearchRegion'
import SimSearchByFactor from '../components/SimSearch/SimSearchByFactor'

import DisplaySimSearchRegions from '../components/SimSearch/DisplaySimSearchRegions'
import DisplayExampleRegions from '../components/ExampleRegions/DisplayExampleRegions';
import useCanvasFilteredRegions from '../components/Canvas/FilteredRegions';
import useCanvasAnnotationRegions from '../components/Canvas/Annotation';

import { getSet } from '../components/Regions/localstorage'
import SelectedModal from '../components/SelectedModal'
import InspectorGadget from '../components/InspectorGadget'
import SimSearchResultList from '../components/SimSearch/ResultList'
import { fetchSingleRegionFactorOverlap } from '../lib/regionSetEnrichments';

import RegionStrip from '../components/RegionStrip'


/**
BT ADDED IMPORTS
*/
import { cn } from '@/lib/utils'
import CloseIcon from "@/assets/close.svg?react"
import DebugIcon from "@/assets/debug.svg?react"
import DownloadIcon from "@/assets/download.svg?react"
import GilbertG from "@/assets/gilbert-logo-g.svg?react"
import SearchIcon from "@/assets/search.svg?react"
import SettingsIcon from "@/assets/settings.svg?react"
import UpDownChevronIcon from "@/assets/up-down-chevron.svg?react"
import UploadIcon from "@/assets/upload.svg?react"




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
  if (initialPosition) {
    const [chrom, pos] = initialPosition.split(":")
    const [start, end] = pos.split("-")
    initialSelectedRegion = JSON.stringify(fromPosition(chrom, start, end))
    // console.log("initial position", initialPosition, initialSelectedRegion)
  }

  const navigate = useNavigate();

  const { order, transform, orderOffset, setOrderOffset, zoomMin, zoomMax, orderMin, orderMax } = useZoom()
  const zoomExtent = useMemo(() => [zoomMin, zoomMax], [zoomMin, zoomMax])
  const orderDomain = useMemo(() => [orderMin, orderMax], [orderMin, orderMax])

  const containerRef = useRef()

  const [layerOrderNatural, setLayerOrderNatural] = useState(null)
  const [layerOrder, setLayerOrder] = useState(null)
  const layerOrderRef = useRef(layerOrder)
  useEffect(() => {
    if (layerOrderNatural) {
      setLayerOrder(layerOrderNatural)
      layerOrderRef.current = layerOrderNatural
    }
  }, [layerOrderNatural])
  useEffect(() => {
    layerOrderRef.current = layerOrder
  }, [layerOrder])

  const [lensHovering, setLensHovering] = useState(false)
  const [width, height] = useWindowSize()

  function useWindowSize() {
    const [size, setSize] = useState([0, 0]);

    useEffect(() => {
      const container = containerRef.current;
      if (!container) return;

      // Create a new ResizeObserver instance
      const resizeObserver = new ResizeObserver((entries) => {
        for (let entry of entries) {
          // The contentRect provides the new dimensions
          const { width, height } = entry.contentRect;
          setSize([width, height]);
        }
      });

      // Start observing the container element
      resizeObserver.observe(container);

      // Cleanup: unobserve the element and disconnect the observer when component unmounts
      return () => {
        resizeObserver.unobserve(container);
        resizeObserver.disconnect();
      };
    }, []);

    return size;
  }

  // console.log("outer width, height", width, height)

  // Zoom duration for programmatic zoom
  const [duration, setDuration] = useState(1000)
  const handleChangeDuration = (e) => {
    setDuration(+e.target.value)
  }

  const [isZooming, setIsZooming] = useState(false)
  const [mapLoading, setMapLoading] = useState(false)

  const [layerLock, setLayerLock] = useState(false)
  const [layerLockFromIcon, setLayerLockFromIcon] = useState(null)
  const [layer, setLayer] = useState(dropdownList[0])
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

  // TODO:
  // something is wrong with the order being calculated by the zoom
  // also why isn't zoom legend showing up?



  // We want to keep track of the zoom state
  const [zoom, setZoom] = useState({ points: [], bbox: {} })
  const zoomRef = useRef(zoom)
  useEffect(() => {
    zoomRef.current = zoom
  }, [zoom])

  const orderRef = useRef(order)
  useEffect(() => {
    if (orderRef.current !== order && !layerLockRef.current) {
      setLayer(layerOrderRef.current[order])
    }
    orderRef.current = order
    console.log("order", order)
  }, [order])

  // if we have filters in the url, show the filter modal on loading
  const anyFilters = Object.keys(parseFilters(initialFilters || "[]")).length > 0
  const [showFilter, setShowFilter] = useState(anyFilters)
  const [showFactorPreview, setShowFactorPreview] = useState(false)
  const handleChangeShowFilter = useCallback((e) => {
    setShowFilter(!showFilter)
  }, [showFilter])

  useEffect(() => {
    // turn on showfilter if showfactorpreview is on
    if (showFactorPreview) {
      setShowFilter(showFactorPreview)
    }
  }, [showFactorPreview])

  const [showSankey, setShowSankey] = useState(false)



  // selected powers the sidebar modal and the 1D track
  const [selected, setSelected] = useState(jsonify(initialSelectedRegion))
  const [selectedOrder, setSelectedOrder] = useState(selected?.order)

  const { filters, setFilters, clearFilters, hasFilters } = useContext(FiltersContext);
  const initialUpdateRef = useRef(true);
  useEffect(() => {
    if (initialUpdateRef.current) {
      // console.log("INITIAL FILTERS", initialFilters)
      setFilters(parseFilters(initialFilters || "[]"))
      initialUpdateRef.current = false
    }
  }, [initialFilters, setFilters])

  const {
    activeSet,
    // activePaths, 
    activeState,
    numTopRegions,
    setActiveSet,
    clearActive,
    saveSet,
    activeGenesetEnrichment,
    setSelectedGenesetMembership,
    topNarrations,
    activeRegions,
    filteredActiveRegions,
    activeFilters
  } = useContext(RegionsContext)

  const regions = useMemo(() => {
    // console.log("REGIONS MEMO", filteredActiveRegions, activeRegions)
    // if(filteredActiveRegions?.length) {
    //   return filteredActiveRegions
    // } else if(activeRegions?.length) {
    if (activeRegions?.length) {
      return activeRegions
    } else {
      return []
    }
  }, [activeRegions])//, filteredActiveRegions])

  useEffect(() => {
    if (showFilter && regions?.length) {
      let path_density = layers.find(d => d.datasetName == "precomputed_csn_path_density_above_90th_percentile")
      const lo = {}
      range(4, 15).map(o => {
        lo[o] = filters[o]?.layer || path_density
      })
      // console.log("setting layer order for density", lo)
      setLayerOrder(lo)
      setLayer(lo[orderRef.current])
    } else if (layerOrderNatural) {
      // console.log("setting layer order back to natural", layerOrderNatural)
      // setLayerLock(false)
      setLayerOrder(layerOrderNatural)
      setLayer(layerOrderNatural[orderRef.current])
    }
  }, [filters, showFilter, layerOrderNatural, regions])



  const handleZoom = useCallback((newZoom) => {
    // if(zoomRef.current.order !== newZoom.order && !layerLockRef.current) {
    //   setLayer(layerOrderRef.current[newZoom.order])
    // } else if(zoomRef.current.order !== newZoom.order && layerLockRef.current && showFilter) {
    //   if(filters[newZoom.order]) {
    //     // console.log("LAYER", filters[newZoom.order])
    //     // setLayer(filters[newZoom.order].layer)
    //   }
    // }
    // setZoom(newZoom)
  }, [setZoom, setLayer, showFilter, filters])


  const [scales, setScales] = useState(null)
  const [modalPosition, setModalPosition] = useState({ x: 0, y: 0 })
  useEffect(() => {
    const calculateModalPosition = () => {
      if (!selected || !transform || !scales) return { x: 0, y: 0 };

      let hit = selected
      if (selected.order !== order) {
        hit = fromPosition(selected.chromosome, selected.start, selected.end, order)
      }
      // console.log("HIT", hit)

      // const { k, x, y } = transform;
      // const selectedX = scales.xScale(hit.x) * k + x;
      // const selectedY = scales.yScale(hit.y) * k + y;

      // always center it
      const selectedX = width / 2
      const selectedY = height / 2

      return { x: selectedX, y: selectedY };
    };

    setModalPosition(calculateModalPosition());
    // setModalPosition(showPosition(selected))
  }, [selected, transform, order, scales, width, height])

  const [hover, setHover] = useState(null)
  const [hoveredPosition, setHoveredPosition] = useState({ x: 0, y: 0, sw: 0 })

  useEffect(() => {
    if (!hover || !transform || !scales) {
      setHoveredPosition({ x: 0, y: 0, sw: 0 })
      return;
    }

    let hit = hover
    if (hover.order !== order) {
      hit = fromPosition(hover.chromosome, hover.start, hover.end, order)
    }

    const { k, x, y } = transform;
    const step = Math.pow(0.5, order)
    const sw = scales.sizeScale(step) * k
    const hoveredX = scales.xScale(hit.x) * k + x + sw / 2
    const hoveredY = scales.yScale(hit.y) * k + y// - sw/2

    setHoveredPosition({ x: hoveredX, y: hoveredY, sw, stepSize: scales.sizeScale(step) });
  }, [hover, transform, order, scales])

  const [simSearch, setSimSearch] = useState(null)
  const [similarRegions, setSimilarRegions] = useState([])
  // const [simSearchDetailLevel, setSimSearchDetailLevel] = useState(null)
  const [simSearchMethod, setSimSearchMethod] = useState(null)
  const [selectedNarration, setSelectedNarration] = useState(null)
  const [crossScaleNarration, setCrossScaleNarration] = useState(new Array(1).fill({ 'path': [] }))
  const [crossScaleNarrationIndex, setCrossScaleNarrationIndex] = useState(0)
  const [csnMethod, setCsnMethod] = useState("sum")
  const [csnEnrThreshold, setCsnEnrThreshold] = useState(0)

  const selectedRef = useRef(selected);
  useEffect(() => {
    selectedRef.current = selected;
  }, [selected]);

  useEffect(() => {
    if (!initialSelectedRegion) {
      // TODO: need a reliable way to clear state when deselecting a region
      setSelected(null)
      setSimilarRegions([])
      setCrossScaleNarration([])
    }
  }, [initialSelectedRegion])

  // the hover can be null or the data in a hilbert cell
  const [lastHover, setLastHover] = useState(null)
  // for when a region is hovered in the similar region list
  const [similarRegionListHover, setSimilarRegionListHover] = useState(null)

  // changing the region changes the zoom and will also highlight on the map
  const [region, setRegion] = useState(jsonify(initialSelectedRegion))

  const [data, setData] = useState(null)
  const dataRef = useRef(data)
  useEffect(() => {
    dataRef.current = data
  }, [data])

  const [searchByFactorInds, setSearchByFactorInds] = useState([])

  const processSimSearchResults = useCallback((order, result) => {
    setSimSearch(result)
    let similarRegions = result?.simSearch
    if (similarRegions && similarRegions.length) {
      const similarRanges = similarRegions.map((d) => {
        return fromCoordinates(d.coordinates)
      })

      setSimilarRegions(similarRanges)
    } else {
      setSimilarRegions([])
      setSelected(null)
    }
  }, [setSimSearch, setSimilarRegions, setSelected])


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
    if (set) {
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

  const handleHover = useCallback((hit, similarRegionList = false) => {
    // if(hit && !selectedRef.current) {}
    if (similarRegionList) {
      setSimilarRegionListHover(hit)
    }
    setHover(hit)
    if (hit) setLastHover(hit)
  }, [setSimilarRegionListHover, setHover])

  const handleFactorClick = useCallback((newSearchByFactorInds) => {
    console.log("HANDLE FACTOR CLICK", newSearchByFactorInds, simSearchMethod)
    setSearchByFactorInds(newSearchByFactorInds)
    if (newSearchByFactorInds.length > 0) {
      if (simSearchMethod != "Region") {
        SimSearchByFactor(newSearchByFactorInds, order, layer).then((SBFResult) => {
          setSelected(null)
          setSelectedNarration(null)
          processSimSearchResults(order, SBFResult)
          setSimSearchMethod("SBF")
        })
      } else if (simSearchMethod == "Region") {
        SimSearchRegion(selected, selected.order, layer, setSearchByFactorInds, newSearchByFactorInds, simSearchMethod).then((regionResult) => {
          processSimSearchResults(selected.order, regionResult)
          console.log("REGION RESULT", regionResult)
        })
      }
    } else {
      // clear the sim search
      processSimSearchResults(order, { simSearch: null, factors: null, method: null, layer: null })
      setSimSearchMethod(null)
    }
  }, [selected, order, setSearchByFactorInds, processSimSearchResults, simSearchMethod, setSelected, setSelectedNarration, layer])  // setGenesetEnrichment


  const [showHilbert, setShowHilbert] = useState(false)
  const handleChangeShowHilbert = (e) => {
    setShowHilbert(!showHilbert)
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

  const handleChangeLocationViaGeneSearch = useCallback((selected) => {
    if (!selected) return
    console.log("selected", selected)
    let range = []
    // console.log("gencode", gencode)
    // if(selected.factor) {
    //   // query for the paths for the factor
    //   let f = selected.factor
    //   fetchFilteringWithoutOrder([{factor: f.index, dataset: f.layer.datasetName}], null)
    //     .then((response) => {
    //       console.log("FILTERING WITHOUT ORDER", response)
    //       let regions = response.regions.map(r => {
    //         return {...fromIndex(r.chromosome, r.i, r.order), score: r.score}
    //       })
    //       saveSet(selected.factor.label, regions, { activate: true, type: "search", factor: selected.factor })
    //     })

    // } else {
    if (selected.gene) {
      range = fromRange(selected.gene.chromosome, selected.gene.start, selected.gene.end, 200)
    } else {
      range = fromRange(selected.chromosome, selected.start, selected.end, 200)
    }
    // const mid = range[Math.floor(range.length / 2)]
    // Find the region closest to the midpoint of the x,y coordinates in the range
    const midX = (range[0].x + range[range.length - 1].x) / 2;
    const midY = (range[0].y + range[range.length - 1].y) / 2;
    const mid = range.reduce((closest, current) => {
      const closestDist = Math.sqrt(Math.pow(closest.x - midX, 2) + Math.pow(closest.y - midY, 2));
      const currentDist = Math.sqrt(Math.pow(current.x - midX, 2) + Math.pow(current.y - midY, 2));
      return currentDist < closestDist ? current : closest;
    }, range[0]);
    // console.log("MID", mid)
    setRegion(mid)
    // console.log("autocomplete range", range)
    // saveSet(selected.value, range, { activate: true, type: "search"})
    // }
  }, [setRegion, saveSet])

  // const handleChangeLocationViaAutocomplete = useCallback((autocompleteRegion) => {
  //   if (!autocompleteRegion) return
  //   console.log("autocomplete", autocompleteRegion)
  //   let range = []
  //   // console.log("gencode", gencode)
  //   if(autocompleteRegion.type == "gene") {
  //     let gene = gencode.find(d => d.hgnc == autocompleteRegion.name)
  //     // console.log("GENE", gene)
  //     range = fromRange(gene.chromosome, gene.start, gene.end, 100)
  //   } else {
  //     range = fromRange(autocompleteRegion.chrom, autocompleteRegion.start, autocompleteRegion.stop, 100)
  //   }
  //   const mid = range[Math.floor(range.length / 2)]
  //   setRegion(mid)
  //   // console.log("autocomplete range", range)
  //   saveSet(autocompleteRegion.name || autocompleteRegion.location, range, { activate: true, type: "search"})
  // }, [setRegion, saveSet])


  const onData = useCallback((payload) => {
    // console.log("data payload", payload)
    setData(payload)
    // setHover(payload.center)

    // const fetchInChunks = async (data, chunkSize) => {
    //   let combinedResults = [];
    //   for (let i = 0; i < data.length; i += chunkSize) {
    //     const chunk = data.slice(i, i + chunkSize);
    //     const response = await fetchTopPathsForRegions(chunk.map(toPosition), 1);
    //     console.log("DATA PAYLOAD PATHS", i, response);
    //     const tpr = getDehydrated(chunk, response.regions);
    //     console.log("DATA PAYLOAD TPR",i, tpr);
    //     combinedResults = combinedResults.concat(tpr);
    //   }
    //   return combinedResults;
    // };

    // fetchInChunks(payload.data, 200).then((combinedResults) => {
    //   const sortedResults = combinedResults.sort((a, b) => b.score - a.score);
    //   console.log("COMBINED", sortedResults)
    //   saveSet("1mb", sortedResults, { type: "file", activate: true });
    // });
  }, [setData])


  const [powerOrder, setPowerOrder] = useState(order + 0.5)


  const orderSums = useMemo(() => {
    // return calculateOrderSums()
    let os = calculateSegmentOrderSums()
    // console.log("OS", os)
    return os
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


  // useEffect(() => {
  //   // console.log("all full csns", allFullCSNS)
  //   if(activePaths?.length) {
  //     let sorted = activePaths.slice(0, numTopRegions)
  //       // .sort((a,b) => b.score - a.score)
  //     // console.log("sorted", sorted)
  //     setTopFullCSNS(sorted)
  //     setCSNLoading("")
  //   } else {
  //     setTopFullCSNS([])
  //   }
  // }, [activePaths, numTopRegions])


  // const [pathDiversity, setPathDiversity] = useState(true)
  const [loadingRegionCSNS, setLoadingRegionCSNS] = useState(false)
  const [loadingSelectedCSN, setLoadingSelectedCSN] = useState(false)

  useEffect(() => {
    if (selected) {
      // TODO: check if logic is what we want
      // if an activeSet we grab the first region (since they are ordered) that falls witin the selected region
      // if the region is smaller than the activeSet regions, the first one where the selected region is within the activeset region
      let region = selected
      if (filteredActiveRegions?.length) {
        let overlappingRegion = overlaps(selected, filteredActiveRegions)[0] || selected
        overlappingRegion.subregion ? overlappingRegion = overlappingRegion.subregion : null
        region = overlappingRegion.order > selected.order ? overlappingRegion : selected
      }
      setLoadingSelectedCSN(true)
      // setLoadingRegionCSNS(true)
      setSelectedTopCSN(null)
      // setRegionCSNS([])
      fetchPartialPathsForRegions([region]).then((response) => {
        if(!response) { 
          // setRegionCSNS([])
          setSelectedTopCSN(null)
          setLoadingSelectedCSN(false)
          setLoadingRegionCSNS(false)
          return null
        } else {
          let responseRegion = response.regions[0]
          let rehydrated = {
            path: rehydratePartialCSN(responseRegion, [...csnLayers, ...variantLayers]).path,
            region, 
            genes: responseRegion.genes
          }
          setSelectedTopCSN(rehydrated)
          setLoadingRegionCSNS(false)
          setLoadingSelectedCSN(false)
          return rehydrated
        }
      }).catch((e) => {
        console.log("error creating top paths for selected region", e)
        // setRegionCSNS([])
        setSelectedTopCSN(null),
        setLoadingRegionCSNS(false)
        return null
      }).then((response) => {
        // subpath query
        let factorExclusion = determineFactorExclusion(response[0] ? response[0] : null)
        // find and set subpaths
        findSubpaths(region, factorExclusion)
      })
    } else {
      // selected is cleared
      setSelectedGenesetMembership([])
      findSubpaths(null, [])
    }
  }, [selected, filteredActiveRegions])

  const [topCSNSFactorByCurrentOrder, setTopCSNSFactorByCurrentOrder] = useState(new Map())

  const [filteredRegionsByCurrentOrder, setFilteredRegionsByCurrentOrder] = useState(new Map())
  const [allRegionsByCurrentOrder, setAllRegionsByCurrentOrder] = useState(new Map())
  // group the top regions found through filtering by the current order
  useEffect(() => {
    // let regions = activeRegions
    if (regions?.length) {
      console.log("REGIONS HOME", regions)
      const groupedAllRegions = group(
        regions,
        d => d.chromosome + ":" + (d.order > order ? hilbertPosToOrder(d.i, { from: d.order, to: order }) : d.i))
      console.log("GROUPED ALL REGIONS", groupedAllRegions)
      setAllRegionsByCurrentOrder(groupedAllRegions)
    } else {
      // console.log("no regions!!")
      setAllRegionsByCurrentOrder(new Map())
    }
  }, [regions, order])

  useEffect(() => {
    // let regions = activeRegions 
    if (filteredActiveRegions?.length) {
      console.log("FILTERED ACTVE REGIONS HOME", filteredActiveRegions)
      const groupedFilteredRegions = group(
        // filteredActiveRegions.map(d => d.subregion ? d.subregion : d), 
        filteredActiveRegions,  // only using base regions for now
        d => d.chromosome + ":" + (d.order > order ? hilbertPosToOrder(d.i, { from: d.order, to: order }) : d.i))
      console.log("GROUPED EFFECTIVE REGIONS", groupedFilteredRegions)
      setFilteredRegionsByCurrentOrder(groupedFilteredRegions)
    } else {
      // console.log("no regions!!")
      setFilteredRegionsByCurrentOrder(new Map())
    }
  }, [filteredActiveRegions, order])

  // useEffect(() => {
  //   if(activePaths?.length) {
  //     console.log("updating active regions by current order", order)
  //     const groupedActiveRegions = group(
  //       activePaths.slice(0, numTopRegions),
  //       d => d.chromosome + ":" + hilbertPosToOrder(d.i, {from: 14, to: order}))
  //     setActiveRegionsByCurrentOrder(groupedActiveRegions)
  //   } else {
  //     console.log("no active regions", order)
  //     setActiveRegionsByCurrentOrder(new Map())
  //   }
  // }, [order, activePaths, regions, numTopRegions])



  const handleFactorPreview = useCallback((field, values) => {
    // console.log("preview factor!", field, values)
    setFactorPreviewField(field)
    setFactorPreviewValues(values)
  }, [setFactorPreviewField, setFactorPreviewValues])

  const handleSelectedCSNSankey = useCallback((csn) => {
    let hit = fromPosition(csn.chromosome, csn.start, csn.end, order)
    console.log("SELECTED SANKEY CSN", csn, hit)
    setSelected(csn?.region)
    setRegion(hit)
  }, [order])


  const handleHoveredCSN = useCallback((csn) => {
    setHoveredTopCSN(csn)
    setHover(csn?.region)
  }, [])


  // figure out which active regions are in the hovered segment if any
  const [activeInHovered, setActiveInHovered] = useState(null)
  const [intersectedGenes, setIntersectedGenes] = useState([])
  const [associatedGenes, setAssociatedGenes] = useState([])
  // TODO: we probably want logic here for effective regions
  useEffect(() => {
    if (hover && activeSet && regions?.length && filteredActiveRegions?.length) {
      // find the regions within the hover
      // do we need to perform on the subregions if they exist?
      let activeInHover = overlaps(hover, filteredActiveRegions, r => r)
      // console.log("ACTIVE IN HOVER", hover, filteredActiveRegions, activeInHover)
      // let intersected = [...new Set(paths.flatMap(p => p.genes.filter(g => g.in_gene).map(g => g.name)))]
      // let associated = [...new Set(paths.flatMap(p => p.genes.filter(g => !g.in_gene).map(g => g.name)))]
      // // make sure the 'associated' genes do not contain any 'intersected'/overlapping genes
      // associated = associated.filter(g => !intersected.includes(g))
      // get the paths
      setActiveInHovered(activeInHover)
      // setIntersectedGenes(intersected)
      // setAssociatedGenes(associated)
    } else {
      setActiveInHovered(null)
    }
  }, [hover, activeSet, filteredActiveRegions, regions])

  useEffect(() => {
    if (mapLoading || activeState) {
      document.body.style.cursor = "wait"
      return;
    }
    if (hover) {
      if (activeSet) {
        if (activeInHovered?.length) {
          document.body.style.cursor = "pointer"
        } else {
          document.body.style.cursor = "default"
        }
      } else {
        document.body.style.cursor = "pointer"
      }
    } else {
      document.body.style.cursor = "default"
    }
  }, [hover, activeInHovered, activeSet, activeState, mapLoading])

  // const drawFilteredRegions = useCanvasFilteredRegions(filterSegmentsByCurrentOrder)
  // const drawActiveFilteredRegions = useCanvasFilteredRegions(activeRegionsByCurrentOrder, { color: "orange", opacity: 1, strokeScale: 1, mask: true })
  const drawEffectiveFilteredRegions = useCanvasFilteredRegions(filteredRegionsByCurrentOrder, { color: "orange", opacity: 1, strokeScale: 1, mask: true })
  const drawAllFilteredRegions = useCanvasFilteredRegions(allRegionsByCurrentOrder, { color: "gray", opacity: 0.5, strokeScale: 0.5, mask: false })
  const drawAnnotationRegionSelected = useCanvasAnnotationRegions(selected, "selected", {
    stroke: "orange",
    mask: !activeSet,
    radiusMultiplier: 1,
    strokeWidthMultiplier: 0.35,
    showGenes: false
  })
  const drawAnnotationRegionHover = useCanvasAnnotationRegions(hover, "hover", {
    // if there is an activeSet and no paths in the hover, lets make it lightgray to indicate you can't click on it
    stroke: activeSet && !activeInHovered?.length ? "lightgray" : "black",
    radiusMultiplier: 1,
    strokeWidthMultiplier: 0.1,
    showGenes,
    highlightPath: true
  })
  // const drawAnnotationRegionCenter = useCanvasAnnotationRegions(data?.center, "hover", { 
  //   // if there is an activeSet and no paths in the hover, lets make it lightgray to indicate you can't click on it
  //   stroke: "gray",
  //   radiusMultiplier: 0.5, 
  //   strokeWidthMultiplier: 0.05, 
  //   showGenes, 
  //   highlightPath: true 
  // })
  const canvasRenderers = useMemo(() => [
    drawEffectiveFilteredRegions,
    drawAllFilteredRegions,
    drawAnnotationRegionSelected,
  ], [
    drawEffectiveFilteredRegions,
    drawAllFilteredRegions,
    drawAnnotationRegionSelected,
  ]);

  const hoverRenderers = useMemo(() => [
    drawAnnotationRegionHover,
  ], [
    drawAnnotationRegionHover,
  ]);


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
    setSelectedTopCSN(null)
    setRegionCSNS([])
    // setPowerNarration(null)
  }, [setRegion, setSelected, setSelectedOrder, setSimSearch, setSearchByFactorInds, setSimilarRegions, setSelectedNarration, setSimSearchMethod, setSelectedTopCSN])

  useEffect(() => {
    // if the filters change from a user interaction we want to clear the selected
    // if(filters.userTriggered) clearSelectedState()
    // if the active filters or active regions change we want to clear the selected
    clearSelectedState()
  }, [filters, activeFilters, activeRegions, filteredActiveRegions, clearSelectedState])  // don't need filters anymore?

  // TODO: consistent clear state
  const handleModalClose = useCallback(() => {
    clearSelectedState()
  }, [clearSelectedState])

  const handleClear = useCallback(() => {
    console.log("handle clear!")
    clearSelectedState()
    clearFilters()
    clearActive()
    // setActiveSet(null)
    setShowFilter(false)
  }, [clearSelectedState, clearFilters, setShowFilter, clearActive])

  const handleClick = useCallback((hit, order, double) => {
    // console.log("app click handler", hit, order, double)
    console.log("HANDLE CLICK", hit, selectedRef.current)
    if (hit && selectedRef.current) {
      clearSelectedState()
    } else if (hit) {
      // if(filteredActiveRegions?.length) {
      //   let overs = overlaps(hit, filteredActiveRegions, r => r)
      //   console.log("OVERS", overs, hit.order)
      //   if(overs.length && overs[0].order > hit.order) {
      //     setSelected(overs[0])
      //   } else {
      //     setSelected(hit)
      //   }
      // } else {
      //   setSelected(hit)
      // }
      setSelected(hit)
      setRegion(hit)
    }
  }, [setSelected, setRegion, clearSelectedState, filteredActiveRegions])

  const autocompleteRef = useRef(null)
  // keybinding that closes the modal on escape
  useEffect(() => {
    function handleKeyDown(e) {
      if (e.key === "Escape") {
        handleModalClose()
      }
      if (e.key == "/") {
        if (autocompleteRef.current) {
          autocompleteRef.current.applyFocus()
        }
      }
    }
    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    }
  }, [handleModalClose])

  const [showLayerLegend, setShowLayerLegend] = useState(false)
  const [showSpectrum, setShowSpectrum] = useState(false)
  const [showTopFactors, setShowTopFactors] = useState(false)
  const [showManageRegionSets, setShowManageRegionSets] = useState(false)
  const [showActiveRegionSet, setShowActiveRegionSet] = useState(false)
  const [loadingSpectrum, setLoadingSpectrum] = useState(false);

  // useEffect(() => {
  //   if(regions?.length && activeGenesetEnrichment === null) {
  //     setLoadingSpectrum(true)
  //   } else {
  //     setLoadingSpectrum(false)
  //   }
  // }, [activeGenesetEnrichment, regions])

  useEffect(() => {
    if (activeSet) {
      setShowManageRegionSets(false)
      setShowLayerLegend(false)
      // setShowFilter(true)
      setShowActiveRegionSet(true)
      // setShowTopFactors(true)
    } else {
      setShowActiveRegionSet(false)
      // setShowSpectrum(false)
      setShowTopFactors(false)
    }
  }, [activeSet])

  // console.log(showSpectrum, activeGenesetEnrichment)

  useEffect(() => {
    if (!activeSet) {
      setShowSpectrum(false)
    } else {
      // console.log("FIRING FROM HERE!!!", activeGenesetEnrichment?.length)
      activeGenesetEnrichment?.length > 0 ? setShowSpectrum(true) : setShowSpectrum(false)
    }

  }, [activeSet, activeGenesetEnrichment])

  // const activePathsRef = useRef(activePaths)
  // useEffect(() => {
  //   activePathsRef.current = activePaths
  //   if(activePaths?.length) {
  //     setShowTopFactors(true)
  //   } else {
  //     setShowTopFactors(false)
  //   }
  // }, [activePaths])

  // useEffect(() => {
  //   if(showManageRegionSets) {
  //     setShowActiveRegionSet(false)
  //   } else if(showActiveRegionSet) {
  //     setShowManageRegionSets(false)
  //   }
  // }, [showManageRegionSets, showActiveRegionSet])


  // factor enrichments for selected region
  const [subpaths, setSubpaths] = useState(null)
  // find the subpaths for region
  const findSubpaths = useCallback((region, factorExclusion) => {
    setSubpaths(null)
    if (region) {
      fetchSingleRegionFactorOverlap({ region: region, factorExclusion: factorExclusion })
        .then((response) => {
          let topSubregionFactors = response.map(f => {
            let layer = layers.find(d => d.datasetName == f.dataset)
            let factorName = layer.fieldColor.domain()[f.factor]
            return { ...f, factorName, color: layer.fieldColor(factorName), layer }
          })
          // look at the below surface segments and create subregion paths
          createSubregionPaths(topSubregionFactors, region)
            .then((subpathResponse) => {
              setSubpaths(subpathResponse)
            })
        })
    }
  }, [])


  // determine factor exclusion for subpath query
  const determineFactorExclusion = useCallback((narration) => {
    let originalFactor = activeSet?.factor
    let factorExclusion = [
      ...(originalFactor ? [{ dataset: originalFactor?.layer?.datasetName, factor: originalFactor?.index }] : []),
      ...activeFilters.map(d => ({ dataset: d.layer.datasetName, factor: d.index })),
      ...(narration ? narration.path.map(d => ({ dataset: d.layer?.datasetName, factor: d.field?.index })) : [])
    ]

    // reduce factor list to unique set
    const uniqueFactors = []
    const seen = new Set()

    factorExclusion.forEach(d => {
      const factorString = `${d.dataset?.replace("_top10", "")},${d.factor}`  // convert top10 TF dataset name
      if (d.factor && d.dataset && !seen.has(factorString)) {
        seen.add(factorString)
        uniqueFactors.push(d)
      }
    })

    return uniqueFactors
  }, [activeSet, activeFilters])

  const handleSelectActiveRegionSet = useCallback((effective, base) => {
    setSelected(effective)
    setRegion(base)
  }, [setSelected, setRegion])

  const showInspectorGadget = selected && (selectedTopCSN || loadingSelectedCSN)

  return (
    <div className="w-dvw h-dvh overflow-hidden flex flex-col">
      <div className="grow-0">
        <div className="flex text-xs border-separator border-b-1">
          <div className="grow-0 border-separator border-r-1">
            <div className="h-globalMenuBar aspect-square flex items-center justify-center">
              <GilbertG />
            </div>
          </div>
          <div className="grow-0 border-separator border-r-1">
            <HeaderRegionSetModal
              selectedRegion={selected}
            />
          </div>
          <div className="flex-1 border-separator border-r-1 bg-gray-100">
            <GeneSearch
              onSelect={handleChangeLocationViaGeneSearch}
            />
          </div>
          <div className="grow-0 border-separator border-r-1 px-3.5 flex items-center">
            <label className="inline-flex gap-3.5 items-center cursor-pointer">
              <div className="font-medium">Legend</div>
              <input
                className="absolute -z-50 pointer-events-none opacity-0 peer"
                type="checkbox"
                checked={showLayerLegend}
                onChange={() => setShowLayerLegend(!showLayerLegend)}
              />
              <span className="block bg-muted-foreground border-2 border-muted-foreground h-3 w-6 rounded-full after:block after:h-full after:aspect-square after:bg-white after:rounded-full peer-checked:bg-primary peer-checked:border-primary peer-checked:after:ml-[0.725rem]"></span>
            </label>
          </div>
          <div className="grow-0 h-globalMenuBar aspect-square flex items-center justify-center border-separator border-r-1 ">
            <SettingsIcon />
          </div>
          <div className="grow-0 h-globalMenuBar aspect-square flex items-center justify-center">
            <DebugIcon />
          </div>
        </div>
      </div>
      <div className="flex-1 flex min-h-0">
        <div className="grow-0">
          <ActiveRegionSetModal
            show={activeSet}
            onSelect={handleSelectActiveRegionSet}
          >
            {selected && (selectedTopCSN || loadingSelectedCSN) && (
              <HilbertGenome
                orderMin={orderDomain[0]}
                orderMax={orderDomain[1]}
                zoomMin={zoomExtent[0]}
                zoomMax={zoomExtent[1]}
                width={430}
                height={242}
                zoomToRegion={region}
                activeLayer={layer}
                selected={selected}
                zoomDuration={duration}
                CanvasRenderers={canvasRenderers}
                HoverRenderers={hoverRenderers}
                SVGRenderers={[
                  SVGChromosomeNames({}),
                  showHilbert && SVGHilbertPaths({ stroke: "black", strokeWidthMultiplier: 0.1, opacity: 0.5 }),
                  SVGSelected({ hit: hover, dataOrder: order, stroke: "black", highlightPath: true, type: "hover", strokeWidthMultiplier: 0.1, showGenes }),
                  showGenes && SVGGenePaths({ stroke: "black", strokeWidthMultiplier: 0.1, opacity: 0.25 }),
                ]}
                onZoom={handleZoom}
                onHover={handleHover}
                onClick={handleClick}
                onData={onData}
                onScales={setScales}
                onZooming={(d) => setIsZooming(d.zooming)}
                onLoading={setMapLoading}
                // onLayer={handleLayer}
                debug={showDebug}
              />
            )}
          </ActiveRegionSetModal>
        </div>
        <div className={showInspectorGadget ? "flex-1" : "grow-0"}>
          {selected && (selectedTopCSN || loadingSelectedCSN) && (
            <InspectorGadget
              selected={selected}
              subpaths={subpaths}
              zoomOrder={powerOrder}
              narration={selectedTopCSN}
              setNarration={setSelectedTopCSN}
              layers={csnLayers}
              loadingCSN={loadingSelectedCSN}
              mapWidth={width}
              mapHeight={height}
              modalPosition={modalPosition}
              onClose={handleModalClose}
              setSubpaths={setSubpaths}
              findSubpaths={findSubpaths}
              determineFacto rExclusion={determineFactorExclusion}
            />
          )}
        </div>
        <div className="flex-1 flex">
          <div className="flex-1 flex flex-col">
            <div className="grow-0">
              {data && (
                <div className="relative h-28 border-t-1 border-separator">
                  <div className="absolute top-0 left-0 w-full h-full overflow-hidden">
                    <Spectrum
                      show
                      width={width - 24}
                      height={90}
                    />
                  </div>
                </div>
              )}
            </div>
            <div className="relative flex-1">
              <div ref={containerRef} className="absolute top-0 left-0 w-full h-full overflow-hidden">
                <LayerLegend
                  data={data}
                  hover={hover}
                  selected={selected}
                  show={showLayerLegend}
                  handleFactorClick={handleFactorClick}
                  searchByFactorInds={searchByFactorInds}
                />
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
                  zoomDuration={duration}
                  CanvasRenderers={canvasRenderers}
                  HoverRenderers={hoverRenderers}
                  SVGRenderers={[
                    SVGChromosomeNames({}),
                    showHilbert && SVGHilbertPaths({ stroke: "black", strokeWidthMultiplier: 0.1, opacity: 0.5 }),
                    SVGSelected({ hit: hover, dataOrder: order, stroke: "black", highlightPath: true, type: "hover", strokeWidthMultiplier: 0.1, showGenes }),
                    showGenes && SVGGenePaths({ stroke: "black", strokeWidthMultiplier: 0.1, opacity: 0.25 }),
                  ]}
                  onZoom={handleZoom}
                  onHover={handleHover}
                  onClick={handleClick}
                  onData={onData}
                  onScales={setScales}
                  onZooming={(d) => setIsZooming(d.zooming)}
                  onLoading={setMapLoading}
                  // onLayer={handleLayer}
                  debug={showDebug}
                />
              </div>
            </div>
            <div className="grow-0">
              {data && (
                <div className="relative h-24 border-t-1 border-separator">
                  <div className="absolute top-0 left-0 w-full h-full overflow-hidden">
                    <LinearGenome
                      // center={data?.center} 
                      data={data?.data}
                      dataOrder={data?.dataOrder}
                      activeRegions={filteredRegionsByCurrentOrder}
                      layer={data?.layer}
                      width={width}
                      height={96}
                      mapWidth={width}
                      mapHeight={height}
                      hover={hover}
                      onHover={handleHover}
                      onClick={(hit) => {
                        setRegion(hit)
                      }}
                    />
                  </div>
                </div>
              )}
            </div>
          </div>
          <div className="grow-0 shrink-0 col-start-2 row-start-2 row-end-3 flex">
            <ZoomLegend
              k={transform.k}
              height={height}
              effectiveOrder={order}
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
          </div>
        </div>
      </div>
      <div className="grow-0">
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
      </div>

      {/* These are all components that seem to need to exist in order for app
        to render and zoom correctly
       */}
      <div className="fixed top-0 left-full opacity-0 pointer-events-none">
        {showFactorPreview ?
          <SelectFactorPreview
            activeWidth={400}
            restingWidth={400}
            onPreviewValues={handleFactorPreview}
          />
          :
          //<Autocomplete
          //   ref={autocompleteRef}
          //   onChangeLocation={handleChangeLocationViaAutocomplete}
          // /> 
          <GeneSearch
            onSelect={handleChangeLocationViaGeneSearch}
          />
        }

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
          order={order}
        />

        <LayerDropdown
          layers={dropdownList}
          activeLayer={layer}
          onLayer={handleLayer}
          order={order}
          layerLock={layerLock}
          setLayerLock={setLayerLock}
          setLayerLockFromIcon={setLayerLockFromIcon}
        />

        <LeftToolbar
          showLayerLegend={showLayerLegend}
          onLayerLegend={setShowLayerLegend}
          showSpectrum={showSpectrum}
          onSpectrum={setShowSpectrum}
          loadingSpectrum={loadingSpectrum}
          showTopFactors={showTopFactors}
          onTopFactors={setShowTopFactors}
          showManageRegionSets={showManageRegionSets}
          showActiveRegionSet={showActiveRegionSet}
          onManageRegionSets={setShowManageRegionSets}
          onActiveRegionSet={setShowActiveRegionSet}
          showSankey={showSankey}
          onSankey={setShowSankey}
        />

        <LayerLegend
          data={data}
          hover={hover}
          selected={selected}
          show={showLayerLegend}
          onShow={setShowLayerLegend}
          handleFactorClick={handleFactorClick}
          searchByFactorInds={searchByFactorInds}
        />

        <ManageRegionSetsModal
          show={showManageRegionSets}
        />

        <ActiveRegionSetModal
          show={showActiveRegionSet}
          onSelect={handleSelectActiveRegionSet}
        // selectedRegion={selected}
        // queryRegions={filteredSegments} 
        // queryRegionsCount={filteredSegmentsCount}
        // queryRegionOrder={filterOrder}
        // queryLoading={filterLoading}
        />

        <SankeyModal
          show={showSankey}
          width={400}
          height={height - 10}
          numPaths={numPaths}
          selectedRegion={selected}
          hoveredRegion={hover}
          factorCsns={topFactorCSNS}
          fullCsns={topFullCSNS}
          loading={activeState}
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

        {activeInHovered?.length ? <Tooltip id="hovered"
          isOpen={hover && activeInHovered?.length}
          delayShow={0}
          delayHide={0}
          delayUpdate={0}
          place="right"
          border="1px solid gray"
          style={{
            position: 'absolute',
            pointerEvents: 'none',
            backgroundColor: "white",
            color: "black",
            fontSize: "12px",
            padding: "6px",
            left: hoveredPosition.x,
            top: hoveredPosition.y,
          }}
        >
          <b>{activeInHovered?.length} {activeInHovered?.length > 1 ? "filtered regions" : "filtered region"}</b><br />
          {/* {intersectedGenes.length ? <span>Overlapping genes: {intersectedGenes.join(", ")}<br/></span> : null} */}
          {/* {associatedGenes.length ? <span>Nearby genes: {associatedGenes.join(", ")}<br/></span> : null} */}
          {/* {activeInHovered.map(p => {
                return <div key={p.chromosome + ":" + p.i}>
                  {showPosition(p.region)}: {p.genes.map(g => 
                  <span key={g.name} style={{
                    fontWeight: g.in_gene ? "bold" : "normal",
                    fontStyle: g.in_gene ? "italic" : "normal"
                  }}>
                    {g.name}
                  </span>)}
                </div>
                })} */}
        </Tooltip> : null}

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

        {showSettings ? <SettingsPanel
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
        /> : null}
      </div>
    </div>
  )
}

export default Home
