import { useState, useRef, useEffect, useMemo, useCallback } from 'react';
import { scaleLinear } from 'd3-scale';
import { zoomIdentity } from 'd3-zoom';

import { HilbertChromosome } from '../lib/HilbertChromosome';
import Data from '../lib/data';

import CanvasBase from './CanvasBase';

import './RegionThumb.css';

import PropTypes from 'prop-types';

RegionThumb.propTypes = {
  region: PropTypes.object.isRequired,
  layer: PropTypes.string.isRequired,
  width: PropTypes.number.isRequired,
  height: PropTypes.number.isRequired,
};


function RegionThumb({ region, layer, width, height }) {

  const canvasRef = useRef(null);
  const [data, setData] = useState(null)
  const [points, setPoints] = useState(null)

  const radius = 7 // # of steps to take in each direction
  const scaler = 1.5


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

  const zoomToBox = useCallback((x0,y0,x1,y1,pinnedOrder=null,scaleMultiplier=1) => {
    // TODO the multipliers should be based on aspect ratio
    const xOffset =  (width/height)*2
    const yOffset = -(width/height)*2
    let tx = xScale(x0) - sizeScale(x1 - x0) * xOffset
    let ty = yScale(y0) - sizeScale(y1 - y0) * yOffset
    let tw = xScale(x1 - x0) - xScale(0) // the width of the box
    let xw = xScale(xScale.domain()[1] - xScale.domain()[0])
    // we zoom to 1/4 the scale of the hit
    let scale = xw/tw/4
    let transform = zoomIdentity.translate(-tx * scale, -ty * scale).scale(scale)
    if(pinnedOrder) {
      scale = orderZoomScale.invert(Math.pow(2,(pinnedOrder - orderDomain[0] + 0.99))) * scaleMultiplier
      // TODO: still dont know why these magic numbers are needed
      transform = zoomIdentity.translate(-tx * scale + xw*0.36, -ty * scale + xw*0.64).scale(scale)
    }
    return transform
  }, [xScale, yScale, sizeScale, orderZoomScale, orderDomain, width, height])


  useEffect(() => {
    console.log("region", region)
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
    dataClient.fetchData(layer, region.order, points).then((response) => {
      // console.log("response!", response)
      setData(response)
    })
  }, [region, layer])

  useEffect(() => {
    // setup the transform to be zoomed in to our region
    const hilbert = new HilbertChromosome(region.order)
    const step = hilbert.step
    const transform = zoomToBox(region.x, region.y, region.x + step, region.y + step, region.order, scaler)
    // console.log("REGION", region)
    // console.log("transform", transform)
    // console.log("data", data)
    if(data && layer) {
      CanvasBase({ 
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

      layer.renderer({ 
        scales, 
        state: { 
          data,
          loading: false,
          points,
          meta: data.metas.find((meta) => meta.chromosome === region.chromosome),
          order: region.order,
          transform
        }, 
        layer, 
        canvasRef 
      })

      // render region
      const ctx = canvasRef.current.getContext('2d');
      let t = {...transform}
      // if the data's order doesn't match the current order we render it more transparently
      ctx.globalAlpha = 1 //order == dataOrder ? 1 : 0.85
      ctx.strokeStyle = "black" 
      ctx.lineWidth = 3;

      const x = t.x + scales.xScale(region.x) * t.k
      const y = t.y + scales.yScale(region.y) * t.k
      let rw = scales.sizeScale(step) * t.k

      ctx.strokeRect(x - rw/2, y - rw/2, rw, rw)

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
      />
    </div>
  );
}

export default RegionThumb;