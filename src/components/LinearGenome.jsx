import { useRef, useCallback, useEffect, useMemo, useState } from "react"
import { scaleLinear } from 'd3-scale';
import Data from '../lib/data';
import scaleCanvas from '../lib/canvas'
import { HilbertChromosome } from '../lib/HilbertChromosome';

import "./LinearGenome.css"

const LinearGenome = ({
  center = null, // center of the view, a region
  hover = null,
  data = [],
  order,
  layer = null,
  zoom = {},
  width = 640,
  height = 100,
  onHover = () => {}
} = {}) => {

  let geneHeight = useMemo(() => height * .40, [height])
  let trackHeight = useMemo(() => height * .40, [height])
  let axisHeight = useMemo(() => height * .20, [height])

  const canvasRef = useRef(null)
  const xScaleRef = useRef(null)

  useEffect(() => {
    scaleCanvas(canvasRef.current, canvasRef.current.getContext("2d"), width, height)
  }, [width, height])

  // the final 1d track data as calculated by the data1D use effect
  // This updates when the data is done loading, after we receive new data from the 2d map
  const [dataPoints, setDataPoints] = useState([])

  // grab the continuous data (and relevant metaddata) from the center of the map
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
        // Set up the x scale for the whole track
        const bpbw = points[0].end - points[0].start
        let xExtent = [region.start - targetSize * bpbw, region.start + targetSize * bpbw + bpbw]
        const xScale = scaleLinear()
          .domain(xExtent)
          .range([0, width])
        const bw = xScale(points[0].end) - xScale(points[0].start)
        xScaleRef.current = xScale

        // Render the background points
        ctx.strokeStyle = "gray"
        ctx.lineWidth = 0.5
        // ctx.fillStyle = "lightgray"
        ctx.fillStyle = "white"
        points.forEach(p => {
          ctx.fillRect(xScale(p.start)+0.75, geneHeight, bw-1.5, trackHeight)
          if(bw-1.5 > 1.5) {
            ctx.strokeRect(xScale(p.start)+0.75, geneHeight, bw-1.5, trackHeight)
          }
        })
        // console.log("POINTS bounds", points[0], region, points[points.length - 1] )
        // console.log("POINTS", points)
        // console.log("DATA", data)

        // Render the "axis"
        // render the center point location
        ctx.textAlign = "center";
        ctx.fillStyle = "black"
        ctx.font = "10px monospace"
        let cx = xScale(region.start) + bw / 2
        // render the left most point location and boundary
        let lx = xScale(points[0].start)
        let rx = xScale(points[points.length - 1].end)
        if(cx - lx < 120) {
          ctx.textAlign = "right";
          lx -= 10
          ctx.fillText(points[0].chromosome + ":" + points[0].start, lx, geneHeight + trackHeight + axisHeight - 2);
          ctx.textAlign = "left";
          ctx.fillText(region.chromosome + ":" + region.start, cx, geneHeight + trackHeight + axisHeight - 2);
        } else if (rx - cx < 120) {
          ctx.textAlign = "left";
          lx += 1
          rx += 10
          ctx.fillText(points[0].chromosome + ":" + points[0].start, lx, geneHeight + trackHeight + axisHeight - 2);
          ctx.textAlign = "right";
          ctx.fillText(region.chromosome + ":" + region.start, cx, geneHeight + trackHeight + axisHeight - 2);
          ctx.textAlign = "left";
          rx += 1
          ctx.fillText(points[points.length - 1].chromosome + ":" + points[points.length - 1].end, rx, geneHeight + trackHeight + axisHeight - 2);
        } else{ 
          ctx.textAlign = "left";
          lx += 1
          ctx.fillText(points[0].chromosome + ":" + points[0].start, lx, geneHeight + trackHeight + axisHeight - 2);
          ctx.textAlign = "center";
          ctx.fillText(region.chromosome + ":" + region.start, cx, geneHeight + trackHeight + axisHeight - 2);
          ctx.textAlign = "right";
          rx -= 1
          ctx.fillText(points[points.length - 1].chromosome + ":" + points[points.length - 1].end, rx, geneHeight + trackHeight + axisHeight - 2);
        }
        // make sure it starts at left if far from center, or aligns right if its close to center
        // render the right most point location
        

        // Render the gene track

        // Render the data track
        if(data && layer && data[0]) {
          ctx.globalAlpha = 1  
          const meta = metas?.find((meta) => meta.chromosome === region.chromosome)
          let { min, max, fields } = Data.getDataBounds(meta)
          if(layer.datasetName == "variants_gwas") {
            max = 100
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
                .range([trackHeight,0])

              let y = geneHeight + yScale(sample.value)// + 0.5
              let h = trackHeight - yScale(sample.value)// - 2
              if(layer.name == "Nucleotides") {
                ctx.fillStyle = layer.fieldColor(sample.value)
                y = geneHeight
                h = trackHeight
              } else if(layer.datasetName == "badges") {
                ctx.fillStyle = layer.nucleotideColor(d.data.nucleotide)
                y = geneHeight
                h = trackHeight
              } else {
                ctx.fillStyle = layer.fieldColor(sample.field)
              }
              const x = xScale(d.start)// + 1
              const w = Math.max(1, bw - 0.5)// - 2
              ctx.fillRect(x, y, w, h)
              if(layer.name == "Nucleotides") {
                // ctx.fillStyle = 'white'
                ctx.fillStyle = 'black'
                let fs = trackHeight/3
                ctx.font = `${fs}px monospace`;
                ctx.fillText(sample.value, x+bw/2 - .4*fs, y+trackHeight/2+.3*fs)
              }
              
              // if(d.i == region.i){
              //   ctx.strokeRect(xScale(d.start)+1, 1, bw-2, height-2)
              // }
            }
          })
          ctx.strokeStyle = "black" 
          ctx.lineWidth = 1;
          ctx.strokeRect(xScale(region.start), geneHeight, bw, trackHeight-1)
        }
      } else {
        xScaleRef.current = null
      }
    }
  }, [width, height, geneHeight, trackHeight])

  useEffect(() => {
    // Calculate the data points we need for the track. We start with the data from the 2D map
    // Then we target up to 250 regions left and right of the center
    // we only request whats missing
    console.log("data1D", data1D)
    if(!data1D || !data1D.data || !data1D.data.length) return
    const layer = data1D.layer
    const hilbert = new HilbertChromosome(data1D.order)
    const dataClient = new Data()

    // find a target number of regions, based on the cdata length
    let targetRegions = Math.floor(data1D.cdata.length/2)
    if(targetRegions > 250) targetRegions = 250
    // console.log("target regions", targetRegions)
    // we want to get more data if we dont have enough in either left or right
    let leftDeficit = targetRegions - (data1D.centerIndex - data1D.left)
    let rightDeficit = targetRegions - (data1D.right - data1D.centerIndex)
    // console.log("leftDeficit", leftDeficit, "rightDeficit", rightDeficit)
    let leftPoints = data1D.cdata.slice(data1D.left, data1D.centerIndex)
    let rightPoints = data1D.cdata.slice(data1D.centerIndex, data1D.right + 1)
      // console.log("right points before", rightPoints)
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
      // console.log("right points after", rightPoints)
    }
    let data = leftPoints.concat(rightPoints)
    setDataPoints(data)
    let newPoints = newLeftPoints.concat(newRightPoints)
    let renderPoints = newLeftPoints.concat(leftPoints).concat(rightPoints).concat(newRightPoints).sort((a,b) => a.i - b.i)
    render(data1D.center, targetRegions, data, data1D.metas, data1D.layer, renderPoints)

    if(newPoints.length){
      if(layer.layers) {
        Promise.all(layer.layers.map(l => dataClient.fetchData(l, data1D.order, newPoints))).then((responses) => {
          let data = layer.combiner(responses)
            .concat(leftPoints).concat(rightPoints)
            .sort((a,b) => a.i - b.i)
          setDataPoints(data)
          render(data1D.center, targetRegions, data, data1D.metas, data1D.layer, renderPoints)
          console.log("data", data)
        })
      } else {
        dataClient.fetchData(layer, data1D.order, newPoints).then((response) => {
          let data = response
            .concat(leftPoints).concat(rightPoints)
            .sort((a,b) => a.i - b.i)
          setDataPoints(data)
          render(data1D.center, targetRegions, data, data1D.metas, data1D.layer, renderPoints)
          console.log("data", data)
        })
      }
    }
  }, [data1D]) // only want this to change when data1D changes, so we pack everything in it


  const [hoverData, setHoverData] = useState(null)
  const [bandwidth, setBandwidth] = useState(1)
  useEffect(() => {
    setHoverData(hover)
    if(hover) {
      setBandwidth(xScaleRef.current(hover?.end) - xScaleRef.current(hover?.start))
    }
  }, [hover])

  const handleMouseMove = useCallback((event) => {
    if(xScaleRef.current) {
      const rect = event.target.getBoundingClientRect();
      const ex = event.clientX - rect.x; // x position within the element.
      let x = xScaleRef.current.invert(ex)
      let data = dataPoints.filter(d => d.start <= x && d.end >= x)
      setHoverData(data[0])
      setBandwidth(xScaleRef.current(data[0]?.end) - xScaleRef.current(data[0]?.start))
      onHover(data[0])
    }
  }, [dataPoints])

  return (
    <div className="linear-genome">
    <svg className="linear-genome-svg" width={width} height={height}>
      {hoverData && <rect width="2" height={height} x={xScaleRef.current(hoverData.start) + bandwidth/2} fill="black" />}
    </svg>
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