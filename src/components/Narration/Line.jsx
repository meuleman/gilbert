import { useState, useEffect, useMemo } from 'react';
import { scaleLinear } from 'd3-scale';
import { range } from 'd3-array';
import { showFloat } from '../../lib/display';
import { variantChooser } from '../../lib/csn';
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
  selected=false,
  width = 500,
  height,
  onHover = () => {},
  onClick = () => {}
}) {
  
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

  const [rw, setRw] = useState(height/2)

  const depth = 14 - 4
  const spacing = width/(depth + 1)
  const w = width - spacing*2
  const xScale = useMemo(() => scaleLinear().domain([4, 14]).range([0, w]), [w])
  useEffect(() => {
    setRw(height/3)
  }, [width, height])

  return (
    <div className="csn-line" onMouseEnter={() => onHover(csn)} onClick={() => onClick(csn)}>
      
      <svg width={width} height={height}>
        <line 
          x1={xScale(4)} 
          x2={xScale(15)+rw} 
          // y1={height/2+rw/2} 
          // y2={height/2+rw/2} 
          y1={height-4}
          y2={height-4}
          stroke={selected ? "black" : highlight ? "#aaa" : "lightgray" }
          strokeWidth={highlight ? 2 : 1} />

        {path.length && xScale ? <g>
          {range(4, 15).map(o => {
            let p = path.find(d => d.order == o)
            
            return <g key={o}>
              <rect
                x={xScale(o)}
                // y={height/2 - rw/2}
                y={0}
                width={rw}
                height={height-4}
                fill={ p ? p.field.color : "white"}
                stroke={ highlight ? "black" : "lightgray"}
              />
              <text
                x={xScale(o) + rw/2}
                y={height/2}
                dx={rw}
                dy=".2em"
                fontSize="12"
                fontFamily="monospace"
                fontWeight={o == order ? "bold" : "normal"}
                fill="#333"
                // fill={ p ? p.field.color : "white"}
                // stroke={ p ? "black" : "lightgray"}
                // paintOrder="stroke"
                >
                  { p ? p.field.field : null}
                </text>
              </g>
          })}
          
        </g> : null }
        <text x={xScale(15) + 20} y={height/2 - rw} dy=".35em" fontSize="10" fontFamily="monospace" fill="black">Score: {showFloat(csn?.score)}</text>
        <text x={xScale(15) + 20} y={height/2} dy=".4em" fontSize="10" fontFamily="monospace" fill="black">Paths: {csn.members}</text>
      </svg>
    </div>
  )
}