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
  width: PropTypes.number,
  height: PropTypes.number,
  tipOrientation: PropTypes.string,
  onHover: PropTypes.func,
  onClick: PropTypes.func
};

export default function ScoreBars({
  csn,
  order,
  highlight=false,
  selected=false,
  showOrderLine=true,
  highlightOrders=[],
  text=true,
  width = 50,
  height = 400,
  fontSize = 9,
  scoreHeight = 20,
  showScore=true,
  tipOrientation="left",
  onHover = () => {},
  onClick = () => {}
}) {
  const tooltipRef = useRef(null)
  
  const [or, setOr] = useState(order)
  useEffect(() => {
    setOr(order)
  }, [order])

  const [path, setPath] = useState([])
  const [maxENR, setMaxENR] = useState(0)
  useEffect(() => {
    // console.log(csn, order)
    let maxenr = 0
    if(csn?.path){
      // console.log("csn.path",csn)
      let p = csn.path.filter(d => !!d).sort((a, b) => a.order - b.order) 
      p.forEach(d => {
        if(d.layer && d.layer.datasetName.indexOf("enr") > -1) {
          if(d.field.value > maxenr) {
            maxenr = d.field.value
          }
        }
      })
      if(csn.variants && csn.variants.length) {
        // let v = csn.variants.sort((a,b) => b.topField.value - a.topField.value)[0]
        let v = variantChooser(csn.variants)
        // console.log("top variant line ",v)
        p = p.filter(d => d.order !== 14);
        p.push({field: v.topField, layer: v.layer, order: 14, region: v})
        // console.log("p", p)
      }
      setPath(p)
      setMaxENR(maxenr)
    }
  }, [csn, order])


  // we create an extra space for the score bar
  // we create an extra space for the score bar
  const depth = (showScore ? 15 : 14) - 4
  if(!showScore) scoreHeight = -5
  let scoreOffset = scoreHeight
  if(!showScore) scoreOffset = -scoreHeight
  const spacing = (height - scoreHeight)/(depth + 1)
  const h = height - spacing - 1 
  const yScale = useMemo(() => scaleLinear().domain([4, 14]).range([ 5 + scoreHeight, h + 3 - scoreOffset]), [h, scoreOffset, scoreHeight])
  const rw = useMemo(() => yScale(5) - yScale(4) - 2, [yScale])

  const handleClick = useCallback((e, o) => {
    // const p = path.find(d => d.order === o)
    // if(p) {
    //   onClick(p)
    // }
  }, [path, onClick])

  const handleHover = useCallback((e, o) => {
      const rect = e.currentTarget.getBoundingClientRect();
      const my = e.clientY - rect.top;
      const or = o + (my) / rw;
      onHover(or);
      setOr(or);

      const p = path.find(d => d.order === o);
      if (p) {
        const xoff = tipOrientation === "left" ? -5 : width + 3;
        let x = rect.left + xoff;
        let y = rect.top + my + 1.5;
        tooltipRef.current.show(
          { ...p.region, fullData: p.fullData, counts: p.counts, layer: p.layer, score: csn.score, GWAS: p.GWAS },
          p.layer, x, y
        );
      } else {
        tooltipRef.current.hide()
      }
    }, [csn, path, yScale, rw, onHover, tipOrientation, width])

  const handleLeave = useCallback(() => {
    tooltipRef.current.hide()
  }, [])

  return (
    <div
      className="score-bars"
      style={{ position: "relative", width, height }}
      onClick={() => onClick(csn)}
    >
      <div style={{ position: "relative", width, height }}>
        {path.length && yScale &&
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
                onMouseMove={e => handleHover(e, o)}
                onMouseLeave={handleLeave}
                style={{
                  position: "absolute",
                  top: yScale(o),
                  left: 0,
                  width: width,
                  height: rw,
                  pointerEvents: "all"
                }}
              >
                <div
                  style={{
                    position: "absolute",
                    top: 0,
                    left: 0,
                    width: width,
                    height: rw,
                    backgroundColor: "white",
                    opacity: 0.01
                  }}
                />
                {w ? <div
                  style={{
                    position: "absolute",
                    top: 0,
                    left: 0,
                    width: w,
                    height: rw,
                    backgroundColor: p && p.field ? p.field.color : "white",
                    opacity: selected ? 0.75 : 0.5,
                    border: "1px solid lightgray"
                  }}
                /> : null}
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
        {path.length && yScale && text &&
          range(4, 15).map(o => {
            const p = path.find(d => d.order === o);
            const y = yScale(o) + rw / 2
            return (
              <div>
                <div
                  key={`${o}-field`}
                  style={{
                    position: "absolute",
                    top: y - fontSize,
                    left: 0,
                    width: width,
                    paddingLeft: 5,
                    fontFamily: "Courier",
                    fontSize: fontSize,
                    fontWeight: highlightOrders.indexOf(o) >= 0 ? "bold" : "normal",
                    color: "#111",
                    pointerEvents: "none"
                  }}
                >
                  {p?.field?.field ? p?.field?.field : ""}
                </div>
                <div
                  key={`${o}-score`}
                  style={{
                    position: "absolute",
                    top: y,
                    left: 0,
                    width: width,
                    paddingLeft: 5,
                    fontFamily: "Courier",
                    fontSize: fontSize,
                    fontWeight: highlightOrders.indexOf(o) >= 0 ? "bold" : "normal",
                    color: "#111",
                    pointerEvents: "none"
                  }}
                >
                  {p?.field ? showFloat(p.field.value) : ""}
                </div>
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
    </div>
  )
}