import { useState, useRef, useEffect, useMemo, useCallback } from 'react';
import { useResizeObserver } from '../../hooks/useResizeObserver';
import { useCanvasScale } from '../../hooks/useCanvasScale';
import { scaleLinear } from 'd3-scale';
import { range, extent } from 'd3-array';
import { interpolateObject, interpolateNumber } from 'd3-interpolate';
import { HilbertChromosome } from '../../lib/HilbertChromosome';
import Data from '../../lib/data';
import { debouncer } from '../../lib/debounce';
import { showPosition } from '../../lib/display';
import { variantChooser } from '../../lib/csn';
import { getGencodesInView } from '../../lib/Genes';
import order_14 from '../../layers/order_14';
import Loading from '../Loading';
import { Renderer as CanvasRenderer } from '../Canvas/Renderer';
import { useZoom } from '../../contexts/zoomContext';
import SelectedStatesStore from '../../states/SelectedStates';
import Tooltip from '../Tooltips/Tooltip';
import { renderSquares, renderPipes, zoomToBox } from './PowerUtils';
import './Power.css';
import PropTypes from 'prop-types';

PowerModal.propTypes = {
  width: PropTypes.number,
  height: PropTypes.number,
  sheight: PropTypes.number,
  userOrder: PropTypes.number,
  onData: PropTypes.func,
  onOrder: PropTypes.func,
  onPercent: PropTypes.func,
};

const dataDebounce = debouncer();

