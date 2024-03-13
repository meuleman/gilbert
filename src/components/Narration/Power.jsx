import { useState, useRef, useEffect, useMemo, useCallback } from 'react';
import { scaleLinear, scaleLog, scalePow } from 'd3-scale';
import { zoomIdentity } from 'd3-zoom';
import { range, extent } from 'd3-array';
import { interpolateObject, interpolateNumber } from 'd3-interpolate';

import { HilbertChromosome } from '../../lib/HilbertChromosome';
import Data from '../../lib/data';
import { showKb, showPosition } from '../../lib/display'
import scaleCanvas from '../../lib/canvas'


import CanvasBase from '../CanvasBase';

import './Power.css';

import PropTypes from 'prop-types';

Power.propTypes = {
  csn: PropTypes.object.isRequired,
  width: PropTypes.number.isRequired,
  height: PropTypes.number.isRequired,
  // percent: PropTypes.number
};


function Power({ csn, width, height, sheight=30 }) {

  const canvasRef = useRef(null);
  const canvasRef1D = useRef(null);
  const canvasRefStrip = useRef(null);

  const [percent, setPercent] = useState(1)
  const [order, setOrder] = useState(4)

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
  const percentScale = useMemo(() => scaleLinear().domain([1, 100]).range([4, 14.999]), [])
  const orderZoomScale = useMemo(() =>  scaleLinear().domain(zoomExtent).range([1, Math.pow(2, orderDomain[1] - orderDomain[0] + 0.999)]), [orderDomain, zoomExtent])
  const scales = useMemo(() => ({ xScale, yScale, sizeScale, orderZoomScale, width, height }), [xScale, yScale, sizeScale, orderZoomScale, width, height])

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
  useEffect(() => {
    scaleCanvas(canvasRef1D.current, canvasRef1D.current.getContext("2d"), width, height)
  }, [canvasRef1D, width, height])
  useEffect(() => {
    scaleCanvas(canvasRefStrip.current, canvasRefStrip.current.getContext("2d"), width, sheight)
  }, [canvasRefStrip, width, sheight])



  useEffect(() => {
    // pre-fetch the data for each path in the CSN (if it exists)
    const dataClient = new Data()
    if(csn && csn.path) {
      let lastRegion = null
      const orderPoints = range(4, 14).map((o) => {
        const p = csn.path.find(d => d.order === o)
        const hilbert = new HilbertChromosome(o)
        const step = hilbert.step
        let region;
        if(p) {
          region = p.region
          lastRegion = region
        } else {
          const i = lastRegion.i * 4
          region = hilbert.fromRange(lastRegion.chromosome, i, i+1)
          console.log("missing region", region)
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
          layer: p?.layer,
          region,
          p,
          points
        }
      })

      Promise.all(orderPoints.map(p => dataClient.fetchData(p.layer, p.order, p.points)))
        .then((responses) => {
          setData(responses.map((d,i) => {
            return {
              order: orderPoints[i].order,
              layer: orderPoints[i].layer,
              points: orderPoints[i].points,
              region: orderPoints[i].region,
              p: orderPoints[i].p,
              data: d
            }
          }))
        })
    }
  }, [csn])


  const oscale = useMemo(() => scaleLinear().domain([0, 0.5]).range([1, 0]).clamp(true), [])
  const scrollScale = useMemo(() => scaleLinear().domain([0.8, 1]).range([0, 1]).clamp(true), [])
  const nextScrollScale = useMemo(() => scaleLinear().domain([0.5, 1]).range([1, 0]).clamp(true), [])
  function renderSquares(ctx, points, t, o, scales) {
    let i,d,xx,yy; 
    let step = Math.pow(0.5, o)
    let rw = scales.sizeScale(step) * t.k - 1
    for(i = 0; i < points.length; i++) {
      d = points[i];
      // scale and transform the coordinates
      xx = t.x + scales.xScale(d.x) * t.k
      yy = t.y + scales.yScale(d.y) * t.k
      ctx.strokeRect(xx - rw/2, yy - rw/2, rw, rw)
    }
  }

  // Render the 2D power visualization
  useEffect(() => {
    const or = percentScale(percent)
    const o = Math.floor(or)
    setOrder(o)
    // console.log("percent", percent, or, o)

    const hilbert = new HilbertChromosome(o)
    const step = hilbert.step

    if(csn && csn.path && canvasRef.current && data) {
      const region = csn.path.find(d => d.order === o)
      if(region) {
        // interpolate between last order and next. or - o goes from 0 to 1
        const r = region.region
        // console.log("region", region, "step", step, "scaler", scaler)
        // console.log("or - o", or - o, "scaler", scaler, "k", transform.k)
        let transform;
          // next order 
        const no = o + 1
        const nhilbert = new HilbertChromosome(no)
        const nstep = nhilbert.step
        const nregion = csn.path.find(d => d.order === no)
        if(nregion) {
          const nr = nregion.region
          const t = zoomToBox(r.x, r.y, r.x + step, r.y + step, o, 0.75)
          const nt = zoomToBox(nr.x, nr.y, nr.x + nstep, nr.y + nstep, no, 0.75)
          transform = interpolateObject(t, nt)(or - o)
          // console.log("transform", transform, t, nt, or - o)
        } else {
          const scaler = 1 + (or - o) * 1.5
          transform = zoomToBox(r.x, r.y, r.x + step, r.y + step, o, scaler)
        }

        const ctx = canvasRef.current.getContext('2d');
        ctx.clearRect(0, 0, width, height)

        const d = data.find(d => d.order === o)

        // render the current layer
        ctx.globalAlpha = 1
        if(d.layer){
          d.layer.renderer({ 
            scales, 
            state: { 
              data: d.data,
              loading: false,
              points: d.points,
              meta: d.data.metas.find((meta) => meta.chromosome === r.chromosome),
              order: o,
              transform
            }, 
            layer: d.layer, 
            canvasRef 
          })
        }

        // render squares outlining the current order squares
        ctx.strokeStyle = "gray"
        ctx.lineWidth = 0.5
        // renderSquares(ctx, d.points, transform, o, scales);
        // render the previous layer faded out
        if(o > 4) {
          let pd = data.find(d => d.order === o - 1)
          ctx.lineWidth = 0.5
          ctx.globalAlpha = oscale(or - o)
          // renderSquares(ctx, pd.points, transform, o-1, scales);
          if(pd.layer){
            pd.layer.renderer({ 
              scales, 
              state: { 
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
          }
          const lr = csn.path.find(d => d.order === o-1)
          ctx.lineWidth = 2
          ctx.strokeStyle = "black"
          lr && renderSquares(ctx, [lr.region], transform, o-1, scales);
        }
        // if we are closer to the next order (and less than 14) lets preview it
        ctx.globalAlpha = 1
        ctx.lineWidth = 2
        ctx.strokeStyle = "black"
        // console.log(r, d, o)
        renderSquares(ctx, [r], transform, o, scales);
      }

    }
  }, [percent, percentScale, csn, data, oscale, width, height, zoomToBox, scales])

  // Render the 1D pyramid visualization (and 1D Strip)
  useEffect(() => {
    const or = percentScale(percent)
    const o = Math.floor(or)
    const hilbert = new HilbertChromosome(o)
    const step = hilbert.step

    let rh = height / (15 - 4) // one row per order

    if(csn && csn.path && canvasRef1D.current && canvasRefStrip.current && data) {

      const region = csn.path.find(d => d.order === o)
      if(region) {
        const r = region.region

        const ctx = canvasRef1D.current.getContext('2d');
        ctx.clearRect(0, 0, width, height)
        const ctxs = canvasRefStrip.current.getContext('2d');
        ctxs.clearRect(0, 0, width, sheight)

        const hdistance = 16 + 4 * (o - 4)

        const dorder = data.find(d => d.order === o)
        const pointso = dorder.points.filter(d => d.chromosome === r.chromosome && d.i > r.i - hdistance && d.i < r.i + hdistance)
        const xExtentStart = extent(pointso, d => d.start)
        const xExtentEnd = extent(pointso, d => d.end)
        let xs = scaleLinear().domain([xExtentStart[0], xExtentEnd[1]]).range([0, width])

        // we interpolate between this zoom and the next zoom region to get the scale we use
        const no = o + 1
        const nregion = csn.path.find(d => d.order === no)
        if(nregion) {
          const nr = nregion.region
          const dnorder = data.find(d => d.order === no)
          const nhdistance = 16 + 4 * (no - 4)
          const pointsno = dnorder.points.filter(d => d.chromosome === r.chromosome && d.i > nr.i - nhdistance && d.i < nr.i + nhdistance)
          const nxExtentStart = extent(pointsno, d => d.start)
          const nxExtentEnd = extent(pointsno, d => d.end)
          // const nxs = scaleLinear().domain([xExtentStart[0], xExtentEnd[1]]).range([0, width])
          const interpolateStart = interpolateNumber(xExtentStart[0], nxExtentStart[0]);
          const interpolateEnd = interpolateNumber(xExtentEnd[1], nxExtentEnd[1]);
          xs = scaleLinear().domain([
            interpolateStart(or - o), 
            interpolateEnd(or - o)
          ]).range([0, width]);
        }

        // we want a global coordinate system essentially for the 1D visualization
        // const d = data.find(d => d.order === o)
        data.map(d => {
          // render a strip for each order
          const i = d.order - 4
          const y = i * rh
          const h = rh
          const w = width
          ctx.fillStyle = "white"
          ctx.fillRect(0, y, w, h)
          ctxs.fillStyle = "white"
          ctxs.fillRect(0, y, w, h)
          const layer = d.layer
          if(layer) {
            // loop over the data poitns
            const meta = d.data.metas.find((meta) => meta.chromosome === r.chromosome)
            // TODO: abstract the min and max for scaling into function
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

            // console.log("data", d)
            const data = d.data
            const dhdistance = 16 + 4 * (d.order - 4)
            data.filter(p => p.i > d.region.i - dhdistance && p.i < d.region.i + dhdistance).map(p => {
              const sample = layer.fieldChoice(p);
              if(sample && sample.field){
                // let fi = meta.fields.indexOf(sample.field)
                // let domain = [meta.min[fi] < 0 ? 0 : meta.min[fi], meta.max[fi]]
                // TODO: we could scale height
                // TODO or we could scale opacity
                ctx.fillStyle = layer.fieldColor(sample.field)
                const x = xs(p.start)
                let w = xs(p.end) - x
                if(w < 1) w = 1
                ctx.fillRect(x, y, w-0.5, h-1)
                if(d.order == o) {
                  ctxs.globalAlpha = 1
                  ctxs.fillStyle = layer.fieldColor(sample.field)
                  ctxs.fillRect(x, 0, w-0.5, h-1)
                }
                if(d.order == o-1) {
                  ctxs.fillStyle = layer.fieldColor(sample.field)
                  ctxs.globalAlpha = oscale(or - o)
                  ctxs.fillRect(x, 0, w-0.5, h-1)
                }
              }
            })
          }
          // render the region being highlighted
          ctx.strokeStyle = "black"
          // ctx.globalAlpha = 0.75
          ctx.lineWidth = 1;
          ctx.strokeRect(xs(d.region.start), i*rh, xs(d.region.end) - xs(d.region.start)-0.5, rh-1)
        })

        // render the region being highlighted
        ctx.strokeStyle = "black"
        ctxs.strokeStyle = "black"
        // ctx.globalAlpha = 0.75
        ctx.lineWidth = 2;
        ctxs.lineWidth = 2;
        ctx.strokeRect(xs(r.start), (r.order - 4)*rh, xs(r.end) - xs(r.start)-0.5, rh-1)
        ctxs.strokeRect(xs(r.start), 0, xs(r.end) - xs(r.start)-0.5, rh-1)

      }
    }
  }, [percent, percentScale, csn, data, width, height, zoomToBox, scales])


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
        <div className="power-scroll" style={{width: width + "px", height: height + "px"}}>
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
              {/* ({showKb(4 ** (14 - d.order))})<br/> */}
              {showPosition(d.region)}<br/>
              Order {d.order} <br/> 
              {d.layer?.name}<br/>
              <span style={{color: field?.color}}>{field?.field} </span>
              {/* {field?.value}<br/> */}
              {/* {t} {or} */}
            </div>)
          })}
        </div>
        <canvas 
          className="power-canvas-1d"
          width={width + "px"}
          height={height + "px"}
          style={{width: width + "px", height: height + "px"}}
          ref={canvasRef1D}
        />
      </div>
      <canvas 
          className="power-canvas-strip"
          width={width + "px"}
          height={20 + "px"}
          style={{width: width + "px", height: sheight + "px"}}
          ref={canvasRefStrip}
        />
      <label>
        <input style={{width: (width*1) + "px"}} type="range" min={1} max={100} value={percent} onChange={(e) => setPercent(e.target.value)}></input>
        {order}
      </label>
    </div>
  );
}

export default Power;