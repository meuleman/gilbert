import { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { scaleLinear } from 'd3-scale';
import { range } from 'd3-array';
import { showFloat, showKb} from '../../lib/display';
import { variantChooser } from '../../lib/csn';
import './Line.css';

import Tooltip from '../Tooltips/Tooltip';
import { tooltipContent } from './FactorTooltip'

import PropTypes from 'prop-types';


ZoomLine.propTypes = {
  csn: PropTypes.object,
  order: PropTypes.number.isRequired,
  maxPathScore: PropTypes.number,
  highlight: PropTypes.bool,
  selected: PropTypes.bool,
  loadingFullNarration: PropTypes.bool,
  width: PropTypes.number,
  height: PropTypes.oneOfType([PropTypes.number, PropTypes.string]),
  tipOrientation: PropTypes.string,
  showScore: PropTypes.bool,
  onHover: PropTypes.func,
  onClick: PropTypes.func,
  onFactor: PropTypes.func
};

export default function ZoomLine({
  csn,
  order,
  maxPathScore,
  highlight=false,
  selected=false,
  loadingFullNarration=false,
  showOrderLine=true,
  highlightOrders=[],
  text=true,
  showScore=true,
  width = 50,
  height = '100%', // Changed to support percentage
  fontSize = 9,
  offsetX = 0,
  scoreHeight = 20,
  tipOrientation="left",
  onClick = () => {},
  onHover = () => {},
  onFactor= () => {},
  backtrack= () => {},
}) {
  const tooltipRef = useRef(null);
  // const scoreTooltipRef = useRef(null);
  const containerRef = useRef(null);
  
  const [or, setOr] = useState(order);
  useEffect(() => {
    setOr(order);
  }, [order]);

  const [containerHeight, setContainerHeight] = useState(0);
  
  // adds event listeners to track shift key state
  const [isShiftPressed, setIsShiftPressed] = useState(false);
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Shift') {
        setIsShiftPressed(true);
      }
    };
    
    const handleKeyUp = (e) => {
      if (e.key === 'Shift') {
        setIsShiftPressed(false);
        tooltipRef.current.hide();
      }
    };
    
    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, []);

  
  
  // Measure container height when it's mounted or when height prop changes
  useEffect(() => {
    if (!containerRef.current) return;
    
    const resizeObserver = new ResizeObserver(entries => {
      for (const entry of entries) {
        setContainerHeight(entry.contentRect.height);
      }
    });
    
    resizeObserver.observe(containerRef.current);
    setContainerHeight(containerRef.current.clientHeight);
    
    return () => {
      resizeObserver.disconnect();
    };
  }, []);

  const [path, setPath] = useState([]);
  useEffect(() => {
    if(csn?.path){
      let p = csn.path.filter(d => !!d).sort((a, b) => a.order - b.order) 
      if(csn.variants && csn.variants.length) {
        let v = variantChooser(csn.variants);
        p = p.filter(d => d.order !== 14);
        p.push({field: v.topField, layer: v.layer, order: 14, region: v})
      }
      setPath(p);
    }
  }, [csn, order]);

  // Adjusted scale calculation based on container height
  const depth = (showScore ? 15 : 14) - 4;
  const effectiveScoreHeight = !showScore ? -5 : scoreHeight;
  const scoreOffset = !showScore ? -effectiveScoreHeight : effectiveScoreHeight;
  
  const h = containerHeight - ((containerHeight - effectiveScoreHeight) / (depth + 1)) - 1;
  const yScale = useMemo(() => 
    scaleLinear()
      .domain([4, 14])
      .range([5 + effectiveScoreHeight, h - scoreOffset + 2]), 
    [h, scoreOffset, effectiveScoreHeight, containerHeight]
  );
  
  const rw = useMemo(() => yScale(5) - yScale(4), [yScale]);

  // const handleClick = useCallback((e, o) => {
  //   const p = path.find(d => d.order === o);
  //   if(p) {
  //     onFactor(p);
  //   }
  // }, [path, onFactor]);

  const handleHover = useCallback((e, o) => {
    const containerRect = containerRef.current.getBoundingClientRect();
    const rectTop = yScale(o);
    const relativeY = e.clientY - containerRect.top - rectTop;
    const or = o + relativeY / rw;
    onHover(or);
  }, [csn, path, yScale, rw, offsetX, onHover, tipOrientation, width]);

  const handleMoreInfoHover = useCallback((e, o) => {
    const containerRect = containerRef.current.getBoundingClientRect();
    const p = path.find(d => d.order === o);
    const my = e.clientY - containerRect.top;
    handleHover(e, o);
    if (p) {
      const xoff = tipOrientation === "left" ? -5 : width + 5;
      const tooltipX = containerRect.left + xoff + offsetX;
      const tooltipY = containerRect.top + my + 1.5;
      tooltipRef.current &&
        tooltipRef.current.show(
          { ...p.region, 
            fullData: p.fullData, 
            counts: p.counts, 
            layer: p.layer, 
            score: csn.score, 
            GWAS: p.GWAS,
            loadingFullNarration: loadingFullNarration
          },
          p.layer,
          tooltipX,
          tooltipY
        );
    } else {
      tooltipRef.current && tooltipRef.current.hide();
    }
  }, [csn, path, yScale, rw, offsetX, onHover, tipOrientation, width, loadingFullNarration]);

  const handleLeave = useCallback(() => {
    tooltipRef.current.hide();
  }, []);

  const handleClick = useCallback((o) => {
    if(Math.max(...path.map(d => d.order)) > o) {
      backtrack(o);
    }
  }, [path]);

  // const handleScoreHover = useCallback((e) => {
  //   const containerRect = e.currentTarget.getBoundingClientRect();
  //   const xoff = tipOrientation === "left" ? -5 : width + 5;
  //   const tooltipX = containerRect.left + xoff;
  //   const tooltipY = containerRect.top + scoreHeight - (scoreHeight * (csn.score / maxPathScore)) / 2;
  //   // scoreTooltipRef.current && scoreTooltipRef.current.show(csn.score, null, tooltipX, tooltipY);
  // }, [csn, maxPathScore, scoreHeight, tipOrientation, width]);

  // const handleScoreLeave = useCallback(() => {
  //   scoreTooltipRef.current.hide();
  // }, []);

  return (
    <div 
      ref={containerRef} 
      className="relative w-full h-full" 
      style={{ width }} 
      onClick={() => onClick(csn)}
    >
      {showScore && maxPathScore && (
        <>
          <div
            className="absolute top-0 left-0 opacity-[0.01] bg-red-500"
            style={{
              width,
              height: scoreHeight
            }}
            // onMouseMove={handleScoreHover}
            // onMouseLeave={handleScoreLeave}
          />
          <div
            className="absolute left-0 bg-gray-300 opacity-50"
            style={{
              top: scoreHeight - scoreHeight * (csn.score / maxPathScore) + 3,
              width,
              height: scoreHeight * (csn.score / maxPathScore)
            }}
            // onMouseMove={handleScoreHover}
            // onMouseLeave={handleScoreLeave}
          />
        </>
      )}

      {path.length && yScale && containerHeight > 0 && range(4, 15).map(o => {
        let p = path.find(d => d.order === o);
        let barWidth = 0;
        if (p && p.layer && p.field) {
          barWidth =
            p.layer.datasetName.indexOf("enr") > -1
              ? width * (p.field.value / (maxPathScore || width))
              : width * (p.field.value);
        }
        return (
          <div
            key={o}
            className="absolute left-0 pointer-events-auto"
            style={{
              top: yScale(o),
              width,
              height: rw
            }}
            onMouseMove={(e) => {isShiftPressed ? handleMoreInfoHover(e, o) : handleHover(e, o)}}
            onMouseLeave={handleLeave}
            onClick={() => handleClick(o)}
          >
            <div
              className="absolute top-0 left-0 opacity-10 bg-white"
              style={{
                width,
                height: rw
              }}
            />
            <div
              className={`absolute top-0 left-0 ${highlight ? 'border border-black' : 'border border-gray-300'}`}
              style={{
                width,
                height: rw,
                backgroundColor: p && p.field ? p.field.color : "white",
                opacity: selected ? 0.75 : 0.5
              }}
            />
          </div>
        );
      })}

      {showOrderLine && containerHeight > 0 && (
        <div 
          className="absolute left-0 bg-black pointer-events-none"
          style={{
            top: yScale(or),
            width,
            height: 2
          }}
        />
      )}

      {path.length && yScale && text && containerHeight > 0 && range(4, 15).map(o => {
        let p = path.find(d => d.order === o);
        let bp = showKb(Math.pow(4, 14 - o));
        return (
          <div
            key={`text-${o}`}
            className="absolute left-0 text-center font-mono pointer-events-none"
            style={{
              top: yScale(o) + rw / 2,
              width,
              fontSize,
              fontWeight: highlightOrders.indexOf(o) >= 0 ? "bold" : "normal",
              color: "#111",
              transform: "translateY(-50%)"
            }}
          >
            <div>{bp[0]}</div>
            <div>{bp[1]}</div>
          </div>
        );
      })}

      {showScore && (
        <div
          className="absolute left-0 text-center font-mono font-bold text-gray-900"
          style={{
            top: h + scoreHeight,
            width,
            fontSize: 11
          }}
        >
          {showFloat(csn.score)}
        </div>
      )}
      
      <Tooltip 
        ref={tooltipRef} 
        orientation={tipOrientation} 
        contentFn={tooltipContent} 
        enforceBounds={false} 
      />
      {/* <Tooltip ref={scoreTooltipRef} orientation={tipOrientation} contentFn={scoreTooltipContent} enforceBounds={false} /> */}
    </div>
  );
}