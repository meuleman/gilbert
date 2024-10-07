import { useRef, useCallback, useEffect, useMemo } from "react"
import { scaleLinear } from 'd3-scale';
import { extent } from 'd3-array';
import Data from '../lib/data';
import scaleCanvas from '../lib/canvas'
import { HilbertChromosome } from '../lib/HilbertChromosome';

import "./LinearGenome.css"

const LinearGenome = ({
  center = null, // center of the view, a region
  data = [],
  order,
  layer = null,
  zoom = {},
  width = 640,
  height = 100,
} = {}) => {

  let geneHeight = useMemo(() => height * .40, [height])
  let trackHeight = useMemo(() => height * .40, [height])
  let axisHeight = useMemo(() => height * .20, [height])

  const canvasRef = useRef(null)
  const xScaleRef = useRef(null)

  useEffect(() => {
    scaleCanvas(canvasRef.current, canvasRef.current.getContext("2d"), width, height)
  }, [width, height])

  const data1D = useMemo(() => {
    if(!center) return []
    let cdata = data.filter(d => d.chromosome === center.chromosome)
    console.log("cdata length", cdata.length)
    let centerIndex = cdata.findIndex(d => d.i == center.i)
    if (centerIndex === -1) return []

    // get the continuous regions from the center
    let left = centerIndex
    let right = centerIndex
    // Loop left
    while (left > 0 && cdata[left - 1].i === cdata[left].i - 1) {
      left--
    }
    // Loop right
    while (right < cdata.length - 1 && cdata[right + 1].i === cdata[right].i + 1) {
      right++
    }

    console.log("left", centerIndex - left, "right", right - centerIndex, "length", right - left + 1)
    return {
      data: cdata.slice(left, right + 1),
      metas: data.metas,
      center,
      cdata,
      centerIndex,
      left,
      right,
      order,
      layer
    }
  }, [data, center, order, layer])

  const render = useCallback((region, targetSize, data, metas, layer, points) => {
    if(canvasRef.current){
      const ctx = canvasRef.current.getContext('2d');
      ctx.clearRect(0, 0, width, height)

      if(region && points) {
        const bpbw = points[0].end - points[0].start
        // let xExtent = extent(points, d => d.start)
        // xExtent[1] += bpbw
        let xExtent = [region.start - targetSize * bpbw, region.start + targetSize * bpbw + bpbw]
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
          if(bw-1.5 > 1.5) {
            ctx.strokeRect(xScale(p.start)+0.75, 1, bw-1.5, height-2)
          }
        })
        console.log("POINTS bounds", points[0], region, points[points.length - 1] )
        console.log("POINTS", points)
        console.log("DATA", data)
        if(data && layer && data[0]) {
          // render the region
          ctx.globalAlpha = 1  

          let fields, max, min
          if(metas){
            const meta = metas?.find((meta) => meta.chromosome === region.chromosome)
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

              let y = yScale(sample.value)// + 0.5
              let h = height - yScale(sample.value)// - 2
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
              const x = xScale(d.start)// + 1
              const w = Math.max(1, bw - 0.5)// - 2
              ctx.fillRect(x, y, w, h)
              if(layer.name == "Nucleotides") {
                // ctx.fillStyle = 'white'
                ctx.fillStyle = 'black'
                let fs = height/3
                ctx.font = `${fs}px monospace`;
                ctx.fillText(sample.value, x+bw/2 - .4*fs, y+height/2+.3*fs)
              }
              
              // if(d.i == region.i){
              //   ctx.strokeRect(xScale(d.start)+1, 1, bw-2, height-2)
              // }
            }
          })
          ctx.strokeStyle = "black" 
          ctx.lineWidth = 1;
          ctx.strokeRect(xScale(region.start), 1, bw, height-1)
        }
      } else {
        xScaleRef.current = null
      }
    }
  }, [width, height])

  useEffect(() => {
    console.log("data1D", data1D)
    if(!data1D || !data1D.data || !data1D.data.length) return
    const layer = data1D.layer
    const hilbert = new HilbertChromosome(data1D.order)
    const dataClient = new Data()

    // find a target number of regions, based on the cdata length
    let targetRegions = Math.floor(data1D.cdata.length/2)
    if(targetRegions > 250) targetRegions = 250
    console.log("target regions", targetRegions)
    // we want to get more data if we dont have enough in either left or right
    let leftDeficit = targetRegions - (data1D.centerIndex - data1D.left)
    let rightDeficit = targetRegions - (data1D.right - data1D.centerIndex)
    console.log("leftDeficit", leftDeficit, "rightDeficit", rightDeficit)
    let leftPoints = data1D.cdata.slice(data1D.left, data1D.centerIndex)
    let rightPoints = data1D.cdata.slice(data1D.centerIndex, data1D.right + 1)
      console.log("right points before", rightPoints)
    let newLeftPoints = []
    let newRightPoints = []
    if(leftDeficit > 0) {
      // fetch data to fill in
      let li = data1D.data[0].i
      newLeftPoints = hilbert.fromRange(data1D.center.chromosome, li, Math.max(li - leftDeficit, 0))
    } else if(leftDeficit < 0) {
      leftPoints = leftPoints.slice(-leftDeficit)
    }
    if(rightDeficit > 0) {
      // fetch data to fill in 
      let ri = data1D.data[data1D.data.length - 1].i
      // TODO: check max of chromosome
      let orderMax = Math.pow(4, data1D.order)
      newRightPoints = hilbert.fromRange(data1D.center.chromosome, ri, Math.min(ri + rightDeficit, orderMax))
    } else if(rightDeficit < 0) {
      rightPoints = data1D.cdata.slice(data1D.centerIndex, data1D.right + rightDeficit + 1)
      console.log("right points after", rightPoints)
    }
    let newPoints = newLeftPoints.concat(newRightPoints)
    let renderPoints = newLeftPoints.concat(leftPoints).concat(rightPoints).concat(newRightPoints).sort((a,b) => a.i - b.i)
    render(data1D.center, targetRegions, data1D.data, data1D.metas, data1D.layer, renderPoints)
    
    if(newPoints.length){
      if(layer.layers) {
        Promise.all(layer.layers.map(l => dataClient.fetchData(l, data1D.order, newPoints))).then((responses) => {
          let data = layer.combiner(responses)
            .concat(leftPoints).concat(rightPoints)
            .sort((a,b) => a.i - b.i)
          render(data1D.center, targetRegions, data, data1D.metas, data1D.layer, renderPoints)
        })
      } else {
        dataClient.fetchData(layer, data1D.order, newPoints).then((response) => {
          let data = response
            .concat(leftPoints).concat(rightPoints)
            .sort((a,b) => a.i - b.i)
          render(data1D.center, targetRegions, data, data1D.metas, data1D.layer, renderPoints)
        })
      }
    }
  }, [data1D]) // only want this to change when data1D changes, so we pack everything in it


  const handleMouseMove = useCallback((event) => {
  }, [])

  return (
    <div className="linear-genome">
    <canvas 
      className="linear-genome-canvas"
      width={width + "px"}
      height={height + "px"}
      ref={canvasRef}
      onMouseMove={handleMouseMove}
    />
    </div>
)

}

export default LinearGenome