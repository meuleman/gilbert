// Visualize a 1D strip centered on a region

import { useState, useRef, useEffect, useMemo, useCallback } from 'react';
import { scaleLinear } from 'd3-scale';
import { extent } from 'd3-array';

import { HilbertChromosome } from '../lib/HilbertChromosome';
import Data from '../lib/data';

import CanvasBase from './CanvasBase';

import './RegionStrip.css';

import PropTypes from 'prop-types';

RegionStrip.propTypes = {
  region: PropTypes.object.isRequired,
  segments: PropTypes.number,
  highlights: PropTypes.array,
  layer: PropTypes.object.isRequired,
  width: PropTypes.number.isRequired,
  height: PropTypes.number.isRequired,
};


function RegionStrip({ region, segments=100, highlights, layer, width, height }) {

  const canvasRef = useRef(null);
  const [data, setData] = useState(null)
  const [points, setPoints] = useState(null)

  const render = useCallback((region, data) => {
    if(region && data && layer && data[0] && canvasRef.current) {
      const ctx = canvasRef.current.getContext('2d');
      ctx.clearRect(0, 0, width, height)

      const bpbw = data[0].end - data[0].start
      let xExtent = extent(data, d => d.start)
      xExtent[1] += bpbw
      const xScale = scaleLinear()
        .domain(xExtent)
        .range([0, width])
      const bw = xScale(data[0].end) - xScale(data[0].start)

      // render the region
      ctx.globalAlpha = 1 
      ctx.strokeStyle = "black" 
      ctx.lineWidth = 2;

      const meta = data.metas.find((meta) => meta.chromosome === region.chromosome)
      // console.log("meta", meta)
      // the min and max for scaling
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

      data.map(d => {
        const sample = layer.fieldChoice(d);
        if(sample && sample.field){
          // console.log("sample", sample, yScale(sample.value))
          let fi = fields.indexOf(sample.field)
          let domain = [min[fi] < 0 ? 0 : min[fi], max[fi]]
          const yScale = scaleLinear()
            .domain(domain)
            .range([height,0])

          ctx.fillStyle = layer.fieldColor(sample.field)
          const x = xScale(d.start)
          const y = yScale(sample.value)
          const w = bw
          const h = height - yScale(sample.value)
          ctx.fillRect(x, y, w, h)
        }
        if(d.i == region.i){
          ctx.strokeRect(xScale(d.start), 1, bw, height-1)
        }
      })

      // render the highlighted regions
      if(highlights && highlights.length) {
        ctx.strokeStyle = "black" 
        ctx.globalAlpha = 0.5
        ctx.lineWidth = 1;
        highlights.forEach(d => {
          if(d.order == region.order - 1) {
            const x = xScale(d.start)
            const y = 0
            const w = bw * 4
            const h = height
            ctx.strokeRect(x, y, w, h)
          }
        })
      }
    }
  }, [layer, highlights, width, height])
  // useEffect(() => {
  //   // setup the transform to be zoomed in to our region
  //   // console.log("REGION", region)
  //   // console.log("data", data)
  // }, [region, points, data, layer, width, height, highlights])
  useEffect(() => {
    if(region) {
      const hilbert = new HilbertChromosome(region.order)
      const radius = Math.floor(segments/2)
      let stripStart = region.i - radius
      let stripOffset = 0
      if(stripStart < 0) {
        stripStart = 0
        stripOffset = radius - region.i
      }
      let stripEnd = region.i + radius + stripOffset
      let orderMax = Math.pow(4, region.order)
      if(stripEnd > orderMax) {
        stripEnd = orderMax
        stripOffset = radius - (stripEnd - region.i)
        stripStart = region.i - radius - stripOffset
      }
      const points = hilbert.fromRange(region.chromosome, stripStart, stripEnd)
      setPoints(points)

      // fetch the data around the region
      const dataClient = new Data()
      dataClient.fetchData(layer, region.order, points).then((response) => {
        setData(response)
        render(region, response)
      })
    }
  }, [region, layer, segments, render])




  return (
    <div 
      className="region-strip" 
      style={{
        width: width + "px",
        height: height + "px"
      }}>
      <canvas 
        className="region-strip-canvas"
        width={width + "px"}
        height={height + "px"}
        ref={canvasRef}
      />
    </div>
  );
}

export default RegionStrip;