import React, { useEffect, useState, useRef, useMemo, useContext } from 'react';
import './Spectrum.css';
import genesetOrder from '../../data/genesetOrder2023.json';
import colors from '../../data/spectrumColors.json';
import labels from '../../data/spectrumLabels.json';
import Loading from '../Loading';
import * as d3 from 'd3'
import RegionsContext from '../Regions/RegionsContext';

const SpectrumBar = React.memo(({ data, xScale, y, height, colorbarX }) => {
  // console.time("MAP")
  const colorBar = data.map((d, i) => {
    return (
      <rect
        key={i}
        fill={colorbarX(i)}
        x={xScale(i)}
        y={y}
        width={xScale(1) - xScale(0)}
        height={height}
      />
    );
  })
  // console.timeEnd("MAP")
  return (
    <g>
      {colorBar}
    </g>
  );
});

const Curve = React.memo(({ data, xScale, yScale, height, color }) => {
  // console.time("Curve")
  const curve = data.map((d, i) => {
    return (
      d ? <rect
        key={i}
        fill={color}
        fillOpacity={1}
        x={xScale(i)}
        y={yScale(d)}
        width={xScale(1) - xScale(0)}
        height={height - yScale(d)}
      /> : null
    );
  })
  // console.timeEnd("Curve")
  return (
    <g>
      {curve}
    </g>
  );
});

const YTicks = React.memo(({ data, yScale, xScale, numTicks = 5 }) => {
  // console.time("YTicks");
  const maxValue = Math.max(...data);
  const minValue = Math.min(...data);
  const step = (maxValue - minValue) / (numTicks - 1);
  const yTicks = Array.from({ length: numTicks }, (v, i) => minValue + i * step);

  const ticks = yTicks.map((d, i) => {
    return d ? (
      <g key={i}>
        <line
          x1={xScale(0)}
          x2={xScale(0) - 5}
          y1={yScale(d)}
          y2={yScale(d)}
          stroke="#000"
        />
        <text
          x={xScale(0) - 10}
          y={yScale(d)}
          dy={4}
          fontSize={10}
          fill="#000"
          textAnchor="end"
        >
          {d.toFixed(2)}
        </text>
      </g>
    ) : null;
  });
  // console.timeEnd("YTicks");
  return (
    <g>
      {ticks}
    </g>
  );
});

const Labels = ({ labels, xScale }) => {
  let textLabels = labels.map((d, i) => (
    <text key={i} x={xScale(d.i)} y={0} dominantBaseline="hanging" fontSize={8}>
      {d.label}
    </text>
  ))
  return (
    <g>
      {textLabels}
    </g>
  );
};


const Tooltip = ({ tooltipData, position }) => {
  if (!tooltipData) return null;

  return (
    <div
      className="spectrum-tooltip"
      style={{
        left: position.x + 20 + 'px',
        top: position.y + 'px',
        opacity: 1,
        zIndex: 1,
        minWidth: '200px',
        backgroundColor: 'white',
        border: 'solid',
        borderWidth: '1px',
        borderRadius: '5px',
        padding: '10px',
        position: 'absolute',
        display: 'inline',
      }}
    >
      {/* <div>
        xIndex: <b>{tooltipData.index}</b>
      </div> */}
      <div>
        Geneset: <b>{tooltipData.genesetName.split("_").slice(1).join(" ")}</b>
      </div>
      <div>
        Enrichment -log10(p-value): <b>{tooltipData.enrichment}</b>
      </div>
    </div>
  );
};


