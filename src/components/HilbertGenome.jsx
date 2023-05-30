import { useReducer, useEffect, useRef, useMemo, useCallback } from 'react';

import  debounce from 'lodash.debounce';
import { scaleLinear } from 'd3-scale';
import { zoom, zoomIdentity } from 'd3-zoom';
import { select } from 'd3-selection';
import { quadtree } from 'd3-quadtree';

import { HilbertChromosome } from '../lib/HilbertChromosome';
import { getBboxDomain } from '../lib/bbox';
import Data from '../lib/Data';



// TODO: seperate out state and actions into seperate files
// Define the initial state
const initialState = {
  transform: zoomIdentity,
  bbox: null,
  order: 0,
  dataOrder: 0,
  data: [],
  meta: {},
};

// Define the actions
const actions = {
  ZOOM: "ZOOM", // have all the zoom dependencies update the state at once
  // SET_TRANSFORM: "SET_TRANSFORM",
  // SET_BBOX: "SET_BBOX",
  // SET_ORDER: "SET_ORDER",
  // SET_POINTS: "SET_POINTS",
  SET_DATA: "SET_DATA",
  SET_META: "SET_META",
};

// Define the reducer function
function reducer(state, action) {
  switch (action.type) {
    case actions.ZOOM:
      return { ...state, ...action.payload };
    // case actions.SET_TRANSFORM:
    //   return { ...state, transform: action.payload };
    // case actions.SET_BBOX:
    //   return { ...state, bbox: action.payload };
    // case actions.SET_ORDER:
    //   return { ...state, order: action.payload };
    // case actions.SET_POINTS:
    //   return { ...state, points: action.payload };
    case actions.SET_DATA:
      return { ...state, data: action.payload.data, dataOrder: action.payload.order };
    case actions.SET_META:
      return { ...state, meta: action.payload };
    default:
      throw new Error();
  }
}

const HilbertGenome = ({
    orderDomain,
    zoomExtent,
    xDomain = [0, 5],
    yDomain = [0, 5],
    sizeDomain = [0, 5],
    width,
    height,
    activeLayer = "bands",
    LayerConfig={},
    SVGRenderers=[],
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
      return LayerConfig[activeLayer]
    }
  }, [state.order])
  const LayerRenderer = layer.renderer;


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
    return function(transform) {
      return layer.renderer({ scales, state: { data: state.data, points: state.points, order: state.order, dataOrder: state.dataOrder, transform}, layer, canvasRef })
    }
  }, [state, scales, layer, canvasRef])

  // Data fetching
  const dataClient = Data({ 
    baseURL: LayerConfig.baseURL, 
    // debug // this outputs a lot to the console
  })
  const fetchData = useMemo(() => {
    return debounce(() => {
      return dataClient.fetchData(layer.datasetName, state.order, layer.aggregateName, state.points)
        .then(data => {
          dispatch({ type: actions.SET_DATA, payload: { data, order: state.order } 
        });
      })
    }, 150)
  }, [state.order, state.points, layer]);

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

    // dispatch({ type: actions.SET_TRANSFORM, payload: transform });
    // dispatch({ type: actions.SET_ORDER, payload: order });
    // dispatch({ type: actions.SET_BBOX, payload: bbox });
    // dispatch({ type: actions.SET_POINTS, payload: points });
    dispatch({ type: actions.ZOOM, payload: {
      transform,
      order,
      bbox,
      points,
    }})

    // we want to update our canvas renderer immediately with new transform
    renderCanvas(transform)
    // call our debounced fetch data function
    fetchData()
  }, [renderCanvas, fetchData]);

  useEffect(() => {
    // we want to fetch after every time the points recalculate
    // this will be redundant but the fetch is debounced
    fetchData()
  }, [state.points])

  useEffect(() => {
    // we want to make sure and render again once the data loads
    renderCanvas(state.transform)
  }, [state.data, state.transform])


  // setup the event handlers for zoom and attach it to the DOM
  zoomBehavior
    .on("zoom", handleZoom)
    .on("end", fetchData)
  select(svgRef.current).call(zoomBehavior)

  // run the zoom with the initial transform when the component mounts
  useEffect(() => {
    zoomBehavior.transform(select(svgRef.current), state.transform)
  }, []);


  // let qt = quadtree()
  //     .extent([[-1, -1], [5 + 1, 5 + 1]])
  //     .x(d => d.x)
  //     .y(d => d.y)
  //     .addAll(points)

  

  // Render the component
  return (
    <div 
      className="hilbert-genome"
      // onWheel={handleZoom} 
      style={{
        width: width + "px",
        height: height + "px"
      }}
      >
      
      <canvas 
        className="hilbert-genome-canvas"
        width={width + "px"}
        height={height + "px"}
        ref={canvasRef}
      />
      {/* Render the active data layer */}
      {/* <LayerRenderer state={state} scales={scales} canvasRef={canvasRef} layer={layer} /> */}

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
            {SVGRenderers.map((Renderer, index) => <Renderer key={index} state={state} scales={scales} />)}
      
          </g>

        </g>
        
      </svg>

      { debug && 
        <pre style={{
          position: "relative",
          top: height + 10 + "px",
        }}>
          {JSON.stringify({ order: state.order, points: state.points?.length }, null, 2)}
        </pre>
      }
      
    </div>
    
    
  );
};

export default HilbertGenome;