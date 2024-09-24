import React, { useRef, useEffect, useContext, useState, useMemo, useCallback } from 'react';
import './Spectrum.css';
import genesetOrder from '../../data/genesetOrder2023.json';
import colors from '../../data/spectrumColors.json';
import labels from '../../data/spectrumLabels.json';
import Loading from '../Loading';
import * as d3 from 'd3'
import RegionsContext from '../Regions/RegionsContext';
import scaleCanvas from '../../lib/canvas'
// import Tooltip from './Tooltips/Tooltip';


const Tooltip = ({ tooltipData, position }) => {
  if (!tooltipData) return null;

  let genesetName = tooltipData.genesetName.split("_").slice(1).join(" ").toLowerCase()
  genesetName = genesetName.charAt(0).toUpperCase() + genesetName.slice(1)

  return (
    <div
      className="spectrum-tooltip"
      style={{
        left: position.x + 20 + 'px',
        top: position.y + 'px',
        opacity: 1,
        zIndex: 1,
        minWidth: '200px',
        // backgroundColor: 'white',
        background: "#efefef",
        border: 'solid',
        borderWidth: '1px',
        borderRadius: '5px',
        padding: '10px',
        position: 'absolute',
        display: 'inline',
        fontSize: '16px',
        color: 'black',
      }}
    >
      {/* <div>
        xIndex: <b>{tooltipData.index}</b>
      </div> */}
      <div>
        {genesetName}
      </div>
      {tooltipData.enrichment ? 
        <div>
        -log10(p): {tooltipData.enrichment}
        </div> 
      : null}
    </div>
  );
};


