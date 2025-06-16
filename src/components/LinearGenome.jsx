import { useRef, useCallback, useEffect, useMemo, useState, memo } from "react"
import { scaleLinear } from 'd3-scale';
import { extent } from 'd3-array'
import { select } from 'd3-selection';
import { zoom, zoomIdentity } from 'd3-zoom';
import { drag } from 'd3-drag';

import { Tooltip } from 'react-tooltip'
import { createPortal } from 'react-dom';

import Data from '../lib/data';
import scaleCanvas from '../lib/canvas'
import { HilbertChromosome, hilbertPosToOrder } from '../lib/HilbertChromosome';
import { debouncer } from '../lib/debounce'
import { defaultContent } from './Tooltips/Content';
import { getGencodesInView } from '../lib/Genes';

import SelectedStatesStore from '../states/SelectedStates';
import HoverStatesStore from '../states/HoverStates'
import { useZoom } from '../contexts/ZoomContext';
import Loading from './Loading';

const zoomDebounce = debouncer()

import "./LinearGenome.css"

// Uses similar badge rendering logic as in CanvasOrder14Component
const renderBadge = (ctx, d, layer, x, y, w, h) => {
  // Draw background
  ctx.fillStyle = layer.nucleotideColor(d.data.nucleotide);
  ctx.fillRect(x, y, w, h);
  
  // Define corner positions for badges
  const cornerXOffset = w/3;
  const cornerYOffset = h/4;
  const radius = w/10;

  const dataForBadges = [
    { value: d.data.protein_function, color: layer.fieldColor("Protein Function"), x: x + cornerXOffset, y: y + cornerYOffset},
    { value: d.data.clinvar_sig, color: layer.fieldColor("ClinVar Sig"), x: x + w - cornerXOffset, y: y + h - cornerYOffset},
    { value: d.data.conservation, color: layer.fieldColor("Conservation"), x: x + cornerXOffset, y: y + h - cornerYOffset},
    { value: d.data.gwas, color: layer.fieldColor("GWAS"), x: x + w - cornerXOffset, y: y + cornerYOffset}
  ];

  // Render badges
  dataForBadges.forEach((badge) => {
    if (badge.value) {
      ctx.fillStyle = badge.color;
    } else {
      ctx.fillStyle = "#bbb";  // Default badgeColor
    }
    ctx.beginPath();
    ctx.arc(badge.x, badge.y, radius, 0, 2 * Math.PI);
    ctx.fill();
  });
  
  // Render nucleotide text
  ctx.fillStyle = 'black';
  const fontSize = Math.min(w/2, h/3);
  ctx.font = `${fontSize}px monospace`;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(d.data.nucleotide, x + w/2, y + h/2);
}

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
  loading = false,
  onHover = () => {},
  onClick = () => {},
  allowPanning = true,
  showCoordinates = true,
  showCoordinatesInTooltip = true,
  showLayerNameInTooltip = true,
  setTransform: propSetTransform = null,
} = {}) => {

  const { selected } = SelectedStatesStore()
  const { show1DTooltip, setShow1DTooltip } = HoverStatesStore()

  const { 
    transform: zoomTransform, 
    selectedTransform: zoomSelectedTransform,
    order, 
    orderRaw: zoomOrderRaw, 
    selectedOrderRaw: zoomSelectedOrderRaw,
    zoomMin,
    zoomMax,
    orderMin,
    setTransform: zoomSetTransform, 
    setSelectedTransform: zoomSetSelectedTransform,
    handleSelectedZoom,
    orderZoomScale,
    setZooming, 
    panning,
    setPanning,
    center: zoomCenter,
    selectedCenter: zoomSelectedCenter,
  } = useZoom()

  const center = propCenter || !!selected ? zoomSelectedCenter : zoomCenter;
  const orderRaw = propOrderRaw || !!selected ? zoomSelectedOrderRaw : zoomOrderRaw;
  const setTransform  = propSetTransform || !!selected ? zoomSetSelectedTransform : zoomSetTransform;
  const transform = !!selected ? zoomSelectedTransform : zoomTransform;
  const handleZoom = !!selected ? handleSelectedZoom : () => {}

  let zoomExtent = useMemo(() => [zoomMin, zoomMax], [zoomMin, zoomMax])

  let geneHeight, trackHeight, axisHeight;
  if(showCoordinates) {
    geneHeight = useMemo(() => height * .4, [height])
    trackHeight = useMemo(() => height * .4, [height])
    axisHeight = useMemo(() => height * .2, [height])
  } else {
    geneHeight = useMemo(() => height * .5, [height])
    trackHeight = useMemo(() => height * .5, [height])
    axisHeight = 0
  }
  

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
  const dataPointsRef = useRef([])
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
        // ensure scale factor is non-negative so track doesn't invert
        const scaleFactor = Math.max(0, 1 + 3 * diff)
        // Set up the x scale for the whole track
        const bpbw = points[0].end - points[0].start

        // For badges at order 14, use a reduced view window (zoom in)
        const zoomFactor = (layer?.datasetName === "badges" && region.order === 14) ? 0.2 : 1;
        let xExtent = [region.start - targetSize * bpbw * zoomFactor , region.start + targetSize * bpbw * zoomFactor + bpbw]

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
        if(showCoordinates) {
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
        }

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
        ctx.font = "10px monospace"
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
        if(data && layer && data[0] && !!layer.fieldChoice) {
          ctx.globalAlpha = 1  
          const meta = metas?.find((meta) => meta.chromosome === region.chromosome)
          let { min, max, fields } = Data.getDataBounds(meta)
          max = extent(data, d => layer.fieldChoice(d)?.value)[1]
          if(layer.datasetName == "variants_ukbb_94") {
            max = 100
          }

          data.map(d => {
            const sample = layer.fieldChoice(d);
            if(sample && sample.field){
              const x = xScale(d.start);
              const w = Math.max(1, bw - 0.5);
              if(layer.datasetName == "badges" && d.data?.nucleotide) {
                const y = geneHeight;
                const h = trackHeight;
                renderBadge(ctx, d, layer, x, y, w, h)
              } else {
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
                } else {
                  ctx.fillStyle = layer.fieldColor(sample.field)
                }
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
            }
          }) 
        }
        ctx.strokeStyle = "black" 
        ctx.lineWidth = 1;
        ctx.strokeRect(xScale(region.start), geneHeight, bw, trackHeight-1)

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
    orderRaw,
    showCoordinates,
    data
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
    if(!renderPoints || !data) return;
    let missing = []
    let dataPoints = []
    renderPoints.forEach(p => {
      let d = data.find(d => d.chromosome == p.chromosome && d.i == p.i)
      if(d && layer) {
        d['layer'] = layer
      }
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
    const pointsToUse = dataPoints?.length ? dataPoints : missing;
    // check if we need to update
    if(pointsToUse?.length !== dataPointsRef.current?.length) {
      setDataPoints(pointsToUse)
      dataPointsRef.current = pointsToUse
    } else {
      if (
        // checks for empty array of data points
        (pointsToUse.length !== 0) &&
        // checks if the first point is different from the previous iteration
        (
          !(
            (pointsToUse[0].chromosome === dataPointsRef.current[0].chromosome) &&
            (pointsToUse[0].i === dataPointsRef.current[0].i) &&
            (pointsToUse[0].order === dataPointsRef.current[0].order)
          ) || (
            pointsToUse[0].data && !dataPointsRef.current[0].data
          ) || (
            pointsToUse[0].layer?.datasetName !== dataPointsRef.current[0].layer?.datasetName
          )
        )
      ) {
        setDataPoints(pointsToUse)
        dataPointsRef.current = pointsToUse
      }
    }
  }, [data, renderPoints, layer])
  
  useEffect(() => {
    // clear the canvas when layer or data changes
    if (canvasRef.current) {
      const ctx = canvasRef.current.getContext('2d');
      ctx.clearRect(0, 0, width, height);
    }
    if(centerRef.current && data) {
      render(centerRef.current, targetRegions, dataPoints, data.metas, layer, renderPoints, activeRegions) 
    }
  }, [targetRegions, renderPoints, dataPoints, data, layer, render, activeRegions])


  const [hoverData, setHoverData] = useState(null)
  const hoverDataRef = useRef(null)
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

  // reflects changes in hover on 2d map
  useEffect(() => {
    let hd = processHover(hover)
    if(center && panning) {
      hd = processHover(center)
    }
    if(
      !(
        (hd?.chromosome === hoverDataRef.current?.chromosome) && 
        (hd?.i === hoverDataRef.current?.i) && 
        (hd?.order === hoverDataRef.current?.order)
      )
    ) {
      // collect data for point if not already found
      if(!!hd && !hd?.data) {
        let data = dataPoints.find(d => (
          (d.chromosome === hd?.chromosome) &&
          (d.i === hd?.i) &&
          (d.order === hd?.order)
        ))?.data
        hd['data'] = data
      }
      setHoverData(hd)
      hoverDataRef.current = hd
    }
  }, [center, hover, processHover, panning, dataPoints])

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

    if(!show1DTooltip) setShow1DTooltip(true);
    if(xScaleRef.current) {
      const rect = event.target.getBoundingClientRect();
      const ex = event.clientX - rect.x; // x position within the element.
      let x = xScaleRef.current.invert(ex)
      let data = dataPoints.filter(d => d.start <= x && d.end >= x)
      // console.log("mouse move", ex, x, data[0])
      let hd = processHover(data[0])
      if (
        !(
          (hd?.chromosome === hoverDataRef.current?.chromosome) && 
          (hd?.i === hoverDataRef.current?.i) && 
          (hd?.order === hoverDataRef.current?.order)
        )
      ) {
        setHoverData(hd)
        hoverDataRef.current = hd
        onHover(hd)
      }
    }
  }, [dataPoints, processHover, onHover, panning, show1DTooltip, setShow1DTooltip])

  const handleMouseLeave = useCallback(() => {
    setShow1DTooltip(false)
  }, [setShow1DTooltip])

  const handleMouseClick = useCallback((event) => {
    // console.log("clicked", event)
    if(panning) return
    if(xScaleRef.current) {
      const rect = event.target.getBoundingClientRect();
      const ex = event.clientX - rect.x; // x position within the element.
      let x = xScaleRef.current.invert(ex)
      let data = dataPoints.filter(d => d.start <= x && d.end >= x)
      let hd = processHover(data[0])
      // console.log("clicked", hd)
      if(hd) {
        onClick(hd, hd?.order)
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

            // check if panning allowed
            if(!allowPanning) return;

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
                // power relies on zoom level
                handleZoom(orderMin + Math.log2(orderZoomScale(nt.k)))
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
    allowPanning,
    orderMin,
    orderZoomScale,
    handleZoom,
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

  // track the last applied transform
  const lastAppliedTransformRef = useRef(null);
  useEffect(() => {
    if(svgRef.current) {
      // check if the transform is different from the last one we applied
      if (!lastAppliedTransformRef.current || 
          lastAppliedTransformRef.current.k !== transform.k || 
          lastAppliedTransformRef.current.x !== transform.x || 
          lastAppliedTransformRef.current.y !== transform.y) {
        
        // create the new transform
        const newTransform = zoomIdentity.translate(transform.x, 0).scale(transform.k);
        
        // apply it to D3's zoom behavior
        zoomBehavior.transform(select(svgRef.current), newTransform);
        
        // store it as the last applied transform
        lastAppliedTransformRef.current = {...transform};
      } else {
        // otherwise, use orderRaw to create new transform 
        const k = orderZoomScale.invert(Math.pow(2, orderRaw - orderMin));
      
        // create a new transform that maintains x position but updates scale
        const newTransform = zoomIdentity
          .translate(transform.x, transform.y)
          .scale(k);

        zoomBehavior.transform(select(svgRef.current), newTransform);

        // Store it as the last applied transform
        lastAppliedTransformRef.current = {...transform};
      }
    }
  }, [transform, zoomBehavior, orderRaw, orderMin]);

  return (
    <div className="linear-genome">
      {loading && (
        <div className="absolute bg-white bg-opacity-40 inset-0 flex items-center justify-center pointer-events-none transform scale-[1.75]"
        style={{paddingTop: "10px"}}>
          <Loading />
        </div>
      )}
      <svg className="linear-genome-svg" width={width} height={height} 
        ref={svgRef}
        onMouseMove={handleMouseMove}
        onMouseLeave={handleMouseLeave}
        onClick={handleMouseClick}
        style={{ cursor: allowPanning ? panning ? 'grabbing' : 'grab' : 'pointer' }}
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
      {hoverData && show1DTooltip && 
        <>
          <div style={{
            position: "absolute",
            left: hoverData?.sx + "px",
            top: "0px",
            pointerEvents: "none",
            width: "1px",
            height: "1px"
          }} id="linear-genome-tooltip-anchor" />
          
          {createPortal(
            <Tooltip 
              anchorSelect="#linear-genome-tooltip-anchor"
              isOpen={!!hoverData}
              delayShow={0}
              delayHide={0}
              delayUpdate={0}
              place="top"
              offset={0}
              border="1px solid gray"
              style={{
                backgroundColor: "white",
                color: "black",
                fontSize: "12px",
                padding: "6px",
              }}
            >
              {layer ? defaultContent(hoverData, layer, "", showCoordinatesInTooltip, showLayerNameInTooltip) : null}
            </Tooltip>,
            document.body
          )}
        </>
    }
    </div>
  )
}
const MemoLinearGenome = memo(LinearGenome)
MemoLinearGenome.displayName = "LinearGenome"

export default MemoLinearGenome