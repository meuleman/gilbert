import { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { scaleLinear } from 'd3-scale';
import { range } from 'd3-array';
import { showFloat } from '../../lib/display';
import { variantChooser } from '../../lib/csn';
import './Line.css';

import Tooltip from '../Tooltips/Tooltip';

import PropTypes from 'prop-types';
ZoomLine.propTypes = {
  csn: PropTypes.object.isRequired,
  order: PropTypes.number.isRequired,
  highlight: PropTypes.bool,
  width: PropTypes.number,
  height: PropTypes.number,
  onHover: PropTypes.func,
  onClick: PropTypes.func
};


export default function ZoomLine({
  csn,
  order,
  highlight=false,
  selected=false,
  text=true,
  width = 50,
  height = 400,
  onHover = () => {},
  onClick = () => {}
}) {
  const tooltipRef = useRef(null)
  
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


  const depth = 14 - 4
  const spacing = height/(depth + 1)
  const h = height - spacing
  const yScale = useMemo(() => scaleLinear().domain([4, 14]).range([0, h]), [h])
  const rw = useMemo(() => yScale(5) - yScale(4), [yScale])

  const handleClick = useCallback((e, o) => {
    // const p = path.find(d => d.order === o)
    // if(p) {
    //   onClick(p)
    // }
  }, [path, onClick])

  const handleHover = useCallback((e, o) => {
    tooltipRef.current.hide()
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
      tooltipRef.current.show(p.region, p.layer, rect.x - 5, rect.y + my)
    }
    // tooltipRef.current.show(tooltipRef.current, csn)
  }, [path, yScale, rw, onHover])

  const handleLeave = useCallback(() => {
    tooltipRef.current.hide()
  }, [tooltipRef])

  return (
    <div className="csn-line" onClick={() => onClick(csn)}>
      <svg width={width} height={height}>
        {path.length && yScale ? <g>
          {range(4, 15).map(o => {
            let p = path.find(d => d.order == o)
            return <g key={o} onMouseMove={(e) => handleHover(e, o)} onMouseLeave={() => handleLeave()}>
              <rect
                y={yScale(o)}
                x={0}
                height={yScale(5) - yScale(4)}
                width={width}
                fill={ p ? p.field.color : "white"}
                fillOpacity={selected ? 0.75 : 0.5}
                stroke="lightgray"
                // stroke={ highlight ? "black" : "lightgray"}
              />
            </g>
          })}
        </g> : null}

        <line 
          y1={yScale(or)} 
          y2={yScale(or)} 
          x1={0}
          x2={width}
          stroke="black"
          strokeWidth={2}
          pointerEvents="none"
           />
        {path.length && yScale && text ? <g>
          {range(4, 15).map(o => {
            return <g key={o} onMouseMove={(e) => handleHover(e, o)} onMouseLeave={() => handleLeave()}>
              <text
                y={yScale(o) + 2*rw/3}
                x={o < 10 ? 4 : 1}
                fontFamily="Courier"
                fontSize={12}
                // stroke="#333"
                fill="#111"
                paintOrder="stroke"
                >
                {o}
              </text>
            </g>
          })}
        </g> : null}

      </svg>
      <Tooltip ref={tooltipRef} orientation="left" enforceBounds={false} />
    </div>
  )
}