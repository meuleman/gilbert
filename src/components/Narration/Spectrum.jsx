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


const Tooltip = ({ geneset, x, y, visible }) => {
  if (!visible || !geneset) return null;
  let genesetName = geneset.geneset.split("_").slice(1).join(" ").toLowerCase()
  genesetName = genesetName.charAt(0).toUpperCase() + genesetName.slice(1)
  let enrichment = Math.round(geneset.score * 10000) / 10000

  const tooltipRef = useRef();

  const content = (
  <div>
    <div>
      {genesetName}
    </div>
    {(enrichment > 0) &&
      <div>
        -log10(p): {enrichment}
      </div> 
    }
  </div>)

  useEffect(() => {
    if (tooltipRef.current) {
      tooltipRef.current.style.left = `${x + 20}px`;
      tooltipRef.current.style.bottom = `${y}px`;
      tooltipRef.current.style.display = visible ? 'block' : 'none';
      tooltipRef.current.style.minWidth = '200px';
      tooltipRef.current.style.background = "#efefef";
      tooltipRef.current.style.border = 'solid';
      tooltipRef.current.style.borderWidth = '1px';
      tooltipRef.current.style.borderRadius = '5px';
      tooltipRef.current.style.padding = '10px';
      // tooltipRef.current.style.position = 'absolute';
      // tooltipRef.current.style.display = 'inline';
      tooltipRef.current.style.fontSize = '16px';
      tooltipRef.current.style.color = 'black';
    }
  }, [x, y, visible]);

  return (
    <div ref={tooltipRef} style={{ position: 'absolute', background: '#fff', border: '1px solid #ccc', padding: '5px', pointerEvents: 'none' }}>
      {content}
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
    const drawYAxis = (ctx, yScale, yAxisStart, yAxisStop, estTickCount = 6) => {
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
      const step = Math.ceil((maxValue - minValue) / (estTickCount));
      const yTicks = Array.from({ length: estTickCount }, (v, i) => minValue + i * step).filter(d => d <= maxValue);
      
      // Draw the ticks and labels
      yTicks.forEach((value) => {
        const y = yScale(value)

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

  const Membership = ({membership, genesetOrder, data, ctx, xScale, yScale, height, barWidth, color}) => {
    console.log("geneset membership length", membership.length)
    membership.forEach((d) => {
      if (d.geneset) {
        let i = genesetOrder.indexOf(d.geneset);
        if(i >= 0) {
          let value = data[i];
          ctx.fillStyle = color;
          ctx.globalAlpha = 1;
          ctx.fillRect(xScale(i), yScale(value), xScale(barWidth) - xScale(0), height - yScale(value));
        }
      }
    });
  }

  const Labels = ({ labels, ctx, xScale }) => {
    ctx.font = '9px Arial';
    ctx.fillStyle = '#000';
    ctx.textAlign = "left";
    ctx.textBaseline = "top";

    labels.forEach((d, i) => {
      ctx.fillText(d.label, xScale(d.i), 0);
    });

  }

  const { activeGenesetEnrichment, selectedGenesetMembership } = useContext(RegionsContext)
  // console.log("activeGenesetEnrichment", activeGenesetEnrichment)

  const [enrichments, setEnrichments] = useState(new Array(genesetOrder.length).fill(0));
  const [smoothData, setSmoothData] = useState(new Array(genesetOrder.length).fill(0));

  const [tooltip, setTooltip] = useState({ content: null, x: 0, y: 0, visible: false });

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

  }, [activeGenesetEnrichment, selectedGenesetMembership, genesetOrder, windowSize]);

  // const handleMouseClick = () => {
  //   // setQueryGeneset(tooltipData.genesetName);
  //   console.log(tooltipData.genesetName)
  // };

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
    Membership({ membership: selectedGenesetMembership, genesetOrder, data: smoothData, ctx, xScale, yScale, height: plotYStop, barWidth: 10, color: "#F00" });
    Labels({ labels, ctx, xScale });

    const handleMouseMove = (e) => {
      const rect = canvas.getBoundingClientRect();
      const mouseX = e.clientX - rect.left;
      const mouseY = e.clientY - rect.top;
      
      // determine which section of spectrum is hovered over and adjust content accordingly
      if (isHoveringSpectrumBar(mouseX, mouseY)) {  // colorbar
        let geneset = determineGeneset(mouseX)
        // set the enrichment score to 0 so it will not be shown
        geneset['score'] = 0
        setTooltip({ content: geneset, x: mouseX, y: height - mouseY, visible: true });
      } else if (isHoveringCurve(mouseX, mouseY, smoothData)) {  // curve
        let geneset = determineGeneset(mouseX)
        if(geneset.score !== 0) {
          setTooltip({ content: geneset, x: mouseX, y: height - mouseY, visible: true });
        } else {
          handleMouseLeave();
        }
      } else {
        handleMouseLeave();
      }
    }

    const handleMouseLeave = () => {
      setTooltip({ content: null, x: 0, y: 0, visible: false });
    };

    canvas.addEventListener('mousemove', handleMouseMove);
    canvas.addEventListener('mouseleave', handleMouseLeave);
    
    return () => {
      canvas.removeEventListener('mousemove', handleMouseMove);
      canvas.removeEventListener('mouseleave', handleMouseLeave);
    };
  }, [smoothData, xScale, yScale, plotYStop, spectrumBarHeight, colorbarX, labels]);

  // determines if mouse hovering over spectrum color bar
  const isHoveringSpectrumBar = (x, y) => {
    return x >= plotXStart && x <= plotXStop && y >= plotYStop && y <= height
  };

  // determines if mouse hovering over spectrum curve
  const isHoveringCurve = (x, y, data) => {
    // ensure that the y value is within the curve
    const index = Math.floor(xScaleInvert(x))
    if (index >= 0 && index < data.length) {
      const yValue = yScale(data[index])
      return x >= plotXStart && x <= plotXStop && y >= yValue && y <= plotYStop
    } else {
      return false
    }
  }

  // determines geneset to show on hover given the x position
  const determineGeneset = (x) => {
    const index = Math.floor(xScaleInvert(x))
    if (index >= 0 && index < genesetOrder.length) {
      const hoverWindowSize = 50;
      let startIndex = Math.max(0, index - hoverWindowSize / 2);
      let endIndex = Math.min(enrichments.length, index + hoverWindowSize / 2);
      let windowValues = enrichments.slice(startIndex, endIndex);
      
      let topIndexInWindow = {score: 0, index: index}
      if(Math.max(...windowValues) !== 0) {
        topIndexInWindow = windowValues.map((v, i) => ({score: v, index: i + startIndex})).sort((a, b) => b.score - a.score)[0]
      }
      topIndexInWindow['geneset'] = genesetOrder[topIndexInWindow.index]
      return topIndexInWindow
    } else {
      return null
    }
  }

  // console.log("Spectrum render")
  return (
    <div className={"spectrum-component" + (show ? " show": " hide")} >
      <div style={{ position: 'relative', width: width + 'px', height: height + 'px' }}>
        <canvas ref={canvasRef} width={width} height={height}/>
        <Tooltip geneset={tooltip.content} x={tooltip.x} y={tooltip.y} visible={tooltip.visible} />

      </div>
    </div>
  );
};

export default React.memo(Spectrum);