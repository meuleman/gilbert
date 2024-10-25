import { useReducer, useEffect, useRef, useMemo, useCallback } from 'react';

// import  debounce from 'lodash.debounce';
import { scaleLinear } from 'd3-scale';
import { zoom, zoomIdentity } from 'd3-zoom';
import { select } from 'd3-selection';
import { quadtree } from 'd3-quadtree';
import { sum, range } from 'd3-array';
import { easeLinear, easePolyOut, easeExpOut, easeQuadOut } from 'd3-ease';

import { HilbertChromosome, hilbertPosToOrder } from '../lib/HilbertChromosome';
import { getBboxDomain, untransform } from '../lib/bbox';
import Data from '../lib/data';
import { debouncer, debouncerTimed } from '../lib/debounce'
import scaleCanvas from '../lib/canvas';
import { Renderer as CanvasRenderer } from './Canvas/Renderer';

import { useZoom } from '../contexts/ZoomContext';

import './HilbertGenome.css';

// Define the initial state
const initialState = {
  // The transform drives pretty much everything. It is set by the d3-zoom behavior (scrolling and panning)
  // transform: zoomIdentity, // now handled by ZoomContext
  // The bbox is calculated from the transform and is used to determine which data points are visible
  bbox: null,
  // The hilbert order determined by the zoom level (the k component of the transform)
  // order: 0, // now handled by ZoomContext
  // The hilbert points in view for the current order
  points: [],
  // the loading state
  loading: false,
  // The data fetched from the layer for each point in points
  data: [],
  // The hilbert order when the data is fetched (this could be different than the current order if the user zooms in before the data is fetched)
  dataOrder: 0,
  // the layer when the data is fetched
  dataLayer: null,
  //the points when the data is fetched
  dataPoints: [],
  // meta for order when data is fetched
  dataMeta: {},
  // the transform at the time of data fetching
  dataTransform: zoomIdentity,
  // The meta data for each available order of the layer
  metas: new Map(),
  // The data point selected by clicking
  // selected: null,
  // The data point selected by hovering
  hovered: null,
  zooming: false,
};

// Define the actions
const actions = {
  ZOOM: "ZOOM", // have all the zoom dependencies update the state at once
  ZOOMING: "ZOOMING", // if we are actively zooming
  SET_LOADING: "SET_LOADING",
  SET_DATA: "SET_DATA",
  SET_METAS: "SET_METAS",
  // SET_SELECTED: "SET_SELECTED",
  SET_HOVERED: "SET_HOVERED",
};

// Define the reducer function
function reducer(state, action) {
  switch (action.type) {
    case actions.ZOOM: {
      const { bbox, points } = action.payload;
      return { ...state, bbox, points };
    }
    case actions.ZOOMING: {
      const { zooming } = action.payload;
      return { ...state, zooming };
    }
    case actions.SET_LOADING: {
      const { loading } = action.payload;
      return { ...state, loading };
    }
    case actions.SET_DATA: {
      const { data, order, layer, points, meta, transform } = action.payload;
      return { 
        ...state, 
        data, 
        dataOrder: order, 
        dataPoints: points, 
        dataLayer: layer, 
        dataMeta: meta, 
        dataTransform: transform,
        loading: false 
      }
    }
    case actions.SET_METAS: {
      const { metas, metaLayer } = action.payload;
      return { ...state, metas, metaLayer };
    }
    // case actions.SET_SELECTED:
    //   return { ...state, selected: action.payload };
    case actions.SET_HOVERED:
      return { ...state, hovered: action.payload };
    default:
      throw new Error();
  }
}

// we define these globally so they dont get reset by app rerenders
const dataDebounceTimed = debouncerTimed()
const dataDebounce = debouncer()
const zoomDebounce = debouncer()

