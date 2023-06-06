import { useReducer, useEffect, useRef, useMemo, useCallback } from 'react';

// import  debounce from 'lodash.debounce';
import { scaleLinear } from 'd3-scale';
import { zoom, zoomIdentity } from 'd3-zoom';
import { select } from 'd3-selection';
import { quadtree } from 'd3-quadtree';
import { range } from 'd3-array';

import { HilbertChromosome, hilbertPosToOrder } from '../lib/HilbertChromosome';
import { getBboxDomain, untransform } from '../lib/bbox';
import Data from '../lib/data';
import debounce from '../lib/debounce'
import scaleCanvas from '../lib/canvas';
import CanvasBase from './CanvasBase';

import './HilbertGenome.css';


// Define the initial state
const initialState = {
  // The transform drives pretty much everything. It is set by the d3-zoom behavior (scrolling and panning)
  transform: zoomIdentity,
  // The bbox is calculated from the transform and is used to determine which data points are visible
  bbox: null,
  // The hilbert order determined by the zoom level (the k component of the transform)
  order: 0,
  // The hilbert points in view for the current order
  points: [],
  // The data fetched from the layer for each point in points
  data: [],
  // The hilbert order when the data is fetched (this could be different than the current order if the user zooms in before the data is fetched)
  dataOrder: 0,
  // The meta data for each available order of the layer
  metas: new Map(),
  // The data point selected by clicking
  selected: null,
  // The data point selected by hovering
  hovered: null
};

// Define the actions
const actions = {
  ZOOM: "ZOOM", // have all the zoom dependencies update the state at once
  SET_DATA: "SET_DATA",
  SET_METAS: "SET_METAS",
  SET_SELECTED: "SET_SELECTED",
  SET_HOVERED: "SET_HOVERED",
};

// Define the reducer function
function reducer(state, action) {
  switch (action.type) {
    case actions.ZOOM: {
      const { transform, bbox, order, points } = action.payload;
      return { ...state, transform, bbox, order, points };
    }
    case actions.SET_DATA: {
      const { data, order } = action.payload;
      return { ...state, data, dataOrder: order }
    }
    case actions.SET_METAS:
      return { ...state, metas: action.payload };
    case actions.SET_SELECTED:
      return { ...state, selected: action.payload };
    case actions.SET_HOVERED:
      return { ...state, hovered: action.payload };
    default:
      throw new Error();
  }
}


// TODO: broadcast channel for pubsub events (zoom, hover, click, etc)

