import { useState, useRef, useEffect, useMemo, useCallback, useLayoutEffect } from 'react';
import { scaleLinear, scaleLog, scalePow } from 'd3-scale';
import { zoomIdentity } from 'd3-zoom';
import { range, extent } from 'd3-array';
import { line } from "d3-shape";
import { interpolateObject, interpolateNumber } from 'd3-interpolate';
import { HilbertChromosome } from '../../lib/HilbertChromosome';
import Data from '../../lib/data';
import { debouncer } from '../../lib/debounce'
import { showKb, showPosition } from '../../lib/display'
import scaleCanvas from '../../lib/canvas'
import { getOffsets } from "../../lib/segments"
import { variantChooser } from '../../lib/csn';
import { getGencodesInView } from '../../lib/Genes';
import order_14 from '../../layers/order_14';
import Loading from '../Loading';
import { Renderer as CanvasRenderer } from '../Canvas/Renderer';
import { useZoom } from '../../contexts/zoomContext'
import SelectedStatesStore from '../../states/SelectedStates'
import Tooltip from '../Tooltips/Tooltip';
import { renderSquares, renderPipes, zoomToBox } from './PowerUtils';
import './Power.css';

import PropTypes from 'prop-types';

PowerModal.propTypes = {
  // csn: PropTypes.object.isRequired,
  width: PropTypes.number,
  height: PropTypes.number,
  sheight: PropTypes.number,
  userOrder: PropTypes.number,
  onData: PropTypes.func,
  onOrder: PropTypes.func,
  onPercent: PropTypes.func,
  // percent: PropTypes.number
};

const dataDebounce = debouncer()

