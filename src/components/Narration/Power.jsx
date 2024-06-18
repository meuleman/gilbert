import { useState, useRef, useEffect, useMemo, useCallback } from 'react';
import { scaleLinear, scaleLog, scalePow } from 'd3-scale';
import { zoomIdentity } from 'd3-zoom';
import { range, extent } from 'd3-array';
import { line } from "d3-shape";
import { interpolateObject, interpolateNumber } from 'd3-interpolate';

import { HilbertChromosome } from '../../lib/HilbertChromosome';
import Data from '../../lib/data';
import { showKb, showPosition } from '../../lib/display'
import scaleCanvas from '../../lib/canvas'
import { getOffsets } from "../../lib/segments"
import { variantChooser } from '../../lib/csn';

import order_14 from '../../layers/order_14';

import { Renderer as CanvasRenderer } from '../Canvas/Renderer';


import Tooltip from '../Tooltips/Tooltip';

import './Power.css';


// TODO: move this to a more general place 
function getDataBounds(meta) {
  let nonzero_min = meta["nonzero_min"]
  let fields, max, min
  if ((meta["fields"].length == 2) && (meta["fields"][0] == "max_field") && (meta["fields"][1] == "max_value")) {
    fields = meta["full_fields"]
    max = meta["full_max"]
    min = nonzero_min ? nonzero_min : meta["full_min"]
  } else {
    fields = meta["fields"]
    max = meta["max"]
    min = nonzero_min ? nonzero_min : meta["min"]
  }
  if(!min.length && min < 0) min = 0;
  return { min, max, fields }
}

function renderSquares(ctx, points, t, o, scales, fill, stroke, sizeMultiple=1) {
  let i,d,xx,yy; 
  let step = Math.pow(0.5, o)
  let rw = scales.sizeScale(step) * t.k * sizeMultiple - 1
  for(i = 0; i < points.length; i++) {
    d = points[i];
    // scale and transform the coordinates
    xx = t.x + scales.xScale(d.x) * t.k
    yy = t.y + scales.yScale(d.y) * t.k
    if(stroke) {
      ctx.strokeStyle = stroke
      ctx.strokeRect(xx - rw/2, yy - rw/2, rw, rw)
    }
    if(fill) {
      ctx.fillStyle = fill
      ctx.fillRect(xx - rw/2, yy - rw/2, rw, rw)
    }
  }
}

function renderPipes(ctx, points, t, o, scales, stroke, sizeMultiple=1) {
  let linef = line()
    .x(d => d.x)
    .y(d => d.y)
    .context(ctx)
  let i,d,xx,yy,dp1,dm1; 
  let step = Math.pow(0.5, o)
  let rw = scales.sizeScale(step) * t.k 
  let srw = rw * sizeMultiple

  for(i = 0; i < points.length; i++) {
    d = points[i];
    dm1 = points[i-1];
    dp1 = points[i+1];
    // scale and transform the coordinates
    xx = t.x + scales.xScale(d.x) * t.k
    yy = t.y + scales.yScale(d.y) * t.k
    let ps = []
    if(dm1) {
      let { xoff, yoff } = getOffsets(d, dm1, rw, srw)
      ps.push({x: xx + xoff, y: yy + yoff})
    }
    ps.push({x: xx, y: yy})
    if(dp1) {
      let { xoff, yoff } = getOffsets(d, dp1, rw, srw)
      ps.push({x: xx + xoff, y: yy + yoff})
    }

    ctx.strokeStyle = stroke
    ctx.lineWidth = srw
    ctx.beginPath()
    linef(ps)
    ctx.stroke()
  }
}

import PropTypes from 'prop-types';

PowerModal.propTypes = {
  csn: PropTypes.object.isRequired,
  width: PropTypes.number.isRequired,
  height: PropTypes.number.isRequired,
  sheight: PropTypes.number,
  userOrder: PropTypes.number,
  onData: PropTypes.func,
  onOrder: PropTypes.func,
  onPercent: PropTypes.func,
  // percent: PropTypes.number
};


