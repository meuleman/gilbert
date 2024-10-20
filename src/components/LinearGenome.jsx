import { useRef, useCallback, useEffect, useMemo, useState, memo } from "react"
import { scaleLinear } from 'd3-scale';
import { extent } from 'd3-array'
import { select } from 'd3-selection';
import { zoom, zoomIdentity } from 'd3-zoom';
import { drag } from 'd3-drag';

import { Tooltip } from 'react-tooltip'

import Data from '../lib/data';
import scaleCanvas from '../lib/canvas'
import { HilbertChromosome } from '../lib/HilbertChromosome';
import { debouncer } from '../lib/debounce'
import { defaultContent } from './Tooltips/Content';
import { getGencodesInView } from '../lib/Genes';

import { useZoom } from '../contexts/ZoomContext';

const zoomDebounce = debouncer()

import "./LinearGenome.css"

const LinearGenome = ({
  center = null, // center of the view, a region
  hover = null,
  data = [],
  dataOrder = null,
  layer = null,
  width = 640,
  height = 100,
  mapWidth = 640,
  mapHeight = 640,
  onHover = () => {}
} = {}) => {

  const { 
    transform, 
    order, 
    orderZoomScale, 
    orderRaw, 
    zoomMin,
    zoomMax,
    zooming, 
    setTransform, 
    setZooming 
  } = useZoom()

  let zoomExtent = useMemo(() => [zoomMin, zoomMax], [zoomMin, zoomMax])

  let geneHeight = useMemo(() => height * .40, [height])
  let trackHeight = useMemo(() => height * .40, [height])
  let axisHeight = useMemo(() => height * .20, [height])

  const canvasRef = useRef(null)
  const xScaleRef = useRef(null)

  // map scales for zooming
  let diff = useMemo(() => (mapWidth > mapHeight) ? mapWidth - mapHeight : mapHeight - mapWidth, [mapHeight, mapWidth]);
  let mapXRange = useMemo(() => (mapWidth > mapHeight) ? [diff / 2, mapWidth - diff / 2] : [0, mapWidth], [mapHeight, mapWidth, diff])
  let mapYRange = useMemo(() => (mapWidth > mapHeight) ? [0, mapHeight] : [diff / 2, mapHeight - diff / 2], [mapHeight, mapWidth, diff])
  const mapXScale = useMemo(() => scaleLinear().domain([0, 5]).range(mapXRange), [mapXRange]); // TODO: HG xMin,xMax should be higher level constants
  const mapYScale = useMemo(() => scaleLinear().domain([0, 5]).range(mapYRange), [mapYRange]);


  useEffect(() => {
    scaleCanvas(canvasRef.current, canvasRef.current.getContext("2d"), width, height)
  }, [width, height])

  // the final 1d track data as calculated by the data1D use effect
  // This updates when the data is done loading, after we receive new data from the 2d map
  const [dataPoints, setDataPoints] = useState([])
  const [targetRegions, setTargetRegions] = useState(250)
  const [renderPoints, setRenderPoints] = useState([])

  const genes = useMemo(() => getGencodesInView(dataPoints, order, 100000000), [dataPoints, order])

  // grab the continuous data (and relevant metaddata) from the center of the map
  const data1D = useMemo(() => {
    if(!center) return []
    let cdata = data.filter(d => d.chromosome === center.chromosome)
    // console.log("cdata length", cdata.length)
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

    // console.log("left", centerIndex - left, "right", right - centerIndex, "length", right - left + 1)
    return {
      data: cdata.slice(left, right + 1),
      metas: data.metas,
      center,
      cdata,
      centerIndex,
      left,
      right,
      order: dataOrder,
      layer
    }
  }, [data, center, dataOrder, layer])


  // depend on order or dataOrder? 
  // allow the useeffect to update when render updates?
  // how am i going to scale things based on the actual order (orderRaw? or transform.k?)
  const render = useCallback((region, targetSize, data, metas, layer, points) => {
    if(canvasRef.current){
      // console.log("order zoom", order, transform.k, orderRaw)

      const ctx = canvasRef.current.getContext('2d');
      ctx.clearRect(0, 0, width, height)

      //  && Math.floor(orderRaw) == order && order == dataOrder
      if(region && points && points.length) {
        // figure out scale factor
        const diff = orderRaw - order
        const scaleFactor = 1 + 3 * diff
        // Set up the x scale for the whole track
        const bpbw = points[0].end - points[0].start
        let xExtent = [region.start - targetSize * bpbw, region.start + targetSize * bpbw + bpbw]

        const xs = scaleLinear()
          .domain(xExtent)
          .range([0, width])
        
        const centerX = width / 2
        const xScale = (x) => {
          if (typeof x === 'function') {
            // This allows chaining of other d3 scale methods
            return xScale;
          }
          const normalizedX = xs(x);
          const scaledX = (normalizedX - centerX) * scaleFactor + centerX;
          return scaledX;
        }
        xScale.invert = (scaledX) => {
          const normalizedX = (scaledX - centerX) / scaleFactor + centerX;
          return xs.invert(normalizedX);
        }
        

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
        let minw = points[0].end - points[0].start
        const gs = genes
          .filter(d => d.end - d.start > minw)
        const rows = [];
        const padding = (points[0].end - points[0].start) * 0
        gs.forEach(gene => {
          let placed = false;
          for (let i = 0; i < rows.length; i++) {
            if (!rows[i].some(g => g.start < gene.end + padding && g.end > gene.start - padding)) {
              rows[i].push(gene);
              placed = true;
              break;
            }
          }
          if (!placed) {
            rows.push([gene]);
          }
        });

        ctx.globalAlpha = 1
        ctx.textAlign = "center"
        // we want a global coordinate system essentially for the 1D visualization
        rows.map((r,i) => {
          r.map((g,j) => {
            const h = geneHeight - 5

            ctx.fillStyle = "black";
            let x = xScale(g.start) + Math.abs(xScale(g.end) - xScale(g.start))/2
            if(x < 10) x = 10
            if(x > width - 10) x = width - 10
            let y = Math.floor(h - i*15)
            ctx.fillText(g.hgnc, Math.floor(x), y - 5);

            // draw the polarity circle for start and triangle for end
            ctx.fillStyle = "black"
            ctx.beginPath();
            let r = 2
            let px = g.posneg == "-" ? xScale(g.end) + r/2 : xScale(g.start) - r/2
            // ctx.moveTo(px, y);
            ctx.arc(px, y, r, 0, 2 * Math.PI);
            ctx.fill();

            let pex = g.posneg == "-" ? xScale(g.start) + r/2 : xScale(g.end) - r/2
            ctx.beginPath();
            if (g.posneg === "-") {
              ctx.moveTo(pex, y - r/2);
              ctx.lineTo(pex - r, y);
              ctx.lineTo(pex, y + r/2);
            } else {
              ctx.moveTo(pex, y - r/2);
              ctx.lineTo(pex + r, y);
              ctx.lineTo(pex, y + r/2);
            }
            ctx.closePath();
            ctx.fill();

            // draw the gene line
            // ctx.beginPath();
            ctx.moveTo(Math.floor(xScale(g.start)), y);
            ctx.lineTo(Math.floor(xScale(g.end)), y);
            // console.log("g", g, xs(g.start), xs(g.end))
            ctx.strokeStyle = "black";
            ctx.lineWidth = 2;
            ctx.stroke();

            
          })
        })

        // Render the data track
        if(data && layer && data[0]) {
          ctx.globalAlpha = 1  
          const meta = metas?.find((meta) => meta.chromosome === region.chromosome)
          let { min, max, fields } = Data.getDataBounds(meta)
          max = extent(data, d => layer.fieldChoice(d)?.value)[1]
          if(layer.datasetName == "variants_gwas") {
            max = 100
          }

          data.map(d => {
            const sample = layer.fieldChoice(d);
            
            if(sample && sample.field){
              // console.log("sample", sample, yScale(sample.value))
              let domain = [0, max]
              // let domain = [min < 0 ? 0 : min, max]
              // if (Array.isArray(min)) {
              //   let fi = fields.indexOf(sample.field)
              //   domain = [min[fi] < 0 ? 0 : min[fi], max[fi]]
              // }
              
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
  }, [
    width, 
    height, 
    geneHeight, 
    trackHeight, 
    axisHeight, 
    genes, 
    dataOrder, 
    order, 
    orderRaw
  ])

  useEffect(() => {
    // Calculate the data points we need for the track. We start with the data from the 2D map
    // Then we target up to 250 regions left and right of the center
    // we only request whats missing
    // console.log("data1D", data1D)
    if(!data1D || !data1D.data || !data1D.data.length) return
    const layer = data1D.layer
    const hilbert = new HilbertChromosome(data1D.order)
    const dataClient = new Data()

    // find a target number of regions, based on the cdata length
    let targetRegions = Math.floor(data1D.cdata.length/2)
    if(targetRegions > 250) targetRegions = 250
    setTargetRegions(targetRegions)
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
    let rps = newLeftPoints.concat(leftPoints).concat(rightPoints).concat(newRightPoints).sort((a,b) => a.i - b.i)
    setRenderPoints(rps)
    // render(data1D.center, targetRegions, data, data1D.metas, data1D.layer, renderPoints)

    if(newPoints.length){
      if(layer.layers) {
        Promise.all(layer.layers.map(l => dataClient.fetchData(l, data1D.order, newPoints))).then((responses) => {
          let data = layer.combiner(responses)
            .concat(leftPoints).concat(rightPoints)
            .sort((a,b) => a.i - b.i)
          setDataPoints(data)
          // render(data1D.center, targetRegions, data, data1D.metas, data1D.layer, renderPoints)
          // console.log("data", data)
        })
      } else {
        dataClient.fetchData(layer, data1D.order, newPoints).then((response) => {
          let data = response
            .concat(leftPoints).concat(rightPoints)
            .sort((a,b) => a.i - b.i)
          setDataPoints(data)
          // render(data1D.center, targetRegions, data, data1D.metas, data1D.layer, renderPoints)
          // console.log("data", data)
        })
      }
    }
  }, [data1D]) // only want this to change when data1D changes, so we pack everything in it
  
  useEffect(() => {
    render(data1D.center, targetRegions, dataPoints, data1D.metas, data1D.layer, renderPoints) 
  }, [targetRegions, renderPoints, dataPoints, data1D, render])


  const [hoverData, setHoverData] = useState(null)
  // const [bandwidth, setBandwidth] = useState(1)

  const processHover = useCallback((hover) =>{
    let hd = null
    if(hover && xScaleRef.current) {
      let bw = xScaleRef.current(hover?.end) - xScaleRef.current(hover?.start)
      let sx = xScaleRef.current(hover?.start) + bw/2
      // we allow for hover thats out of range to indicate at the edges
      if(sx < 0) sx = 0
      if(sx > width) sx = width
      let gs = getGencodesInView([hover], dataOrder, 100000000)
      hd = {
        ...hover,
        sx,
        bw,
        genes: gs
      }
    }
    return hd
  }, [width, dataOrder])

  useEffect(() => {
    // console.log("hover updated")
    let hd = processHover(hover)
    setHoverData(hd)
  }, [hover, processHover])

  const handleMouseMove = useCallback((event) => {
    if(xScaleRef.current) {
      const rect = event.target.getBoundingClientRect();
      const ex = event.clientX - rect.x; // x position within the element.
      let x = xScaleRef.current.invert(ex)
      let data = dataPoints.filter(d => d.start <= x && d.end >= x)
      // console.log("mouse move", ex, x, data[0])
      let hd = processHover(data[0])
      setHoverData(hd)
      onHover(hd)
    }
  }, [dataPoints, processHover, onHover])

  const handleMouseClick = useCallback((event) => {
    console.log("clicked", event)
    if(xScaleRef.current) {
      const rect = event.target.getBoundingClientRect();
      const ex = event.clientX - rect.x; // x position within the element.
      let x = xScaleRef.current.invert(ex)
      let data = dataPoints.filter(d => d.start <= x && d.end >= x)
      let hd = processHover(data[0])
      console.log("clicked", hd)
    }
  }, [dataPoints, processHover])

  const svgRef = useRef(null);
  const handleZoomRef = useRef(null);

  const [isDragging, setIsDragging] = useState(false);
  const lastMousePosition = useRef(null);



  // const handleZoom = useCallback((event) => {
  useEffect(() => {
    handleZoomRef.current = (event) => {
      zoomDebounce(() => new Promise((resolve, reject) => {resolve()}), () => {
        if(dataPoints?.length && xScaleRef.current) {
          const { transform: newTransform, sourceEvent } = event;
          
          // Check if this is a drag event (mouse move with button pressed)
          if (sourceEvent && sourceEvent.type === 'mousemove' && sourceEvent.buttons === 1) {
            setIsDragging(true);
            
            const currentMousePosition = [sourceEvent.clientX, sourceEvent.clientY];
            if (lastMousePosition.current) {
              const dx = currentMousePosition[0] - lastMousePosition.current[0];
              
              const centerX = width / 2;
              const oldPos = xScaleRef.current.invert(centerX);
              const oldData = dataPoints.find(d => d.start <= oldPos && d.end >= oldPos);
              const newCenterX = centerX - dx;
              const newPos = xScaleRef.current.invert(newCenterX);
              const newData = dataPoints.find(d => d.start <= newPos && d.end >= newPos);
              console.log("centerx", centerX)
              console.log("newcenter", newCenterX)
              console.log("olddata", oldData)
              console.log("newdata", newData)
              if (newData?.i !== oldData?.i && newData?.chromosome == oldData?.chromosome) {
                console.log("current transform", transform)
                let newX = mapXScale(newData?.x)
                let newY = mapYScale(newData?.y)

                console.log("NEWX", newX, "NEWY", newY)
                const mapCenterX = mapWidth/2
                const mapCenterY = mapHeight/2

                const newTransform = {
                  ...transform,
                  x: mapCenterX - newX * transform.k,
                  y: mapCenterY - newY * transform.k,
                  // x: transform.x + (mapWidth/2 - newX) * transform.k,
                  // y: transform.y + (mapHeight/2 - newY) * transform.k,
                };
                console.log("newTransform", newTransform)

                requestAnimationFrame(() => {
                  setTransform(newTransform);
                  setZooming(true);
                });
              }
            }
            lastMousePosition.current = currentMousePosition;
          } else {
            const newK = newTransform.k

            // Calculate the center point of the 2D map
            const centerX = mapWidth / 2;
            const centerY = mapHeight / 2;
            
            // Calculate the new transform for both 1D and 2D views
            const newX = centerX - (centerX - transform.x) * (newK / transform.k);
            const newY = centerY - (centerY - transform.y) * (newK / transform.k);

            const nt = { k: newK, x: newX, y: newY };

            let pos = xScaleRef.current.invert(centerX)
            let data = dataPoints.filter(d => d.start <= pos && d.end >= pos)

            if(data[0] && JSON.stringify(transform) !== JSON.stringify(nt)) {
              requestAnimationFrame(() => {
                setTransform(nt);
                setZooming(true);
              });
            }
          }

        }
      },10)
    }
  }, [
    transform, 
    dataPoints, 
    mapWidth, 
    mapHeight, 
    setTransform, 
    setZooming
  ])

  const zoomBehavior = useMemo(() => {
    const extentMargin = Math.max(width/2, height/2)
    return zoom()
      .extent([
        [0, 0],
        [width, height]
      ])
      .translateExtent([
        [-extentMargin, -extentMargin],
        [width + extentMargin, height + extentMargin]
      ])
    .scaleExtent(zoomExtent)
      .on('zoom', (event) => handleZoomRef.current ? handleZoomRef.current(event) : null)
      .on('end', () => {
        setZooming(false);
      });
  }, [width, height, zoomExtent, setZooming])

  useEffect(() => {
    if (!svgRef.current) return;
    const svg = select(svgRef.current);
    svg.call(zoomBehavior);
    return () => {
      svg.on('.zoom', null);
    };
  }, [zoomBehavior]);

  // update the SVG's transform when the transform changes
  useEffect(() => {
    if(svgRef.current)
      zoomBehavior.transform(select(svgRef.current), zoomIdentity.translate(transform.x, 0).scale(transform.k));
  }, [transform, zoomBehavior]);


  return (
    <div className="linear-genome">
      <svg className="linear-genome-svg" width={width} height={height} 
        ref={svgRef}
        onMouseMove={handleMouseMove}
        onClick={handleMouseClick}
        style={{ cursor: isDragging ? 'grabbing' : 'grab' }}
        >
        {hoverData && <rect pointerEvents="none" width="2" height={height} x={hoverData.sx} fill="black" />}
      </svg>
      <canvas 
        className="linear-genome-canvas"
        width={width + "px"}
        height={height + "px"}
        ref={canvasRef}
        // onMouseMove={handleMouseMove}
        // onClick={handleMouseClick}
      />
      <div style={{
        position: "absolute",
        left: hoverData?.sx + "px",
        top: "5px",
        pointerEvents: "none"
      }} data-tooltip-id="linear-genome-hovered">
      </div>
      {hoverData ? <Tooltip id="linear-genome-hovered"
        isOpen={!!hoverData}
        delayShow={0}
        delayHide={0}
        delayUpdate={0}
        place="top"
        style={{
          position: 'absolute',
          left: hoverData.sx + "px",
          top: "5px",
          pointerEvents: 'none',
        }}
        >
          {defaultContent(hoverData, layer, "")}
        </Tooltip>: null}
    </div>
  )
}
const MemoLinearGenome = memo(LinearGenome)
MemoLinearGenome.displayName = "LinearGenome"

export default MemoLinearGenome