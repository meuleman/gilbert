import { useEffect, useState, useRef, useCallback, useMemo, useContext } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'

import { useZoom } from '../contexts/ZoomContext';

import { urlify, jsonify, fromPosition, fromCountOrder, overlaps } from '../lib/regions'
import { hilbertPosToOrder } from '../lib/HilbertChromosome'
import { getRangesOverCell } from "../lib/Genes"

import { useContainerSize } from '../lib/utils';
import { range, group } from 'd3-array'
import { Tooltip } from 'react-tooltip'

import './Home.css'
// base component
import HilbertGenome from '../components/HilbertGenome'
import LinearGenome from '../components/LinearGenome'
// rendering components
import SVGHilbertPaths from '../components/SVGHilbertPaths'
import SVGGenePaths from '../components/SVGGenePaths'
import ZoomLegend from '../components/ZoomLegend'
import StatusBar from '../components/StatusBar'
import LeftToolbar from '../components/LeftToolbar'
import SettingsPanel from '../components/SettingsPanel';
import LayerLegend from '../components/LayerLegend'
import SVGChromosomeNames from '../components/SVGChromosomeNames'

import RegionsContext from '../components/Regions/RegionsContext';
import RegionSetModalStatesStore from '../states/RegionSetModalStates'
import SelectedStatesStore from '../states/SelectedStates'
import ComponentSizeStore from '../states/ComponentSizes';

import SankeyModal from '../components/Narration/SankeyModal';
import HeaderRegionSetModal from '../components/Regions/HeaderRegionSetModal';
import ManageRegionSetsModal from '../components/Regions/ManageRegionSetsModal'
import ActiveRegionSetModal from '../components/Regions/ActiveRegionSetModal'
import SummarizePaths from '../components/Narration/SummarizePaths'
import ZoomInspector from '../components/ZoomInspector'
import Power from '../components/Narration/Power'

// custom hooks
import useSelectedEffects from '../components/hooks/useSelectedEffects'
import useLayerEffects from '../components/hooks/useLayerEffects';

// layer configurations
import { fullList as layers } from '../layers'

// import RegionFilesSelect from '../components/Regions/RegionFilesSelect'
// autocomplete
// import Autocomplete from '../components/Autocomplete/Autocomplete'
import GeneSearch from '../components/GeneSearch'

import useCanvasFilteredRegions from '../components/Canvas/FilteredRegions';
import useCanvasAnnotationRegions from '../components/Canvas/Annotation';
import useCanvasPathAnnotation from '../components/Canvas/PathAnnotation';

import { getSet } from '../components/Regions/localstorage'

import { linearGenomeHeight } from '../components/Constants/Constants'


/**
BT ADDED IMPORTS
*/
import DebugIcon from "@/assets/debug.svg?react"
import RevertIcon from "@/assets/revert.svg?react"
import GilbertG from "@/assets/gilbert-logo-g.svg?react"
import SettingsIcon from "@/assets/settings.svg?react"

