import { useState, useCallback, useEffect, useContext, memo, useMemo, useRef } from 'react'
import RegionsContext from './RegionsContext'
import SelectedStatesStore from '../../states/SelectedStates'
import HilbertGenome from '../../components/HilbertGenome'
import { hilbertPosToOrder } from '../../lib/HilbertChromosome'
import { fromIndex } from '../../lib/regions'
import { minimapLayer } from '../../layers'
import useCanvasFilteredRegions from '../../components/Canvas/FilteredRegions';
import useCanvasAnnotationRegions from '../../components/Canvas/Annotation';
import SVGChromosomeNames from '../../components/SVGChromosomeNames'
import SVGHilbertPaths from '../../components/SVGHilbertPaths'
import SVGGenePaths from '../../components/SVGGenePaths'
import SVGSelected from '../../components/SVGSelected'
import { zoomIdentity } from 'd3-zoom';
import { range, group } from 'd3-array'


const Minimap = ({
  width,
  height,
}) => {

  const { 
    activeSet,
    activeRegions, 
    filteredRegionsLoading,
    filteredActiveRegions,
    setActiveSet,
  } = useContext(RegionsContext)
  const { selected, setSelected, setRegion } = SelectedStatesStore()
  const [hover, setHover] = useState(null)

  const order = 4
  const orderDomain = [order, order]
  const zoomExtent = [1, 1]
  const [activeInHovered, setActiveInHovered] = useState(null)
  const [filteredRegionsByCurrentOrder, setFilteredRegionsByCurrentOrder] = useState(new Map())
  const [minimapResolutionSelected, setMinimapResolutionSelected] = useState(null)
  const [minimapResolutionHover, setMinimapResolutionHover] = useState(null)
  const [allRegionsByCurrentOrder, setAllRegionsByCurrentOrder] = useState(new Map())
  const [transform, setTransform] = useState(zoomIdentity);
  const [panning, setPanning] = useState(false);

  // group the full set of regions found in region set by the current order
  useEffect(() => {
    if (activeRegions?.length) {
      const groupedAllRegions = group(
        activeRegions,
        d => d.chromosome + ":" + (d.order > order ? hilbertPosToOrder(d.i, { from: d.order, to: order }) : d.i))
      setAllRegionsByCurrentOrder(groupedAllRegions)
    } else {
      setAllRegionsByCurrentOrder(new Map())
    }
  }, [activeRegions, order])

  // group the top regions found through filtering by the current order
  useEffect(() => {
    if (filteredActiveRegions?.length) {
      const groupedFilteredRegions = group(
        filteredActiveRegions,  // only using base regions for now
        d => d.chromosome + ":" + (d.order > order ? hilbertPosToOrder(d.i, { from: d.order, to: order }) : d.i))
      setFilteredRegionsByCurrentOrder(groupedFilteredRegions)
    } else {
      setFilteredRegionsByCurrentOrder(new Map())
    }
  }, [filteredActiveRegions, order])

  // convert the selected region to the minimap resolution
  useEffect(() => {
    if (selected) {
      let minimapResSelected = fromIndex(selected.chromosome, hilbertPosToOrder(selected.i, { from: selected.order, to: order }), order)
      setMinimapResolutionSelected(minimapResSelected)
    } else {
      setMinimapResolutionSelected(null)
    }
  }, [selected])

  // convert the hover region to the minimap resolution
  useEffect(() => {
    if (hover && !selected) {
      let minimapResHover = fromIndex(hover.chromosome, hilbertPosToOrder(hover.i, { from: hover.order, to: order }), order)
      setMinimapResolutionHover(minimapResHover)
    } else {
      setMinimapResolutionHover(null)
    }
  }, [hover, selected])

  const drawEffectiveFilteredRegions = useCanvasFilteredRegions(filteredRegionsByCurrentOrder, { color: "orange", opacity: 1, strokeScale: 1, mask: true })
  // const drawAllFilteredRegions = useCanvasFilteredRegions(allRegionsByCurrentOrder, { color: "gray", opacity: 0.5, strokeScale: 0.5, mask: false })
  const drawAnnotationRegionSelected = useCanvasAnnotationRegions(minimapResolutionSelected, "selected", {
    stroke: "red",
    mask: false,
    radiusMultiplier: 1.25,
    opacity: 1,
    strokeWidthMultiplier: 0.5,
    showGenes: false
  })
  const drawAnnotationRegionHover = useCanvasAnnotationRegions(minimapResolutionHover, "hover", {
    // if there is an activeSet and no paths in the hover, lets make it lightgray to indicate you can't click on it
    stroke: "black",
    radiusMultiplier: 1.25,
    mask: false,
    strokeWidthMultiplier: 0.5,
    showGenes: false,
    highlightPath: true,
    opacity: 1
  })
  const canvasRenderers = useMemo(() => [
    drawEffectiveFilteredRegions,
    // drawAllFilteredRegions,
    drawAnnotationRegionSelected,
  ], [
    drawEffectiveFilteredRegions,
    // drawAllFilteredRegions,
    drawAnnotationRegionSelected,
  ]);

  const hoverRenderers = useMemo(() => [
    drawAnnotationRegionHover,
  ], [
    drawAnnotationRegionHover,
  ]);

  const handleZoom = useCallback((newZoom) => {
    console.log("ZOOMIN....")
  }, [])

  const handleData = useCallback((data) => {
    console.log("Data loaded");
  }, []);

  const handleTransform = useCallback((data) => {
    setTransform({x: 0, y: 0, k: 1})
  }, []);

  return (
    <div className="absolute x0 y0">
      <HilbertGenome
        orderMin={orderDomain[0]}
        orderMax={orderDomain[1]}
        zoomMin={zoomExtent[0]}
        zoomMax={zoomExtent[1]}
        width={width}
        height={height}
        // zoomToRegion={region}
        activeLayer={minimapLayer}
        // selected={selected}
        // zoomDuration={duration}
        CanvasRenderers={canvasRenderers}
        HoverRenderers={hoverRenderers}
        SVGRenderers={[
          SVGChromosomeNames({fontSize: 10}),
          SVGHilbertPaths({ stroke: "black", strokeWidthMultiplier: 0.1, opacity: 0.5 }),
          SVGSelected({ hit: hover, dataOrder: order, stroke: "black", highlightPath: true, type: "hover", strokeWidthMultiplier: 0.1, showGenes: true }),
          SVGGenePaths({ stroke: "black", strokeWidthMultiplier: 0.1, opacity: 0.25 }),
        ]}
        onZoom={handleZoom}
        zoomMethods={{
          transform,
          order: 4,
          zooming: false,
          orderZoomScale: { invert: (k) => k },
          setTransform: (t) => handleTransform(t),
          setZooming: () => {},
          panning,
          setPanning,
          center: () => {},
          setCenter: () => {},
          easeZoom: (from, to) => { setTransform(from); },
        }}
        // onHover={handleHover}
        // onClick={handleClick}
        onData={handleData}
        // onScales={setScales}
        // onZooming={(d) => setIsZooming(d.zooming)}
        // onLoading={setMapLoading}
        // onLayer={handleLayer}
        // debug={showDebug}
        miniMap={true}
      />
    </div>
  )
}
export default Minimap
