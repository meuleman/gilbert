import React, { useRef, useEffect, useContext, useState, useMemo, useCallback } from 'react';
import './Spectrum.css';
import genesetOrder from '../../data/genesetOrder2023.json';
import colors from '../../data/spectrumColors.json';
import labels from '../../data/spectrumLabels.json';
import Loading from '../Loading';
import * as d3 from 'd3';
import RegionsContext from '../Regions/RegionsContext';
import SelectedStatesStore from '../../states/SelectedStates';
import scaleCanvas from '../../lib/canvas';

const Tooltip = ({ geneset, x, y, visible, width }) => {
  if (!visible || !geneset) return null;
  let genesetName = geneset.geneset.split("_").slice(1).join(" ").toLowerCase();
  genesetName = genesetName.charAt(0).toUpperCase() + genesetName.slice(1);
  let enrichment = Math.round(geneset.score * 10000) / 10000;
  const positionLeft = (geneset?.index / genesetOrder.length) < 0.5;
  const tooltipRef = useRef();

  const content = (
    <div>
      <div>{genesetName}</div>
      {(enrichment > 0) && (
        <div>-log10(p): {enrichment}</div>
      )}
    </div>
  );

  useEffect(() => {
    if (tooltipRef.current) {
      tooltipRef.current.style.left = 'auto';
      tooltipRef.current.style.right = 'auto';
      positionLeft 
        ? tooltipRef.current.style.left = `${x}px` 
        : tooltipRef.current.style.right = `${width - x}px`;
      tooltipRef.current.style.bottom = `${y}px`;
      tooltipRef.current.style.display = visible ? 'block' : 'none';
      tooltipRef.current.style.minWidth = '150px';
      tooltipRef.current.style.maxWidth = `${width / 2}px`;
      tooltipRef.current.style.background = "#efefef";
      tooltipRef.current.style.border = 'solid';
      tooltipRef.current.style.borderWidth = '1px';
      tooltipRef.current.style.borderRadius = '5px';
      tooltipRef.current.style.padding = '5px';
      tooltipRef.current.style.fontSize = '12px';
      tooltipRef.current.style.color = 'black';
    }
  }, [x, y, visible, positionLeft, width]);

  return (
    <div ref={tooltipRef} style={{ position: 'absolute', background: '#fff', border: '1px solid #ccc', padding: '5px', pointerEvents: 'none' }}>
      {content}
    </div>
  );
};