const HilbertGenome = ({
    orderDomain,
    zoomExtent,
    xDomain = [0, 5],
    yDomain = [0, 5],
    sizeDomain = [0, 5],
    zoomToRegion = null,
    zoomDuration = 1000,
    width,
    height,
    activeLayer = "bands",
    LayerConfig={},
    SVGRenderers=[],
    onZoom = () => {},
    onHover = () => {},
    onLayer= () => {},
    onClick = () => {},
    debug = false,
  }) => {
  const [state, dispatch] = useReducer(reducer, initialState);

  const canvasRef = useRef();
  const svgRef = useRef();
  const sceneRef = useRef();

  let diff = height - width;
  let xRange = [0, width]
  let yRange = [diff / 2, height - diff / 2] 
  let sizeRange = [0, width]
  if (width > height) {
    yRange = [0, height]
    sizeRange = [0, height]
    diff = width - height;
    xRange = [diff / 2, width - diff / 2]
  }

  
  // setup the scales
  const xScale = useMemo(() => scaleLinear().domain(xDomain).range(xRange), [xDomain, xRange]);
  const yScale = useMemo(() => scaleLinear().domain(yDomain).range(yRange), [yDomain, yRange]);
  const sizeScale = useMemo(() => scaleLinear().domain(sizeDomain).range(sizeRange), [sizeDomain, sizeRange]);
  const orderZoomScale = useMemo(() =>  scaleLinear().domain(zoomExtent).range([1, Math.pow(2, orderDomain[1] - orderDomain[0] + 0.999)]), [orderDomain, zoomExtent])
  // const xScale = scaleLinear().domain(xDomain).range(xRange)
  // const yScale = scaleLinear().domain(yDomain).range(yRange)
  // const sizeScale = scaleLinear().domain(sizeDomain).range(sizeRange)
  // const orderZoomScale =  scaleLinear().domain(zoomExtent).range([1, Math.pow(2, orderDomain[1] - orderDomain[0] + 0.999)])

  const scales = { xScale, yScale, sizeScale, orderZoomScale, width, height }

  // the layer can change when the order changes once we implement some logic for it
  const layer = useMemo(() => {
    if(activeLayer == "auto") {
      // TODO have some logic for automatically selecting the layer
    } else {
      return activeLayer
    }
  }, [state.order, activeLayer])

  // Data fetching
  const dataClient = Data({ 
    baseURL: LayerConfig.baseURL, 
    debug
  })
  // this debounced function fetches the data and updates the state
  const fetchData = useMemo(() => {
    return () => {
      // we dont want to fetch data if the order is not within the layer order range
      if (state.order < layer.orders[0] || state.order > layer.orders[1]) return;
      let myPromise = dataClient.fetchData(layer.datasetName, state.order, state.points)
      let myCallback = (data) => {
        if(data)
          dispatch({ type: actions.SET_DATA, payload: { data, order: state.order } });
      }
      debounce(myPromise, myCallback, 150)
    }
  }, [state.order, state.points, layer]);


  useEffect(() => {
    if (layer) {
      console.log("layer", layer)
      // fetch the meta for each order in this layer
      const metas = Promise.all(range(layer.orders[0], layer.orders[1] + 1)
        .map(async (order) => {
          return dataClient.fetchMeta(layer.datasetName, order, "meta")
        })
      ).then(metas => {
        console.log("METAS", metas)
        const metaMap = new Map(metas.map(meta => [meta.order, meta]))
        dispatch({ type: actions.SET_METAS, payload: metaMap})
      })
      // onLayer(layer)
    }
  }, [layer])


  // setup the zoom behavior
  const zoomBehavior = useMemo(() => {
    return zoom()
      .extent([
        [0, 0],
        [width, height]
      ])
      .translateExtent([
        [0, 0],
        [width, height]
      ])
      .scaleExtent(zoomExtent)
    }, [svgRef, zoomExtent, width, height])


  // we setup a function we can call to re-render our layer
  // this allows us to re-render whenever the transform changes (frequently on zoom)
  // with the latest data available (updated via state)
  const renderCanvas = useMemo(() => { 
    return function(transform, points) {
      // notice that we are overriding transform and points in the state we pass in
      // this is because we want to render immediately with the values in the zoom handler
      // the data in the state may be stale but we still want to render it
      // this will all be run again when the data is updated to draw fresh data
      CanvasBase({ scales, state: { 
        data: state.data, 
        points, 
        order: state.order, 
        dataOrder: state.dataOrder, 
        transform
      }, layer, canvasRef })

      layer.renderer({ scales, state: { 
        data: state.data, 
        points, 
        meta: state.metas.get(state.dataOrder), 
        order: state.order, 
        dataOrder: state.dataOrder, 
        transform
      }, layer, canvasRef })
    }
  }, [state, scales, layer, canvasRef])

  

  // Zoom event handler
  // This is responsible for setting up most of the rendering dependencies
  const handleZoom = useCallback((event) => {
    // console.log("zoom event", event)
    let transform = event.transform;
    // update the svg transform
    select(sceneRef.current)
      .attr("transform", transform)

    // calculate the hilbert order
    let orderRaw = orderDomain[0] + Math.log2(orderZoomScale(transform.k))
    let order = Math.floor(orderRaw)
    if(order < orderDomain[0]) order = orderDomain[0]
    if(order > orderDomain[1]) order = orderDomain[1]

    let hilbert = HilbertChromosome(order, { padding: 2 })
    let bbox = getBboxDomain(transform, xScale, yScale, width, height)    
    let points = hilbert.fromBbox(bbox)

    const payload = {
      transform,
      order,
      bbox,
      points,
    }
    // update the state
    dispatch({ type: actions.ZOOM, payload })
    
    // update the parent component
    onZoom(payload)

    // we want to update our canvas renderer immediately with new transform
    renderCanvas(transform, points)
  }, [renderCanvas]);

  useEffect(() => {
    // we want to fetch after every time the points recalculate
    // this will be often but the fetch is debounced
    fetchData()
  }, [state.points, state.metas])

  useEffect(() => {
    // we want to make sure and render again once the data loads
    renderCanvas(state.transform, state.points)
  }, [state.data, state.points])


  // setup the event handlers for zoom and attach it to the DOM
  zoomBehavior
    .on("zoom", handleZoom)
    .filter((event) => {
      if(event.type === 'dblclick') return false
      return true
    })
  select(svgRef.current).call(zoomBehavior)

  // run the zoom with the initial transform when the component mounts
  useEffect(() => {
    zoomBehavior.transform(select(svgRef.current), state.transform)
  }, [width, height]);
  useEffect(() => {
    scaleCanvas(canvasRef.current, canvasRef.current.getContext("2d"), width, height)
  }, [canvasRef, width, height])

  const zoomToBox = useMemo(() => {
    return (x0,y0,x1,y1) => {

      // TODO the multipliers should be based on aspect ratio
      const xOffset = 2.5
      const yOffset = 1.75
      let tx = xScale(x0) - sizeScale(x1 - x0) * xOffset
      let ty = yScale(y0) - sizeScale(y1 - y0) * yOffset
      let tw = xScale(x1 - x0) - xScale(0) // the width of the box
      let xw = xScale(xScale.domain()[1] - xScale.domain()[0])
      // we zoom to 1/4 the scale of the hit
      let scale = xw/tw/4
      let transform = zoomIdentity.translate(-tx * scale, -ty * scale).scale(scale)

      // transitionStarted()
      select(svgRef.current)
        .transition()
        .duration(zoomDuration)
        .call(zoomBehavior.transform, transform)
      // transitionFinished()
    }
  }, [state.order, xScale, yScale, sizeScale, svgRef, zoomDuration, zoomBehavior])

  useEffect(() => {
    if(zoomToRegion) {
      const length = zoomToRegion.end - zoomToRegion.start
      // figure out the appropriate order to zoom to
      let order = orderDomain[1];

      // console.log("length", length)
      
      while(length > hilbertPosToOrder(1, { from: order, to: orderDomain[1] })) {
        // console.log("order", order, hilbertPosToOrder(1, { from: order, to: orderDomain[1] }))
        order--;
        if(order == orderDomain[0]) break;
      }
      // console.log("zoom to region", zoomToRegion, order)
      let pos = hilbertPosToOrder(zoomToRegion.start, { from: orderDomain[1], to: order })
      let hilbert = HilbertChromosome(order, { padding: 2 })
      let hit = hilbert.get2DPoint(pos, zoomToRegion.chromosome)
      // console.log("hit!", hit)
      zoomToBox(hit.x, hit.y, hit.x + hilbert.step, hit.y + hilbert.step)
    }
  }, [zoomToRegion])



  // MOUSE INTERACTIONS
  // we create a quadtree so we can find the closest point to the mouse
  const qt = useMemo(() => {
    if(!state.points) return null
    let qt = quadtree()
        .extent([[-1, -1], [5 + 1, 5 + 1]])
        .x(d => d.x)
        .y(d => d.y)
        .addAll(state.points)
    return qt
  }, [state.points])

  // Mouse move event handler
  const handleMouseMove = useCallback((event) => {
    if(!qt) return
    let ex = event.nativeEvent.offsetX
    let ey = event.nativeEvent.offsetY
    // console.log("mouse y", event)
    let ut = untransform(ex, ey, state.transform)
    let step = Math.pow(0.5, state.order)
    let hit = qt.find(xScale.invert(ut.x), yScale.invert(ut.y), step * 3)
    
    let hover = hit;
    if(hit) {
      let datum = state.data.find(x => x.i == hit.i && x.chromosome == hit.chromosome)
      if(datum)
        hover = datum
    }
    onHover(hover);
  }, [state.data, state.transform, state.order, qt, xScale, yScale])
    
  const handleClick = useCallback((event) => {
    if(!qt) return
    let ex = event.nativeEvent.offsetX
    let ey = event.nativeEvent.offsetY
    // console.log("mouse y", event)
    let ut = untransform(ex, ey, state.transform)
    let step = Math.pow(0.5, state.order)
    let hit = qt.find(xScale.invert(ut.x), yScale.invert(ut.y), step * 3)
    
    let clicked = hit;
    if(hit) {
      let datum = state.data.find(x => x.i == hit.i && x.chromosome == hit.chromosome)
      if(datum)
        clicked = datum
    }
    onClick(clicked, state.order);
    // zoomToBox(hit.x, hit.y, hit.x + step, hit.y + step)
    // dispatch({ type: actions.SET_SELECTED, payload: clicked })
  }, [state.data, state.transform, state.order, qt, xScale, yScale]) 



  const handleDoubleClick = useCallback((event) => {
    if(!qt) return
    // event.preventDefault()
    // event.stopPropagation()
    let ex = event.nativeEvent.offsetX
    let ey = event.nativeEvent.offsetY

    let ut = untransform(ex, ey, state.transform)
    let step = Math.pow(0.5, state.order)
    let hit = qt.find(xScale.invert(ut.x), yScale.invert(ut.y), step * 3)
    
    let clicked = hit;
    if(hit) {
      let datum = state.data.find(x => x.i == hit.i && x.chromosome == hit.chromosome)
      if(datum)
        clicked = datum
    }
    onClick(clicked, state.order);
    // dispatch({ type: actions.SET_SELECTED, payload: clicked })

    // zoom into the hit
    // first we get the x,y coordinates of the point in absolute position
    // TODO: the multipliers should be based on aspect ratio
    // let tx = xScale(hit.x) - sizeScale(step) * 2.5 
    // let ty = yScale(hit.y) - sizeScale(step) * 1.75
    // let tw = xScale(step) - xScale(0)
    // let xw = xScale(xScale.domain()[1] - xScale.domain()[0])
    // // we zoom to 1/4 the scale of the hit
    // let scale = xw/tw/4
    // let transform = zoomIdentity.translate(-tx * scale, -ty * scale).scale(scale)

    // // zoomBehavior.transform(select(svgRef.current), transform) 
    // // transition the zoom to the new transform

    // // transitionStarted()
    // select(svgRef.current).transition().duration(1000).call(zoomBehavior.transform, transform)
    // // transitionFinished()
    zoomToBox(hit.x, hit.y, hit.x + step, hit.y + step)

  }, [state.data, state.transform, state.order, qt, xScale, yScale, zoomToBox]) 

    // fire callbacks when our selected change
  // partly this is so we can update the selected in the parent when layer changes with new data
  // TODO: this doesn't quite work if we've changed orders because we wont have the old data for new layer
  // useEffect(() => {
  //   let selected = state.selected
  //   if(selected) {
  //     let datum = state.data.find(x => x.i == selected.i && x.chromosome == selected.chromosome && x.order == selected.order )
  //     if(datum)
  //       onClick(datum, datum.order)
  //   }
  // }, [state.data, state.selected]) 
  

  // Render the component
  return (
    <div 
      className="hilbert-genome"
      // onWheel={handleZoom} 
      style={{
        width: width + "px",
        height: height + "px"
      }}
      onMouseMove={handleMouseMove}
      onClick={handleClick}
      onDoubleClick={handleDoubleClick}
      >
      
      <canvas 
        className="hilbert-genome-canvas"
        width={width + "px"}
        height={height + "px"}
        ref={canvasRef}
      />

      <svg
        className="hilbert-genome-svg" 
        width={width + "px"}
        height={height + "px"}
        ref={svgRef}
      >
        <g className="hg-container">
          {/* This is the background that doesn't get transformed */}
          <g className="hg-background">
            <rect className="hg-background-rect" 
              width={width + "px"}
              height={height + "px"}
            />
          </g>

          {/* This is what gets transformed and where most annotations will be rendered */}
          <g className="hg-scene" ref={sceneRef}>
            {SVGRenderers.filter(d => d).map((Renderer, index) => <Renderer key={index} state={state} scales={scales} />)}
      
          </g>

        </g>
        
      </svg>
    </div>
    
    
  );
};

export default HilbertGenome;