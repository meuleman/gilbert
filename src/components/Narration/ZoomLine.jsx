import { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { scaleLinear } from 'd3-scale';
import { range } from 'd3-array';
import { showFloat, showKb} from '../../lib/display';
import { variantChooser } from '../../lib/csn';
import './Line.css';

import Tooltip from '../Tooltips/Tooltip';
import { tooltipContent } from './FactorTooltip'

import PropTypes from 'prop-types';


function scoreTooltipContent(score, layer, orientation) {
  return (
    <div style={{display: 'flex', flexDirection: 'column'}}>
      <span>Score: {showFloat(score)}</span>
    </div>
  )
}

ZoomLine.propTypes = {
  csn: PropTypes.object,
  order: PropTypes.number.isRequired,
  maxPathScore: PropTypes.number,
  highlight: PropTypes.bool,
  selected: PropTypes.bool,
  width: PropTypes.number,
  height: PropTypes.number,
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
  showOrderLine=true,
  highlightOrders=[],
  text=true,
  showScore=true,
  width = 50,
  height = 400,
  fontSize = 9,
  offsetX = 0,
  scoreHeight = 20,
  tipOrientation="left",
  onClick = () => {},
  onHover = () => {},
  onFactor= () => {}
}) {
  const tooltipRef = useRef(null)
  const scoreTooltipRef = useRef(null)
  
  const [or, setOr] = useState(order)
  useEffect(() => {
    setOr(order)
  }, [order])

  const [path, setPath] = useState([])
  useEffect(() => {
    // console.log(csn, order)
    if(csn?.path){
      // console.log("csn.path",csn)
      let p = csn.path.filter(d => !!d).sort((a, b) => a.order - b.order) 
      if(csn.variants && csn.variants.length) {
        // let v = csn.variants.sort((a,b) => b.topField.value - a.topField.value)[0]
        let v = variantChooser(csn.variants)
        // console.log("top variant line ",v)
        p = p.filter(d => d.order !== 14);
        p.push({field: v.topField, layer: v.layer, order: 14, region: v})
        // console.log("p", p)
      }
      setPath(p)
    }
  }, [csn, order])


  // we create an extra space for the score bar
  const depth = (showScore ? 15 : 14) - 4
  if(!showScore) scoreHeight = -5
  let scoreOffset = scoreHeight
  if(!showScore) scoreOffset = -scoreHeight
  const spacing = (height - scoreHeight)/(depth + 1)
  const h = height - spacing - 1 
  const yScale = useMemo(() => scaleLinear().domain([4, 14]).range([ 5 + scoreHeight, h - scoreOffset + 2]), [h, scoreOffset, scoreHeight])
  const rw = useMemo(() => yScale(5) - yScale(4), [yScale])

  const handleClick = useCallback((e, o) => {
    const p = path.find(d => d.order === o)
    if(p) {
      onFactor(p)
    }
  }, [path, onFactor])

  const handleHover = useCallback((e, o) => {
      const containerRect = e.currentTarget.getBoundingClientRect();
      const p = path.find(d => d.order === o);
      const y = yScale(o);
      const my = e.clientY - containerRect.top;
      const or = o + my / rw;
      onHover(or);
      setOr(or);
      if (p) {
        const xoff = tipOrientation === "left" ? -5 : width + 5;
        const tooltipX = containerRect.left + xoff + offsetX;
        const tooltipY = containerRect.top + my + 1.5;
        tooltipRef.current &&
          tooltipRef.current.show(
            { ...p.region, fullData: p.fullData, counts: p.counts, layer: p.layer, score: csn.score, GWAS: p.GWAS },
            p.layer,
            tooltipX,
            tooltipY
          );
      } else {
        tooltipRef.current && tooltipRef.current.hide();
      }
    }, [csn, path, yScale, rw, offsetX, onHover, tipOrientation, width])

  const handleLeave = useCallback(() => {
    tooltipRef.current.hide()
  }, [])

  const handleScoreHover = useCallback((e) => {
      const containerRect = e.currentTarget.getBoundingClientRect();
      const xoff = tipOrientation === "left" ? -5 : width + 5;
      const tooltipX = containerRect.left + xoff;
      const tooltipY = containerRect.top + scoreHeight - (scoreHeight * (csn.score / maxPathScore)) / 2;
      scoreTooltipRef.current && scoreTooltipRef.current.show(csn.score, null, tooltipX, tooltipY);
    }, [csn, maxPathScore, scoreHeight, tipOrientation, width])

  const handleScoreLeave = useCallback(() => {
    scoreTooltipRef.current.hide()
  }, [])

  return (
    <div className="csn-line" style={{ position: "relative", width, height }} onClick={() => onClick(csn)}>
      <div style={{ position: "relative", width, height }}>
        {showScore && maxPathScore && (
          <div
            style={{
              position: "absolute",
              top: 0,
              left: 0,
              width: width,
              height: scoreHeight,
              backgroundColor: "red",
              opacity: 0.01
            }}
            onMouseMove={handleScoreHover}
            onMouseLeave={handleScoreLeave}
          />
        )}
        {showScore && maxPathScore && (
          <div
            style={{
              position: "absolute",
              top: scoreHeight - scoreHeight * (csn.score / maxPathScore) + 3,
              left: 0,
              width: width,
              height: scoreHeight * (csn.score / maxPathScore),
              backgroundColor: "lightgray",
              opacity: 0.5
            }}
            onMouseMove={handleScoreHover}
            onMouseLeave={handleScoreLeave}
          />
        )}

        {path.length && yScale && range(4, 15).map(o => {
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
              style={{
                position: "absolute",
                top: yScale(o),
                left: 0,
                width: width,
                height: rw,
                pointerEvents: "all",
              }}
              onMouseMove={(e) => handleHover(e, o)}
              onMouseLeave={handleLeave}
              onClick={(e) => handleClick(e, o)}
            >
              <div
                style={{
                  position: "absolute",
                  top: 0,
                  left: 0,
                  width: width,
                  height: rw,
                  backgroundColor: "white",
                  opacity: 0.1
                }}
              />
              <div
                style={{
                  position: "absolute",
                  top: 0,
                  left: 0,
                  width: width,
                  height: rw,
                  backgroundColor: p && p.field ? p.field.color : "white",
                  opacity: selected ? 0.75 : 0.5,
                  border: highlight ? "1px solid black" : "1px solid lightgray"
                }}
              />
            </div>
          );
        })}
        {showOrderLine && (
          <div 
            style={{
              position: "absolute",
              top: yScale(or),
              left: 0,
              width: width,
              height: 2,
              backgroundColor: "black",
              pointerEvents: "none"
            }}
          />
        )}
        {path.length && yScale && text && range(4, 15).map(o => {
          let bp = showKb(Math.pow(4, 14 - o));
          return (
            <div
              key={o}
              style={{
                position: "absolute",
                top: yScale(o) + rw / 2,
                left: 0,
                width: width,
                textAlign: "center",
                fontFamily: "Courier",
                fontSize: fontSize,
                fontWeight: highlightOrders.indexOf(o) >= 0 ? "bold" : "normal",
                color: "#111",
                transform: "translateY(-50%)",
                pointerEvents: "none"
              }}
              onMouseMove={(e) => handleHover(e, o)}
              onMouseLeave={handleLeave}
            >
              <div>{bp[0]}</div>
              <div>{bp[1]}</div>
            </div>
          );
        })}
        {showScore && (
          <div
            style={{
              position: "absolute",
              top: h + scoreHeight,
              left: 0,
              width: width,
              textAlign: "center",
              fontFamily: "Courier",
              fontSize: 11,
              fontWeight: "bold",
              color: "#111"
            }}
          >
            {showFloat(csn.score)}
          </div>
        )}
      </div>
      <Tooltip ref={tooltipRef} orientation={tipOrientation} contentFn={tooltipContent} enforceBounds={false} />
      <Tooltip ref={scoreTooltipRef} orientation={tipOrientation} contentFn={scoreTooltipContent} enforceBounds={false} />
    </div>
  )
}