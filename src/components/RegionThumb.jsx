import { useState, useRef, useEffect, useMemo, useCallback } from 'react';
import { scaleLinear } from 'd3-scale';
import { zoomIdentity } from 'd3-zoom';
// these 2 for renderPipes
import { line } from 'd3-shape';
import { getOffsets } from "../lib/segments"

import { HilbertChromosome } from '../lib/HilbertChromosome';
import Data from '../lib/data';

import { Renderer as CanvasRenderer } from './Canvas/Renderer';

import './RegionThumb.css';

import PropTypes from 'prop-types';

RegionThumb.propTypes = {
  region: PropTypes.object.isRequired,
  highlights: PropTypes.array,
  layer: PropTypes.object,
  width: PropTypes.number.isRequired,
  height: PropTypes.number.isRequired,
};

// TODO: this function is copied from Power.jsx
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


function RegionThumb({ region, highlights, layer, width, height }) {

  const canvasRef = useRef(null);
  const [data, setData] = useState(null)
  const [points, setPoints] = useState(null)

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
    const hilbert = new HilbertChromosome(region.order)
    const step = hilbert.step
    // determine the bounding box around the region
    const bbox = {
      x: region.x - step * radius,
      y: region.y - step * radius,
      width: step * radius * 2,
      height: step * radius * 2
    }
    const points = hilbert.fromBbox(bbox)
    setPoints(points)

    // fetch the data around the region
    const dataClient = new Data()
    if(layer?.layers) {
      Promise.all(layer.layers.map(l => dataClient.fetchData(l, region.order, points))).then((responses) => {
        setData(layer.combiner(responses))
      })
    } else {
      dataClient.fetchData(layer, region.order, points).then((response) => {
        setData(response)
      })
    }
  }, [region, layer])

  const [transform, setTransform] = useState(null)
  useEffect(() => {
    // setup the transform to be zoomed in to our region
    const hilbert = new HilbertChromosome(region.order)
    const step = hilbert.step
    const transform = zoomToBox(region.x, region.y, region.x + step, region.y + step, region.order, scaler)
    setTransform(transform)
    // console.log("REGION", region)
    // console.log("transform", transform)
    // console.log("data", data)
    const ctx = canvasRef.current.getContext('2d');
    ctx.clearRect(0, 0, width, height)
    if(data && layer) {
      let t = {...transform}

      CanvasRenderer("Base", { 
        scales, 
        state: { 
          data,
          loading: false,
          points, 
          order: region.order, 
          transform
        }, 
        layer, 
        canvasRef 
      })

      CanvasRenderer(layer.renderer, { 
        scales, 
        state: { 
          data,
          loading: false,
          points,
          meta: data.metas?.find((meta) => meta.chromosome === region.chromosome),
          order: region.order,
          transform
        }, 
        layer, 
        canvasRef 
      })

      // render region
      
      // render the highlighted regions
      if(highlights && highlights.length) {
        ctx.strokeStyle = "black" 
        ctx.globalAlpha = 0.75
        ctx.lineWidth = 1;
        highlights.forEach(d => {
          let hstep = new HilbertChromosome(d.order).step
          const x = t.x + scales.xScale(d.x) * t.k
          const y = t.y + scales.yScale(d.y) * t.k
          let rw = scales.sizeScale(hstep) * t.k
          ctx.strokeRect(x - rw/2, y - rw/2, rw, rw)
        })
      } 

      // render the region
      ctx.globalAlpha = 1 
      ctx.strokeStyle = "black" 
      ctx.lineWidth = 3;

      const x = t.x + scales.xScale(region.x) * t.k
      const y = t.y + scales.yScale(region.y) * t.k
      let rw = scales.sizeScale(step) * t.k
      ctx.strokeRect(x - rw/2, y - rw/2, rw, rw)

    } else if(points?.length) {
      // render the empty pipes
      renderPipes(ctx, points, transform, region.order, scales, "#eee", 0.25);
    }
  }, [region, points, data, layer, scales, zoomToBox])

  return (
    <div 
      className="region-thumb" 
      style={{
        width: width + "px",
        height: height + "px"
      }}>
      <canvas 
        className="region-thumb-canvas"
        width={width + "px"}
        height={height + "px"}
        ref={canvasRef}
        onClick={() => console.log("transform", transform, region)}
      />
    </div>
  );
}

export default RegionThumb;