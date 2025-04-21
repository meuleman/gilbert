import { useState, useCallback, useEffect, useContext, memo, useMemo, useRef } from 'react'
import RegionsContext from './RegionsContext'
import SelectedStatesStore from '../../states/SelectedStates'
import MinimapGenome from './MinimapGenome'
import { hilbertPosToOrder } from '../../lib/HilbertChromosome'
import { fromIndex, overlaps } from '../../lib/regions'
import { minimapLayer } from '../../layers'
import useCanvasFilteredRegions from '../../components/Canvas/FilteredRegions';
import useCanvasAnnotationRegions from '../../components/Canvas/Annotation';
import useCanvasBbox from '../../components/Canvas/Bbox';
import SVGChromosomeNames from '../../components/SVGChromosomeNames'
import SVGHilbertPaths from '../../components/SVGHilbertPaths'
import { zoomIdentity } from 'd3-zoom';
import { range, group } from 'd3-array'

import { useZoom } from '../../contexts/zoomContext';


const Minimap = ({
  width,
  height,
}) => {

  const { bbox, transform: mainMapTransform, setTransform: setMainMapTransform, scales: mainMapScales } = useZoom()

  const { filteredActiveRegions, } = useContext(RegionsContext)
  const { selected, setSelected, setRegion, clearSelected } = SelectedStatesStore()
  const [hover, setHover] = useState(null)

  const order = 4
  const zoomExtent = [1, 1]
  const [filteredRegionsByCurrentOrder, setFilteredRegionsByCurrentOrder] = useState(new Map())
  const [minimapResolutionSelected, setMinimapResolutionSelected] = useState(null)
  const [allRegionsByCurrentOrder, setAllRegionsByCurrentOrder] = useState(new Map())
  const [localTransform, setLocalTransform] = useState(zoomIdentity);
  const [panning, setPanning] = useState(false);

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

  const handleHover = useCallback((region) => {
    let overlappingRegion = region ? overlaps(region, filteredActiveRegionsRef.current)[0] : null;
    if (overlappingRegion) setHover(region)
    else setHover(null)
  }, [setHover])

  const drawEffectiveFilteredRegions = useCanvasFilteredRegions(filteredRegionsByCurrentOrder, { color: "black", opacity: 1, strokeScale: 1, mask: false, dotFill: true })
  const drawAnnotationRegionSelected = useCanvasAnnotationRegions(minimapResolutionSelected, "selected", {
    stroke: "black",
    mask: false,
    radiusMultiplier: 1.25,
    opacity: 1,
    strokeWidthMultiplier: 0.5,
    showGenes: false
  })
  const drawAnnotationRegionHover = useCanvasAnnotationRegions(hover, "selected", {
    stroke: "red",
    radiusMultiplier: 1.25,
    mask: false,
    strokeWidthMultiplier: 0.5,
    opacity: 1
  })

  const drawBbox = useCanvasBbox(bbox, { color: "black", opacity: 0.5, strokeScale: 1 })
  const canvasRenderers = useMemo(() => {
    let renderers = [
      drawEffectiveFilteredRegions,
      drawAnnotationRegionSelected,
    ]
    if(!selected) {
      renderers.push(drawBbox)
    }
    return renderers
  }, [
    drawEffectiveFilteredRegions,
    drawAnnotationRegionSelected,
    drawBbox,
    selected
  ]);

  const hoverRenderers = useMemo(() => [
    drawAnnotationRegionHover,
  ], [
    drawAnnotationRegionHover,
  ]);

  const handleTransform = useCallback((data) => {
    // setLocalTransform({x: 0, y: 0, k: 1})
  }, []);

  // use ref to keep track of the filtered active and selected regions for the click handler
  const filteredActiveRegionsRef = useRef(filteredActiveRegions);
  useEffect(() => {
    filteredActiveRegionsRef.current = filteredActiveRegions;
  }, [filteredActiveRegions])

  const selectedRef = useRef(selected);
  useEffect(() => {
    selectedRef.current = selected;
  }, [selected]);

  const handleClick = useCallback((hit) => {
    clearSelected(() => {
      // This code will run only after the state has been cleared
      if (hit) {
        if (filteredActiveRegionsRef.current?.length) {
          // only allow regions from region set to be selected
          let overlappingRegion = overlaps(hit, filteredActiveRegionsRef.current)[0];
          if (overlappingRegion?.subregion) {
            overlappingRegion = overlappingRegion.subregion;
          }
          if (overlappingRegion) {
            setSelected(overlappingRegion);
          }
        }
      }
    });
  }, [setSelected, setRegion, clearSelected, filteredActiveRegions])

  const getBbox = useCallback(() => bbox, [bbox]);

  // Handle dragging of the bounding box
  const lastDragPosRef = useRef({x: null, y: null});
  const handleBboxDrag = useCallback(({x, y}, renderThreshold = 0.01) => {
    if (
      Math.abs(lastDragPosRef.current.x - x) > renderThreshold ||  
      Math.abs(lastDragPosRef.current.y - y) > renderThreshold
    ) {

      lastDragPosRef.current = {x, y};

      let xDomain = mainMapScales.xScale.domain()
      let yDomain = mainMapScales.yScale.domain()

      let newX = (mainMapScales.width/2) - mainMapScales.xScale(x * (xDomain[1] - xDomain[0])) * mainMapTransform.k
      let newY = (mainMapScales.height/2) - mainMapScales.yScale(y * (yDomain[1] - yDomain[0])) * mainMapTransform.k

      let newTransform = zoomIdentity.translate(newX, newY).scale(mainMapTransform.k)

      requestAnimationFrame(() => {
        setMainMapTransform(newTransform);
      });
    }
  }, [mainMapTransform.k, mainMapScales.xScale, mainMapScales.yScale, mainMapScales.width, mainMapScales.height, setMainMapTransform]);

  return (
    <div className="absolute x0 y0 cursor-pointer">
      {(width > 0 && height > 0) ? <MinimapGenome
        zoomMin={zoomExtent[0]}
        zoomMax={zoomExtent[1]}
        width={width}
        height={height}
        CanvasRenderers={canvasRenderers}
        HoverRenderers={hoverRenderers}
        SVGRenderers={[
          SVGChromosomeNames({fontSize: 7}),
          SVGHilbertPaths({ stroke: "black", strokeWidthMultiplier: 0.1, opacity: 0.5 }),
        ]}
        zoomMethods={{
          transform: localTransform,
          order: 4,
          zooming: false,
          orderZoomScale: { invert: (k) => k },
          setTransform: (t) => handleTransform(t),
          setZooming: () => {},
          panning,
          setPanning,
          center: () => {},
          setCenter: () => {},
          easeZoom: (from, to) => { setLocalTransform(from); },
        }}
        onHover={handleHover}
        onClick={handleClick}
        getBbox={getBbox}
        onBboxDrag={handleBboxDrag}
      /> : null}
    </div>
  )
}
export default Minimap
