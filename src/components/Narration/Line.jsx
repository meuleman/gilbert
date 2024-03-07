import { useState, useEffect, useMemo } from 'react';
import { scaleLinear } from 'd3-scale';
import { range } from 'd3-array';
import { showFloat } from '../../lib/display';

import './Line.css';

import PropTypes from 'prop-types';

Line.propTypes = {
  csn: PropTypes.object.isRequired,
  order: PropTypes.number.isRequired,
  highlight: PropTypes.bool,
  width: PropTypes.number,
  height: PropTypes.number.isRequired,
  onHover: PropTypes.func
};


export default function Line({
  csn,
  order,
  highlight=false,
  width = 500,
  height,
  onHover = () => {}
}) {
  
  const [path, setPath] = useState([])
  useEffect(() => {
    // console.log(csn, order)
    if(csn?.path){
      const p =csn.path.filter(d => !!d).sort((a, b) => a.order - b.order) 
      setPath(p)
    }
  }, [csn, order])

  const [rw, setRw] = useState(height/2)

  const depth = 14 - 4
  const spacing = width/(depth + 1)
  const w = width - spacing
  const xScale = useMemo(() => scaleLinear().domain([4, 14]).range([0, w]), [width])
  useEffect(() => {
    setRw(height/3)
  }, [width, height])

  return (
    <div className="csn-line" onMouseEnter={() => onHover(csn)}>
      
      <svg width={width} height={height}>
        <line 
          x1={xScale(4)} 
          x2={xScale(14)+rw} 
          y1={height/2+rw/2} 
          y2={height/2+rw/2} 
          stroke={highlight ? "black" : "lightgray" }
          strokeWidth={highlight ? 2 : 1} />

        {path.length && xScale ? <g>
          {range(4, 15).map(o => {
            let p = path.find(d => d.order == o)
            return <g key={o}>
              <rect
                x={xScale(o)}
                y={height/2 - rw/2}
                width={rw}
                height={rw}
                fill={ p ? p.field.color : "white"}
                stroke={ highlight ? "black" : "lightgray"}
              />
              <text
                x={xScale(o) + rw/2}
                y={height/2}
                dx={rw}
                dy=".35em"
                fontSize="12"
                fontFamily="monospace"
                fill={ p ? p.field.color : "white"}
                stroke={ p ? "black" : "lightgray"}
                paintOrder="stroke">
                  { p ? p.field.field : null}
                </text>
              </g>
          })}
          
        </g> : null }
        <text x={xScale(14) + 20} y={height/2 - rw/2} dy=".35em" fontSize="12" fontFamily="monospace" fill="black">Score: {showFloat(csn?.score)}</text>
        <text x={xScale(14) + 20} y={height/2 + rw/2} dy=".35em" fontSize="12" fontFamily="monospace" fill="black">Paths: {csn.members}</text>
      </svg>
    </div>
  )
}