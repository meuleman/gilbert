import { useReducer, useEffect, useRef, useMemo } from 'react';

import { scaleLinear } from 'd3-scale';
import { zoom, zoomIdentity } from 'd3-zoom';
import { select } from 'd3-selection';
import { quadtree } from 'd3-quadtree';

import { HilbertChromosome } from '../lib/HilbertChromosome';
import { getBboxDomain } from '../lib/bbox';



// TODO: seperate out state and actions into seperate files
// Define the initial state
const initialState = {
  transform: zoomIdentity,
  bbox: null,
  order: 0,
};

// Define the actions
const actions = {
  SET_TRANSFORM: "SET_TRANSFORM",
  SET_BBOX: "SET_BBOX",
  SET_ORDER: "SET_ORDER",
  SET_POINTS: "SET_POINTS",
};

// Define the reducer function
function reducer(state, action) {
  switch (action.type) {
    case actions.SET_TRANSFORM:
      return { ...state, transform: action.payload };
    case actions.SET_BBOX:
      return { ...state, bbox: action.payload };
    case actions.SET_ORDER:
      return { ...state, order: action.payload };
    case actions.SET_POINTS:
      return { ...state, points: action.payload };
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
  const scales = { xScale, yScale, sizeScale, orderZoomScale }

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

  // Zoom event handler
  // This is responsible for setting up most of the rendering dependencies
  const handleZoom = (event) => {
    console.log("event", event)
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

    dispatch({ type: actions.SET_TRANSFORM, payload: transform });
    dispatch({ type: actions.SET_ORDER, payload: order });
    dispatch({ type: actions.SET_BBOX, payload: bbox });
    dispatch({ type: actions.SET_POINTS, payload: points });
  };
  

  const handleZoomEnd = (event) => {
    // TODO: data loading
  }

  // setup the event handlers for zoom and attach it to the DOM
  zoomBehavior
    .on("zoom", handleZoom)
    .on("end", handleZoomEnd)
  select(svgRef.current).call(zoomBehavior)

  // run the zoom with the initial transform when the component mounts
  useEffect(() => {
    // handleZoom({transform: state.transform});
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