import { useReducer, useEffect, useRef, useMemo, useCallback } from 'react';

// import  debounce from 'lodash.debounce';
import { scaleLinear } from 'd3-scale';
import { zoom, zoomIdentity } from 'd3-zoom';
import { select } from 'd3-selection';
import { quadtree } from 'd3-quadtree';
import { sum, range } from 'd3-array';
import { easeLinear, easePolyOut, easeExpOut, easeQuadOut } from 'd3-ease';

import { HilbertChromosome, hilbertPosToOrder } from '../../lib/HilbertChromosome';
import { getBboxDomain, untransform } from '../../lib/bbox';
import Data from '../../lib/data';
import { debouncer, debouncerTimed } from '../../lib/debounce'
import scaleCanvas from '../../lib/canvas';
import { Renderer as CanvasRenderer } from '../Canvas/Renderer';

import { useZoom } from '../../contexts/zoomContext';

// import './MinimapGenome.css';

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

const MinimapGenome = ({
  xMin = 0,
  xMax = 5,
  yMin = 0,
  yMax = 5,
  sizeMin = 0,
  sizeMax = 5,
  width,
  height,
  SVGRenderers = [],
  CanvasRenderers = [],
  HoverRenderers = [],
  onScales = () => { },
  onHover = () => { },
  onClick = () => { },
  zoomMethods = {},
  debug = false,
}) => {
  const [state, dispatch] = useReducer(reducer, initialState);

  const canvasRef = useRef();
  const hoverCanvasRef = useRef();
  const svgRef = useRef();
  const sceneRef = useRef();

  let diff = useMemo(() => (width > height) ? width - height : height - width, [height, width]);
  let xRange = useMemo(() => (width > height) ? [diff / 2, width - diff / 2] : [0, width], [height, width, diff])
  let yRange = useMemo(() => (width > height) ? [0, height] : [diff / 2, height - diff / 2], [height, width, diff])
  let sizeRange = useMemo(() => (width > height) ? [0, height] : [0, width], [height, width])

  // setup the scales
  const xScale = useMemo(() => scaleLinear().domain([xMin, xMax]).range(xRange), [xMin, xMax, xRange]);
  const yScale = useMemo(() => scaleLinear().domain([yMin, yMax]).range(yRange), [yMin, yMax, yRange]);
  const sizeScale = useMemo(() => scaleLinear().domain([sizeMin, sizeMax]).range(sizeRange), [sizeMin, sizeMax, sizeRange]);
  const zoomContext = useZoom();
  const {
    transform = zoomContext.transform,
    order = zoomContext.order,
    orderZoomScale = zoomContext.orderZoomScale,
    setTransform = zoomContext.setTransform,
    setCenter = zoomContext.setCenter,
  } = zoomMethods || {};

  const scales = useMemo(() => ({ xScale, yScale, sizeScale, orderZoomScale, width, height }), [xScale, yScale, sizeScale, orderZoomScale, width, height])
  useEffect(() => {
    onScales(scales)
  }, [scales, onScales])


  // we setup a function we can call to re-render our layer
  // this allows us to re-render whenever the transform changes (frequently on zoom)
  // with the latest data available (updated via state)
  const renderCanvas = useMemo(() => {
    return function (transform, points) {
      // make sure we don't try to render without the dataLayer ready
      // console.log("HG: renderCanvas", state.dataLayer, transform, points?.[0], state.data?.[0], points?.length, state.data?.length)
      if (!canvasRef.current || !transform || !points) return;
      // all of the data we are rendering is associated with the currently loaded data in state 
      // (including layer, order and meta at time data was loaded)
      CanvasRenderer("Base", {
        scales,
        state: {
          data: [],
          loading: state.loading,
          points,
          order: order,
          transform
        },
        canvasRef
      })

      CanvasRenderers.forEach(cr => {
        cr(canvasRef, scales, {
          data: points,//state.data,
          loading: state.loading,
          points,
          order: order,
          transform
        })
      })
    }
  }, [
    state.data,
    state.loading,
    order,
    scales,
    state.dataLayer,
    CanvasRenderers
  ])

  const renderHovers = useMemo(() => {
    return function (transform, points) {
      // clear the hover canvas
      let hoverCtx = hoverCanvasRef.current.getContext("2d")
      hoverCtx.clearRect(0, 0, width, height)
      HoverRenderers.forEach(cr => {
        cr(hoverCanvasRef, scales, {
          data: state.data,
          loading: state.loading,
          points,
          order: order,
          transform
        })
      })
    }
  }, [
    width, height,
    state.data,
    state.loading,
    order,
    scales,
    HoverRenderers
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

    // we want to update our canvas renderer immediately with new transform
  }, [
    xScale, yScale,
    width, height,
  ]);

  // we rerender the canvas anytime the transform or points change
  // but we only want to do it if they actually change
  const prevTransformRefRender = useRef({ ...transform, init: true });
  const prevTransformRefSVG = useRef({ ...transform, init: true });
  const prevPointsRef = useRef(state.points);
  const prevDataRef = useRef(state.data)
  const prevLayerRef = useRef(state.dataLayer)
  const prevOrder = useRef(order)
  function pointSummary(points) {
    // return points[0]?.i + sum(points, p => p.i)
    return points[0]?.i + points[points.length - 1]?.i
  }

  // We "handleTransform" which calculates new points when the transform or order updates
  useEffect(() => {
    const hasTransformChanged = JSON.stringify(transform) !== JSON.stringify(prevTransformRefSVG.current);
    const hasOrderChanged = order !== prevOrder.current
    if (hasTransformChanged || hasOrderChanged) {
      handleTransform(transform, order)
      prevOrder.current = order
      prevTransformRefSVG.current = transform
    }
  }, [transform, order, handleTransform])

  // we re-render our canvas (with whatever data is currently in state)
  // this allows us to still show something while the data is loading
  // so even if we change orders the points will render at the appropriate size
  useEffect(() => {
    const hasTransformChanged = JSON.stringify(transform) !== JSON.stringify(prevTransformRefRender.current);
    const havePointsChanged = pointSummary(state.points) !== pointSummary(prevPointsRef.current);
    const hasDataChanged = pointSummary(state.data) !== pointSummary(prevDataRef.current);
    const hasLayerChanged = state.dataLayer?.datasetName !== prevLayerRef.current?.datasetName;

    if (hasTransformChanged || havePointsChanged || hasDataChanged || hasLayerChanged) {
      renderCanvas(transform, state.points);
      prevTransformRefRender.current = transform;
      prevPointsRef.current = state.points;
      prevDataRef.current = state.data
      prevLayerRef.current = state.dataLayer
    } else if (canvasRef.current && transform && scales && state.data?.length) {
      // for initial render of main map
      renderCanvas(transform, state.points);
    }
  }, [transform, state.points, state.data, state.dataLayer, CanvasRenderers, canvasRef, scales])

  // rerender the canvas when the canvas renderers change
  useEffect(() => {
    renderCanvas(prevTransformRefRender.current, prevPointsRef.current);
  }, [CanvasRenderers])

  useEffect(() => {
    renderHovers(prevTransformRefRender.current, prevPointsRef.current);
  }, [HoverRenderers])

  // MOUSE INTERACTIONS
  // we create a quadtree so we can find the closest point to the mouse
  const qt = useMemo(() => {
    if (!state.points) return null
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
    if (hit) {
      let datum = state.data.find(x => x.i == hit.i && x.chromosome == hit.chromosome)
      if (datum)
        return datum
    } else {
      return
    }
  }, [state.data, order, transform, xScale, yScale, qt])

  useEffect(() => {
    if (!transform) return
    let center = regionFromXY(width / 2, height / 2)
    // console.log("center", center)
    setCenter(center)
  }, [transform, regionFromXY, width, height, setCenter])

  const handleClick = useCallback((event) => {
    if (!qt) return
    let ex = event.nativeEvent.offsetX
    let ey = event.nativeEvent.offsetY

    let ut = untransform(ex, ey, transform)
    let step = Math.pow(0.5, order)
    let hit = qt.find(xScale.invert(ut.x), yScale.invert(ut.y), step * 3)

    let clicked = hit;
    onClick(clicked);

  }, [untransform, transform, order, qt, xScale, yScale])

  useEffect(() => {
    // Force initial render with the proper transform
    setTransform({x: 0, y: 0, k: 1});
  }, []);

  const handleMouseMove = useCallback((event) => {
    if (!qt) return
    let ex = event.nativeEvent.offsetX
    let ey = event.nativeEvent.offsetY

    let ut = untransform(ex, ey, transform)
    let step = Math.pow(0.5, order)
    let hover = qt.find(xScale.invert(ut.x), yScale.invert(ut.y), step * 3)

    onHover(hover)

  }, [untransform, transform, order, qt, xScale, yScale, onHover])

  // Render the component
  // eslint-disable-next-line no-unreachable
  return (
    <div
      className="hilbert-genome"
      style={{
        width: width + "px",
        height: height + "px"
      }}
      onClick={handleClick}
      onMouseMove={handleMouseMove}
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

      <canvas
        className="hilbert-genome-hover-canvas"
        width={width + "px"}
        height={height + "px"}
        ref={hoverCanvasRef}
      />

      {debug && <div className="debug"
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

export default MinimapGenome;