function Home() {
  const location = useLocation();
  const queryParams = new URLSearchParams(location.search);
  const initialRegionset = queryParams.get('regionset');
  let initialSelectedRegion = queryParams.get('region');
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

  const { 
    order, orderZoomScale, transform, 
    setTransform, orderOffset, setOrderOffset, 
    zoomMin, zoomMax, orderMin, orderMax, 
    setSelectedOrder, easeZoom
  } = useZoom()
  const zoomExtent = useMemo(() => [zoomMin, zoomMax], [zoomMin, zoomMax])
  const orderDomain = useMemo(() => [orderMin, orderMax], [orderMin, orderMax])

  const containerRef = useRef()

  // effects for handling the layer order and setting the layer
  const { 
    setLayerOrder, layerOrder, layer, setLayer, handleRevertLayerOrder, layerOrderDeviated
  } = useLayerEffects()

  // Zoom duration for programmatic zoom
  const [duration, setDuration] = useState(1000)
  const handleChangeDuration = (e) => {
    setDuration(+e.target.value)
  }

  const [isZooming, setIsZooming] = useState(false)
  const [mapLoading, setMapLoading] = useState(false)

  // We want to keep track of the zoom state
  const [zoom, setZoom] = useState({ points: [], bbox: {} })
  const zoomRef = useRef(zoom)
  useEffect(() => {
    zoomRef.current = zoom
  }, [zoom])
  
  const [showSankey, setShowSankey] = useState(false)

  // store
  const { setShowActiveRegionSet, setShowSummary } = RegionSetModalStatesStore()
  const { 
    selected, setSelected, region, setRegion, clearSelected,
    selectedNarration, setSelectedNarration, clearSnapshots, 
    regionSnapshots, popRegionFromSnapshots, createKey,
  } = SelectedStatesStore()
  // selected summary effects
  useSelectedEffects()

  const { setMainMapSize } = ComponentSizeStore()

  // determine window size
  const [width, setWidth] = useState(1)
  const [height, setHeight] = useState(1)
  const containerSize = useContainerSize(containerRef)
  useEffect(() => {
    setMainMapSize(containerSize)
    setWidth(containerSize.width)
    setHeight(containerSize.height)
  }, [containerSize, setMainMapSize, setWidth, setHeight])

  // only on initial mount
  useEffect(() => {
    // selected powers the sidebar modal and the 1D track
    setSelected(jsonify(initialSelectedRegion))
    // // changing the region changes the zoom and will also highlight on the map
    // setRegion(jsonify(initialSelectedRegion))
  }, [])

  const initialUpdateRef = useRef(true);

  const {
    activeSet,
    activeState,
    clearActive,
    saveSet,
    activeGenesetEnrichment,
    setRegionSetNarration,
    setRegionSetAbstracts,
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
  }, [setZoom, setLayer])

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
      setCrossScaleNarration([])
    }
  }, [initialSelectedRegion])


  const [data, setData] = useState(null)
  const dataRef = useRef(data)
  useEffect(() => {
    dataRef.current = data
  }, [data])

  const [searchByFactorInds, setSearchByFactorInds] = useState([])


  const updateUrlParams = useCallback((newRegionSet, newSelected, newFilters) => {
    const params = new URLSearchParams();
    if (newRegionSet) params.set('regionset', newRegionSet);
    if (newSelected) params.set('region', urlify(newSelected));
    // if (newFilters) params.set('filters', urlifyFilters(newFilters));
    navigate({ search: params.toString() }, { replace: true });
  }, [navigate]);

  const [regionset, setRegionSet] = useState(initialRegionset)
  const [exampleRegions, setExampleRegions] = useState([])
  useEffect(() => {
    const set = getSet(regionset)
    if (set) {
      setExampleRegions(set)
    }
    if (!initialUpdateRef.current) {  // Only update URL params if not the initial render
      updateUrlParams(regionset, selected)
    }
  }, [regionset, selected, setExampleRegions, updateUrlParams])

  useEffect(() => {
    // After the initial render, set to false so URL updates can occur
    initialUpdateRef.current = false;
  }, []);

  // cross scale narration
  const handleChangeCSNIndex = (e) => setCrossScaleNarrationIndex(e.target.value)
  // function to handle the change of the method in which CSN paths are scored
  const handleCsnMethodChange = (e) => setCsnMethod(e.target.value)
  // function to change the ENR threshold for CSN
  const handleCsnEnrThresholdChange = (e) => setCsnEnrThreshold(e.target.value)

  const handleHover = useCallback((hit) => {
    setHover(hit)
  }, [setHover])

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


  const fill1DTrack = useCallback((start, end) => {
    // target number of regions at the start of each order
    const targetRegionsStart = 500
    // for order 14, match the scaling factor in LinearGenome
    const ranges = range(4, 15).map(d => {
      const size = 4 ** (14 - d)
      const atStart = d !== 14 ? size * targetRegionsStart : size * targetRegionsStart * 0.2
      const atEnd = d !== 14 ? (size * targetRegionsStart) / 4 : (size * targetRegionsStart) / 4 * 0.2
      return {
        order: d,
        atStart,
        atEnd,
      }
    })
    
    const regionSize = end - start
    const order = ranges.find(d => d.atStart >= regionSize && d.atEnd <= regionSize)

    if(order) {
      const logAtStart = Math.log2(order.atStart)
      const logAtEnd = Math.log2(order.atEnd)
      const logRegionSize = Math.log2(regionSize)
      // TODO: This calculation is slightly off for ranges between atStart and atEnd for order, zooms in too far
      const percent = (logAtStart - logRegionSize) / (logAtStart - logAtEnd)
      return percent + order.order
    } else if(regionSize > ranges.find(d => d.order === 4).atStart) {
      // if the region size is larger than the max range at order 4, return 4
      return ranges[0].order
    } else if(regionSize > ranges.find(d => d.order === 14).atStart) {
      // if region size in between order 14 and 13 ranges (due to order 14 scaling factor), return 14 (zoomed out)
      return 14
    } else if(regionSize < ranges.find(d => d.order === 14).atEnd) {
      // if the region size is smaller than the smallest range at order 14, return 14 (zoomed in)
      return 15
    }
    return null
  }, [])

  const zoomToCoordinateRange = useCallback((chromosome, start, end, buffer = 0.2) => {
    // calculate center point and raw order value
    const centerPosition = Math.floor((start + end) / 2);
    const bufferSize = Math.floor((end - start) * buffer);
    const rawOrder = fill1DTrack(start - bufferSize, end + bufferSize);
    if (!rawOrder) return;
    
    console.log(`Zooming to ${chromosome}:${start}-${end} at order ${rawOrder}`);
    
    // find center region
    const intOrder = Math.floor(rawOrder);
    const region = fromPosition(chromosome, centerPosition, centerPosition, intOrder);

    // calculate k value from the raw order
    const targetK = orderZoomScale.invert(Math.pow(2, rawOrder - orderMin));
    
    // create new transform that zooms to center point
    const mapCenterX = width / 2;
    const mapCenterY = height / 2;
    const pointX = scales.xScale(region.x);
    const pointY = scales.yScale(region.y);
    
    const newTransform = {
      k: targetK,
      x: mapCenterX - pointX * targetK,
      y: mapCenterY - pointY * targetK
    };
    easeZoom(transform, newTransform, () => {})
    
  }, [fill1DTrack, setRegion, scales, orderZoomScale, orderMin, width, height, setTransform, transform]);

  const handleChangeLocationViaGeneSearch = useCallback((selected) => {
    if (selected.gene) {
      zoomToCoordinateRange(selected.gene.chromosome, selected.gene.start, selected.gene.end)
    } else {
      zoomToCoordinateRange(selected.chromosome, selected.start, selected.end)
    }
  }, [zoomToCoordinateRange])

  const onData = useCallback((payload) => {
    setData(payload)
  }, [setData])

  const [numPaths, setNumPaths] = useState(100)
  const [topFullCSNS, setTopFullCSNS] = useState([])
  const [topFactorCSNS, setTopFactorCSNS] = useState([])
  const [hoveredTopCSN, setHoveredTopCSN] = useState(null)
  const [csnSort, setCSNSort] = useState("factor")
  
  useEffect(() => {
    !activeSet && setShowActiveRegionSet(!!selected)  // if selected but no region set, show the minimap anyway
  }, [selected])

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


  const handleSelectedCSNSankey = useCallback((csn) => {
    let hit = fromPosition(csn.chromosome, csn.start, csn.end, order)
    console.log("SELECTED SANKEY CSN", csn, hit)
    setSelected(csn?.region)
    // setRegion(hit)
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

  const hoverArrowRange = useMemo(() => {
    if(!hover) return []
      let range = fromCountOrder(hover.chromosome, hover.start, 2, hover.order)
      return range
  }, [hover])

  const geneRanges = useMemo(() => {
    if(!hover) return []
    let ranges = getRangesOverCell(hover, hover.order)
    return ranges
  }, [hover])


  // const drawFilteredRegions = useCanvasFilteredRegions(filterSegmentsByCurrentOrder)
  // const drawActiveFilteredRegions = useCanvasFilteredRegions(activeRegionsByCurrentOrder, { color: "orange", opacity: 1, strokeScale: 1, mask: true })
  const drawEffectiveFilteredRegions = useCanvasFilteredRegions(filteredRegionsByCurrentOrder, { color: "orange", opacity: 1, strokeScale: 1, mask: true })
  const drawAllFilteredRegions = useCanvasFilteredRegions(allRegionsByCurrentOrder, { color: "gray", opacity: 0.5, strokeScale: 0.5, mask: false })
  const drawAnnotationRegionSelected = useCanvasAnnotationRegions(selected, "selected", {
    stroke: "orange",
    mask: false,
    radiusMultiplier: 1,
    strokeWidthMultiplier: 0.35,
    showGenes: false
  })
  const drawAnnotationRegionHover = useCanvasAnnotationRegions(hover, "hover", {
    stroke: "gray",
    mask: false,
    radiusMultiplier: 1,
    strokeWidthMultiplier: 0.15,
    showGenes: false
  })
  const drawPathHover = useCanvasPathAnnotation([hoverArrowRange], {
    stroke: "gray",
    radiusMultiplier: 1,
    strokeWidthMultiplier: 0.1,
    startMarker: false,
    endMarker: true,
    limitLength: true
  });
  const drawPathGenes = useCanvasPathAnnotation(geneRanges, {
    stroke: "black",
    radiusMultiplier: 1,
    strokeWidthMultiplier: 0.1,
    startMarker: true,
    endMarker: true,
    limitLength: true
  });
  const canvasRenderers = useMemo(() => [
    drawEffectiveFilteredRegions,
    drawAllFilteredRegions,
    drawAnnotationRegionSelected,
    drawAnnotationRegionHover,
    drawPathGenes,
    drawPathHover,
  ], [
    drawEffectiveFilteredRegions,
    drawAllFilteredRegions,
    drawAnnotationRegionSelected,
    drawAnnotationRegionHover,
    drawPathGenes,
    drawPathHover,
  ]);


  const clearSelectedState = useCallback(() => {
    console.log("CLEARING STATE")
    clearSelected()  // from SelectedStatesStore
  }, [setRegion, setSelected, setSelectedNarration])

  const clearRegionSetSummaries = useCallback(() => {
    setRegionSetNarration("")
    setRegionSetAbstracts([])
  }, [setRegionSetAbstracts, setRegionSetNarration])

  const regionSetStateRef = useRef({ activeFilters, activeRegions, filteredActiveRegions });
  useEffect(() => {
    // if the filters change from a user interaction we want to clear the selected
    // if(filters.userTriggered) clearSelectedState()
    // if the active filters or active regions change we want to clear the selected
    
    // below is done to prevent clearing on initialization for when initial selected region is provided in URL
    // is this the best way to solve this problem?
    const prevValues = regionSetStateRef.current;
    if (
      (JSON.stringify(prevValues.activeFilters) !== JSON.stringify(activeFilters)) ||
      (JSON.stringify(prevValues.activeRegions) !== JSON.stringify(activeRegions)) ||
      (JSON.stringify(prevValues.filteredActiveRegions) !== JSON.stringify(filteredActiveRegions))
    ) {
      clearSelectedState()
      clearRegionSetSummaries()
    }
    regionSetStateRef.current = { activeFilters, activeRegions, filteredActiveRegions };
    // filters, activeFilters, activeRegions, filteredActiveRegions, clearSelectedState
  }, [activeFilters, activeRegions, filteredActiveRegions])

  // TODO: consistent clear state
  const handleModalClose = useCallback(() => {
    clearSelectedState()
    clearSnapshots()
  }, [clearSelectedState])

  const handleClear = useCallback(() => {
    console.log("handle clear!")
    clearSelectedState()
    clearRegionSetSummaries()
    clearActive()
    // setActiveSet(null)
  }, [clearSelectedState, clearActive, clearRegionSetSummaries])

  // use ref to keep track of the filtered active regions for the click handler
  const filteredActiveRegionsRef = useRef(filteredActiveRegions);
  useEffect(() => {
    filteredActiveRegionsRef.current = filteredActiveRegions;
  }, [filteredActiveRegions])

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

      // TODO: check if logic is what we want
      // if region set exists, we grab the first region (since they are ordered) that falls within the selected region
      // use region subpath if it exists
      // if the selected region is smaller than the overlapping region set region, use the originally selected region
      let selected = hit
      if(filteredActiveRegionsRef.current?.length) {
        let overlappingRegion = overlaps(hit, filteredActiveRegionsRef.current)[0] || hit
        overlappingRegion.subregion ? overlappingRegion = overlappingRegion.subregion : null
        selected = overlappingRegion.order > hit.order ? overlappingRegion : hit
      } 
      setSelected(selected)
      // setRegion(hit)  // this sets zoom. we should set with selected segment, not implied segment
    }
  }, [setSelected, setRegion, clearSelectedState, filteredActiveRegions])

  const autocompleteRef = useRef(null)
  // keybinding that closes the modal on escape
  useEffect(() => {
    function handleKeyDown(e) {
      if (e.key === "Escape") {
        if(!!selectedRef.current?.derivedFrom) {
          // if the selected region is derived, pop it from the snapshots
          const selectedKey = createKey(selectedRef.current)
          popRegionFromSnapshots(selectedKey)
        } else {
          // if the selected is original region (not derived), close the modal
          handleModalClose()
        }
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
  }, [handleModalClose, regionSnapshots])

  const [showLayerLegend, setShowLayerLegend] = useState(false)
  const [showSpectrum, setShowSpectrum] = useState(false)
  const [showManageRegionSets, setShowManageRegionSets] = useState(false)

  useEffect(() => {
    if (activeSet) {
      setShowManageRegionSets(false)
      setShowLayerLegend(false)
      // setShowFilter(true)
      setShowActiveRegionSet(true)
      // setShowSummary(true)
    } else {
      setShowActiveRegionSet(false)
      // setShowSpectrum(false)
      setShowSummary(false)
    }
  }, [activeSet])

  useEffect(() => {
    if (!activeSet) {
      setShowSpectrum(false)
    } else {
      // console.log("FIRING FROM HERE!!!", activeGenesetEnrichment?.length)
      activeGenesetEnrichment?.length > 0 ? setShowSpectrum(true) : setShowSpectrum(false)
    }
  }, [activeSet, activeGenesetEnrichment])

  const handleLogoClick = () => {
    navigate('/', { replace: true });
    setTimeout(() => {
      window.location.reload();
    }, 10);
  };

  // When narration data updates, recalc the zoom order.
  // (The narration region's order is increased by 0.5; but it is at least 4.)
  useEffect(() => {
    if (!selectedNarration) return;
    let newZoom = selectedNarration.region.order + 0.5;
    if (newZoom < 4) newZoom = 4;
    setSelectedOrder(newZoom);
  }, [selectedNarration]);

  return (
    <div className="w-dvw h-dvh overflow-hidden flex flex-col">
      <div className="grow-0">
        <div className="flex text-xs border-separator border-b-1">
          <div className="grow-0 border-separator border-r-1">
            <div className="h-globalMenuBar aspect-square flex items-center justify-center cursor-pointer">
              <GilbertG onClick={handleLogoClick}/>
            </div>
          </div>
          <div className="grow-0 border-separator border-r-1">
            <HeaderRegionSetModal />
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
          <div className="grow-0 h-globalMenuBar aspect-square flex items-center justify-center border-separator border-r-1">
            <DebugIcon />
          </div>
          <div className="grow-0 h-globalMenuBar aspect-square flex items-center justify-center">
            <button 
              className="grow-0 h-globalMenuBar aspect-square flex items-center justify-center disabled:opacity-50 disabled:cursor-not-allowed"
              disabled={!layerOrderDeviated}
              onClick={handleRevertLayerOrder}
            >
              <RevertIcon className="w-5 h-5"/>
            </button>
          </div>
        </div>
      </div>
      <div className="flex-1 flex min-h-0">
        <div className="grow-0">
          <LeftToolbar
            content={{
              activeRegionSetModal: <ActiveRegionSetModal />,
              regionSetSummary: <SummarizePaths />
            }}
          >
          </LeftToolbar>
        </div>
        <div className="flex-1 flex" >
          <div className="flex-1 flex flex-row">
            <div className="flex-1 flex flex-col" ref={containerRef}>
              {/* <div className="grow-0">
                {activeGenesetEnrichment && (
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
              </div> */}
              {selected ? 
              <div className="w-full flex-1 flex flex-col">
                <div className="relative flex-1">
                  {/*<div className="absolute top-0 left-1/4 w-1/2 h-full overflow-hidden p-2">*/}
                  <div className="absolute top-1 w-full h-full overflow-hidden px-2 pt-6 pb-4 cursor-default">
                    <Power onClose={handleModalClose} showLayerLegend={showLayerLegend}/>
                  </div>
                </div>
              </div>
              : 
              <div className="flex-1 flex flex-col">
                <div className="relative flex-1">
                  {/*  ref={containerRef}  */}
                  <div className="absolute top-0 left-0 w-full h-full overflow-hidden"> 
                    <LayerLegend
                      data={data}
                      hover={hover}
                      selected={selected}
                      show={showLayerLegend}
                      searchByFactorInds={searchByFactorInds}
                    />
                    {/* <div className="grow-0">
                      {activeGenesetEnrichment && (
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
                    </div> */}
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
                      SVGRenderers={[
                        SVGChromosomeNames({}),
                        showHilbert && SVGHilbertPaths({ stroke: "black", strokeWidthMultiplier: 0.1, opacity: 0.5 }),
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
                          height={linearGenomeHeight}
                          mapWidth={width}
                          mapHeight={height}
                          hover={hover}
                          onHover={handleHover}
                          onClick={(hit) => {
                            // setRegion(hit)
                          }}
                          showCoordinatesInTooltip={false}
                          showLayerNameInTooltip={false}
                        />
                      </div>
                    </div>
                  )}
                </div>
              </div>}
            </div>
            <div className="grow-0 shrink-0 col-start-2 row-start-2 row-end-3 flex">
              {selectedNarration ? 
                <ZoomInspector zoomHeight={height} /> : 
                <ZoomLegend
                  k={transform.k}
                  height={height}
                  effectiveOrder={order}
                  zoomExtent={zoomExtent}
                  orderDomain={orderDomain}
                  layerOrder={layerOrder}
                  setLayerOrder={setLayerOrder}
                  layer={layer}
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
              }
            </div>
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
          showDebug={showDebug}
          showSettings={showSettings}
          orderOffset={orderOffset}
          layers={layers}
          onClear={handleClear}
          onDebug={handleChangeShowDebug}
          onSettings={handleChangeShowSettings}
          onOrderOffset={setOrderOffset}
        />
      </div>

      {/* These are all components that seem to need to exist in order for app
        to render and zoom correctly
       */}
      <div className="fixed top-0 left-full opacity-0 pointer-events-none">
         
        <GeneSearch
          onSelect={handleChangeLocationViaGeneSearch}
        />

        <LayerLegend
          data={data}
          hover={hover}
          selected={selected}
          show={showLayerLegend}
          onShow={setShowLayerLegend}
          searchByFactorInds={searchByFactorInds}
        />

        <ManageRegionSetsModal
          show={showManageRegionSets}
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
          showDebug={showDebug}
          showSettings={showSettings}
          orderOffset={orderOffset}
          layers={layers}
          onClear={handleClear}
          onDebug={handleChangeShowDebug}
          onSettings={handleChangeShowSettings}
          onOrderOffset={setOrderOffset}
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