const Spectrum = ({
  show = false,
  windowSize = 100,
  width = 450,
  height = 100,
  xtickMargin = 40,
  plotXStart = xtickMargin,
  plotXStop = width,
  plotYStart = 20,
  spectrumBarHeight = 10,
  plotYStop = height - spectrumBarHeight,
  curveHeight = plotYStop - plotYStart,
  
} = {}) => {
  
  const { activeRegions, activeGenesetEnrichment } = useContext(RegionsContext)

  const [enrichments, setEnrichments] = useState(new Array(genesetOrder.length).fill(0));
  const [smoothData, setSmoothData] = useState(new Array(genesetOrder.length).fill(0));
  
  const [loadingSpectrum, setLoadingSpectrum] = useState(false);
  useEffect(() => {
    if(activeRegions?.length && activeGenesetEnrichment === null) {
      setLoadingSpectrum(true)
    } else {
      setLoadingSpectrum(false)
    }
  }, [activeGenesetEnrichment, activeRegions])
  
  useEffect(() => {
    if(activeGenesetEnrichment?.length) {

      console.time("INIT")
      let enrichments = new Array(genesetOrder.length).fill(0)
      let enrichmentsMax = new Array(genesetOrder.length).fill(0)
      let enrichmentsSmooth = new Array(genesetOrder.length).fill(0)
      console.timeEnd("INIT")

      console.time("FILL")
      activeGenesetEnrichment.forEach((d) => enrichments[genesetOrder.indexOf(d.geneset)] = -Math.log10(d.p))
      setEnrichments(enrichments)
      console.timeEnd("FILL")
      // console.log("FILL", Math.max(...enrichments))
      
      console.time("MAX")
      enrichments.forEach((e, i) => {
        let startIndex = Math.max(0, i - windowSize / 2);
        let endIndex = Math.min(enrichments.length, i + windowSize / 2);
        let enrichmentsInWindow = enrichments.slice(startIndex, endIndex);
        enrichmentsMax[i] = Math.max(...enrichmentsInWindow);
      });
      console.timeEnd("MAX")
      // console.log("MAX", Math.max(...enrichmentsMax))

      console.time("SMOOTH")
      enrichmentsMax.forEach((e, i) => {
        let startIndex = Math.max(0, i - windowSize / 2);
        let endIndex = Math.min(enrichments.length, i + windowSize / 2);
        let enrichmentsMaxInWindow = enrichmentsMax.slice(startIndex, endIndex);
        enrichmentsSmooth[i] = enrichmentsMaxInWindow.reduce((a, b) => a + b) / enrichmentsMaxInWindow.length;
      });
      console.timeEnd("SMOOTH")
      // console.log("SMOOTH", Math.max(...enrichmentsSmooth))

      setSmoothData(enrichmentsSmooth)
    }

  }, [activeGenesetEnrichment, genesetOrder, windowSize]);

  const colorscale = i => {
    let c = colors[i % colors.length];
    let r = Math.round(c[0] * 255);
    let g = Math.round(c[1] * 255);
    let b = Math.round(c[2] * 255);
    let rgbColor = `rgb(${r}, ${g}, ${b})`;
    let hsl = d3.hsl(rgbColor);
    hsl.l = 0.5;
    return hsl.toString();
  };
  // console.log(Math.max(...enrichments.slice(0, 50)))

  const [tooltipData, setTooltipData] = useState(null);
  const [tooltipPosition, setTooltipPosition] = useState({ x: 0, y: 0 });
  const svgRef = useRef();

  const handleMouseLeave = () => {
    setTooltipData(null);
  };

  const handleMouseMove = e => {
      const parentOffset = svgRef.current.getBoundingClientRect();
      const xIndex = Math.round(((e.clientX - parentOffset.x - plotXStart) / (plotXStop - plotXStart)) * genesetOrder.length);
  
      if (xIndex >= 0 && xIndex < genesetOrder.length) {
        const hoverWindowSize = 50;
        let startIndex = Math.max(0, xIndex - hoverWindowSize / 2);
        let endIndex = Math.min(enrichments.length, xIndex + hoverWindowSize / 2);
        let windowValues = enrichments.slice(startIndex, endIndex);

        let topIndexInWindow = windowValues.map((v, i) => ({score: v, index: i + startIndex})).sort((a, b) => b.score - a.score)[0]
        const genesetName = genesetOrder[topIndexInWindow.index];
        const enrichment = topIndexInWindow.score;
        setTooltipData({ index: topIndexInWindow.index, genesetName, enrichment: Math.round(enrichment * 10000) / 10000 });
        setTooltipPosition({ x: e.clientX - parentOffset.x, y: e.clientY - parentOffset.y });
      }
    };

  const xScale = useMemo(() => i => plotXStart + (i / (genesetOrder.length - 1)) * (plotXStop - plotXStart), [plotXStart, plotXStop, genesetOrder.length]);
  const yScale = useMemo(() => d => plotYStart + (curveHeight) * (1 - (d / Math.max(...smoothData))), [smoothData, plotYStart, curveHeight]);

  // TODO: loading indicator
  // console.time("RENDER")
  const Container = (
    <div className="spectrum-container" id="spectrum-container" style={{ height: height + 'px', width: width + 'px' }}>
      {/* <h3>Geneset enrichment spectrum</h3> */}
      {loadingSpectrum ? <div><Loading text="Loading Geneset Enrichments..."/></div> 
      : <div>
          {activeGenesetEnrichment?.length ? <svg
            ref={svgRef}
            id="spectrum-svg"
            className="spectrum"
            width={width}
            height={height}
            // style={{ position: 'absolute' }}
            onMouseMove={handleMouseMove}
            onMouseLeave={handleMouseLeave}
          >

            <SpectrumBar data={smoothData} xScale={xScale} y={plotYStop} height={spectrumBarHeight} colorbarX={colorscale} />
            <Curve data={smoothData} xScale={xScale} yScale={yScale} height={plotYStop} color={"#000"} />
            <YTicks data={smoothData} yScale={yScale} xScale={xScale} numTicks={5} />
            <Labels labels={labels} xScale={xScale} />
          </svg> : <svg></svg>}
          <Tooltip tooltipData={tooltipData} position={tooltipPosition} />
        </div>
      }
    </div>
  )
  // console.timeEnd("RENDER")

  return (
    show && (activeGenesetEnrichment?.length || loadingSpectrum) ? Container : null
  );
};

export default React.memo(Spectrum);