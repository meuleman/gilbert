import { useState, useRef, useEffect, useMemo, useCallback, useLayoutEffect } from 'react';
import { scaleLinear, scaleLog, scalePow } from 'd3-scale';
import { zoomIdentity } from 'd3-zoom';
import { range, extent } from 'd3-array';
import { line } from "d3-shape";
import { interpolateObject, interpolateNumber } from 'd3-interpolate';
import CloseIcon from "@/assets/close.svg?react"

import { HilbertChromosome, hilbertPosToOrder } from '../../lib/HilbertChromosome';
import { fromIndex } from '../../lib/regions'
import Data from '../../lib/data';
import { debouncer } from '../../lib/debounce';
import { showPosition } from '../../lib/display';
import scaleCanvas from '../../lib/canvas';
import { getOffsets } from '../../lib/segments';
import { variantChooser } from '../../lib/csn';
import { getGencodesInView } from '../../lib/genes';
import { linearGenomeHeight } from '../Constants/Constants';

import order_14 from '../../layers/order_14';

import Loading from '../Loading';
import { Renderer as CanvasRenderer } from '../Canvas/Renderer';

import { useZoom } from '../../contexts/zoomContext';
import SelectedStatesStore from '../../states/SelectedStates';
import LinearGenome from '../../components/LinearGenome';

import Tooltip from '../Tooltips/Tooltip';
import PropTypes from 'prop-types';
import './Power.css';
import { throttle } from 'lodash';
import { X } from 'lucide-react'

const dataDebounce = debouncer();

// ------------------
// Helper Rendering Functions
// ------------------
function renderSquares(ctx, points, t, o, scales, fill, stroke, sizeMultiple=1) {
  const step = Math.pow(0.5, o);
  const rw = scales.sizeScale(step) * t.k * sizeMultiple - 1;
  for(let i = 0; i < points.length; i++){
    const d = points[i];
    const xx = t.x + scales.xScale(d.x) * t.k;
    const yy = t.y + scales.yScale(d.y) * t.k;
    if(stroke){
      ctx.strokeStyle = stroke;
      ctx.strokeRect(xx - rw/2, yy - rw/2, rw, rw);
    }
    if(fill){
      ctx.fillStyle = fill;
      ctx.fillRect(xx - rw/2, yy - rw/2, rw, rw);
    }
  }
}

function renderPipes(ctx, points, t, o, scales, stroke, sizeMultiple=1) {
  const lineFunc = line().x(d => d.x).y(d => d.y).context(ctx);
  const step = Math.pow(0.5, o);
  const rw = scales.sizeScale(step) * t.k;
  const srw = rw * sizeMultiple;
  for(let i = 0; i < points.length; i++){
    const d = points[i];
    const dm1 = points[i-1];
    const dp1 = points[i+1];
    const xx = t.x + scales.xScale(d.x) * t.k;
    const yy = t.y + scales.yScale(d.y) * t.k;
    const ps = [];
    if(dm1){
      const { xoff, yoff } = getOffsets(d, dm1, rw, srw);
      ps.push({ x: xx + xoff, y: yy + yoff });
    }
    ps.push({ x: xx, y: yy });
    if(dp1){
      const { xoff, yoff } = getOffsets(d, dp1, rw, srw);
      ps.push({ x: xx + xoff, y: yy + yoff });
    }
    ctx.strokeStyle = stroke;
    ctx.lineWidth = srw;
    ctx.beginPath();
    lineFunc(ps);
    ctx.stroke();
  }
}
  