const Spectrum = ({
  show = false,
  windowSize = 10,
  width = 450,
  height = 100,
  xtickMargin = 20,
  plotXStart = xtickMargin,
  plotXStop = width,
  plotYStart = 20,
  spectrumBarHeight = 10,
  plotYStop = height - spectrumBarHeight,
  curveHeight = (height - spectrumBarHeight) - plotYStart,
} = {}) => {

  const SpectrumBar = ({ data, ctx, xScale, y, height, colorbarX }) => {
    data.forEach((d, i) => {
      ctx.fillStyle = colorbarX(i);
      ctx.fillRect(xScale(i), y, xScale(i + 1) - xScale(i), height);
    });
  };

  const Curve = ({ data, ctx, xScale, yScale, height, color }) => {
    const drawYAxis = (ctx, yScale, yAxisStart, yAxisStop, estTickCount = 6) => {
      const tickLength = 5; 
      ctx.strokeStyle = '#000';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(xScale(0), yAxisStart);
      ctx.lineTo(xScale(0), yAxisStop);
      ctx.stroke();

      const maxValue = Math.max(...data);
      const minValue = Math.min(...data);
      const step = Math.ceil((maxValue - minValue) / estTickCount);
      const yTicks = Array.from({ length: estTickCount }, (v, i) => minValue + i * step).filter(d => d <= maxValue);
      
      yTicks.forEach((value) => {
        const yCoord = yScale(value);
        ctx.beginPath();
        ctx.moveTo(xScale(0) - tickLength, yCoord);
        ctx.lineTo(xScale(0), yCoord);
        ctx.stroke();

        ctx.fillStyle = '#000';
        ctx.textAlign = 'right';
        ctx.textBaseline = 'middle';
        ctx.fillText(Math.floor(value), xScale(0) - tickLength - 2, yCoord);
      });
    };

    drawYAxis(ctx, yScale, yScale(Math.max(...data)), yScale(0), Math.min(6, Math.max(...data) + 1));
  
    data.forEach((d, i) => {
      if (d) {
        ctx.fillStyle = color;
        ctx.globalAlpha = 1;
        ctx.fillRect(xScale(i), yScale(d), xScale(i + 1) - xScale(i), height - yScale(d));
      }
    });
  };

  const Membership = ({ membership, genesetOrder, data, ctx, xScale, yScale, height, barWidth, color }) => {
    membership.forEach((d) => {
      if (d.geneset) {
        const i = genesetOrder.indexOf(d.geneset);
        if(i >= 0) {
          const value = data[i];
          ctx.fillStyle = color;
          ctx.globalAlpha = 1;
          ctx.fillRect(xScale(i), yScale(value), xScale(i + barWidth) - xScale(i), height - yScale(value));
        }
      }
    });
  };

  const Labels = ({ labels, ctx, xScale }) => {
    ctx.font = '7px Arial';
    ctx.fillStyle = '#000';
    ctx.textAlign = "left";
    ctx.textBaseline = "top";
    labels.forEach((d) => {
      ctx.fillText(d.label, xScale(d.i), 0);
    });
  };

  const { activeGenesetEnrichment } = useContext(RegionsContext);
  const { selectedGenesetMembership } = SelectedStatesStore();

  const [enrichments, setEnrichments] = useState(new Array(genesetOrder.length).fill(0));
  const [smoothData, setSmoothData] = useState(new Array(genesetOrder.length).fill(0));
  const [tooltip, setTooltip] = useState({ content: null, x: 0, y: 0, visible: false });

  useEffect(() => {
    if(activeGenesetEnrichment?.length) {
      const newEnrichments = new Array(genesetOrder.length).fill(0);
      const enrichmentsMax = new Array(genesetOrder.length).fill(0);
      const enrichmentsSmooth = new Array(genesetOrder.length).fill(0);

      activeGenesetEnrichment.forEach((d) => {
        newEnrichments[genesetOrder.indexOf(d.geneset)] = -Math.log10(d.p);
      });
      setEnrichments(newEnrichments);

      newEnrichments.forEach((e, i) => {
        const startIndex = Math.max(0, i - windowSize / 2);
        const endIndex = Math.min(newEnrichments.length, i + windowSize / 2);
        const windowArr = newEnrichments.slice(startIndex, endIndex);
        enrichmentsMax[i] = Math.max(...windowArr);
      });

      enrichmentsMax.forEach((e, i) => {
        const startIndex = Math.max(0, i - windowSize / 2);
        const endIndex = Math.min(enrichmentsMax.length, i + windowSize / 2);
        const windowArr = enrichmentsMax.slice(startIndex, endIndex);
        enrichmentsSmooth[i] = windowArr.reduce((a, b) => a + b, 0) / windowArr.length;
      });
      setSmoothData(enrichmentsSmooth);
    } else {
      setEnrichments(new Array(genesetOrder.length).fill(0));
      setSmoothData(new Array(genesetOrder.length).fill(0));
    }
  }, [activeGenesetEnrichment, selectedGenesetMembership, windowSize]);

  // Using d3.scaleLinear for the x and y scales
  const xScale = useMemo(() => {
    return d3.scaleLinear()
      .domain([0, genesetOrder.length - 1])
      .range([plotXStart, plotXStop]);
  }, [plotXStart, plotXStop]);

  const xScaleInvert = useCallback((x) => {
    return Math.floor(d3.scaleLinear()
      .domain([plotXStart, plotXStop])
      .range([0, genesetOrder.length - 1])(x));
  }, [plotXStart, plotXStop]);

  const yScale = useMemo(() => {
    const maxSmooth = Math.max(...smoothData) || 1;
    // invert range: larger value -> lower y position
    return d3.scaleLinear()
      .domain([0, maxSmooth])
      .range([plotYStop, plotYStart]);
  }, [smoothData, plotYStart, plotYStop]);

  const colorbarX = useMemo(() => (i) => {
    const c = colors[i % colors.length];
    const r = Math.round(c[0] * 255);
    const g = Math.round(c[1] * 255);
    const b = Math.round(c[2] * 255);
    const rgbColor = `rgb(${r}, ${g}, ${b})`;
    const hsl = d3.hsl(rgbColor);
    hsl.l = 0.5;
    return hsl.toString();
  }, []);

  const canvasRef = useRef(null);
  useEffect(() => {
    scaleCanvas(canvasRef.current, canvasRef.current.getContext("2d"), width, height);
  }, [width, height]);

  // Memoize mouse event handlers
  const handleMouseLeave = useCallback(() => {
    setTooltip({ content: null, x: 0, y: 0, visible: false });
  }, []);

  const determineGeneset = useCallback((x) => {
    const index = xScaleInvert(x);
    if (index >= 0 && index < genesetOrder.length) {
      const hoverWindowSize = 50;
      const startIndex = Math.max(0, index - hoverWindowSize / 2);
      const endIndex = Math.min(enrichments.length, index + hoverWindowSize / 2);
      const windowValues = enrichments.slice(startIndex, endIndex);
      let topIndexInWindow = { score: 0, index: index };
      if (Math.max(...windowValues) !== 0) {
        topIndexInWindow = windowValues
          .map((v, i) => ({ score: v, index: i + startIndex }))
          .sort((a, b) => b.score - a.score)[0];
      }
      topIndexInWindow.geneset = genesetOrder[topIndexInWindow.index];
      return topIndexInWindow;
    }
    return null;
  }, [enrichments, genesetOrder, xScaleInvert]);

  const isHoveringSpectrumBar = useCallback((x, y) => {
    return x >= plotXStart && x <= plotXStop && y >= plotYStop && y <= height;
  }, [plotXStart, plotXStop, plotYStop, height]);

  const isHoveringCurve = useCallback((x, y, data) => {
    const index = xScaleInvert(x);
    if (index >= 0 && index < data.length) {
      const yValue = yScale(data[index]);
      return x >= plotXStart && x <= plotXStop && y >= yValue && y <= plotYStop;
    }
    return false;
  }, [plotXStart, plotXStop, yScale, plotYStop, xScaleInvert]);

  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    SpectrumBar({ data: smoothData, ctx, xScale, y: plotYStop, height: spectrumBarHeight, colorbarX });
    Curve({ data: smoothData, ctx, xScale, yScale, height: plotYStop, color: selectedGenesetMembership?.length ? "#555" : "#000" });
    Membership({ membership: selectedGenesetMembership, genesetOrder, data: smoothData, ctx, xScale, yScale, height: plotYStop, barWidth: 10, color: "#F00" });
    Labels({ labels, ctx, xScale });

    const handleMouseMove = (e) => {
      const rect = canvas.getBoundingClientRect();
      const mouseX = e.clientX - rect.left;
      const mouseY = e.clientY - rect.top;

      if (isHoveringSpectrumBar(mouseX, mouseY)) {
        const geneset = determineGeneset(mouseX) || {};
        geneset.score = 0;
        setTooltip({ content: geneset, x: mouseX, y: height - mouseY, visible: true });
      } else if (isHoveringCurve(mouseX, mouseY, smoothData)) {
        const geneset = determineGeneset(mouseX);
        if (geneset && geneset.score !== 0) {
          setTooltip({ content: geneset, x: mouseX, y: height - mouseY, visible: true });
        } else {
          handleMouseLeave();
        }
      } else {
        handleMouseLeave();
      }
    };

    canvas.addEventListener('mousemove', handleMouseMove);
    canvas.addEventListener('mouseleave', handleMouseLeave);
    
    return () => {
      canvas.removeEventListener('mousemove', handleMouseMove);
      canvas.removeEventListener('mouseleave', handleMouseLeave);
    };
  }, [smoothData, xScale, yScale, plotYStop, spectrumBarHeight, colorbarX, labels, selectedGenesetMembership, height, isHoveringSpectrumBar, isHoveringCurve, determineGeneset, handleMouseLeave]);

  return (
    <div className={"spectrum-component" + (show ? " show": " hide")} >
      <div style={{ position: 'relative', width: width + 'px', height: height + 'px' }}>
        <canvas ref={canvasRef} width={width} height={height}/>
        <Tooltip geneset={tooltip.content} x={tooltip.x} y={tooltip.y} visible={tooltip.visible} width={width}/>
      </div>
    </div>
  );
};

export default React.memo(Spectrum);