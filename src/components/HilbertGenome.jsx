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
import { debounce } from '../lib/debounce'
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
  dataTransform: {},
  // The meta data for each available order of the layer
  metas: new Map(),
  // The data point selected by clicking
  selected: null,
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
    activeLayer = "bands",
    pinOrder = 0,
    orderOffset = 0,
    SVGRenderers = [],
    onZoom = () => {},
    onHover = () => {},
    onClick = () => {},
    onData = () => {},
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
  const orderZoomScale = useMemo(() =>  scaleLinear().domain(zoomExtent).range([1, Math.pow(2, orderDomain[1] - orderDomain[0] + 0.999)]), [orderDomain, zoomExtent])

  const scales = useMemo(() => ({ xScale, yScale, sizeScale, orderZoomScale, width, height }), [xScale, yScale, sizeScale, orderZoomScale, width, height])
  
  // the layer can change when the order changes once we implement some logic for it
  const layer = useMemo(() => {
    //console.log("layer choice")
    if(activeLayer == "auto") {
      // TODO have some logic for automatically selecting the layer
    } else {
      return activeLayer
    }
  }, [activeLayer])

  // this debounced function fetches the data and updates the state
  const fetchData = useMemo(() => {
    return () => {
      if(state.zooming) return 
      // console.log("fetching data")
      // we dont want to fetch data if the order is not within the layer order range
      if (state.order < layer.orders[0] || state.order > layer.orders[1]) return;
      dispatch({ type: actions.SET_LOADING, payload: { loading: true } });
      
      const dataClient = Data({ 
        // debug
      })
      let myPromise = dataClient.fetchData(layer, state.order, state.points)
      let myCallback = (data) => {
        if(data) {
          dispatch({ type: actions.SET_DATA, payload: { 
            data, 
            order: state.order, 
            layer, 
            points: state.points, 
            meta: state.metas.get(state.order),
            transform: state.transform
          } });
        }
        // dispatch({ type: actions.SET_LOADING, payload: { loading: false } });
      }
      debounce(myPromise, myCallback, 150)
    }
  }, [state.zooming, state.order, state.points, state.metas, state.transform, layer, debug]);

  // when the data changes, let the parent component know
  useEffect(() => {
    if(!state.dataLayer) return
    onData({
      data: state.data, 
      dataOrder: state.dataOrder,
      meta: state.metas.get(state.dataOrder), 
      points: state.points, 
      bbox: state.bbox,
      order: state.order, 
      layer: state.dataLayer,
      loading: state.loading
    })
  }, [state.data, state.dataOrder, state.order, state.dataLayer, state.points, state.bbox])

  useEffect(() => {
    if (layer) {
      const dataClient = Data({ 
        // debug
      })
      // fetch the meta for each order in this layer
      Promise.all(range(layer.orders[0], layer.orders[1] + 1)
        .map(async (order) => {
          return dataClient.fetchMeta(layer, order, "meta")
        })
      ).then(metas => {
        const metaMap = new Map(metas.map(meta => [meta.order, meta]))
        dispatch({ type: actions.SET_METAS, payload: metaMap})
      }).catch(err => {
        console.log("caught", err)
      })
      // onLayer(layer)
    }
  }, [layer, debug ])


  // setup the zoom behavior
  const zoomBehavior = useMemo(() => {
    // console.log("zoombehavior init")
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

      CanvasBase({ scales, state: { 
        data: state.data, 
        loading: state.loading,
        points, 
        order: state.order, 
        // points: state.dataPoints,
        // order: state.dataOrder,
        transform
      }, layer: state.dataLayer, canvasRef })

      state.dataLayer.renderer({ scales, state: { 
        data: state.data, 
        loading: state.loading,
        points: state.dataPoints, 
        meta: state.dataMeta, 
        order: state.dataOrder, 
        transform
      }, layer: state.dataLayer, canvasRef })
    }
  }, [state.data, state.loading, state.order, state.dataOrder, state.dataMeta, scales, state.dataLayer, canvasRef])


  // Zoom event handler
  // This is responsible for setting up most of the rendering dependencies
  const handleZoom = useCallback((event) => {
    let transform = event.transform;
    let order
    let orderRaw = orderDomain[0] + Math.log2(orderZoomScale(transform.k))

    // // logic for calculating the order
    // if(pinOrder) {
    //   // we want to stay at this order
    //   order = pinOrder
    //   // if the zoom out is more than 1.5 orders away from the pinned order, we lower the order
    //   // this way we never load too much data
    //   if(order - orderRaw >= 1.5) {
    //     order -= Math.floor(order - orderRaw)
    //   } 
    // } else {
      // this is the default behavior, calculating the order from the zoom
      order = Math.floor(orderRaw)
    // }
    // we always offset if asked
    if(orderOffset) {
      order += orderOffset
    }
    // make sure our order never goes out of bounds
    if(order < orderDomain[0]) order = orderDomain[0]
    if(order > orderDomain[1]) order = orderDomain[1]

    // update the svg transform (zooms the svg)
    select(sceneRef.current)
      .attr("transform", transform)

    // calculate new state dependencies based on order and zoom 
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
  }, [
    xScale, yScale, 
    width, height, 
    orderDomain, orderZoomScale, 
    renderCanvas,
    onZoom,
    // pinOrder,
    orderOffset,
    // zoomToRegion
  ]);

  // we want to re-render (by calling handleZoom) when the order offset changes, but not everytime the transform changes
  // so we don't add state.transform to the dependencies
  useEffect(() => {
    handleZoom({ transform: state.transform })
  }, [orderOffset])


  useEffect(() => {
    // we want to fetch after every time the points recalculate
    // this will be often but the fetch is debounced
    fetchData()
  }, [state.points, state.metas, fetchData])

  useEffect(() => {
    // we want to make sure and render again once the data loads
    // if data's transform is not same as current transform dont render
    if(JSON.stringify(state.dataTransform) !== JSON.stringify(state.transform)) return;
    renderCanvas(state.transform, state.points)
  }, [state.data, state.points, state.transform, renderCanvas ])


  // setup the event handlers for zoom and attach it to the DOM
  useEffect(() => {
    zoomBehavior
      .on("zoom", handleZoom)
      .filter((event) => {
        if(event.type === 'dblclick') return false
        return true
      })
    select(svgRef.current).call(zoomBehavior)
  }, [zoomBehavior, handleZoom])

  // run the zoom with the initial transform when the component mounts
  useEffect(() => {
    zoomBehavior.transform(select(svgRef.current), state.transform)
  }, [width, height]);

  useEffect(() => {
    scaleCanvas(canvasRef.current, canvasRef.current.getContext("2d"), width, height)
  }, [canvasRef, width, height])

  const zoomToBox = useMemo(() => {
    return (x0,y0,x1,y1,pinnedOrder) => {
      // TODO the multipliers should be based on aspect ratio
      const xOffset =  (width/height)*2
      const yOffset = -(width/height)*2
      let tx = xScale(x0) - sizeScale(x1 - x0) * xOffset
      let ty = yScale(y0) - sizeScale(y1 - y0) * yOffset
      let tw = xScale(x1 - x0) - xScale(0) // the width of the box
      let xw = xScale(xScale.domain()[1] - xScale.domain()[0])
      // we zoom to 1/4 the scale of the hit
      let scale = xw/tw/4
      let transform = zoomIdentity.translate(-tx * scale, -ty * scale).scale(scale)
      if(pinnedOrder) {
        scale = orderZoomScale.invert(Math.pow(2,(pinnedOrder - orderDomain[0] + 0.99)))
        transform = zoomIdentity.translate(-tx * scale + xw/2, -ty * scale + xw/2).scale(scale)
      }

      // we may want to control what happens while programming the zoom
      dispatch({ type: actions.ZOOMING, payload: { zooming: true } })
      // transitionStarted()
      select(svgRef.current)
        .transition()
        .duration(zoomDuration)
        .call(zoomBehavior.transform, transform)
        .on("end", () => {
            // console.log("zoom finished")
            dispatch({ type: actions.ZOOMING, payload: { zooming: false} })
        })
      // transitionFinished()
    }
  }, [width, height, xScale, yScale, sizeScale, svgRef, zoomDuration, zoomBehavior, orderZoomScale, orderDomain])

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
    } else {
      return
    }
    onHover(hover);
  }, [state.data, state.transform, state.order, qt, xScale, yScale])
    
  const handleClick = useCallback((event) => {
    if(!qt) return
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
    } else {
      return
    }
    onClick(clicked, state.order, false);
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
    } else { 
      return;
    }
    onClick(clicked, state.order, true);
    zoomToBox(hit.x, hit.y, hit.x + step, hit.y + step, state.order + 2)

  }, [state.data, state.transform, state.order, qt, xScale, yScale, zoomToBox]) 


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
      { debug && <div className="debug" style={{
                     position:"fixed", 
                     bottom:"20px", 
                     right:"20px",
                     fontSize: "10px"
                  }}
          onClick={(evt) => {
            evt.stopPropagation()
            evt.preventDefault()
            console.log("state", state)
            console.log("layer", layer)
            console.log("canvas ref", canvasRef.current)
          }}>
        <div className="debug-item">order: {state.order}</div>
        <div className="debug-item">layer: {layer?.name}</div>
        <div className="debug-item">loading: {state.loading ? "LOADING" : "DONE"}</div>
        <div className="debug-item">points: {state.points.length}</div>
      </div>}
    </div>
    
    
  );
};

export default HilbertGenome;