function PowerModal({ width: propWidth, height: propHeight, sheight = 30, geneHeight = 64, badgeHeight = 50, onPercent }) {

  // Add container ref and size state
  const containerRef = useRef(null);
  const [containerSize, setContainerSize] = useState({ width: 0, height: 0 });
  
  // Keep existing refs
  const canvasRef = useRef(null);
  const canvasRefStrip = useRef(null);
  const canvasRefGenes = useRef(null);
  const tooltipRef = useRef(null);
  
  // Calculate actual dimensions to use (props or measured container)
  const width = propWidth || containerSize.width;
  const height = propHeight || (containerSize.height - sheight - geneHeight - badgeHeight); // Account for strip height, gene height, and badge height

  // Add resize observer to measure container
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
    
    // Initial measurement
    setContainerSize({
      width: containerRef.current.clientWidth,
      height: containerRef.current.clientHeight
    });
    
    return () => resizeObserver.disconnect();
  }, []);

  const { handleSelectedZoom: onOrder, selectedZoomOrder: userOrder } = useZoom()
  const { 
    collectFullData: onData, narrationPreview, loadingFullNarration, 
    selectedNarration, fullNarration 
  } = SelectedStatesStore()

  // determine if we are in preview mode
  const [isPreview, setIsPreview] = useState(false)
  useEffect(() => {
    setIsPreview(!!narrationPreview)
  }, [narrationPreview])

  const [csn, setCsn] = useState(selectedNarration)
  useEffect(() => {
    setCsn(narrationPreview ? narrationPreview : loadingFullNarration ? selectedNarration : fullNarration)
  }, [narrationPreview, loadingFullNarration, selectedNarration, fullNarration])

  const [loading, setLoading] = useState(false)

  const percentScale = useMemo(() => scaleLinear().domain([1, 100]).range([4, 14.999]), [])

  const [percent, setPercent] = useState(userOrder ? percentScale.invert(userOrder) : 1)

  useEffect(() => {
    setPercent(userOrder ? percentScale.invert(userOrder) : 1)
  }, [userOrder, percentScale])

  const [order, setOrder] = useState(userOrder ? userOrder : 4)

  const [data, setData] = useState(null)
  const [currentPreferred, setCurrentPreferred] = useState(null)

  const radius = 9 // # of steps to take in each direction (), previously 3
  const scaler = .75

  // hard coded, should probably hard code these in the HilbertGenome component anyway
  const orderMin = 4
  const orderMax = 14
  let xMin = 0, yMin = 0, sizeMin = 0, zoomMin = 0.85
  let xMax = 5, yMax = 5, sizeMax = 5, zoomMax = 4000
  // TODO: this might be overkill, copied from HilbertGenome
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

  const [interpXScale, setInterpXScale] = useState(() => scaleLinear())

  useEffect(() => {
    scaleCanvas(canvasRef.current, canvasRef.current.getContext("2d"), width, height)
  }, [canvasRef, width, height])
  // useEffect(() => {
  //   scaleCanvas(canvasRef1D.current, canvasRef1D.current.getContext("2d"), width, height)
  // }, [canvasRef1D, width, height])
  useEffect(() => {
    scaleCanvas(canvasRefStrip.current, canvasRefStrip.current.getContext("2d"), width, sheight)
  }, [canvasRefStrip, width, sheight])


  useEffect(() => {
    if (!csn || !csn.path || !csn.path.length) return;

    const fetchData = async () => {
      // pre-fetch the data for each path in the CSN (if it exists)
      const dataClient = new Data()
      let lastRegion = null
      const orderPoints = range(4, 15).map((o) => {
        let p = csn.path.find(d => d.order === o)
        if(o == 14 && csn.variants) {
          // const v = csn.variants.sort((a,b) => b.topField.value - a.topField.value)[0]
          const v = variantChooser(csn.variants || [])
          // console.log("order 14 top variant", v, "variants", csn.variants)
          // combine the variants into order_14 data
          p = { region: v, layer: v.layer, field: v.topField, order: 14 }
        }
        const hilbert = new HilbertChromosome(o)
        const step = hilbert.step
        let region;
        if(p) {
          // if we have a path, we use it's region and save it in the last region as well
          region = p.region
          lastRegion = region
        } else {
          let start, end, chromosome
          if(!lastRegion) {
            // look at closest existing region we can base current order off of
            const np = csn.path.find(d => d.order > o)
            const orderDiff = np.order - o
            const i = parseInt(np.region.i / (4 ** orderDiff))
            region = hilbert.fromRange(np.region.chromosome, i, i+1)[0]
            chromosome = region.chromosome
            start = region.start
            end = region.end
          } else {
            const i = lastRegion.i * 4
            chromosome = lastRegion.chromosome
            region = hilbert.fromRange(chromosome, i, i+1)[0]
            start = lastRegion.start
            end = lastRegion.end
          }
          if(o < 14) {
            let np = csn.path.find(d => d.order > o)
            if(o == 13 && csn.variants) {
              const v = csn.variants.sort((a,b) => b.topField.value - a.topField.value)[0]
              np = { region: v }
            }
            if(np && np.region) {
              // if there is a path region at an order greater than the current missing path
              // we use that as the start and end so that we zoom in on the right square
              start = np.region.start
              end = np.region.end
            }
          }
          const regions = hilbert.fromRegion(chromosome, start, end)
          region = regions[0]
          lastRegion = region
        }
        // determine the bounding box around the region
        const bbox = {
          x: region.x - step * radius,
          y: region.y - step * radius,
          width: step * radius * 2,
          height: step * radius * 2
        }
        const points = hilbert.fromBbox(bbox)
        return {
          order: o,
          // layer: o == 14 ? nucleotides : p?.layer,
          // layer: o != 14 || (o == 14 && p?.layer) ? p?.layer : variants_categorical,
          layer: o == 14 ? order_14 : p?.layer,
          // layer: o == 14 ? variants_apc : p?.layer,
          region,
          p,
          points
        }
      });

      const responses = await Promise.all(orderPoints.map(p => {
        if(p.layer?.layers){ 
          return Promise.all(p.layer.layers.map(l => dataClient.fetchData(l, p.order, p.points)))
        } else {
          // console.log("P", p.order, p.layer)
          return dataClient.fetchData(p.layer, p.order, p.points)
        }
      }))
      
      return { responses, orderPoints };
    };
    
    setLoading(true)
    dataDebounce(
      fetchData, 
      ({ responses, orderPoints }) => {
        setData(responses.map((d,i) => {
          const order = orderPoints[i].order
          const layer = orderPoints[i].layer
          const region = orderPoints[i].region
          // console.log("set data", order, layer)
          if(order == 14) {
              // combine the data
              d = layer.combiner(d)
              // for now we need to calculate the topField
              // let topField = layer.fieldChoice(d.find(r => r.chromosome === region.chromosome && r.i == region.i))
              // region.topField = topField
          }
          return {
            order,
            layer,
            points: orderPoints[i].points,
            region,
            p: orderPoints[i].p,
            data: d
          }
        }))
        setLoading(false)
      },
      50
    )
  }, [csn])

  const handleWheel = useCallback((event) => {
    event.preventDefault();
    const delta = -event.deltaY;
    setPercent(prevPercent => {
      let newPercent = prevPercent + delta * 0.01; // Adjust the 0.01 to control the sensitivity of the scroll
      newPercent = Math.max(0, Math.min(100, newPercent));
      onOrder(percentScale(newPercent))
      return newPercent
    });
  }, [setPercent, onOrder]);

  useEffect(() => {
    const canvas = canvasRef.current
    if (canvas) {
      canvas.addEventListener('wheel', handleWheel, { passive: false });
      return () => {
        canvas.removeEventListener('wheel', handleWheel);
      };
    }
  }, [handleWheel]);


  const oscale = useMemo(() => scaleLinear().domain([0, 0.5]).range([1, 0]).clamp(true), [])
  

  // Render the 2D power visualization
  useEffect(() => {
    const or = percentScale(percent)
    const o = Math.floor(or)
    setOrder(o)
    // console.log("percent", percent, or, o)

    const hilbert = new HilbertChromosome(o)
    const step = hilbert.step

    if(csn && csn.path && canvasRef.current && data) {
      // const region = csn.path.find(d => d.order === o)
      const d = data.find(d => d.order === o)
      // if(!region) console.log("no region", d)
      if(d) {
        // set the current preferred factor
        setCurrentPreferred(d.p)
        // interpolate between last order and next. or - o goes from 0 to 1
        const r = d.region
        let transform;
          // next order 
        const no = o + 1
        // const nregion = csn.path.find(d => d.order === no)
        const nd = data.find(d => d.order === no)
        if(nd) {
          const nr = nd.region
          const t = zoomToBox(scales.xScale, scales.yScale, width, height)(r.x, r.y, r.x + step, r.y + step, o, 0.25);
          const nt = zoomToBox(scales.xScale, scales.yScale, width, height)(nr.x, nr.y, nr.x + step, nr.y + step, no, 0.25);
          transform = interpolateObject(t, nt)(or - o)
        } else {
          const scaler = .25 + (or - o) // TODO: magic number for order 14..., was 0.675
          transform = zoomToBox(scales.xScale, scales.yScale, width, height)(r.x, r.y, r.x + step, r.y + step, o, scaler);
        }

        const ctx = canvasRef.current.getContext('2d');
        ctx.clearRect(0, 0, width, height)
        
        const meta = d.data.metas?.find((meta) => meta.chromosome === r.chromosome) || {}

        // render the current layer
        ctx.globalAlpha = 1
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
          })
        } else {
          // renderSquares(ctx, d.points, transform, o, scales, "#eee", false, 0.25);
          renderPipes(ctx, d.points, transform, o, scales, "#eee", 0.25);
        }

        // render squares outlining the current order squares
        // ctx.strokeStyle = "gray"
        ctx.lineWidth = 0.5
        // renderSquares(ctx, d.points, transform, o, scales, false, "gray");
        // render the previous layer faded out
        if(o > 4) {
          let pd = data.find(d => d.order === o - 1)
          ctx.lineWidth = 0.5
          ctx.globalAlpha = oscale(or - o)
          if(pd.layer){
            // pd.data.find(r => r.i == pd.p.region.i).data = pd.region.data
            CanvasRenderer(pd.layer.renderer, { 
              scales, 
              state: { 
                // data: { [pd.p.field.field]: pd.p.field.value },
                data: pd.data.filter(dd => dd.chromosome === r.chromosome),
                loading: false,
                points: pd.points,
                meta: pd.data.metas.find((meta) => meta.chromosome === pd.region.chromosome),
                order: o-1,
                transform
              }, 
              layer: pd.layer, 
              canvasRef 
            })
          } else {
            // renderSquares(ctx, d.points, transform, o, scales, "#eee", false, 0.25);
            renderPipes(ctx, pd.points, transform, o-1, scales, "#eee", 0.25);
          }
          const lr = data.find(d => d.order === o-1)
          ctx.lineWidth = 2
          ctx.strokeStyle = "black"
          lr && renderSquares(ctx, [lr.region], transform, o-1, scales, false, "black");
        }
        // if we are closer to the next order (and less than 14) lets preview it
        ctx.globalAlpha = 1
        ctx.lineWidth = 2
        ctx.strokeStyle = "black"
        // console.log(r, d, o)
        renderSquares(ctx, [r], transform, o, scales, false, "black");
      }

    }
  }, [percent, percentScale, csn, data, oscale, width, height, zoomToBox, scales])

  // Render the 1D Strip
  useEffect(() => {
    const or = percentScale(percent)
    const o = Math.floor(or)
    const hilbert = new HilbertChromosome(o)
    const step = hilbert.step

    let rh = height / (15 - 4) // one row per order

    if(csn && csn.path && canvasRefStrip.current && data) {
      // the region at the current order
      const dorder = data.find(d => d.order === o)
      if(dorder) {
        const r = dorder.region

        const ctxs = canvasRefStrip.current.getContext('2d');
        ctxs.clearRect(0, 0, width, sheight)

        // how many hilbert segments to render on either side of the region, scales up with order
        const hdistance = 16 + 4 * (o - 4)

        const pointso = dorder.points.filter(d => d.chromosome === r.chromosome && d.i > r.i - hdistance && d.i < r.i + hdistance)
        const xExtentStart = extent(pointso, d => d.start)
        const xExtentEnd = extent(pointso, d => d.end)
        // the x scale is based on the start of the earliest point and the end of the latest point
        let xs = scaleLinear().domain([xExtentStart[0], xExtentEnd[1]]).range([0, width])
        setInterpXScale(() => xs)

        // we interpolate between this zoom and the next zoom region to get the scale we use
        const no = o + 1
        // the region at the next order
        const dnorder = data.find(d => d.order === no)
        let nxExtentStart, nxExtentEnd
        if(dnorder) {
          const nr = dnorder.region
          const nhdistance = 16 + 4 * (no - 4)
          const pointsno = dnorder.points.filter(d => d.chromosome === r.chromosome && d.i > nr.i - nhdistance && d.i < nr.i + nhdistance)
          nxExtentStart = extent(pointsno, d => d.start)
          nxExtentEnd = extent(pointsno, d => d.end)
        } else {
          // order 14
          const rw = r.end - r.start
          nxExtentStart = [r.start - rw*16, 0]
          nxExtentEnd = [0, r.end + rw*16]
        }

        // the x scale is interpolated based on the difference between the raw order and order (0 to 1)
        const interpolateStart = interpolateNumber(xExtentStart[0], nxExtentStart[0]);
        const interpolateEnd = interpolateNumber(xExtentEnd[1], nxExtentEnd[1]);
        xs = scaleLinear().domain([
          interpolateStart(or - o), 
          interpolateEnd(or - o)
        ]).range([0, width]);
        setInterpXScale(() => xs)


        // TODO: why is this still going thru all the layers if we are only rendering 1 (or 2)
        // we want a global coordinate system essentially for the 1D visualization
        data.map(d => {
          // render a strip for each order
          const i = d.order - 4
          const y = i * rh
          const h = rh
          const w = width
          ctxs.fillStyle = "white"
          ctxs.fillRect(0, y, w, h)
          const layer = d.layer

          const data = d.data
          const dhdistance = 16 + 4 * (d.order - 4)
          d.points.filter(p => p.i > d.region.i - dhdistance && p.i < d.region.i + dhdistance).map(p => {
            const dp = data.find(d => d.i == p.i)
            if(dp && layer) {
              const sample = layer.fieldChoice(dp);
              if(sample && sample.field){
                // let fi = meta.fields.indexOf(sample.field)
                // let domain = [meta.min[fi] < 0 ? 0 : meta.min[fi], meta.max[fi]]
                // TODO: we could scale height
                // TODO or we could scale opacity
                if(layer.name == "Nucleotides") {
                  ctxs.fillStyle = layer.fieldColor(sample.value)
                } else {
                  ctxs.fillStyle = layer.fieldColor(sample.field)
                }
                const x = xs(p.start)
                let w = xs(p.end) - x
                if(w < 1) w = 1
                if(d.order == o) {
                  ctxs.globalAlpha = 1
                  ctxs.fillRect(x, 0, w-0.5, h-1)
                }
                if(d.order == o-1) {
                  ctxs.globalAlpha = oscale(or - o)
                  ctxs.fillRect(x, 0, w-0.5, h-1)
                }
              }
            } else {
              ctxs.fillStyle = "#eee"
              const x = xs(p.start)
              let w = xs(p.end) - x
              if(w < 1) w = 1
              if(d.order == o){ 
                ctxs.globalAlpha = 1
                ctxs.fillRect(x, 0, w-0.5, h-1)
              }
              if(d.order == o-1) {
                ctxs.globalAlpha = oscale(or - o)
                ctxs.fillRect(x, 0, w-0.5, h-1)
              }
            }
          })
        })

        // render the region being highlighted
        ctxs.globalAlpha = 1
        ctxs.strokeStyle = "black"
        ctxs.lineWidth = 2;
        ctxs.strokeRect(xs(r.start), 0, xs(r.end) - xs(r.start)-0.5, rh-1)
      }
    }
  }, [percent, percentScale, csn, data, width, height, zoomToBox, scales])

  // Render the Gene tracks
  useEffect(() => {
    const or = percentScale(percent)
    const o = Math.floor(or)
    const hilbert = new HilbertChromosome(o)


    if(canvasRefGenes.current && data) {
      // the region at the current order
      const dorder = data.find(d => d.order === o)
      if(dorder) {
        const r = dorder.region

        const ctxs = canvasRefGenes.current.getContext('2d');
        ctxs.clearRect(0, 0, width, geneHeight)

        // how many hilbert segments to render on either side of the region, scales up with order
        const hdistance = 16 + 4 * (o - 4)

        const pointso = dorder.points.filter(d => d.chromosome === r.chromosome && d.i > r.i - hdistance && d.i < r.i + hdistance)
        const xExtentStart = extent(pointso, d => d.start)
        const xExtentEnd = extent(pointso, d => d.end)
        // the x scale is based on the start of the earliest point and the end of the latest point
        let xs = scaleLinear().domain([xExtentStart[0], xExtentEnd[1]]).range([0, width])
        // setInterpXScale(() => xs)

        // we interpolate between this zoom and the next zoom region to get the scale we use
        const no = o + 1
        // the region at the next order
        const dnorder = data.find(d => d.order === no)
        let nxExtentStart, nxExtentEnd
        if(dnorder) {
          const nr = dnorder.region
          const nhdistance = 16 + 4 * (no - 4)
          const pointsno = dnorder.points.filter(d => d.chromosome === r.chromosome && d.i > nr.i - nhdistance && d.i < nr.i + nhdistance)
          nxExtentStart = extent(pointsno, d => d.start)
          nxExtentEnd = extent(pointsno, d => d.end)
        } else {
          // order 14
          const rw = r.end - r.start
          nxExtentStart = [r.start - rw*16, 0]
          nxExtentEnd = [0, r.end + rw*16]
        }

        // the x scale is interpolated based on the difference between the raw order and order (0 to 1)
        const interpolateStart = interpolateNumber(xExtentStart[0], nxExtentStart[0]);
        const interpolateEnd = interpolateNumber(xExtentEnd[1], nxExtentEnd[1]);
        xs = scaleLinear().domain([
          interpolateStart(or - o), 
          interpolateEnd(or - o)
        ]).range([0, width]);
        // setInterpXScale(() => xs)


        const gs = getGencodesInView(pointso, o, 100000000)

        ctxs.globalAlpha = 1
        // we want a global coordinate system essentially for the 1D visualization
        gs.map((g,i) => {
          // render a strip for each order
          // const i = o - 4
          // const y = i * rh
          const h = geneHeight
          const w = width
          ctxs.fillStyle = "white"
          ctxs.fillRect(0, h, w, h)

          ctxs.fillStyle = "black";
          let x = xs(g.start)
          if(x < 10) x = 10
          if(x > width - 10) x = width - 10
          // if(g.posneg == "-"){ 
          //   x = xs(g.end)
          // }
          // console.log("G", g, g.hgnc, xs(g.start), xs(g.end), rh - i - 5)
          ctxs.fillText(g.hgnc, Math.floor(x), Math.floor(h - i - 5));
          
          ctxs.beginPath();
          let y = Math.floor(h - i)
          ctxs.moveTo(Math.floor(xs(g.start)), y);
          ctxs.lineTo(Math.floor(xs(g.end)), y);
          // console.log("g", g, xs(g.start), xs(g.end))
          ctxs.strokeStyle = "black";
          ctxs.lineWidth = 2;
          ctxs.stroke();

          

          // const dhdistance = 16 + 4 * (o - 4)
        })

        // render the region being highlighted
        // ctxs.strokeStyle = "black"
        // ctxs.lineWidth = 2;
        // ctxs.strokeRect(xs(r.start), 0, xs(r.end) - xs(r.start)-0.5, rh-1)
      }
    }
  }, [percent, percentScale, data, width, height, zoomToBox, scales, sheight])

  const handleMouseMove = useCallback((e) => {
    // if(!xScaleRef.current || !data?.length) return
    const { clientX } = e;
    const rect = e.target.getBoundingClientRect();
    const x = clientX - rect.x; // x position within the element.

    let start = interpXScale.invert(x)

    const dataregions = data?.find(d => d.order == order)
    // console.log("DATA REGIONS", dataregions)
    // console.log("domain", interpXScale.domain(), "range", interpXScale.range(), x, start)
    const d = dataregions.data.find(d => {
      return d.start <= start && start <= d.end
    });
    // console.log("mouse move", x, start)//, d?.region.start)
    // console.log("d", d, d.start, interpXScale(d.start), interpXScale.domain())

    if(d) {
      // const bw = interpXScale(d.end) - interpXScale(d.start)
      const tx = clientX//interpXScale(d.start) + bw// + 12 + 20;
      tooltipRef.current.show(d, dataregions.layer, tx, rect.top + sheight + 5)
    }
  }, [data, interpXScale, order, sheight])

  const handleMouseLeave = useCallback(() => {
    tooltipRef.current.hide()
  }, [])

  return (
    <div ref={containerRef} className="power w-full h-full">
      <div className={`max-h-[${badgeHeight}px] flex flex-col`}>
        <div className="min-h-[25px] text-center" style={{maxWidth: width + "px"}}>
          <div className="text-xl">
            {currentPreferred?.region && showPosition(currentPreferred.region)}
          </div>
        </div>
        {/* TODO: The factor label component is causing a variable width of IG */}
        <div className="text-xl min-h-[25px] text-center mb-2" style={{maxWidth: width + "px"}}>
          {currentPreferred?.field ? (
            <>
              <span style={{ color: currentPreferred?.layer?.fieldColor(currentPreferred?.field?.field), marginRight: '4px' }}>⏺</span>
              {currentPreferred?.field?.field} {currentPreferred?.layer?.labelName}
            </>
          ) : null}
        </div>
      </div>
      <div className="relative">
        {loading ? 
          <div className="absolute inset-0 flex items-center justify-center bg-white bg-opacity-60 transform scale-[1.75]">
            <Loading />
          </div> : null
        }
        <canvas 
          className="power-canvas"
          width={width}
          height={height}
          style={{width: width + "px", height: height + "px"}}
          ref={canvasRef}
        />
        <canvas 
            className="power-canvas-strip"
            width={width}
            height={sheight}
            style={{width: width + "px", height: sheight + "px"}}
            ref={canvasRefStrip}
            onMouseMove={handleMouseMove}
            onMouseLeave={handleMouseLeave}
          />
        <canvas 
          className="power-canvas-genes"
          width={width}
          height={geneHeight}
          style={{width: width + "px", height: geneHeight + "px"}}
          ref={canvasRefGenes}
        />
      </div>
      <Tooltip ref={tooltipRef} orientation="bottom" enforceBounds={false} />
    </div>
  );
}

export default PowerModal;