const HilbertGenome = ({
    orderMin = 4,
    orderMax = 14,
    zoomMin = 0,
    zoomMax = 5,
    xMin = 0,
    xMax = 5,
    yMin = 0,
    yMax = 5,
    sizeMin = 0,
    sizeMax = 5,
    zoomToRegion = null,
    zoomDuration = 1000,
    width,
    height,
    activeLayer,
    selected = null,
    SVGRenderers = [],
    CanvasRenderers = [],
    onZoom = () => {},
    onScales = () => {},
    onHover = () => {},
    onClick = () => {},
    onData = () => {},
    onZooming = () => {},
    onLoading = () => {},
    debug = false,
  }) => {
  const [state, dispatch] = useReducer(reducer, initialState);

  const canvasRef = useRef();
  const svgRef = useRef();
  const sceneRef = useRef();
  
  let zoomExtent = useMemo(() => [zoomMin, zoomMax], [zoomMin, zoomMax])
  let orderDomain = useMemo(() => [orderMin, orderMax], [orderMin, orderMax])
  let diff = useMemo(() => (width > height) ? width - height : height - width, [height, width]);
  let xRange = useMemo(() => (width > height) ? [diff / 2, width - diff / 2] : [0, width], [height, width, diff])
  let yRange = useMemo(() => (width > height) ? [0, height] : [diff / 2, height - diff / 2], [height, width, diff])
  let sizeRange = useMemo(() => (width > height) ? [0, height] : [0, width], [height, width])
  
  // setup the scales
  const xScale = useMemo(() => scaleLinear().domain([xMin, xMax]).range(xRange), [xMin, xMax, xRange]);
  const yScale = useMemo(() => scaleLinear().domain([yMin, yMax]).range(yRange), [yMin, yMax, yRange]);
  const sizeScale = useMemo(() => scaleLinear().domain([sizeMin, sizeMax]).range(sizeRange), [sizeMin, sizeMax, sizeRange]);
  // const orderZoomScale = useMemo(() =>  scaleLinear().domain(zoomExtent).range([1, Math.pow(2, orderDomain[1] - orderDomain[0] + 0.999)]), [orderDomain, zoomExtent])
  const { 
    transform, 
    order, 
    zooming, 
    orderZoomScale, 
    setTransform, 
    setZooming, 
    panning, 
    setPanning,
    center,
    setCenter,
    easeZoom
  } = useZoom();


  const scales = useMemo(() => ({ xScale, yScale, sizeScale, orderZoomScale, width, height }), [xScale, yScale, sizeScale, orderZoomScale, width, height])
  useEffect(() => {
    onScales(scales)
  }, [scales, onScales])
  
  // the layer is controlled outside of this component
  const layer = useMemo(() => {
    return activeLayer
  }, [activeLayer])

  const lastRequestIdRef = useRef(null);
  // this debounced function fetches the data and updates the state
  const fetchData = useMemo(() => {
    return () => {
      if(!state.points?.length) return
      let order = state.points[0]?.order
      // we dont want to fetch data if the order is not within the layer order range
      if (order < layer.orders[0] || order > layer.orders[1]) return;
      if(state.metaLayer?.datasetName !== layer?.datasetName) return;
      
      const dataClient = Data({ 
        // debug
      })
      let requestId = +new Date();
      let myCallback = (data) => {
        if(data && requestId === lastRequestIdRef.current) {
          if(layer.layers) {
            data = layer.combiner(data)
          }
          dispatch({ type: actions.SET_DATA, payload: { 
            data, 
            order: order, 
            layer, 
            points: state.points, 
            meta: state.metas.get(order),
          } });
        }
      }
      // TODO: we should cancel dataClient.fetchData requests if they are in progress when a new request is made
      // this would require some more tracking of requests and plumbing in dataClient to be able to abort them
      if(zooming) {
        dataDebounceTimed(() => {
          console.log("HG fetching data zooming", order, state.points[0], state.points.length)
          lastRequestIdRef.current = requestId
          dispatch({ type: actions.SET_LOADING, payload: { loading: true } });
          if(layer.layers) {
            let promises = layer.layers.map(l => {
              return dataClient.fetchData(l, order, state.points)
            })
            return Promise.all(promises)
          } else {
            return dataClient.fetchData(layer, order, state.points)
          }
        }, myCallback, 150)
      } else {
        dataDebounce(() => {
          lastRequestIdRef.current = requestId
          console.log("HG fetching data no zoom", order, state.points[0], state.points.length)
          dispatch({ type: actions.SET_LOADING, payload: { loading: true } });
          if(layer.layers) {
            let promises = layer.layers.map(l => {
              return dataClient.fetchData(l, order, state.points)
            })
            return Promise.all(promises)
          } else {
            return dataClient.fetchData(layer, order, state.points)
          }
        }, myCallback, 150)
      }
    }
  }, [zooming, state.points, state.metas, state.metaLayer, layer]);
 

  useEffect(() => {
    onLoading(state.loading)
  }, [state.loading, onLoading])

  useEffect(() => {
    onZooming({ zooming: zooming })
  }, [zooming, onZooming])

  useEffect(() => {
    if (layer) {
      const dataClient = Data({ 
        // debug
      })
      // fetch the meta for each order in this layer
      Promise.all(range(layer.orders[0], layer.orders[1] + 1)
        .map(async (order) => {
          if(layer.layers){
            return dataClient.fetchMeta(layer.layers[0], order, "meta")
          } else {
            return dataClient.fetchMeta(layer, order, "meta")
          }
        })
      ).then(metas => {
        const metaMap = new Map(metas.map(meta => [meta.order, meta]))
        dispatch({ type: actions.SET_METAS, payload: { metas: metaMap, metaLayer: layer }})
      }).catch(err => {
        if(!layer.layers)
          console.log("caught", err)
      })
      // onLayer(layer)
    }
  }, [layer])

  useEffect(() => {
    scaleCanvas(canvasRef.current, canvasRef.current.getContext("2d"), width, height)
  }, [canvasRef, width, height])

  // setup the zoom behavior
  const zoomBehavior = useMemo(() => {
    const extentMargin = Math.max(width/2, height/2)
    return zoom()
      .extent([
        [0, 0],
        [width, height]
      ])
      .translateExtent([
        [-extentMargin, -extentMargin],
        [width + extentMargin, height + extentMargin]
      ])
      .scaleExtent(zoomExtent)
  }, [zoomExtent, width, height])


  // we setup a function we can call to re-render our layer
  // this allows us to re-render whenever the transform changes (frequently on zoom)
  // with the latest data available (updated via state)
  const renderCanvas = useMemo(() => { 
    return function(transform, points) {
      // make sure we don't try to render without the dataLayer ready
      if(!state.dataLayer) return;
      // all of the data we are rendering is associated with the currently loaded data in state 
      // (including layer, order and meta at time data was loaded)
      // console.log("RENDER TRANSFORM", transform)
      // console.log("RENDER STATE", state)

      CanvasRenderer("Base", { 
        scales, 
        state: { 
          data: state.data, 
          loading: state.loading,
          points, 
          order: order, 
          // points: state.dataPoints,
          // order: state.dataOrder,
          transform
        }, 
        layer: state.dataLayer, 
        canvasRef 
      })

      CanvasRenderer(state.dataLayer.renderer, { 
        scales, 
        state: { 
          data: state.data, 
          loading: state.loading,
          points: state.dataPoints, 
          meta: state.dataMeta, 
          order: state.dataOrder, 
          transform
        }, 
        layer: state.dataLayer, canvasRef 
      })

      CanvasRenderers.forEach(cr => {
        cr(canvasRef, scales, { 
          data: state.data, 
          loading: state.loading,
          points, 
          order: order, 
          transform
        })
      })
    }
  }, [
    state.data, 
    state.dataPoints, 
    state.loading, 
    order, 
    state.dataOrder, 
    state.dataMeta, 
    scales, 
    state.dataLayer, 
    CanvasRenderers // TODO: memoize this
  ])

  // Zoom event handler
  // This is responsible for setting up most of the rendering dependencies
  const handleTransform = useCallback((transform, order) => {
    // update the svg transform (zooms the svg)
    const tr = zoomIdentity.translate(transform.x, transform.y).scale(transform.k)
    select(sceneRef.current)
      .attr("transform", tr)
    // calculate new state dependencies based on order and zoom 
    let hilbert = HilbertChromosome(order, { padding: 2 })
    let bbox = getBboxDomain(transform, xScale, yScale, width, height)    
    let points = hilbert.fromBbox(bbox)
    // console.log("HANDLE TRANSFORM", order, points, points[0].order)
    const payload = {
      bbox,
      points,
    }
    // update the state
    dispatch({ type: actions.ZOOM, payload })

    // update the parent component
    onZoom(payload)
    // we want to update our canvas renderer immediately with new transform
  }, [
    xScale, yScale, 
    width, height, 
    onZoom,
  ]);


  useEffect(() => {
    // we want to fetch after every time the points recalculate
    // this will be often but the fetch is debounced
    // console.log("fetchData", panning)
    if(!panning) {
      fetchData()
    }
  }, [
    state.points, 
    state.metas, 
    state.metaLayer, 
    fetchData,
    panning,
    zooming
  ])

  // we rerender the canvas anytime the transform or points change
  // but we only want to do it if they actually change
  const prevTransformRefRender = useRef({...transform, init: true});
  const prevTransformRefSVG = useRef({...transform, init: true});
  const prevPointsRef = useRef(state.points);
  const prevDataRef = useRef(state.data)
  const prevOrder = useRef(order)
  function pointSummary(points) { 
    return points[0]?.i + sum(points, p => p.i)
  }
  
  // We "handleTransform" which calculates new points when the transform or order updates
  useEffect(() => {
    const hasTransformChanged = JSON.stringify(transform) !== JSON.stringify(prevTransformRefSVG.current);
    const hasOrderChanged = order !== prevOrder.current
    if(hasTransformChanged || hasOrderChanged){
      // console.log("HG handleTransform", +new Date())
      handleTransform(transform, order)
      // zoomBehavior.transform(select(svgRef.current), transform)
      zoomBehavior.transform(select(svgRef.current), zoomIdentity.translate(transform.x, transform.y).scale(transform.k))
      prevOrder.current = order
      prevTransformRefSVG.current = transform
    }
  }, [transform, order, handleTransform, zoomBehavior]) 

  // we re-render our canvas (with whatever data is currently in state)
  // this allows us to still show something while the data is loading
  // so even if we change orders the points will render at the appropriate size
  useEffect(() => {
    const hasTransformChanged = JSON.stringify(transform) !== JSON.stringify(prevTransformRefRender.current);
    const havePointsChanged = pointSummary(state.points) !== pointSummary(prevPointsRef.current);
    const hasDataChanged = pointSummary(state.data) !== pointSummary(prevDataRef.current);

    // console.log("HG render transform", hasTransformChanged, "points", havePointsChanged, "data", hasDataChanged)
    if(hasDataChanged) {
      console.log("HG data changed", state.data)
    }

    if (hasTransformChanged || havePointsChanged || hasDataChanged) {
      renderCanvas(transform, state.points);
      prevTransformRefRender.current = transform;
      prevPointsRef.current = state.points;
      prevDataRef.current = state.data
    }
  }, [transform, state.points, state.data, renderCanvas])

  // setup the event handlers for zoom and attach it to the DOM
  const handleZoom = useCallback((event) => {
    zoomDebounce(() => new Promise((resolve, reject) => {resolve()}), () => {
      const { sourceEvent } = event;
      // Check if this is a drag event (mouse move with button pressed)
      // If we drag, we are updating the 2D map center based on the data point 
      if (sourceEvent && sourceEvent.type === 'mousemove' && sourceEvent.buttons === 1) {
        setPanning(true)
      }
      setZooming(true)
      setTransform(event.transform)
    },1)
  }, [setTransform, setPanning, setZooming])

  useEffect(() => {
    zoomBehavior
      .on("zoom", (event) => event?.sourceEvent ? handleZoom(event) : null)
      .filter((event) => {
        if(event.type === 'dblclick') return false
        if(selected && event.type === 'wheel') return false
        return true
      })
      .on("end", (event) => {
        // console.log("zoom end", event)
        if(event.sourceEvent) {
          setPanning(false)
          setZooming(false)
        }
      })
    select(svgRef.current).call(zoomBehavior)
  }, [zoomBehavior, selected, handleZoom, setPanning, setZooming])

  // run the zoom with the initial transform when the component mounts
  // useEffect(() => {
  //   zoomBehavior.transform(select(svgRef.current), transform)
  // }, [width, height]);



  const zoomToBox = useCallback((x0,y0,x1,y1,pinnedOrder) => {
      // TODO the multipliers should be based on aspect ratio
      // const xOffset =  (width/height)*2
      // const yOffset = -(width/height)*2
      // let tx = xScale(x0) - sizeScale(x1 - x0) * xOffset
      // let ty = yScale(y0) - sizeScale(y1 - y0) * yOffset
      let tw = xScale(x1 - x0) - xScale(0) // the width of the box
      let xw = xScale(xScale.domain()[1] - xScale.domain()[0])

      let centerX = width/2
      let centerY = height/2
      // we zoom to 1/4 the scale of the hit
      let newK = xw/tw/4
      let newX = centerX - xScale(x0) * newK
      let newY = centerY - yScale(y0) * newK
      let newTransform = zoomIdentity.translate(newX, newY).scale(newK)
      if(pinnedOrder) {
        newK = orderZoomScale.invert(Math.pow(2,(pinnedOrder - orderDomain[0] + 0.99)))
        newX = centerX - xScale(x0) * newK
        newY = centerY - yScale(y0) * newK
        newTransform = zoomIdentity.translate(newX, newY).scale(newK)
      }

      setZooming(true)
      // using prevTransformRef becuase it should be the most recent transform at this point
      easeZoom(prevTransformRefSVG.current, newTransform, () => setZooming(false), zoomDuration)
  }, [
    width, 
    height, 
    xScale, 
    yScale, 
    // sizeScale, 
    zoomDuration,
    // zoomBehavior, 
    orderZoomScale, 
    orderDomain,
    setZooming,
    easeZoom
  ])

  useEffect(() => {
    if(zoomToRegion) {
      const length = zoomToRegion.end - zoomToRegion.start
      let order = zoomToRegion.order
      if(!zoomToRegion.order) {
        // figure out the appropriate order to zoom to
        // we want to zoom in quite a bit to the region if it hasn't specified its order
        order = orderDomain[1];
        while(length/128 > hilbertPosToOrder(1, { from: order, to: orderDomain[1] })) {
          order--;
          if(order == orderDomain[0]) break;
        }
      }
      // figure out the 2D x,y coordinate for the hilbert position at the zoomed order
      let pos = hilbertPosToOrder(zoomToRegion.start + (zoomToRegion.end - zoomToRegion.start)/2, { from: orderDomain[1], to: order })
      let hilbert = HilbertChromosome(order, { padding: 2 })
      let hit = hilbert.get2DPoint(pos, zoomToRegion.chromosome)
      zoomToBox(hit.x, hit.y, hit.x + hilbert.step, hit.y + hilbert.step, order)
    }
  }, [zoomToRegion, orderDomain, zoomToBox])



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

  const regionFromXY = useCallback((x, y) => {
    let ut = untransform(x, y, transform)
    let step = Math.pow(0.5, order)
    let hit = qt.find(xScale.invert(ut.x), yScale.invert(ut.y), step * 3)
    if(hit) {
      let datum = state.data.find(x => x.i == hit.i && x.chromosome == hit.chromosome)
      if(datum)
        return datum
    } else {
      return
    }
  }, [state.data, order, transform, xScale, yScale, qt])

  useEffect(() => {
    if(!transform) return
    let center = regionFromXY(width/2, height/2)
    // console.log("center", center)
    setCenter(center)
  }, [transform, regionFromXY, width, height, setCenter])

  // when the data changes, let the parent component know
  useEffect(() => {
    if(!state.dataLayer) return
    let center = regionFromXY(width/2, height/2)
    onData({
      data: state.data, 
      dataOrder: state.dataOrder,
      center,
      meta: state.metas.get(state.dataOrder), 
      points: state.points, 
      bbox: state.bbox,
      order: order, 
      layer: state.dataLayer,
      loading: state.loading
    })
  }, [
    order,
    state.data, 
    state.dataOrder, 
    state.dataLayer, 
    width, 
    height, 
    state.loading
  ])
    // regionFromXY, state.points, state.bbox, order, state.metas, onData, state.loading])

  // Mouse move event handler
  const handleMouseMove = useCallback((event) => {
    if(!qt) return
    let ex = event.offsetX
    let ey = event.offsetY
    if(event.nativeEvent) {
      ex = event.nativeEvent.offsetX
      ey = event.nativeEvent.offsetY
    }
    let hover = regionFromXY(ex, ey)
    if(hover)
      onHover(hover);
  }, [order, regionFromXY])
    
  const handleClick = useCallback((event) => {
    if(!qt) return
    let ex = event.nativeEvent.offsetX
    let ey = event.nativeEvent.offsetY
    let clicked = regionFromXY(ex, ey)
    if(clicked)
      onClick(clicked, order, false);
  }, [order, regionFromXY])

  const handleDoubleClick = useCallback((event) => {
    if(!qt) return
    // event.preventDefault()
    // event.stopPropagation()
    let ex = event.nativeEvent.offsetX
    let ey = event.nativeEvent.offsetY

    let ut = untransform(ex, ey, transform)
    let step = Math.pow(0.5, order)
    let hit = qt.find(xScale.invert(ut.x), yScale.invert(ut.y), step * 3)
    
    let clicked = hit;
    if(hit) {
      let datum = state.data.find(x => x.i == hit.i && x.chromosome == hit.chromosome)
      if(datum)
        clicked = datum
    } else { 
      return;
    }
    onClick(clicked, order, true);
    zoomToBox(hit.x, hit.y, hit.x + step, hit.y + step, order + 2)

  }, [state.data, transform, order, qt, xScale, yScale, zoomToBox]) 

  const onMouseLeave = useCallback((event) => {
    onHover(null);
  }, [onHover])


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
      onMouseLeave={onMouseLeave}
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

          <line 
            x1={width/2}
            y1={0}
            x2={width/2}
            y2={height}
            stroke="lightgray"
            strokeDasharray="4,4"
          />
          <line 
            x1={0}
            y1={height/2}
            x2={width}
            y2={height/2}
            stroke="lightgray"
            strokeDasharray="4,4"
          />
        </g>
        
      </svg>
      { debug && <div className="debug"
          onClick={(evt) => {
            evt.stopPropagation()
            evt.preventDefault()
            console.log("state", state)
            console.log("layer", layer)
            console.log("canvas ref", canvasRef.current)
          }}>
        <div className="debug-item">order: {order}</div>
        <div className="debug-item">layer: {layer?.name}</div>
        <div className="debug-item">loading: {state.loading ? "LOADING" : "DONE"}</div>
        <div className="debug-item">points: {state.points.length}</div>
        <div className="debug-item">zoom: {transform.k}</div>
      </div>}
    </div>
    
    
  );
};

export default HilbertGenome;