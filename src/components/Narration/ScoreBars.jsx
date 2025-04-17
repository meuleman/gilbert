import { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { scaleLinear } from 'd3-scale';
import { range } from 'd3-array';
import { showFloat, showInt, showPosition, showKb } from '../../lib/display';
import { variantChooser } from '../../lib/csn';
import './Line.css';

import Tooltip from '../Tooltips/Tooltip';
import { tooltipContent } from './FactorTooltip'

import PropTypes from 'prop-types';

ScoreBars.propTypes = {
  csn: PropTypes.object,
  order: PropTypes.number.isRequired,
  highlight: PropTypes.bool,
  selected: PropTypes.bool,
  loadingFullNarration: PropTypes.bool,
  width: PropTypes.number,
  height: PropTypes.oneOfType([PropTypes.number, PropTypes.string]),
  tipOrientation: PropTypes.string,
  onHover: PropTypes.func,
  onClick: PropTypes.func
};

export default function ScoreBars({
  csn,
  order,
  highlight=false,
  selected=false,
  loadingFullNarration=false,
  showOrderLine=true,
  highlightOrders=[],
  text=true,
  width = 50,
  height = '100%',
  fontSize = 9,
  scoreHeight = 20,
  offsetX = 0,
  showScore=true,
  tipOrientation="left",
  onHover = () => {},
  onClick = () => {}
}) {
  const tooltipRef = useRef(null);
  const containerRef = useRef(null);
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
  
  const [or, setOr] = useState(order)
  useEffect(() => {
    setOr(order)
  }, [order])

  const [path, setPath] = useState([])
  const [maxENR, setMaxENR] = useState(0)
  useEffect(() => {
    let maxenr = 0
    if(csn?.path){
      let p = csn.path.filter(d => !!d).sort((a, b) => a.order - b.order) 
      p.forEach(d => {
        if(d.layer && d.layer.datasetName.indexOf("enr") > -1) {
          if(d.field.value > maxenr) {
            maxenr = d.field.value
          }
        }
      })
      if(csn.variants && csn.variants.length) {
        let v = variantChooser(csn.variants)
        p = p.filter(d => d.order !== 14);
        p.push({field: v.topField, layer: v.layer, order: 14, region: v})
      }
      setPath(p)
      setMaxENR(maxenr)
    }
  }, [csn, order])

  // Calculate scale based on container height
  const depth = (showScore ? 15 : 14) - 4
  const effectiveScoreHeight = !showScore ? -5 : scoreHeight
  const scoreOffset = !showScore ? -effectiveScoreHeight : effectiveScoreHeight
  
  const h = containerHeight - ((containerHeight - effectiveScoreHeight) / (depth + 1)) - 1
  const yScale = useMemo(() => 
    scaleLinear()
      .domain([4, 14])
      .range([5 + effectiveScoreHeight, h - scoreOffset + 2]), 
    [h, scoreOffset, effectiveScoreHeight, containerHeight]
  );
  
  const rw = useMemo(() => yScale(5) - yScale(4) - 2, [yScale]);

  const handleClick = useCallback((e, o) => {
    // const p = path.find(d => d.order === o)
    // if(p) {
    //   onClick(p)
    // }
  }, [path, onClick])

  const handleHover = useCallback((e, o) => {
    const containerRect = containerRef.current.getBoundingClientRect();
    const rectTop = yScale(o);
    const relativeY = e.clientY - containerRect.top - rectTop;
    const or = o + relativeY / rw;
    onHover(or);
    setOr(or);
  }, [csn, path, yScale, rw, offsetX, onHover, tipOrientation, width]);

  const handleMoreInfoHover = useCallback((e, o) => {
    const containerRect = containerRef.current.getBoundingClientRect();
    const p = path.find(d => d.order === o);
    const my = e.clientY - containerRect.top;
    handleHover(e, o);
    if (p) {
      const xoff = tipOrientation === "left" ? -5 : width + 5;
      const tooltipX = containerRect.left + xoff - 34; // TODO: do not hardcode!
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
    tooltipRef.current.hide()
  }, [])

  return (
    <div
      ref={containerRef}
      className="relative w-full h-full"
      style={{ width }}
      onClick={() => onClick(csn)}
    >
      {path.length && yScale && containerHeight > 0 &&
        range(4, 15).map(o => {
          const p = path.find(d => d.order === o);
          let w = 0;
          if (p && p.layer) {
            w = p.layer.datasetName.indexOf("enr") > -1
              ? width * (p.field.value / maxENR)
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
            >
              <div
                className="absolute top-0 left-0 opacity-[0.01] bg-white"
                style={{
                  width,
                  height: rw
                }}
              />
              {w ? (
                <div>
                  <div
                    className={`absolute top-0 left-0 border border-gray-300 ${selected ? 'opacity-75' : 'opacity-50'}`}
                    style={{
                      width: w,
                      height: rw,
                      backgroundColor: p && p.field ? p.field.color : "white"
                    }}
                  />
                  <div
                    className={`absolute font-mono cursor-pointer right-0 top-0 -translate-x-1.5 translate-y-1.5 text-[${fontSize}px]`}
                  >
                    <span
                      className="pointer-events-auto"
                      onMouseMove={(e) => handleMoreInfoHover(e, o)}
                      onMouseLeave={handleLeave}
                      onClick={(e) => handleClick(e, o)}
                    >
                      ?
                    </span>
                  </div> 
                </div>
              ) : null}
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

      {path.length && yScale && text && containerHeight > 0 &&
        range(4, 15).map(o => {
          const p = path.find(d => d.order === o);
          const y = yScale(o) + rw / 2
          return (
            <div key={`${o}-container`}>
              <div
                key={`${o}-field`}
                className="absolute left-0 pl-1.5 font-mono pointer-events-none text-gray-900"
                style={{
                  top: y - fontSize,
                  width,
                  fontSize,
                  fontWeight: highlightOrders.indexOf(o) >= 0 ? "bold" : "normal"
                }}
              >
                {p?.field?.field ? p?.field?.field : ""}
              </div>
              <div
                key={`${o}-score`}
                className="absolute left-0 pl-1.5 font-mono pointer-events-none text-gray-900"
                style={{
                  top: y,
                  width,
                  fontSize,
                  fontWeight: highlightOrders.indexOf(o) >= 0 ? "bold" : "normal"
                }}
              >
                {p?.field ? showFloat(p.field.value) : ""}
              </div>
            </div>
          );
        })}

      {showScore && containerHeight > 0 && (
        <div
          className="absolute left-0 w-full text-center font-mono font-bold text-gray-900"
          style={{
            top: h + scoreHeight,
            fontSize: 11
          }}
        >
          {showFloat(csn.score)}
        </div>
      )}
      
      <Tooltip ref={tooltipRef} orientation={tipOrientation} contentFn={tooltipContent} enforceBounds={true} />
    </div>
  )
}