function PowerModal({ csn, width, height, sheight=30, userOrder, onData, onOrder, onPercent }) {

  const canvasRef = useRef(null);
  // const canvasRef1D = useRef(null);
  const canvasRefStrip = useRef(null);
  const tooltipRef = useRef(null)

  const percentScale = useMemo(() => scaleLinear().domain([1, 100]).range([4, 14.999]), [])

  const [percent, setPercent] = useState(userOrder ? percentScale.invert(userOrder) : 1)

  useEffect(() => {
    setPercent(userOrder ? percentScale.invert(userOrder) : 1)
  }, [userOrder, percentScale])

  const [order, setOrder] = useState(userOrder ? userOrder : 4)

  const [data, setData] = useState(null)

  const radius = 3 // # of steps to take in each direction ()
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

  const zoomToBox = useCallback((x0,y0,x1,y1,order,scaleMultiplier=1) => {
    let tw = sizeScale(x1 - x0)
    let scale = Math.pow(2, order)  * scaleMultiplier
    let offset = tw * 1.25 * 2
    let tx = xScale(x0) - offset / scaleMultiplier
    let ty = yScale(y0) - offset / scaleMultiplier
    let transform = zoomIdentity.translate(-tx * scale, -ty * scale).scale(scale)
    return transform
  }, [xScale, yScale, sizeScale])

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
    // pre-fetch the data for each path in the CSN (if it exists)
    const dataClient = new Data()
    if(csn && csn.path && csn.path.length) {
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
      })
      // console.log("in power", csn)
      // console.log("order points", orderPoints)

      Promise.all(orderPoints.map(p => {
        if(p.layer?.layers){ 
          return Promise.all(p.layer.layers.map(l => dataClient.fetchData(l, p.order, p.points)))
        } else {
          // console.log("P", p.order, p.layer)
          return dataClient.fetchData(p.layer, p.order, p.points)
        }
      }))
        .then((responses) => {
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
        })
    }
  }, [csn])

  useEffect(() => {
    if(data && onData)
      onData(data)
  }, [data, onData])

  // useEffect(() => {
  //   onOrder && onOrder(order)
  // }, [order, onOrder])

  // useEffect(() => {
  //   onPercent && onPercent(percent)
  // }, [percent, onPercent])

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
        // interpolate between last order and next. or - o goes from 0 to 1
        const r = d.region
        let transform;
          // next order 
        const no = o + 1
        const nhilbert = new HilbertChromosome(no)
        const nstep = nhilbert.step
        // const nregion = csn.path.find(d => d.order === no)
        const nd = data.find(d => d.order === no)
        if(nd) {
          const nr = nd.region
          const t = zoomToBox(r.x, r.y, r.x + step, r.y + step, o, 0.75)
          const nt = zoomToBox(nr.x, nr.y, nr.x + nstep, nr.y + nstep, no, 0.75)
          transform = interpolateObject(t, nt)(or - o)
        } else {
          const scaler = .675 + (or - o) // TODO: magic number for order 14...
          transform = zoomToBox(r.x, r.y, r.x + step, r.y + step, o, scaler)
        }

        const ctx = canvasRef.current.getContext('2d');
        ctx.clearRect(0, 0, width, height)
        
        const meta = d.data.metas?.find((meta) => meta.chromosome === r.chromosome) || {}

        // render the current layer
        ctx.globalAlpha = 1
        if(d.layer){
          console.log("RENDER o", o, d)
          let rd = {}
          if(o < 14) {
            // if(d.layer.topValues) {
            //   rd["max_field"] = d.layer.fieldColor.domain().indexOf(d.p.field.field)
            //   rd["max_value"] = d.p.field.value
            // } else {
            //   rd[d.p.field.field] = d.p.field.value
            // }
            // set the central region's data to the field we chose 
            const central = d.data.find(r => r.i == d.p.region.i)
            if(d.region.data) {
              central.data = d.region.data
            } else {
              // TODO: this doesn't work because of max_field layers...
              // console.log("central", d.region, central)
              let centralData = {}
              centralData[d.region.field.field] = central.data[d.region.field.field]
              central.data = centralData
            }
          }
          CanvasRenderer(d.layer.renderer, { 
            scales, 
            state: { 
              data: d.data,
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
                data: pd.data,
                loading: false,
                points: pd.points,
                meta: pd.data.metas.find((meta) => meta.chromosome === r.chromosome),
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
        ctxs.strokeStyle = "black"
        ctxs.lineWidth = 2;
        ctxs.strokeRect(xs(r.start), 0, xs(r.end) - xs(r.start)-0.5, rh-1)
      }
    }
  }, [percent, percentScale, csn, data, width, height, zoomToBox, scales])

  const handleMouseMove = useCallback((e) => {
    // if(!xScaleRef.current || !data?.length) return
    const { clientX } = e;
    const rect = e.target.getBoundingClientRect();
    const x = clientX - rect.x; // x position within the element.

    let start = interpXScale.invert(x)

    const dataregions = data.find(d => d.order == order)
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
    <div className="power">
      <div className="power-container">
        <canvas 
          className="power-canvas"
          width={width + "px"}
          height={height + "px"}
          style={{width: width + "px", height: height + "px"}}
          ref={canvasRef}
        />
        {/* <div className="power-scroll" style={{width: 350 + "px", height: height + "px"}}>
          {data && data.map((d) => {
            const or = percentScale(percent)
            const o = Math.floor(or)
            const t = scrollScale(or - o)
            const tn = nextScrollScale(or - o)
            let offset = 0;
            if(d.order == o) {
              offset = -t * 100 // TODO: this is a magic number based on height of info we show

            } else if(d.order == o + 1) {
              offset = tn * height

            } else if(d.order < o) {
              offset = -height

            } else if(d.order > o + 1) {
              offset = height

            }
            let field = d.p?.field
            return (<div className="power-order" key={d.order} style={{top: offset + "px"}}>
              {showPosition(d.region)}<br/>
              Order {d.order} <br/> 
              {d.layer?.name}<br/>
              <span style={{color: field?.color}}>{field?.field} </span>
            </div>)
          })}
        </div> */}
        {/* <canvas 
          className="power-canvas-1d"
          width={width + "px"}
          height={height + "px"}
          style={{width: width + "px", height: height + "px"}}
          ref={canvasRef1D}
        /> */}
      </div>
      <canvas 
          className="power-canvas-strip"
          width={width + "px"}
          height={sheight + "px"}
          style={{width: width + "px", height: sheight + "px"}}
          ref={canvasRefStrip}
          onMouseMove={handleMouseMove}
          onMouseLeave={handleMouseLeave}
        />
      {/* <label>
        <input style={{width: (width*1) + "px"}} type="range" min={1} max={100} value={percent} onChange={(e) => setPercent(e.target.value)}></input>
        {order}
      </label> */}
      <Tooltip ref={tooltipRef} orientation="bottom" enforceBounds={false} />
    </div>
  );
}

export default PowerModal;