const Spectrum = ({
  show = false,
  windowSize = 100,
  width = 450,
  height = 100,
  xtickMargin = 20,
  plotXStart = xtickMargin,
  plotXStop = width,
  plotYStart = 20,
  spectrumBarHeight = 10,
  plotYStop = height - spectrumBarHeight,
  curveHeight = plotYStop - plotYStart,
  
} = {}) => {

  const SpectrumBar = ({ data, ctx, xScale, y, height, colorbarX }) => {

    // Draw the rectangles for the spectrum bar
    data.forEach((d, i) => {
        ctx.fillStyle = colorbarX(i);
        ctx.fillRect(xScale(i), y, xScale(1) - xScale(0), height);
    });
  };

  const Curve = ({ data, ctx, xScale, yScale, height, color }) => {

    // Function to draw the y-axis with ticks
    const drawYAxis = (ctx, yScale, yAxisStart, yAxisStop, tickCount = 6) => {
      const tickInterval = (yAxisStop - yAxisStart) / tickCount;
      const tickLength = 5; // Length of the tick marks

      ctx.strokeStyle = '#000'; // Axis color
      ctx.lineWidth = 1;

      // Draw the y-axis line
      ctx.beginPath();
      ctx.moveTo(xScale(0), yAxisStart);
      ctx.lineTo(xScale(0), yAxisStop);
      ctx.stroke();

      const maxValue = Math.max(...data);
      const minValue = Math.min(...data);
      const step = Math.ceil((maxValue - minValue) / (tickCount));
      const yTicks = Array.from({ length: tickCount }, (v, i) => minValue + i * step);
      
      // Draw the ticks and labels
      yTicks.forEach((value, i) => {
        const y = yScale(value)
        // console.log("value", value)

        ctx.beginPath();
        ctx.moveTo(xScale(0) - tickLength, y);
        ctx.lineTo(xScale(0), y);
        ctx.stroke();

        ctx.fillStyle = '#000'; // Label color
        ctx.textAlign = 'right';
        ctx.textBaseline = 'middle';
        ctx.fillText(Math.floor(value), xScale(0) - tickLength - 2, y);
      })
    };

    // Draw the y-axis
    drawYAxis(ctx, yScale, yScale(Math.max(...data)), yScale(0), Math.min(6, Math.max(...data) + 1));
  
    // Draw the curve
    data.forEach((d, i) => {
      if (d) {
        ctx.fillStyle = color;
        ctx.globalAlpha = 1;
        ctx.fillRect(xScale(i), yScale(d), xScale(1) - xScale(0), height - yScale(d));
      }
    });
  };

  const Labels = ({ labels, ctx, xScale }) => {
    ctx.font = '9px Arial';
    ctx.fillStyle = '#000';
    ctx.textAlign = "left";
    ctx.textBaseline = "top";

    labels.forEach((d, i) => {
      ctx.fillText(d.label, xScale(d.i), 0);
    });

  }

  const { activeGenesetEnrichment } = useContext(RegionsContext)
  // console.log("activeGenesetEnrichment", activeGenesetEnrichment)

  const [enrichments, setEnrichments] = useState(new Array(genesetOrder.length).fill(0));
  const [smoothData, setSmoothData] = useState(new Array(genesetOrder.length).fill(0));

  const [tooltipData, setTooltipData] = useState(null);
  const [tooltipPosition, setTooltipPosition] = useState({ x: 0, y: 0 });

  
  useEffect(() => {
    if(activeGenesetEnrichment?.length) {

      // console.time("INIT")
      let enrichments = new Array(genesetOrder.length).fill(0)
      let enrichmentsMax = new Array(genesetOrder.length).fill(0)
      let enrichmentsSmooth = new Array(genesetOrder.length).fill(0)
      // console.timeEnd("INIT")

      // console.time("FILL")
      activeGenesetEnrichment.forEach((d) => enrichments[genesetOrder.indexOf(d.geneset)] = -Math.log10(d.p))
      setEnrichments(enrichments)
      // console.timeEnd("FILL")
      // console.log("FILL", Math.max(...enrichments))
      
      // console.time("MAX")
      enrichments.forEach((e, i) => {
        let startIndex = Math.max(0, i - windowSize / 2);
        let endIndex = Math.min(enrichments.length, i + windowSize / 2);
        let enrichmentsInWindow = enrichments.slice(startIndex, endIndex);
        enrichmentsMax[i] = Math.max(...enrichmentsInWindow);
      });
      // console.timeEnd("MAX")
      // console.log("MAX", Math.max(...enrichmentsMax))

      // console.time("SMOOTH")
      enrichmentsMax.forEach((e, i) => {
        let startIndex = Math.max(0, i - windowSize / 2);
        let endIndex = Math.min(enrichments.length, i + windowSize / 2);
        let enrichmentsMaxInWindow = enrichmentsMax.slice(startIndex, endIndex);
        enrichmentsSmooth[i] = enrichmentsMaxInWindow.reduce((a, b) => a + b) / enrichmentsMaxInWindow.length;
      });
      // console.timeEnd("SMOOTH")
      // console.log("SMOOTH", Math.max(...enrichmentsSmooth))

      setSmoothData(enrichmentsSmooth)
    } else {
      setEnrichments(new Array(genesetOrder.length).fill(0))
      setSmoothData(new Array(genesetOrder.length).fill(0))
    }

  }, [activeGenesetEnrichment, genesetOrder, windowSize]);

  const handleMouseLeave = () => {
    setTooltipData(null);
  };

  const handleMouseClick = () => {
    // setQueryGeneset(tooltipData.genesetName);
    console.log(tooltipData.genesetName)
  };

  const xScale = useMemo(() => i => plotXStart + (i / (genesetOrder.length - 1)) * (plotXStop - plotXStart), [plotXStart, plotXStop, genesetOrder.length]);
  const xScaleInvert = useMemo(() => x => (x - plotXStart) / (plotXStop - plotXStart) * (genesetOrder.length - 1), [plotXStart, plotXStop, genesetOrder.length]);
  const yScale = useMemo(() => d => plotYStart + (curveHeight) * (1 - (d / Math.max(...smoothData))), [smoothData, plotYStart, curveHeight]);
  // const yScaleInvert = useMemo(() => y => (1 - (y - plotYStart) / curveHeight) * Math.max(...smoothData), [plotYStart, curveHeight, smoothData]);

  const colorbarX = useMemo(() => {
    return (i) => {
      let c = colors[i % colors.length];
      let r = Math.round(c[0] * 255);
      let g = Math.round(c[1] * 255);
      let b = Math.round(c[2] * 255);
      let rgbColor = `rgb(${r}, ${g}, ${b})`;
      let hsl = d3.hsl(rgbColor);
      hsl.l = 0.5;
      return hsl.toString();
    };
  }, [colors]);

  
  // for tooltip
  const handleMouseMove = useCallback((e) => {
    if(!enrichments?.length) return //!xScaleRef.current || 
    const { clientX } = e;
    const rect = e.target.getBoundingClientRect();
    const x = clientX - rect.x; // x position within the element.

    const xIndex = Math.floor(xScaleInvert(x))
    if (xIndex >= 0 && xIndex < genesetOrder.length) {
      const hoverWindowSize = 50;
      let startIndex = Math.max(0, xIndex - hoverWindowSize / 2);
      let endIndex = Math.min(enrichments.length, xIndex + hoverWindowSize / 2);
      let windowValues = enrichments.slice(startIndex, endIndex);

      let topIndexInWindow = windowValues.map((v, i) => ({score: v, index: i + startIndex})).sort((a, b) => b.score - a.score)[0]
      const genesetName = genesetOrder[topIndexInWindow.index];
      const enrichment = topIndexInWindow.score;

      setTooltipData({ index: topIndexInWindow.index, genesetName, enrichment: Math.round(enrichment * 10000) / 10000 });
      setTooltipPosition({ x: e.clientX - rect.x, y: e.clientY - rect.y - 75 });
    }

  }, [enrichments])

  // create canvas
  const canvasRef = useRef(null);
  useEffect(() => {
    scaleCanvas(canvasRef.current, canvasRef.current.getContext("2d"), width, height)
  }, [canvasRef, width, height])

  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');

    // Clear the canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // add items to canvas
    SpectrumBar({ data: smoothData, ctx, xScale, y: plotYStop, height: spectrumBarHeight, colorbarX });
    Curve({ data: smoothData, ctx, xScale, yScale, height: plotYStop, color: "#000" });
    Labels({ labels, ctx, xScale });
  
  }, [smoothData, xScale, yScale, plotYStop, spectrumBarHeight, colorbarX, labels]);

  // console.log("Spectrum render")
  return (
    <div className={"spectrum-component" + (show ? " show": " hide")} style={{ height: height + 'px', width: width + 'px' }}>
      <div style={{ position: 'relative' }}>

        {/* <YTicks data={smoothData} yScale={yScale} xScale={xScale} height={height} numTicks={5} /> */}
        <canvas ref={canvasRef} width={width} height={height} onMouseMove={handleMouseMove} onMouseLeave={handleMouseLeave} onMouseDown={handleMouseClick}/>
        <Tooltip tooltipData={tooltipData} position={tooltipPosition} />

      </div>
    </div>
  );
};

export default React.memo(Spectrum);