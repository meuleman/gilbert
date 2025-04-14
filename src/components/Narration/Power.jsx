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
import LinearGenome from '../../components/LinearGenome'

import Tooltip from '../Tooltips/Tooltip';
import PropTypes from 'prop-types';
import './Power.css';
import { throttle } from 'lodash';
import { X } from 'lucide-react'

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
  const { collectFullData: onData, narrationPreview, loadingFullNarration, selectedNarration, fullNarration, selected, setCurrentPreferred: setCurrentPreferredGlobal } = SelectedStatesStore();
  
  const [currentPreferred, setCurrentPreferred] = useState(null);
  useEffect(() => {
    // having a local and global (zustand) state for currentPreferred prevents lag with scrollable zoom (too many updates for zustand)
    setCurrentPreferredGlobal(currentPreferred);
  }, [currentPreferred]);

  const [isPreview, setIsPreview] = useState(false);
  useEffect(() => setIsPreview(!!narrationPreview), [narrationPreview]);
  const [csn, setCsn] = useState(selectedNarration);
  useEffect(() => {
    setCsn(narrationPreview ? narrationPreview : loadingFullNarration ? selectedNarration : fullNarration);
  }, [narrationPreview, loadingFullNarration, selectedNarration, fullNarration]);

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
  const dataDebounce = debouncer();
  useEffect(() => {
    if (!csn || !csn.path || !csn.path.length) return;
    const fetchData = async () => {
      const dataClient = new Data();
      let lastRegion = null;
      const orderPoints = range(4, 15).map(o => {
        let p = csn.path.find(d => d.order === o);
        if(o === 14 && csn.variants) {
          const v = variantChooser(csn.variants || []);
          p = { region: v, layer: v.layer, field: v.topField, order: 14 };
        }
        const hilbert = new HilbertChromosome(o);
        const step = hilbert.step;
        let region;
        if(p) {
          region = p.region;
          lastRegion = region;
        } else {
          let start, end, chromosome;
          if(!lastRegion) {
            const np = csn.path.find(d => d.order > o);
            const orderDiff = np.order - o;
            const i = parseInt(np.region.i / (4 ** orderDiff));
            region = hilbert.fromRange(np.region.chromosome, i, i+1)[0];
          } else {
            const i = lastRegion.i * 4;
            region = hilbert.fromRange(lastRegion.chromosome, i, i+1)[0];
          }
          if(o < 14) {
            let np = csn.path.find(d => d.order > o);
            if(o === 13 && csn.variants) {
              const v = csn.variants.sort((a,b) => b.topField.value - a.topField.value)[0];
              np = { region: v };
            }
            if(np && np.region) {
              // Optionally update start/end if needed
            }
          }
          const regions = hilbert.fromRegion(lastRegion ? lastRegion.chromosome : csn.path[0].region.chromosome, region.start, region.end);
          region = regions[0];
          lastRegion = region;
        }
        const bbox = {
          x: region.x - step * radius,
          y: region.y - step * radius,
          width: step * radius * 2,
          height: step * radius * 2
        };
        const points = hilbert.fromBbox(bbox);
        return { order: o, layer: o === 14 ? order_14 : p?.layer, region, p, points };
      });
      const responses = await Promise.all(orderPoints.map(p => {
        if(p.layer?.layers){ 
          return Promise.all(p.layer.layers.map(l => dataClient.fetchData(l, p.order, p.points)));
        } else {
          return dataClient.fetchData(p.layer, p.order, p.points);
        }
      }));
      return { responses, orderPoints };
    };
    setLoading(true);
    dataDebounce(
      fetchData, 
      ({ responses, orderPoints }) => {
        setData(responses.map((d, i) => {
          const ord = orderPoints[i].order;
          const layer = orderPoints[i].layer;
          const region = orderPoints[i].region;
          if(ord === 14) {
            d = layer.combiner(d);
          }
          return { order: ord, layer, points: orderPoints[i].points, region, p: orderPoints[i].p, data: d };
        }));
        setLoading(false);
      },
      150
    );
  }, [csn]);

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
    setCurrentPreferred(d.p);
    
    const meta = d.data.metas?.find(meta => meta.chromosome === r.chromosome) || {};
    const ctx = canvasRef.current.getContext('2d');
    ctx.clearRect(0, 0, width, height);
    
    if(d.layer) {
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
      if(pd && pd.layer) {
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

  return (
    <div ref={containerRef} className="power w-full h-full border-[2px] border-separator p-0">
      <div>
        <div className="relative">
          {/* Close button */}
          <div className="absolute -top-1.5 left-0 -ml-0.5 -mt-4.5 px-1 flex flex-row items-center space-x-2 bg-separator text-black text-[10px] cursor-default">
            <div className="group flex items-center">
              <X 
                width="10" 
                role="button" 
                className="cursor-pointer group-hover:[&_path]:stroke-red-500" 
                onClick={onClose}
              />
            </div>
            <div className="flex items-center">
              {showPosition(selected)}
            </div>
          </div>
          {loading && (
            //  bg-white bg-opacity-60
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none transform scale-[1.75]">
              <Loading />
            </div>
          )}
          <canvas
            className="power-canvas"
            width={width}
            height={height}
            style={{ width: width + "px", height: height + "px" }}
            ref={canvasRef}
          />
        </div>
        {data && (
          <div className="relative h-24 border-separator">
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
                hover={null}
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