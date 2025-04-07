import { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { scaleLinear } from 'd3-scale';
import { range } from 'd3-array';
import { showFloat, showKb } from '../../lib/display';
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
  const yScale = useMemo(() => scaleLinear().domain([4, 14]).range([ 5 + scoreHeight, h + 3 - scoreOffset]), [h, scoreOffset, scoreHeight])
  const rw = useMemo(() => yScale(5) - yScale(4) - 2, [yScale])

  const handleClick = useCallback((e, o) => {
    const p = path.find(d => d.order === o)
    if(p) {
      onFactor(p)
    }
  }, [path, onFactor])

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

      const xoff = tipOrientation === "left" ? -5 : width + 5
      tooltipRef.current.show({...p.region, fullData: p.fullData, counts: p.counts, layer: p.layer, score: csn.score, GWAS: p.GWAS}, p.layer, rect.x + xoff + offsetX, rect.y + my + 1.5)
    }
    // tooltipRef.current.show(tooltipRef.current, csn)
  }, [csn, path, yScale, rw, offsetX, onHover])

  const handleLeave = useCallback(() => {
    tooltipRef.current.hide()
  }, [])

  const handleScoreHover = useCallback((e) => {
    const svg = e.target.ownerSVGElement
    const rect = svg.getBoundingClientRect();
    const xoff = tipOrientation === "left" ? -5 : width + 5
    scoreTooltipRef.current.show(csn.score, null, rect.x + xoff, rect.y + scoreHeight - scoreHeight * (csn.score/maxPathScore)/2)
  }, [csn, maxPathScore, rw])

  const handleScoreLeave = useCallback(() => {
    scoreTooltipRef.current.hide()
  }, [])

  return (
    <div className="csn-line" onClick={() => onClick(csn)}>
      <svg width={width} height={height} onMouseLeave={() => handleLeave()}>
        {path.length && yScale ? <g>
          {showScore && maxPathScore && <rect
            y={0}
            x={0}
            height={scoreHeight}
            width={width}
            fill="white"
            stroke="white"
            fillOpacity={0.01}
            onMouseMove={(e) => handleScoreHover(e)} 
            onMouseLeave={() => handleScoreLeave()}
            />}
          {showScore && maxPathScore && <rect
            y={scoreHeight - scoreHeight * (csn.score/maxPathScore) + 3}
            x={0}
            height={scoreHeight * (csn.score/maxPathScore)}
            width={width}
            fill="lightgray"
            stroke="white"
            fillOpacity={0.5}
            onMouseMove={(e) => handleScoreHover(e)} 
            onMouseLeave={() => handleScoreLeave()}
            />}

          {range(4, 15).map(o => {
            let p = path.find(d => d.order == o)
            return <g key={o}
              onClick={(e) => handleClick(e, o)}
              onMouseMove={(e) => handleHover(e, o)} 
              // onMouseLeave={() => handleLeave()}
              >
                <rect
                y={yScale(o)}
                x={0}
                height={rw}
                width={width}
                fill={ "white" }
                fillOpacity={0.01}
              />
              <rect
                y={yScale(o)}
                x={0}
                height={rw}
                width={width}
                fill={ p && p.field ? p.field.color : "white"}
                fillOpacity={selected ? 0.75 : 0.5}
                // stroke="lightgray"
                strokeWidth={1}
                // stroke={highlightOrders.indexOf(o) >= 0 ? "black" : "lightgray"}
                // strokeWidth={highlightOrders.indexOf(o) >= 0 ? 2 : 1}
                stroke={ highlight ? "black" : "lightgray"}
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
            let bp = showKb(Math.pow(4, 14 - o))
            return <g key={o} onMouseMove={(e) => handleHover(e, o)} onMouseLeave={() => handleLeave()}>
              <text
                y={yScale(o) + 2*rw/3}
                x={width / 2}
                textAnchor="middle"
                fontFamily="Courier"
                fontSize={9}
                // stroke="#333"
                fill="#111"
                paintOrder="stroke"
                fontWeight={highlightOrders.indexOf(o) >= 0 ? "bold" : "normal"}
                pointerEvents="none"
                >
                {bp}
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
              pointerEvents="none"
              fontWeight={"bold"}
            >
              Path
            </text>
          }
        </g> : null}

      </svg>
      <Tooltip ref={tooltipRef} orientation={tipOrientation} contentFn={tooltipContent} enforceBounds={false} />
      <Tooltip ref={scoreTooltipRef} orientation={tipOrientation} contentFn={scoreTooltipContent} enforceBounds={false} />
    </div>
  )
}