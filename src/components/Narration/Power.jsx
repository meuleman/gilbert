import { useState, useRef, useEffect, useMemo, useCallback, useLayoutEffect } from 'react';
import { scaleLinear, scaleLog, scalePow } from 'd3-scale';
import { zoomIdentity } from 'd3-zoom';
import { range, extent } from 'd3-array';
import { line } from "d3-shape";
import { interpolateObject, interpolateNumber } from 'd3-interpolate';

import { HilbertChromosome, hilbertPosToOrder } from '../../lib/HilbertChromosome';
import { fromIndex } from '../../lib/regions'
import Data from '../../lib/data';
import { debouncer } from '../../lib/debounce';
import { showPosition } from '../../lib/display';
import scaleCanvas from '../../lib/canvas';
import { getOffsets } from '../../lib/segments';
import { variantChooser } from '../../lib/csn';
import { getGencodesInView } from '../../lib/Genes';

import order_14 from '../../layers/order_14';

import Loading from '../Loading';
import { Renderer as CanvasRenderer } from '../Canvas/Renderer';

import { useZoom } from '../../contexts/zoomContext';
import SelectedStatesStore from '../../states/SelectedStates';

import Tooltip from '../Tooltips/Tooltip';
import PropTypes from 'prop-types';
import './Power.css';

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

// Compute an interpolated x-scale based on current and next order points.
function computeInterpXScale(currentPoints, nextPoints, orDiff, width) {
  const curStart = (extent(currentPoints, d => d.start) || [0,0])[0];
  const curEnd   = (extent(currentPoints, d => d.end)   || [0,width])[1];
  const nextStart = nextPoints ? (extent(nextPoints, d => d.start) || [curStart, curEnd])[0] : curStart;
  const nextEnd   = nextPoints ? (extent(nextPoints, d => d.end)   || [curStart, curEnd])[1] : curEnd;
  const interpStart = interpolateNumber(curStart, nextStart)(orDiff);
  const interpEnd   = interpolateNumber(curEnd, nextEnd)(orDiff);
  return scaleLinear().domain([interpStart, interpEnd]).range([0, width]);
}

// Update render1DStrip to work with a single-order data array.
function render1DStrip(ctx, currentData, xs, currentOrder, oscale, width, sheight) {
  // Render only the current order
  const rh = sheight; // use full strip height 
  const d = currentData[0]; // expect one element
  const dhdistance = 16 + 4 * (d.order - 4);
  d.points
    .filter(p => p.i > d.region.i - dhdistance && p.i < d.region.i + dhdistance)
    .forEach(p => {
      let rectW = xs(p.end) - xs(p.start);
      if(rectW < 1) rectW = 1;
      let dp;
      if(d.order > 4) {
        const tolerance = 1;
        dp = d.data.find(dd =>
          (dd.start <= p.start + tolerance && dd.end >= p.end - tolerance) ||
          (Math.abs(dd.start - p.start) < tolerance && Math.abs(dd.end - p.end) < tolerance)
        );
      } else {
        dp = d.data.find(dd => dd.i === p.i) ||
             d.data.find(dd => p.start >= dd.start && p.end <= dd.end);
      }
      if(dp && d.layer) {
        const sample = d.layer.fieldChoice(dp);
        if(sample && sample.field){
          ctx.fillStyle = d.layer.name === "Nucleotides"
            ? d.layer.fieldColor(sample.value)
            : d.layer.fieldColor(sample.field);
        }
      } else {
        ctx.fillStyle = "#eee";
      }
      // Full opacity for current order.
      ctx.globalAlpha = 1;
      ctx.fillRect(xs(p.start), 0, rectW - 0.5, rh - 1);
    });
  // Highlight the current order's region.
  ctx.globalAlpha = 1;
  ctx.strokeStyle = "black";
  ctx.lineWidth = 2;
  ctx.strokeRect(xs(d.region.start), 0, xs(d.region.end) - xs(d.region.start) - 0.5, rh - 1);
}
  