// ------------------
// Component
// ------------------
function PowerModal({ 
  width: propWidth, 
  height: propHeight, 
  sheight = linearGenomeHeight, 
  onClose = () => {} 
}) {
  const containerRef = useRef(null);
  const [containerSize, setContainerSize] = useState({ width: 0, height: 0 });
  useLayoutEffect(() => {
    const resizeObserver = new ResizeObserver(entries => {
      for (const entry of entries) {
        setContainerSize({
          width: entry.contentRect.width,
          height: entry.contentRect.height
        });
      }
    });
    resizeObserver.observe(containerRef.current);
    setContainerSize({
      width: containerRef.current.clientWidth,
      height: containerRef.current.clientHeight
    });
    return () => resizeObserver.disconnect();
  }, []);
  
  const width = propWidth || containerSize.width;
  const height = propHeight || (containerSize.height - sheight);

  const canvasRef = useRef(null);
  const tooltipRef = useRef(null);

  const { handleSelectedZoom: onOrder, selectedZoomOrder: userOrder } = useZoom();
  const { 
    narrationPreview, selectedNarration, selected, 
    setCurrentPreferred: setCurrentPreferredGlobal,
    setPowerDataLoaded, regionSnapshots, popRegionFromSnapshots,
    powerData: globalPowerData, setPowerData: setGlobalPowerData, 
    switchSnapshots, setPreventDerivation, spawnRegionSidetrack,
    createKey,
  } = SelectedStatesStore();
  
  const currentPreferredRef = useRef(null);

  const [csn, setCsn] = useState(selectedNarration);
  const isPreviewRef = useRef(false);
  useEffect(() => {
    isPreviewRef.current = !!narrationPreview
  }, [narrationPreview]);

  useEffect(() => {
    setCsn(narrationPreview ? narrationPreview : selectedNarration);
  }, [narrationPreview, selectedNarration]);

  const [loading, setLoading] = useState(false);
  const percentScale = useMemo(() => scaleLinear().domain([1, 100]).range([4, 14.999]), []);
  const [percent, setPercent] = useState(userOrder ? percentScale.invert(userOrder) : 1);
  useEffect(() => { setPercent(userOrder ? percentScale.invert(userOrder) : 1); }, [userOrder, percentScale]);
  const [order, setOrder] = useState(userOrder ? userOrder : 4);
  const radius = 9;

  // initialize data to empty data structure so we can render empty hilbert curve while data loads
  const [data, setData] = useState(() => {
    if (!selected) return null;
    
    // Create default empty data structure
    return range(4, 15).map(order => {
      const oi = hilbertPosToOrder(selected.i, { from: selected.order, to: order });
      const hilbert = new HilbertChromosome(order);
      const oRegion = fromIndex(selected.chromosome, oi, order)
      
      // Generate points for initial rendering
      const step = hilbert.step;
      const bbox = {
        x: oRegion.x - step * radius,
        y: oRegion.y - step * radius,
        width: step * radius * 2,
        height: step * radius * 2
      };
      const points = hilbert.fromBbox(bbox)
      
      return {
        order,
        layer: null, // No layer initially
        points,
        region: oRegion,
        p: null, // No preferred point initially
        data: {
          metas: [{ chromosome: selected.chromosome }],
          filter: () => [], // Empty filter function
          find: () => null, // Empty find function
          map: () => [], // Empty map function
          forEach: () => {} // Empty forEach function
        }
      };
    });
  });

  
  const orderMin = 4, orderMax = 14;
  let xMin = 0, yMin = 0, sizeMin = 0, zoomMin = 0.85;
  let xMax = 5, yMax = 5, sizeMax = 5, zoomMax = 4000;
  const zoomExtent = useMemo(() => [zoomMin, zoomMax], [zoomMin, zoomMax]);
  const orderDomain = useMemo(() => [orderMin, orderMax], [orderMin, orderMax]);
  const diff = useMemo(() => (width > height) ? width - height : height - width, [height, width]);
  const xRange = useMemo(() => (width > height) ? [diff / 2, width - diff / 2] : [0, width], [height, width, diff]);
  const yRange = useMemo(() => (width > height) ? [0, height] : [diff / 2, height - diff / 2], [height, width, diff]);
  const sizeRange = useMemo(() => (width > height) ? [0, height] : [0, width], [height, width]);
  const xScale = useMemo(() => scaleLinear().domain([xMin, xMax]).range(xRange), [xMin, xMax, xRange]);
  const yScale = useMemo(() => scaleLinear().domain([yMin, yMax]).range(yRange), [yMin, yMax, yRange]);
  const sizeScale = useMemo(() => scaleLinear().domain([sizeMin, sizeMax]).range(sizeRange), [sizeMin, sizeMax, sizeRange]);
  const orderZoomScale = useMemo(() => scaleLinear().domain(zoomExtent).range([1, Math.pow(2, orderDomain[1] - orderDomain[0] + 0.999)]), [orderDomain, zoomExtent]);
  const scales = useMemo(() => ({ xScale, yScale, sizeScale, orderZoomScale, width, height }), [xScale, yScale, sizeScale, orderZoomScale, width, height]);

  const [interpXScale, setInterpXScale] = useState(() => scaleLinear());

  const zoomToBox = useCallback((x0, y0, x1, y1, order, scaleMultiplier = 1) => {
    const centerX = (x0 + x1) / 2;
    const centerY = (y0 + y1) / 2;
    const screenCenterX = xScale(centerX);
    const screenCenterY = yScale(centerY);
    const scale = Math.pow(2, order) * scaleMultiplier;
    const tx = screenCenterX - width / (2 * scale);
    const ty = screenCenterY - height / (2 * scale);
    return zoomIdentity.translate(-tx * scale, -ty * scale).scale(scale);
  }, [xScale, yScale, width, height]);

  useEffect(() => {
    if (canvasRef.current) {
      scaleCanvas(canvasRef.current, canvasRef.current.getContext("2d"), width, height);
    }
  }, [canvasRef, width, height]);

  // Data fetching
  useEffect(() => {
    if (!csn || !csn.path || !csn.path.length) return;
    
    // check if data has already been collected
    if(!isPreviewRef.current && globalPowerData && globalPowerData.filter(d => d.collected).length === 11) {
      console.log("WE HAVE GLOBAL POWER DATA", globalPowerData)
      setData(globalPowerData);
      setPowerDataLoaded(true);
      return;
    }
    
    // Function to prepare an orderPoint for a specific order
    const prepareOrderPoint = (o) => {
      let p = csn.path.find(d => d.order === o);
      if(o === 14 && csn.variants) {
        const v = variantChooser(csn.variants || []);
        p = { region: v, layer: v.layer, field: v.topField, order: 14 };
      }
      
      const hilbert = new HilbertChromosome(o);
      const step = hilbert.step;
      let region;
      let lastRegion = null;
      
      if(p) {
        region = p.region;
        lastRegion = region;
      } else {
        // Find a region based on nearby regions in the path
        let nearestHigherOrder = csn.path.find(d => d.order > o);
        let nearestLowerOrder = [...csn.path].reverse().find(d => d.order < o);
        
        if (nearestHigherOrder) {
          const orderDiff = nearestHigherOrder.order - o;
          const i = parseInt(nearestHigherOrder.region.i / (4 ** orderDiff));
          region = hilbert.fromRange(nearestHigherOrder.region.chromosome, i, i+1)[0];
        } else if (nearestLowerOrder) {
          const i = nearestLowerOrder.region.i * 4 ** (o - nearestLowerOrder.order);
          region = hilbert.fromRange(nearestLowerOrder.region.chromosome, i, i+1)[0];
        } else {
          // Fallback to first region in path
          const firstRegion = csn.path[0].region;
          region = hilbert.fromRange(firstRegion.chromosome, firstRegion.i, firstRegion.i+1)[0];
        }
        
        // Special handling for order 13 with variants
        if(o === 13 && csn.variants) {
          const v = csn.variants.sort((a,b) => b.topField.value - a.topField.value)[0];
          // Use variant information if available
        }
      }
      
      const bbox = {
        x: region.x - step * radius,
        y: region.y - step * radius,
        width: step * radius * 2,
        height: step * radius * 2
      };
      const points = hilbert.fromBbox(bbox);
      
      return { 
        order: o, 
        layer: o === 14 ? order_14 : p?.layer, 
        region, 
        p, 
        points 
      };
    };
    
    // Function to fetch data for a specific order point
    const fetchDataForOrderPoint = async (orderPoint) => {
      const dataClient = new Data();
      // console.log("fetchDataForOrderPoint", orderPoint)
      if(orderPoint.layer?.layers) { 
        return Promise.all(orderPoint.layer.layers.map(l => 
          dataClient.fetchData(l, orderPoint.order, orderPoint.points)
        ));
      } else {
        return dataClient.fetchData(orderPoint.layer, orderPoint.order, orderPoint.points);
      }
    };
    
    // Function to process fetched data
    const processOrderData = (orderPoint, response) => {
      const ord = orderPoint.order;
      const layer = orderPoint.layer;
      let processedData = response;
      
      if(ord === 14 && layer) {
        processedData = layer.combiner(response);
      }
      
      return { 
        order: ord, 
        layer, 
        points: orderPoint.points, 
        region: orderPoint.region, 
        p: orderPoint.p, 
        data: processedData,
        collected: true
      };
    };
    
    // debounce multiple requests
    dataDebounce(
      // First fetch data for the current order
      async () => {
        const currentOrder = Math.max(...csn?.path?.map(d => d?.order)) || csn.order  // Math.floor(percentScale(percent));
        setLoading(true);
        setPowerDataLoaded(false);
        
        // prepare order points for all orders first for proper initial rendering
        const allOrderPoints = range(4, 15).map(o => prepareOrderPoint(o))

        // reference to order point in allOrderPoints
        const currentOrderPoint = allOrderPoints.find(d => d.order === currentOrder);
        
        let kickoff = Date.now()
        console.log("kick off target fetchData", currentOrderPoint)
        // Fetch data for the current order
        fetchDataForOrderPoint(currentOrderPoint).then(response => {
          console.log("finished target fetchData", currentOrderPoint, Date.now() - kickoff)
          // Process the current order data
          const orderPointWithData = processOrderData(currentOrderPoint, response);
          // Update the data state for just this order
          setData(allOrderPoints.map(d => d.order == orderPointWithData.order ? orderPointWithData : d));
          
          setLoading(false);
          setPowerDataLoaded(true);
          kickoff = Date.now()
          console.log("kick off fetchAllData")
          // Now lazily fetch the rest of the data
          const fetchAllData = async () => {
            // Generate order points for all orders
            // const allOrderPoints = (
              // if preview, load only the current order and its neighbors
              // isPreviewRef.current ? 
                // load extra orders around the current order so the transform
                // can anchor to a position when it approaches the next order
                // and doesn't look off when a neighboring order is suddenly hovered 
                // over
                // [currentOrder + 1, currentOrder - 1, currentOrder + 2]
                // .filter(o => o !== currentOrder && o >= 4 && o <= 14)
            const remainingOrderPoints = allOrderPoints
              .reverse()  // load the highest orders first
              .filter(d => d.order !== currentOrder)  // Skip the already fetched order
            
            // Fetch data for each order point
            for (const orderPoint of remainingOrderPoints) {
              try {
                const response = await fetchDataForOrderPoint(orderPoint);
                const orderPointWithData = processOrderData(orderPoint, response);
                
                // Update the data state with newly collected data for this order
                setData(prevData => {
                  if (!prevData) return allOrderPoints.map(d => d.order == orderPointWithData.order ? orderPointWithData : d);
                  return prevData.map(d => d.order === orderPointWithData.order ? orderPointWithData : d);
                });
              } catch (error) {
                console.error(`Error fetching data for order ${orderPoint.order}:`, error);
              }
            }
            console.log("finished fetchAllData", Date.now() - kickoff)
          };
          // Start fetching all data in the background
          fetchAllData();
        }).catch(error => {
          console.error("Error fetching initial data:", error);
          setLoading(false);
        })
      },
      () => {},
      150
    )
  }, [csn]);

  useEffect(() => {
    if(!isPreviewRef.current) {
      // Update the global power data when local data changes
      // only track data changes if the data is not a preview
      const collectedCount = data.filter(d => d.collected).length;
      const globalCollectedCount = (globalPowerData || []).filter(d => d.collected).length;

      // only update if we have more data than before
      if (collectedCount > globalCollectedCount) {
        const dataRegion = data.filter(d => !!d?.p).sort((a, b) => b.order - a.order).shift()?.region;
        setGlobalPowerData(dataRegion, data);
        
        if(collectedCount === 11) {
          // all power data has been collected
          setPreventDerivation(false);
        }
      }
    }
  }, [data, setGlobalPowerData, globalPowerData, setPreventDerivation])

  const throttledWheel = useCallback(
    throttle((delta) => {
      setPercent(prev => {
        const newP = Math.max(0, Math.min(100, prev + delta * 0.01));

        // Defer update of ZoomProvider until after render:
        requestAnimationFrame(() => {
          onOrder(percentScale(newP));
        });
        // onOrder(percentScale(newP))

        return newP;
      });
    }, 22), // ~45fps
    [onOrder, percentScale]
  );

  const handleWheel = useCallback(event => {
    event.preventDefault();
    throttledWheel(-event.deltaY);
  }, [throttledWheel]);

  // const handleWheel = useCallback(event => {
  //   event.preventDefault();
  //   const delta = -event.deltaY;
  //   setPercent(prev => {
  //     let newP = prev + delta * 0.01;
  //     newP = Math.max(0, Math.min(100, newP));
      
  //     // Defer update of ZoomProvider until after render:
  //     requestAnimationFrame(() => {
  //       onOrder(percentScale(newP));
  //     });
  //     // onOrder(percentScale(newP))
      
  //     return newP;
  //   });
  // }, [onOrder, percentScale]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (canvas) {
      canvas.addEventListener('wheel', handleWheel, { passive: false });
      return () => canvas.removeEventListener('wheel', handleWheel);
    }
  }, [handleWheel]);

  const oscale = useMemo(() => scaleLinear().domain([0, 0.5]).range([1, 0]).clamp(true), []);

  // memoized transform
  const transformResult = useMemo(() => {
    if (!data) return null;
    
    const or = percentScale(percent);
    const o = Math.max(Math.floor(or), 4);
    const hilbert = new HilbertChromosome(o);
    const step = hilbert.step;
    
    const d = data.find(d => d.order === o);
    if (!d) return null;
    
    const r = d.region;
    const no = o + 1;
    const nd = data.find(d => d.order === no);
    
    let transform;
    if(nd) {
      const t = zoomToBox(r.x, r.y, r.x + step, r.y + step, o, 0.25);
      const nStep = new HilbertChromosome(no).step;
      const nt = zoomToBox(nd.region.x, nd.region.y, nd.region.x + nStep, nd.region.y + nStep, no, 0.25);
      transform = interpolateObject(t, nt)(or - o);
    } else {
      const scalerVal = 0.25 + (or - o);
      transform = zoomToBox(r.x, r.y, r.x + step, r.y + step, o, scalerVal);
    }

    return {
      transform,
      order: o,
      region: r,
      data: d,
      or: or
    };
  }, [percent, percentScale, data, zoomToBox]);

  useEffect(() => {
    if (!canvasRef.current || !transformResult) return;
    
    const { transform, order: o, region: r, data: d, or } = transformResult;
    setOrder(o);
    if (d?.region && !(
        currentPreferredRef.current?.chromosome === d.region.chromosome &&
        currentPreferredRef.current?.i === d.region.i &&
        currentPreferredRef.current?.order === d.region.order
      )
    ) {
      currentPreferredRef.current = d.region;
      setCurrentPreferredGlobal(d.region);
    }
    
    const meta = d.data?.metas?.find(meta => meta.chromosome === r.chromosome) || {};
    const ctx = canvasRef.current.getContext('2d');
    ctx.clearRect(0, 0, width, height);
    
    if(d.layer && d.data) {
      CanvasRenderer(d.layer.renderer, { 
        scales, 
        state: { 
          data: d.data.filter(dd => dd.chromosome === r.chromosome),
          loading: false,
          points: d.points,
          meta,
          order: o,
          transform
        }, 
        layer: d.layer, 
        canvasRef 
      });
    } else {
      renderPipes(ctx, d.points, transform, o, scales, "#eee", 0.25);
    }
    
    ctx.lineWidth = 0.5;
    if(o > 4) {
      const pd = data.find(d => d.order === o - 1);
      ctx.globalAlpha = oscale(or - o);
      if(pd && pd.layer && pd.data) {
        CanvasRenderer(pd.layer.renderer, { 
          scales,
          state: { 
            data: pd.data.filter(dd => dd.chromosome === r.chromosome),
            loading: false,
            points: pd.points,
            meta: pd.data.metas.find(meta => meta.chromosome === pd.region.chromosome),
            order: o - 1,
            transform
          },
          layer: pd.layer,
          canvasRef
        });
      } else if(pd) {
        renderPipes(ctx, pd.points, transform, o - 1, scales, "#eee", 0.25);
      }
      const lr = data.find(d => d.order === o - 1);
      ctx.lineWidth = 2;
      ctx.strokeStyle = "black";
      if(lr) renderSquares(ctx, [lr.region], transform, o - 1, scales, false, "black");
    }
    ctx.lineWidth = 2;
    ctx.strokeStyle = "black";
    ctx.globalAlpha = 1; // Ensure full opacity for the outline
    renderSquares(ctx, [r], transform, o, scales, false, "black");
    
  }, [transformResult, width, height, scales, data, oscale]);

  const linearCenter = useMemo(() => {
    let center = csn?.path.find(d => d.order === order)?.region;
    // if path does not extend to order, extend highest resolution region to order and use that as centerpoint
    if(!!csn?.path.length && !center) {
      const largestOrderRegion = csn.path.sort((a, b) => a.order - b.order).slice(-1)[0]?.region;
      const oi = hilbertPosToOrder(largestOrderRegion.i, { from: largestOrderRegion.order, to: order });
      center = fromIndex(largestOrderRegion.chromosome, oi, order)
    }
    return center; 
  }, [csn, order])

  const linearData = useMemo(() => {
    return data?.find(d => d.order === order)?.data
  }, [data, order])

  const linearLayer = useMemo(() => {
    if (!data) return null;
    return data.find(d => d.order === order)?.layer
  }, [data, order])

  const handleClose = useCallback((index) => {
    if (regionSnapshots?.length > 1) {
      let toClose = regionSnapshots[index].selected;
      const id = `${toClose.chromosome},${toClose.i},${toClose.order}`;
      popRegionFromSnapshots(id);
    } else {
      onClose();
    }
  }, [onClose, regionSnapshots])

  const handleTabClick = useCallback((index) => {
    if (regionSnapshots?.length) {
      let toSwitchTo = regionSnapshots[index].selected;
      const id = createKey(toSwitchTo)
      const selectedId = createKey(selected)
      if(id === selectedId) {
        onOrder(selected.order + 0.5);
      } else {
        switchSnapshots(id);
      }
    }
  }, [regionSnapshots, switchSnapshots, selected])

  const handleSegmentClick = useCallback((segment) => {
    if(!!selected.derivedFrom || (
      segment.chromosome === selected?.chromosome &&
      segment.i === selected?.i &&
      segment.order === selected?.order
    )) return;
    spawnRegionSidetrack(segment);
  }, [selected, spawnRegionSidetrack]);

  const findClickedSegment = (x, y, points, t, order, scales) => {
    const step = Math.pow(0.5, order);
    const rw = scales.sizeScale(step) * t.k * 1 - 1;
    
    for (let i = 0; i < points.length; i++) {
      const d = points[i];
      const xx = t.x + scales.xScale(d.x) * t.k;
      const yy = t.y + scales.yScale(d.y) * t.k;
      
      // Check if click is within this segment
      if (
        x >= xx - rw/2 && 
        x <= xx + rw/2 && 
        y >= yy - rw/2 && 
        y <= yy + rw/2
      ) {
        return { ...d, index: i };
      }
    }
    return null;
  };

  const handleCanvasClick = useCallback((event) => {
    if (!transformResult) return;
    
    // canvas relative coordinates
    const rect = canvasRef.current.getBoundingClientRect();
    const x = event.clientX - rect.left;
    const y = event.clientY - rect.top;
    
    // current transform and data
    const { transform, order, data } = transformResult;
    
    // find which segment was clicked
    const clickedSegment = findClickedSegment(x, y, data.points, transform, order, scales);
    if (clickedSegment) handleSegmentClick(clickedSegment)
  }, [transformResult, scales, handleSegmentClick, findClickedSegment]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (canvas) {
      canvas.addEventListener('dblclick', handleCanvasClick);
      return () => canvas.removeEventListener('dblclick', handleCanvasClick);
    }
  }, [handleCanvasClick]);

  return (
    <div ref={containerRef} className="relative power h-full w-full border-[2px] border-gray-400 mt-2">
      <div>
        <div className="relative">
          {/* Tabs */}
          <div className="flex flex-row cursor-default">
            {(regionSnapshots?.length ? regionSnapshots : (selected ? [{selected}] : [])).map((d, index) => {
              let isSelected = (
                d.selected?.chromosome === selected?.chromosome && 
                d.selected?.i === selected?.i && 
                d.selected?.order === selected?.order
              );
              return (
                <div 
                  className={`
                    relative -top-0.5 left-0 -ml-0.5 -mt-7 px-1 flex flex-row items-center space-x-2 
                    text-[10px] rounded-t-lg mx-0.5 cursor-pointer
                    border-t border-l border-r ${isSelected ? 'border-gray-400' : 'border-gray-200'}
                    ${isSelected ? 'bg-gray-400 text-white z-10' : 'bg-gray-100 text-black'}
                  `}
                  onClick={() => handleTabClick(index)}
                  key={`power-tab-${index}`}
                >
                  <div className="group flex items-center">
                    <X 
                      width="10" 
                      role="button" 
                      className="cursor-pointer group-hover:[&_path]:stroke-red-500" 
                      onClick={() => handleClose(index)}
                    />
                  </div>
                  <div className={`flex items-center ${!isSelected ? 'hover:text-red-500' : '' }`}>
                    {showPosition(d.selected)}{!!d.selected?.derivedFrom ? "*" : ""}
                  </div>
                </div>
              )
            })}
          </div>
          {loading && (
            //  bg-white bg-opacity-60
            <div className="absolute bg-white bg-opacity-40 inset-0 flex items-center justify-center pointer-events-none transform scale-[1.75]">
              <Loading />
            </div>
          )}
          <canvas
            className="power-canvas cursor-pointer"
            width={width}
            height={height}
            style={{ width: width + "px", height: height + "px" }}
            ref={canvasRef}
          />
        </div>
        {data && (
          <div className="relative border-separator" style={{ height: `${sheight}px` }}>
            <div className="absolute top-0 left-0 w-full h-full overflow-hidden">
              <LinearGenome
                center={linearCenter} 
                data={linearData}
                dataOrder={order}
                orderRaw={userOrder}
                layer={linearLayer}
                width={width}
                height={sheight}
                mapWidth={width}
                mapHeight={height}
                loading={loading}
                hover={null}
                allowPanning={false}
              />
            </div>
          </div>
        )}
      </div>
      <Tooltip ref={tooltipRef} orientation="bottom" enforceBounds={true} />
    </div>
  );
}

PowerModal.propTypes = {
  width: PropTypes.number,
  height: PropTypes.number,
  sheight: PropTypes.number,
  userOrder: PropTypes.number,
  onData: PropTypes.func,
  onOrder: PropTypes.func,
  onPercent: PropTypes.func,
};

export default PowerModal;