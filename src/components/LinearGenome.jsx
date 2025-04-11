import { useRef, useCallback, useEffect, useMemo, useState, memo } from "react"
import { scaleLinear } from 'd3-scale';
import { extent } from 'd3-array'
import { select } from 'd3-selection';
import { zoom, zoomIdentity } from 'd3-zoom';
import { drag } from 'd3-drag';

import { Tooltip } from 'react-tooltip'

import Data from '../lib/data';
import scaleCanvas from '../lib/canvas'
import { HilbertChromosome, hilbertPosToOrder } from '../lib/HilbertChromosome';
import { debouncer } from '../lib/debounce'
import { defaultContent } from './Tooltips/Content';
import { getGencodesInView } from '../lib/genes';

import { useZoom } from '../contexts/zoomContext';

const zoomDebounce = debouncer()

import "./LinearGenome.css"

const LinearGenome = ({
  center: propCenter = null, // center of the view, a region
  orderRaw: propOrderRaw = null,
  hover = null,
  data = [],
  dataOrder = null,
  activeRegions = new Map(),
  layer = null,
  width = 640,
  height = 100,
  mapWidth = 640,
  mapHeight = 640,
  onHover = () => {},
  onClick = () => {}
} = {}) => {

  const { 
    transform, 
    order, 
    orderZoomScale, 
    orderRaw: zoomOrderRaw, 
    zoomMin,
    zoomMax,
    setTransform, 
    zooming, 
    setZooming, 
    panning,
    setPanning,
    center: zoomCenter,
    setCenter
  } = useZoom()

  const center = propCenter || zoomCenter;
  const orderRaw = propOrderRaw || zoomOrderRaw;

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

  const render = useCallback((region, targetSize, data, metas, layer, points, activeRegions) => {
    if(canvasRef.current){
      // console.log("order zoom", order, transform.k, orderRaw)

      const ctx = canvasRef.current.getContext('2d');
      ctx.clearRect(0, 0, width, height)

      //  && Math.floor(orderRaw) == order && order == dataOrder
      if(region && points && points.length) {
        // figure out scale factor
        const diff = orderRaw - region.order
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

        let bw = xScale(points[0].end) - xScale(points[0].start)
        if(bw < 0) bw = 0
        xScaleRef.current = xScale

        // Render the background points
        ctx.strokeStyle = "gray"
        ctx.lineWidth = 0.5
        // ctx.fillStyle = "white"

        points.forEach(p => {
          ctx.beginPath();
          ctx.moveTo(xScale(p.start)+0.75, trackHeight + geneHeight)
          ctx.lineTo(xScale(p.end)+0.75, trackHeight + geneHeight)
          ctx.stroke()
        //   ctx.fillRect(xScale(p.start)+0.75, geneHeight, bw-1.5, trackHeight)
        //   if(bw-1.5 > 1.5) {
        //     ctx.strokeRect(xScale(p.start)+0.75, geneHeight, bw-1.5, trackHeight)
        //   }
        })
        

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

        // Render the active regions
        if(activeRegions.size) {
          let o = region.order
          // for each region in view, lets see if it shows up in the rbos
          const inTop = points.map(d => {
            let di = d.i
            if(d.order > o) {
              di = hilbertPosToOrder(d.i, {from: d.order, to: o}) 
            }
            let t = activeRegions.get(d.chromosome + ":" + di)
            if(t) {
              return {...d, path: { 
                i: d.i,
                count: t.length
              }}
            } else {
              return null
            }
          }).filter(d => d)
          // console.log("inTop", inTop)

          // render the active regions
          inTop.map(d => {
            ctx.fillStyle = "orange"
            ctx.beginPath();
            ctx.arc(Math.round(xScale(d.start) + bw/2), geneHeight + trackHeight + 4, bw/4, 0, 2 * Math.PI);
            ctx.fill();
          })
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
    orderRaw
  ])

  // we update the renderpoints when the center changes
  // we also track the centerRef that updates as long as we are in the same data order
  const centerRef = useRef(null)
  const renderPointsRef = useRef(null)
  useEffect(() => {
    // don't update the points if the center has advanced past the data order
    if(!center || center.order !== dataOrder) return
    centerRef.current = center
    const hilbert = new HilbertChromosome(center.order)
    let li = Math.max(center.i - targetRegions, 0)
    let ri = Math.min(center.i + targetRegions, Math.pow(4, center.order))
    let newLeftPoints = hilbert.fromRange(center.chromosome, li, center.i - 1)
    let newRightPoints = hilbert.fromRange(center.chromosome, center.i + 1, ri)
    let points = newLeftPoints.concat([center]).concat(newRightPoints)
    setRenderPoints(points)
    renderPointsRef.current = points
  }, [center, targetRegions, dataOrder])

  // TODO: please doublecheck
  // when data changes, we want to match them to the current 1D points
  useEffect(() => {
    if(!renderPointsRef.current || !data) return
    let missing = []
    let dataPoints = []
    renderPointsRef.current.forEach(p => {
      let d = data.find(d => d.chromosome == p.chromosome && d.i == p.i)
      if(d) {
        dataPoints.push(d)
      } else {
        missing.push(p)
      }
    })
    if(missing.length) {
      // console.log("missing", missing)
    }
    // console.log("set data points")
    // if empty order, still show points without layer data
    dataPoints?.length ? setDataPoints(dataPoints) : setDataPoints(missing)
  }, [data])
  
  useEffect(() => {
    // clear the canvas when layer or data changes
    if (canvasRef.current) {
      const ctx = canvasRef.current.getContext('2d');
      ctx.clearRect(0, 0, width, height);
    }
    if(centerRef.current && data && data.metas) {
      render(centerRef.current, targetRegions, dataPoints, data.metas, layer, renderPoints, activeRegions) 
    }
  }, [targetRegions, renderPoints, dataPoints, data, layer, render, activeRegions])


  const [hoverData, setHoverData] = useState(null)
  // const [bandwidth, setBandwidth] = useState(1)

  const processHover = useCallback((hover) =>{
    let hd = null
    if(hover && xScaleRef.current) {
      let chrmatch = hover.chromosome !== renderPointsRef.current?.[0]?.chromosome
      if(chrmatch) return null
      let bw = xScaleRef.current(hover.end) - xScaleRef.current(hover?.start)
      if(bw < 0) bw = 0;
      let sx = xScaleRef.current(hover.start) + bw/2
      // we allow for hover thats out of range to indicate at the edges
      if(sx < 0) sx = 0
      if(sx > width) sx = width
      let gs = getGencodesInView([hover], dataOrder, 100000000)
      // console.log("HOVER", hover)
      let actives = activeRegions.get(hover.chromosome + ":" + hover.i)
      hd = {
        ...hover,
        actives,
        sx,
        bw,
        genes: gs
      }
    }
    return hd
  }, [width, dataOrder, activeRegions])

  useEffect(() => {
    // console.log("hover updated")
    let hd = processHover(hover)
    if(center && panning) {
      hd = processHover(center)
    }
    setHoverData(hd)
  }, [center, hover, processHover, panning])

  const zoom2D = useCallback((hit) => {
    let newX = mapXScale(hit?.x)
    let newY = mapYScale(hit?.y)

    const mapCenterX = mapWidth/2
    const mapCenterY = mapHeight/2

    const newTransform = {
      ...transform,
      x: mapCenterX - newX * transform.k,
      y: mapCenterY - newY * transform.k,
    };
    return newTransform
  }, [mapWidth, mapHeight, mapXScale, mapYScale, transform])

  const handleMouseMove = useCallback((event) => {
    if(panning) return
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
  }, [dataPoints, processHover, onHover, panning])

  const handleMouseClick = useCallback((event) => {
    console.log("clicked", event)
    if(panning) return
    if(xScaleRef.current) {
      const rect = event.target.getBoundingClientRect();
      const ex = event.clientX - rect.x; // x position within the element.
      let x = xScaleRef.current.invert(ex)
      let data = dataPoints.filter(d => d.start <= x && d.end >= x)
      let hd = processHover(data[0])
      console.log("clicked", hd)
      // onClick(hd, hd.order)
      if(hd) {
        const newTransform = zoom2D(hd)
        setTransform(newTransform)
      }
    }
  }, [dataPoints, processHover, zoom2D, setTransform, panning])

  const svgRef = useRef(null);
  const handleZoomRef = useRef(null);

  const dragAnchor = useRef(null);

  // const handleZoom = useCallback((event) => {
  useEffect(() => {
    handleZoomRef.current = (event) => {
      zoomDebounce(() => new Promise((resolve, reject) => {resolve()}), () => {
        if(dataPoints?.length && xScaleRef.current) {
          const { transform: newTransform, sourceEvent } = event;
          // console.log("1D handleZoomRef")
          
          // Check if this is a drag event (mouse move with button pressed)
          // If we drag, we are updating the 2D map center based on the data point 
          if (sourceEvent && sourceEvent.type === 'mousemove' && sourceEvent.buttons === 1) {
            setPanning(true);
            setZooming(true);
            
            const currentMousePosition = [sourceEvent.clientX, sourceEvent.clientY];
            if (!dragAnchor.current) {
              dragAnchor.current = currentMousePosition
            }

            // console.log("1d dragging", dragAnchor.current[0], currentMousePosition[0])

            const dx = currentMousePosition[0] - dragAnchor.current[0];
          
            const centerX = width / 2;
            const oldPos = xScaleRef.current.invert(centerX);
            const oldData = dataPoints.find(d => d.start <= oldPos && d.end >= oldPos);
            const newCenterX = centerX - dx;
            const newPos = xScaleRef.current.invert(newCenterX);
            const newData = dataPoints.find(d => d.start <= newPos && d.end >= newPos);
            if (newData?.i !== oldData?.i && newData?.chromosome == oldData?.chromosome) {
              // console.log("dragging", newData, oldData)
              const newTransform = zoom2D(newData)
              dragAnchor.current[0] += dx

              requestAnimationFrame(() => {
                setTransform(newTransform);
                // let hd = processHover(newData)
                // console.log("dragging hd", hd)
                // setHoverData(hd)
                // onHover(hd)
              });
            }
          } else {
            // handling the zoom via scroll
            console.log("1d zooming")
            dragAnchor.current = null;
            setPanning(false);
            setZooming(true);

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
              });
            }
          }

        }
      },1)
    }
  }, [
    transform, 
    dataPoints, 
    width,
    mapWidth,
    mapHeight,
    setTransform, 
    setZooming,
    zoom2D,
    setPanning,
    onHover,
    processHover,
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
      .on('zoom', (event) => handleZoomRef.current && event.sourceEvent ? handleZoomRef.current(event) : null)
      .on('end', (event) => {
        // console.log("1d zoom end", event)
        if(event.sourceEvent) {
          setZooming(false);
          setPanning(false);
          dragAnchor.current = null;
        }
      });
  }, [width, height, zoomExtent, setZooming, setPanning])

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
    if(svgRef.current) {
      zoomBehavior.transform(select(svgRef.current), zoomIdentity.translate(transform.x, 0).scale(transform.k));
    }
  }, [transform, zoomBehavior]);


  return (
    <div className="linear-genome">
      <svg className="linear-genome-svg" width={width} height={height} 
        ref={svgRef}
        onMouseMove={handleMouseMove}
        onClick={handleMouseClick}
        style={{ cursor: panning ? 'grabbing' : 'grab' }}
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
        border="1px solid gray"
        style={{
          position: 'absolute',
          left: hoverData.sx + "px",
          top: "5px",
          pointerEvents: 'none',
          backgroundColor: "white",
          color: "black",
          fontSize: "12px",
          padding: "6px",
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