function PowerModal({ width: propWidth, height: propHeight, sheight = 30, geneHeight = 64, badgeHeight = 50, onPercent }) {
  // Container & canvas refs
  const containerRef = useRef(null);
  const canvasRef = useRef(null);
  const canvasRefStrip = useRef(null);
  const canvasRefGenes = useRef(null);
  const tooltipRef = useRef(null);

  // Use our custom hook to set containerSize. (No need for a local useLayoutEffect here.)
  const [containerSize, setContainerSize] = useState({ width: 0, height: 0 });
  useResizeObserver(containerRef, setContainerSize);

  // Determine drawing dimensions (either passed as props or measured)
  const width = propWidth || containerSize.width;
  const height = propHeight || (containerSize.height - sheight - geneHeight - badgeHeight);

  // Scale canvases using a custom hook
  useCanvasScale(canvasRef, width, height);
  useCanvasScale(canvasRefStrip, width, sheight);
  useCanvasScale(canvasRefGenes, width, geneHeight);

  // Global state from contexts and stores
  const { handleSelectedZoom: onOrder, selectedZoomOrder: userOrder } = useZoom();
  const { collectFullData: onData, narrationPreview, loadingFullNarration, selectedNarration, fullNarration } = SelectedStatesStore();

  // Determine preview mode and choose the current CSN accordingly
  const [isPreview, setIsPreview] = useState(false);
  useEffect(() => {
    setIsPreview(!!narrationPreview);
  }, [narrationPreview]);

  const [csn, setCsn] = useState(selectedNarration);
  useEffect(() => {
    setCsn(narrationPreview ? narrationPreview : loadingFullNarration ? selectedNarration : fullNarration);
  }, [narrationPreview, loadingFullNarration, selectedNarration, fullNarration]);

  const [loading, setLoading] = useState(false);
  const percentScale = useMemo(() => scaleLinear().domain([1, 100]).range([4, 14.999]), []);
  const [percent, setPercent] = useState(userOrder ? percentScale.invert(userOrder) : 1);
  useEffect(() => {
    setPercent(userOrder ? percentScale.invert(userOrder) : 1);
  }, [userOrder, percentScale]);

  const [order, setOrder] = useState(userOrder ? userOrder : 4);
  const [data, setData] = useState(null);
  const [currentPreferred, setCurrentPreferred] = useState(null);
  const radius = 9; // Number of steps in each direction

  // Hard-coded parameters (could later be moved or documented as constants)
  const orderMin = 4, orderMax = 14;
  let xMin = 0, yMin = 0, sizeMin = 0, zoomMin = 0.85;
  let xMax = 5, yMax = 5, sizeMax = 5, zoomMax = 4000;
  const zoomExtent = useMemo(() => [zoomMin, zoomMax], [zoomMin, zoomMax]);
  const orderDomain = useMemo(() => [orderMin, orderMax], [orderMin, orderMax]);
  const diff = useMemo(() => (width > height) ? width - height : height - width, [width, height]);
  const xRange = useMemo(() => (width > height) ? [diff / 2, width - diff / 2] : [0, width], [width, height, diff]);
  const yRange = useMemo(() => (width > height) ? [0, height] : [diff / 2, height - diff / 2], [width, height, diff]);
  const sizeRange = useMemo(() => (width > height) ? [0, height] : [0, width], [width, height]);
  const xScale = useMemo(() => scaleLinear().domain([xMin, xMax]).range(xRange), [xMin, xMax, xRange]);
  const yScale = useMemo(() => scaleLinear().domain([yMin, yMax]).range(yRange), [yMin, yMax, yRange]);
  const sizeScale = useMemo(() => scaleLinear().domain([sizeMin, sizeMax]).range(sizeRange), [sizeMin, sizeMax, sizeRange]);
  const orderZoomScale = useMemo(() => scaleLinear().domain(zoomExtent).range([1, Math.pow(2, orderDomain[1] - orderDomain[0] + 0.999)]), [orderDomain, zoomExtent]);
  const scales = useMemo(() => ({ xScale, yScale, sizeScale, orderZoomScale, width, height }), [xScale, yScale, sizeScale, orderZoomScale, width, height]);

  // For the 1D view
  const [interpXScale, setInterpXScale] = useState(() => scaleLinear());

  // Fetch data using debouncing (can later be extracted into its own hook if desired)
  useEffect(() => {
    if (!csn || !csn.path || !csn.path.length) return;
    const fetchData = async () => {
      const dataClient = new Data();
      let lastRegion = null;
      const orderPoints = range(4, 15).map((o) => {
        let p = csn.path.find(d => d.order === o);
        if (o === 14 && csn.variants) {
          const v = variantChooser(csn.variants || []);
          p = { region: v, layer: v.layer, field: v.topField, order: 14 };
        }
        const hilbert = new HilbertChromosome(o);
        const step = hilbert.step;
        let region;
        if (p) {
          region = p.region;
          lastRegion = region;
        } else {
          let start, end, chromosome;
          if (!lastRegion) {
            const np = csn.path.find(d => d.order > o);
            const orderDiff = np.order - o;
            const i = parseInt(np.region.i / (4 ** orderDiff));
            region = hilbert.fromRange(np.region.chromosome, i, i + 1)[0];
            chromosome = region.chromosome;
            start = region.start;
            end = region.end;
          } else {
            const i = lastRegion.i * 4;
            chromosome = lastRegion.chromosome;
            region = hilbert.fromRange(chromosome, i, i + 1)[0];
            start = lastRegion.start;
            end = lastRegion.end;
          }
          if(o < 14) {
            let np = csn.path.find(d => d.order > o);
            if(o === 13 && csn.variants) {
              const v = csn.variants.sort((a,b) => b.topField.value - a.topField.value)[0];
              np = { region: v };
            }
            if(np && np.region) {
              start = np.region.start;
              end = np.region.end;
            }
          }
          const regions = hilbert.fromRegion(chromosome, start, end);
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
        return {
          order: o,
          layer: o === 14 ? order_14 : p?.layer,
          region,
          p,
          points
        };
      });
      const responses = await Promise.all(orderPoints.map(p => {
        if (p.layer?.layers) {
          return Promise.all(p.layer.layers.map(l => dataClient.fetchData(l, p.order, p.points)));
        } else {
          return dataClient.fetchData(p.layer, p.order, p.points);
        }
      }));
      return { responses, orderPoints };
    };

    setLoading(true);
    dataDebounce(fetchData, ({ responses, orderPoints }) => {
      setData(responses.map((d, i) => {
        const order = orderPoints[i].order;
        const layer = orderPoints[i].layer;
        const region = orderPoints[i].region;
        if(order === 14) {
          d = layer.combiner(d);
        }
        return {
          order,
          layer,
          points: orderPoints[i].points,
          region,
          p: orderPoints[i].p,
          data: d
        };
      }));
      setLoading(false);
    }, 50);
  }, [csn]);

  // Handle scroll wheel input to adjust percent and thus zoom/order
  const handleWheel = useCallback((event) => {
    event.preventDefault();
    const delta = -event.deltaY;
    setPercent(prevPercent => {
      let newPercent = prevPercent + delta * 0.01;
      newPercent = Math.max(0, Math.min(100, newPercent));
      onOrder(percentScale(newPercent));
      return newPercent;
    });
  }, [onOrder, percentScale]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (canvas) {
      canvas.addEventListener('wheel', handleWheel, { passive: false });
      return () => {
        canvas.removeEventListener('wheel', handleWheel);
      };
    }
  }, [handleWheel]);

  // For fading previous order: interpolate from [0, 0.5] -> [1, 0]
  const oscale = useMemo(() => scaleLinear().domain([0, 0.5]).range([1, 0]).clamp(true), []);

  // Render the 2D power visualization on the main canvas
  useEffect(() => {
    const or = percentScale(percent);
    const o = Math.floor(or);
    setOrder(o);
    const hilbert = new HilbertChromosome(o);
    const step = hilbert.step;
    if (csn && csn.path && canvasRef.current && data) {
      const d = data.find(d => d.order === o);
      if (d) {
        setCurrentPreferred(d.p);
        const r = d.region;
        let transform;
        const no = o + 1;
        const nd = data.find(d => d.order === no);
        if(nd) {
          const nr = nd.region;
          const t = zoomToBox(scales.xScale, scales.yScale, width, height)(r.x, r.y, r.x + step, r.y + step, o, 0.25);
          const nt = zoomToBox(scales.xScale, scales.yScale, width, height)(nr.x, nr.y, nr.x + step, nr.y + step, no, 0.25);
          transform = interpolateObject(t, nt)(or - o);
        } else {
          const scaler = 0.25 + (or - o);
          transform = zoomToBox(scales.xScale, scales.yScale, width, height)(r.x, r.y, r.x + step, r.y + step, o, scaler);
        }
        const ctx = canvasRef.current.getContext('2d');
        ctx.clearRect(0, 0, width, height);
        const meta = d.data.metas?.find(meta => meta.chromosome === r.chromosome) || {};
        ctx.globalAlpha = 1;
        if (d.layer) {
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
        if (o > 4) {
          let pd = data.find(d => d.order === o - 1);
          ctx.lineWidth = 0.5;
          ctx.globalAlpha = oscale(or - o);
          if (pd.layer) {
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
          } else {
            renderPipes(ctx, pd.points, transform, o - 1, scales, "#eee", 0.25);
          }
          const lr = data.find(d => d.order === o - 1);
          ctx.lineWidth = 2;
          ctx.strokeStyle = "black";
          lr && renderSquares(ctx, [lr.region], transform, o - 1, scales, false, "black");
        }
        ctx.globalAlpha = 1;
        ctx.lineWidth = 2;
        ctx.strokeStyle = "black";
        renderSquares(ctx, [r], transform, o, scales, false, "black");
      }
    }
  }, [percent, percentScale, csn, data, oscale, width, height, scales]);

  // Render the 1D strip visualization
  useEffect(() => {
    const or = percentScale(percent);
    const o = Math.floor(or);
    const hilbert = new HilbertChromosome(o);
    const step = hilbert.step;
    const rh = height / (15 - 4); // one row per order
    if (csn && csn.path && canvasRefStrip.current && data) {
      const dorder = data.find(d => d.order === o);
      if (dorder) {
        const r = dorder.region;
        const ctxs = canvasRefStrip.current.getContext('2d');
        ctxs.clearRect(0, 0, width, sheight);
        const hdistance = 16 + 4 * (o - 4);
        const pointso = dorder.points.filter(d => d.chromosome === r.chromosome && d.i > r.i - hdistance && d.i < r.i + hdistance);
        const xExtentStart = extent(pointso, d => d.start);
        const xExtentEnd = extent(pointso, d => d.end);
        let xs = scaleLinear().domain([xExtentStart[0], xExtentEnd[1]]).range([0, width]);
        setInterpXScale(() => xs);
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
          nxExtentStart = [r.start - rw * 16, 0];
          nxExtentEnd = [0, r.end + rw * 16];
        }
        const interpolateStart = interpolateNumber(xExtentStart[0], nxExtentStart[0]);
        const interpolateEnd = interpolateNumber(xExtentEnd[1], nxExtentEnd[1]);
        xs = scaleLinear().domain([interpolateStart(or - o), interpolateEnd(or - o)]).range([0, width]);
        setInterpXScale(() => xs);
        data.forEach(d => {
          const i = d.order - 4;
          const y = i * rh;
          ctxs.fillStyle = "white";
          ctxs.fillRect(0, y, width, rh);
          const layer = d.layer;
          const dhdistance = 16 + 4 * (d.order - 4);
          d.points.filter(p => p.i > d.region.i - dhdistance && p.i < d.region.i + dhdistance).forEach(p => {
            const dp = d.data.find(dd => dd.i === p.i);
            if (dp && layer) {
              const sample = layer.fieldChoice(dp);
              if (sample && sample.field) {
                ctxs.fillStyle = layer.name === "Nucleotides" ? layer.fieldColor(sample.value) : layer.fieldColor(sample.field);
                const x = xs(p.start);
                let w = xs(p.end) - x;
                if (w < 1) w = 1;
                ctxs.globalAlpha = d.order === o ? 1 : oscale(or - o);
                ctxs.fillRect(x, 0, w - 0.5, rh - 1);
              }
            } else {
              ctxs.fillStyle = "#eee";
              const x = xs(p.start);
              let w = xs(p.end) - x;
              if (w < 1) w = 1;
              ctxs.globalAlpha = d.order === o ? 1 : oscale(or - o);
              ctxs.fillRect(x, 0, w - 0.5, rh - 1);
            }
          });
        });
        ctxs.globalAlpha = 1;
        ctxs.strokeStyle = "black";
        ctxs.lineWidth = 2;
        ctxs.strokeRect(xs(r.start), 0, xs(r.end) - xs(r.start) - 0.5, rh - 1);
      }
    }
  }, [percent, percentScale, csn, data, width, sheight]);

  // Render Gene Tracks visualization
  useEffect(() => {
    const or = percentScale(percent);
    const o = Math.floor(or);
    if (canvasRefGenes.current && data) {
      const dorder = data.find(d => d.order === o);
      if (dorder) {
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
        if (dnorder) {
          const nr = dnorder.region;
          const nhdistance = 16 + 4 * (no - 4);
          const pointsno = dnorder.points.filter(d => d.chromosome === r.chromosome && d.i > nr.i - nhdistance && d.i < nr.i + nhdistance);
          nxExtentStart = extent(pointsno, d => d.start);
          nxExtentEnd = extent(pointsno, d => d.end);
        } else {
          const rw = r.end - r.start;
          nxExtentStart = [r.start - rw * 16, 0];
          nxExtentEnd = [0, r.end + rw * 16];
        }
        const interpolateStart = interpolateNumber(xExtentStart[0], nxExtentStart[0]);
        const interpolateEnd = interpolateNumber(xExtentEnd[1], nxExtentEnd[1]);
        xs = scaleLinear().domain([interpolateStart(or - o), interpolateEnd(or - o)]).range([0, width]);
        const gs = getGencodesInView(pointso, o, 100000000);
        ctxs.globalAlpha = 1;
        gs.forEach((g, i) => {
          const h = geneHeight;
          ctxs.fillStyle = "white";
          ctxs.fillRect(0, h, width, h);
          ctxs.fillStyle = "black";
          let x = xs(g.start);
          if (x < 10) x = 10;
          if (x > width - 10) x = width - 10;
          ctxs.fillText(g.hgnc, Math.floor(x), Math.floor(h - i - 5));
          ctxs.beginPath();
          const y = Math.floor(h - i);
          ctxs.moveTo(Math.floor(xs(g.start)), y);
          ctxs.lineTo(Math.floor(xs(g.end)), y);
          ctxs.strokeStyle = "black";
          ctxs.lineWidth = 2;
          ctxs.stroke();
        });
      }
    }
  }, [percent, percentScale, data, width, geneHeight]);

  // Tooltip handlers for the 1D strip canvas
  const handleMouseMove = useCallback((e) => {
    const { clientX } = e;
    const rect = e.target.getBoundingClientRect();
    const x = clientX - rect.x;
    let start = interpXScale.invert(x);
    const dataregions = data?.find(d => d.order === order);
    if (!dataregions) return;
    const d = dataregions.data.find(d => d.start <= start && start <= d.end);
    if(d) {
      tooltipRef.current.show(d, dataregions.layer, clientX, rect.top + sheight + 5);
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
            <div className="absolute inset-0 flex items-center justify-center bg-white bg-opacity-60 transform scale-[1.75]">
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
      <Tooltip ref={tooltipRef} orientation="bottom" enforceBounds={false} />
    </div>
  );
}

export default PowerModal;