// ------------------
// Component
// ------------------
function PowerModal({ width: propWidth, height: propHeight, sheight = 30, geneHeight = 64, badgeHeight = 50, onPercent }) {
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
  const height = propHeight || (containerSize.height - sheight - geneHeight - badgeHeight);

  const canvasRef = useRef(null);
  const canvasRefStrip = useRef(null);
  const canvasRefGenes = useRef(null);
  const tooltipRef = useRef(null);

  const { handleSelectedZoom: onOrder, selectedZoomOrder: userOrder } = useZoom();
  const { collectFullData: onData, narrationPreview, loadingFullNarration, selectedNarration, fullNarration, selected } = SelectedStatesStore();

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
  const [currentPreferred, setCurrentPreferred] = useState(null);
  const radius = 9;

  // initialize data to empty data structure so we can render empty hilbert curve while data loads
  const [data, setData] = selected ? useState(() => {
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
  }) : useState(null);

  
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
  useEffect(() => {
    if (canvasRefStrip.current) {
      scaleCanvas(canvasRefStrip.current, canvasRefStrip.current.getContext("2d"), width, sheight);
    }
  }, [canvasRefStrip, width, sheight]);

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
      50
    );
  }, [csn]);

  const handleWheel = useCallback(event => {
    event.preventDefault();
    const delta = -event.deltaY;
    setPercent(prev => {
      let newP = prev + delta * 0.01;
      newP = Math.max(0, Math.min(100, newP));
      onOrder(percentScale(newP));
      return newP;
    });
  }, [onOrder, percentScale]);
  useEffect(() => {
    const canvas = canvasRef.current;
    if (canvas) {
      canvas.addEventListener('wheel', handleWheel, { passive: false });
      return () => canvas.removeEventListener('wheel', handleWheel);
    }
  }, [handleWheel]);

  const oscale = useMemo(() => scaleLinear().domain([0, 0.5]).range([1, 0]).clamp(true), []);

  // Render the 2D power visualization (unchanged)
  useEffect(() => {
    const or = percentScale(percent);
    const o = Math.floor(or);
    setOrder(o);
    const hilbert = new HilbertChromosome(o);
    const step = hilbert.step;
    if (canvasRef.current && data) { //csn && csn.path && 
      const d = data.find(d => d.order === o);
      if(d) {
        setCurrentPreferred(d.p);
        const r = d.region;
        let transform;
        const no = o + 1;
        const nd = data.find(d => d.order === no);
        if(nd) {
          const t = zoomToBox(r.x, r.y, r.x + step, r.y + step, o, 0.25);
          const nStep = new HilbertChromosome(no).step;
          const nt = zoomToBox(nd.region.x, nd.region.y, nd.region.x + nStep, nd.region.y + nStep, no, 0.25);
          transform = interpolateObject(t, nt)(or - o);
        } else {
          const scalerVal = 0.25 + (or - o);
          transform = zoomToBox(r.x, r.y, r.x + step, r.y + step, o, scalerVal);
        }
        const meta = d.data.metas?.find(meta => meta.chromosome === r.chromosome) || {};
        const ctx = canvasRef.current.getContext('2d');
        ctx.clearRect(0, 0, width, height);
        if(d.layer){
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
      }
    }
  }, [percent, percentScale, csn, data, oscale, width, height, zoomToBox, scales]);

  // Optimized Render for the 1D Strip
  useEffect(() => {
    const or = percentScale(percent);
    const o = Math.floor(or);
    const dCurrent = data?.find(d => d.order === o);
    if(dCurrent && canvasRefStrip.current) {
      const r = dCurrent.region;
      const hdistance = 16 + 4 * (o - 4);
      const pointso = dCurrent.points.filter(d => 
        d.chromosome === r.chromosome && d.i > r.i - hdistance && d.i < r.i + hdistance
      );
      const xExtentStart = extent(pointso, d => d.start);
      const xExtentEnd = extent(pointso, d => d.end);
      let xs = scaleLinear().domain([xExtentStart[0], xExtentEnd[1]]).range([0, width]);
      
      // Interpolate with next order if available.
      const no = o + 1;
      const dnorder = data.find(d => d.order === no);
      let nxExtentStart, nxExtentEnd;
      if(dnorder) {
        const nr = dnorder.region;
        const nhdistance = 16 + 4 * (no - 4);
        const pointsno = dnorder.points.filter(d =>
          d.chromosome === r.chromosome && d.i > nr.i - nhdistance && d.i < nr.i + nhdistance
        );
        nxExtentStart = extent(pointsno, d => d.start);
        nxExtentEnd = extent(pointsno, d => d.end);
      } else {
        const rw = r.end - r.start;
        nxExtentStart = [r.start - rw * 16, 0];
        nxExtentEnd = [0, r.end + rw * 16];
      }
      const interpolateStart = interpolateNumber(xExtentStart[0], nxExtentStart[0]);
      const interpolateEnd = interpolateNumber(xExtentEnd[1], nxExtentEnd[1]);
      xs = scaleLinear().domain([
        interpolateStart(or - o),
        interpolateEnd(or - o)
      ]).range([0, width]);
      setInterpXScale(() => xs);
      const ctxs = canvasRefStrip.current.getContext('2d');
      ctxs.clearRect(0, 0, width, sheight);
      // Render only the current order by sending it as a single-element array.
      render1DStrip(ctxs, [dCurrent], xs, o, oscale, width, sheight);
    }
  }, [percent, percentScale, csn, data, width, sheight, oscale]);


  // Render the Gene tracks (using similar interpolation as before)
  useEffect(() => {
    const or = percentScale(percent);
    const o = Math.floor(or);
    const hilbert = new HilbertChromosome(o);
    if(canvasRefGenes.current && data) {
      const dorder = data.find(d => d.order === o);
      if(dorder) {
        const r = dorder.region;
        const ctxs = canvasRefGenes.current.getContext('2d');
        ctxs.clearRect(0, 0, width, geneHeight);
        const hdistance = 16 + 4 * (o - 4);
        const pointso = dorder.points.filter(d => d.chromosome === r.chromosome && d.i > r.i - hdistance && d.i < r.i + hdistance);
        const xExtentStart = extent(pointso, d => d.start);
        const xExtentEnd = extent(pointso, d => d.end);
        let xs = scaleLinear().domain([xExtentStart[0], xExtentEnd[1]]).range([0, width]);
        const no = o + 1;
        const dnorder = data.find(d => d.order === no);
        let nxExtentStart, nxExtentEnd;
        if(dnorder) {
          const nr = dnorder.region;
          const nhdistance = 16 + 4 * (no - 4);
          const pointsno = dnorder.points.filter(d => d.chromosome === r.chromosome && d.i > nr.i - nhdistance && d.i < nr.i + nhdistance);
          nxExtentStart = extent(pointsno, d => d.start);
          nxExtentEnd = extent(pointsno, d => d.end);
        } else {
          const rw = r.end - r.start;
          nxExtentStart = [r.start - rw*16, 0];
          nxExtentEnd = [0, r.end + rw*16];
        }
        const interpolateStart = interpolateNumber(xExtentStart[0], nxExtentStart[0]);
        const interpolateEnd = interpolateNumber(xExtentEnd[1], nxExtentEnd[1]);
        xs = scaleLinear().domain([
          interpolateStart(or - o),
          interpolateEnd(or - o)
        ]).range([0, width]);
        const gs = getGencodesInView(pointso, o, 100000000);
        ctxs.globalAlpha = 1;
        gs.forEach((g, i) => {
          let xpos = xs(g.start);
          if(xpos < 10) xpos = 10;
          if(xpos > width - 10) xpos = width - 10;
          ctxs.fillStyle = "black";
          ctxs.fillText(g.hgnc, Math.floor(xpos), Math.floor(geneHeight - i - 5));
          ctxs.beginPath();
          const y = geneHeight - i;
          ctxs.moveTo(Math.floor(xs(g.start)), y);
          ctxs.lineTo(Math.floor(xs(g.end)), y);
          ctxs.strokeStyle = "black";
          ctxs.lineWidth = 2;
          ctxs.stroke();
        });
      }
    }
  }, [percent, percentScale, data, width, geneHeight]);

  const handleMouseMove = useCallback(e => {
    const { clientX } = e;
    const rect = e.target.getBoundingClientRect();
    const xPos = clientX - rect.x;
    let start = interpXScale.invert(xPos);
    const dataRegion = data?.find(d => d.order === order);
    if(!dataRegion) return;
    const dFound = dataRegion.data.find(dd => dd.start <= start && dd.end >= start);
    if(dFound){
      tooltipRef.current.show(dFound, dataRegion.layer, clientX, rect.top + sheight + 5);
    }
  }, [data, interpXScale, order, sheight]);
  
  const handleMouseLeave = useCallback(() => {
    tooltipRef.current.hide();
  }, []);

  return (
    <div ref={containerRef} className="power w-full h-full">
      <div className={`max-h-[${badgeHeight}px] flex flex-col`}>
        <div className="min-h-[25px] text-center" style={{ maxWidth: width + "px" }}>
          <div className="text-xl">
            {currentPreferred?.region && showPosition(currentPreferred.region)}
          </div>
        </div>
        <div className="text-xl min-h-[25px] text-center mb-2" style={{ maxWidth: width + "px" }}>
          {currentPreferred?.field ? (
            <>
              <span style={{ color: currentPreferred?.layer?.fieldColor(currentPreferred?.field?.field), marginRight: '4px' }}>⏺</span>
              {currentPreferred?.field?.field} {currentPreferred?.layer?.labelName}
            </>
          ) : null}
        </div>
      </div>
      <div>
        <div className="relative">
          {loading && (
            //  bg-white bg-opacity-60
            <div className="absolute inset-0 flex items-center justify-center transform scale-[1.75]">
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
        <canvas
          className="power-canvas-strip"
          width={width}
          height={sheight}
          style={{ width: width + "px", height: sheight + "px" }}
          ref={canvasRefStrip}
          onMouseMove={handleMouseMove}
          onMouseLeave={handleMouseLeave}
        />
        <canvas
          className="power-canvas-genes"
          width={width}
          height={geneHeight}
          style={{ width: width + "px", height: geneHeight + "px" }}
          ref={canvasRefGenes}
        />
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