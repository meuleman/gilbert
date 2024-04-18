// Visualize a 1D strip centered on a region

import { useState, useRef, useEffect, useCallback } from 'react';
import { scaleLinear } from 'd3-scale';
import { extent } from 'd3-array';

import { HilbertChromosome } from '../lib/HilbertChromosome';
import scaleCanvas from '../lib/canvas'

import Data from '../lib/data';

import Tooltip from './Tooltips/Tooltip';

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
  const tooltipRef = useRef(null)
  const [data, setData] = useState(null)
  const [points, setPoints] = useState(null)

  const xScaleRef = useRef(null)

  useEffect(() => {
    scaleCanvas(canvasRef.current, canvasRef.current.getContext("2d"), width, height)
  }, [canvasRef, width, height])

  const render = useCallback((region, data, points) => {
    if(canvasRef.current){
      const ctx = canvasRef.current.getContext('2d');
      ctx.clearRect(0, 0, width, height)

      if(region && points) {
        const bpbw = points[0].end - points[0].start
        let xExtent = extent(points, d => d.start)
        xExtent[1] += bpbw
        const xScale = scaleLinear()
          .domain(xExtent)
          .range([0, width])
        const bw = xScale(points[0].end) - xScale(points[0].start)
        xScaleRef.current = xScale

        ctx.strokeStyle = "gray"
        ctx.lineWidth = 0.5
        ctx.fillStyle = "white"
        points.forEach(p => {

          ctx.fillRect(xScale(p.start)+0.75, 1, bw-1.5, height-2)
          ctx.strokeRect(xScale(p.start)+0.75, 1, bw-1.5, height-2)
        })

        
        if(data && layer && data[0]) {
          // render the region
          ctx.globalAlpha = 1 
          ctx.strokeStyle = "black" 
          ctx.lineWidth = 3;

          let fields, max, min
          if(data.metas){
            const meta = data.metas?.find((meta) => meta.chromosome === region.chromosome)
            // console.log("meta", meta)
            // the min and max for scaling
            let nonzero_min = meta["nonzero_min"]
            if ((meta["fields"].length == 2) && (meta["fields"][0] == "max_field") && (meta["fields"][1] == "max_value")) {
              fields = meta["full_fields"]
              max = meta["full_max"]
              min = nonzero_min ? nonzero_min : meta["full_min"]
            } else {
              fields = meta["fields"]
              max = meta["max"]
              min = nonzero_min ? nonzero_min : meta["min"]
            }
            if(!min || !min.length && min < 0) min = 0;

            if(layer.datasetName == "variants_gwas") {
              max = 100
              // console.log("minmax",min,max)
            }
          }

          data.map(d => {
            const sample = layer.fieldChoice(d);
            
            if(sample && sample.field){
              // console.log("sample", sample, yScale(sample.value))
              let domain = [min < 0 ? 0 : min, max]
              if (Array.isArray(min)) {
                let fi = fields.indexOf(sample.field)
                domain = [min[fi] < 0 ? 0 : min[fi], max[fi]]
              }
              
              const yScale = scaleLinear()
                .domain(domain)
                .range([height,0])

              let y = yScale(sample.value) + 0.5
              let h = height - yScale(sample.value) - 2
              if(layer.name == "Nucleotides") {
                ctx.fillStyle = layer.fieldColor(sample.value)
                y = 1
                h = height - 2
              } else if(layer.datasetName == "badges") {
                ctx.fillStyle = layer.nucleotideColor(d.data.nucleotide)
                y = 1
                h = height - 2
              } else {
                ctx.fillStyle = layer.fieldColor(sample.field)
              }
              const x = xScale(d.start) + 1
              const w = bw - 2
              ctx.fillRect(x, y, w, h)
              if(layer.name == "Nucleotides") {
                // ctx.fillStyle = 'white'
                ctx.fillStyle = 'black'
                let fs = height/3
                ctx.font = `${fs}px monospace`;
                ctx.fillText(sample.value, x+bw/2 - .4*fs, y+height/2+.3*fs)
              }
              if(layer.datasetName == "badges") {
                // console.log("sup badge", d)

                let fs = height/3
                let xx = x+bw/2 - bw/12
                let yy = y + height/2  - fs/10
                let coX = bw/5
                let coY = fs
                let radius = bw/8
                const badgeColor = "#bbb"
                // render protein_function in top left
                if(d.data.protein_function) {
                  ctx.fillStyle = layer.fieldColor("Protein Function")
                } else {
                  ctx.fillStyle = badgeColor
                }
                ctx.beginPath()
                ctx.arc(xx - coX, yy - coY, radius, 0, 2*Math.PI)
                ctx.fill()
                // render clinvar_sig in bottom right
                if(d.data.clinvar_sig) {
                  ctx.fillStyle = layer.fieldColor("ClinVar Sig")
                } else {
                  ctx.fillStyle = badgeColor
                }
                ctx.beginPath()
                ctx.arc(xx + coX, yy + coY, radius, 0, 2*Math.PI)
                ctx.fill()
              
                // render conservation in bottom left
                if(d.data.conservation) {
                  ctx.fillStyle = layer.fieldColor("Conservation")
                } else {
                  ctx.fillStyle = badgeColor
                }
                ctx.beginPath()
                ctx.arc(xx - coX, yy + coY, radius, 0, 2*Math.PI)
                ctx.fill()

                // render gwas in top right
                if(d.data.gwas) {
                  ctx.fillStyle = layer.fieldColor("GWAS")
                } else {
                  ctx.fillStyle = badgeColor
                }
                ctx.beginPath()
                ctx.arc(xx + coX, yy - coY, radius, 0, 2*Math.PI)
                ctx.fill()



                ctx.fillStyle = 'black'
                ctx.font = `${fs}px monospace`;
                ctx.fillText(d.data.nucleotide, x+bw/2 - .4*fs, y+height/2+.3*fs)
              }
            }
            if(d.i == region.i){
              ctx.strokeRect(xScale(d.start)+1, 1, bw-2, height-2)
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
      } else {
        xScaleRef.current = null
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
      if(layer.layers) {
        Promise.all(layer.layers.map(l => dataClient.fetchData(l, region.order, points))).then((responses) => {
          let data = layer.combiner(responses)
          setData(data)
          render(region, data, points)
        })
      } else {
        dataClient.fetchData(layer, region.order, points).then((response) => {
          setData(response)
          render(region, response, points)
        })
      }
    }
  }, [region, layer, segments, render])

  const handleClick = useCallback(() => {
    console.log("clicked region strip", region, data, layer)
  }, [region, data, layer])

  const handleMouseMove = useCallback((e) => {
    if(!xScaleRef.current || !data?.length) return
    const { clientX } = e;
    const rect = e.target.getBoundingClientRect();
    const x = clientX - rect.x; // x position within the element.

    const mStart = xScaleRef.current.invert(x); 

    const hoveredData = data.find(d => {
      return d.start < mStart && d.end > mStart
    });

    if(hoveredData) {
      const bw = xScaleRef.current(hoveredData.end) - xScaleRef.current(hoveredData.start)
      const tx = xScaleRef.current(hoveredData.start) + rect.x + bw/2
      console.log("hovered data", hoveredData)
      tooltipRef.current.show(hoveredData, layer, tx, rect.top - 2)
    }
  }, [data, layer])

  const handleMouseLeave = useCallback(() => {
    tooltipRef.current.hide()
  }, [])

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
        onClick={handleClick}
        onMouseMove={handleMouseMove}
        onMouseLeave={handleMouseLeave}
      />
      <Tooltip ref={tooltipRef} orientation="top" bottomOffset={height+5} />
    </div>
  );
}

export default RegionStrip;