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
    // tooltipRef.current.hide()
    const svg = e.target.ownerSVGElement
    const rect = svg.getBoundingClientRect();

    const p = path.find(d => d.order === o)
    const y = yScale(o)
    const my = e.clientY - rect.y
    const or = o + (my - y)/rw
    onHover(or)
    setOr(or)
    // console.log("y", y, my, or)//, p, rect)
    if(p) {

      const xoff = tipOrientation === "left" ? -5 : width + 3
      let x = rect.x + xoff
      let y = rect.y + my + 1.5
      tooltipRef.current.show({...p.region, fullData: p.fullData, counts: p.counts, layer: p.layer, score: csn.score, GWAS: p.GWAS}, p.layer, x, y)
    } else {
      tooltipRef.current.hide()
    }
    // tooltipRef.current.show(tooltipRef.current, csn)
  }, [csn, path, yScale, rw, onHover])

  const handleLeave = useCallback(() => {
    tooltipRef.current.hide()
  }, [])

  return (
    <div className="score-bars" onClick={() => onClick(csn)}>
      <svg width={width} height={height}  onMouseLeave={() => handleLeave()}>
        {path.length && yScale ? <g>
          {range(4, 15).map(o => {
            let p = path.find(d => d.order == o)
            let w = 0
            if(p && p.layer) {
              w = p.layer.datasetName.indexOf("enr") > -1 ? width * (p.field.value / maxENR) : width * (p.field.value)
            }
            return <g key={o} onMouseMove={(e) => handleHover(e, o)}>
              {/* this first rect acts as a mouse catcher */}
              <rect
                y={yScale(o)}
                x={0}
                height={rw}
                width={width}
                fill={ "white"}
                fillOpacity={0.01}
              />
              <rect
                y={yScale(o)}
                x={0}
                height={rw}
                width={w}
                fill={ p && p.field ? p.field.color : "white"}
                fillOpacity={selected ? 0.75 : 0.5}
                stroke="lightgray"
                // stroke={highlightOrders.indexOf(o) >= 0 ? "black" : "lightgray"}
                // strokeWidth={highlightOrders.indexOf(o) >= 0 ? 2 : 1}
                // stroke={ highlight ? "black" : "lightgray"}
              />
            </g>
          })}
        </g> : null}

        {showOrderLine ? <line 
          y1={yScale(or)} 
          y2={yScale(or)} 
          x1={0}
          x2={width}
          stroke="black"
          strokeWidth={2}
          pointerEvents="none"
          /> : null}
          
        {path.length && yScale && text ? <g>
          {range(4, 15).map(o => {
            let p = path.find(d => d.order == o)
            // let bp = showKb(Math.pow(4, 14 - o))
            return <g key={o} onMouseMove={(e) => handleHover(e, o)}>
              <text
                y={yScale(o) + rw/2 + fontSize/2}
                x={width / 2}
                textAnchor="middle"
                fontFamily="Courier"
                fontSize={fontSize}
                // stroke="#333"
                fill="#111"
                paintOrder="stroke"
                fontWeight={highlightOrders.indexOf(o) >= 0 ? "bold" : "normal"}
                >
                {p?.field ? showFloat(p.field.value) : ""}
              </text>
            </g>
          })}
          {
            showScore && <text
              y={h + scoreHeight}
              x={width / 2}
              textAnchor="middle"
              fontFamily="Courier"
              fontSize={11}
              fill="#111"
              paintOrder="stroke"
              fontWeight={"bold"}
            >
              {showFloat(csn.score)}
            </text>
          }

        </g> : null}

      </svg>
      <Tooltip ref={tooltipRef} orientation={tipOrientation} contentFn={tooltipContent} enforceBounds={false} />
    </div>
  )
}