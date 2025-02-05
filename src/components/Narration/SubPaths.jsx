import { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { scaleLinear } from 'd3-scale';
import { range } from 'd3-array';
import { showFloat, showKb } from '../../lib/display';
import { variantChooser } from '../../lib/csn';
import { showKbOrder } from '../../lib/display';
import './Line.css';

import Tooltip from '../Tooltips/Tooltip';
import { tooltipContent } from './FactorTooltip'

import PropTypes from 'prop-types';


function factorTooltipContent(factor) {
  return (
    <div style={{display: 'flex', flexDirection: 'column', borderColor: factor.color, gap: 2}}>
       <span>
        <span style={{ display: 'inline-block', width: 10, height: 10, marginRight: 4, backgroundColor: factor.color }}></span>
        <span>{factor.factorName} ({factor.topSegment.score.toFixed(2)})</span>
       </span>
       <span>{showKbOrder(factor.topSegment.order)}</span>
       <span>{factor.layer.name}</span>
    </div>
  )
}

SubPaths.propTypes = {
  csn: PropTypes.object,
  factors: PropTypes.array,
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
  onFactor: PropTypes.func,
  onSubpathBack: PropTypes.func
};

export default function SubPaths({
  csn,
  factors,
  subpathCollection,
  order,
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
  onFactor= () => {},
  onSubpathBack= () => {}
}) {
  const tooltipRef = useRef(null)
  
  const [or, setOr] = useState(order)
  useEffect(() => {
    setOr(order)
  }, [order])

  const factorsByOrder = useMemo(() => {
    let facs = {}
    if(!factors) return facs
    factors.forEach(f => {
      let o = f.topSegment.order
      let score = f.topSegment.score
      if(!facs[o]) facs[o] = []
      facs[o].push({factor: f, score} )
      facs[o].sort((a, b) => b.score - a.score)
    })
    console.log("factors", factors)
    console.log("facs", facs)
    return facs
  }, [factors])

  const [path, setPath] = useState([])
  const [chosenFactorOrder, setChosenFactorOrder] = useState(0)
  useEffect(() => {
    // console.log(csn, order)
    if(csn?.path){
      let mfo = 0 // max factor order
      // console.log("csn.path",csn)
      let p = csn.path.filter(d => !!d).sort((a, b) => a.order - b.order) 
      if(csn.variants && csn.variants.length) {
        // let v = csn.variants.sort((a,b) => b.topField.value - a.topField.value)[0]
        let v = variantChooser(csn.variants)
        // console.log("top variant line ",v)
        p = p.filter(d => d.order !== 14);
        p.push({field: v.topField, layer: v.layer, order: 14, region: v})
      }
      setPath(p)
      p.forEach(d => {
        if(d?.field?.value && d.order > mfo) mfo = d.order
      })
      setChosenFactorOrder(mfo)
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

  const handleClick = useCallback((e, f) => {
    onFactor(f)
    tooltipRef.current.hide()
  }, [onFactor])

  const handleHover = useCallback((e, f) => {
    const svg = e.target.ownerSVGElement
    const rect = svg.getBoundingClientRect();

    const my = e.clientY - rect.y
    const xoff = tipOrientation === "left" ? -5 : width + 5
    let x = rect.x + xoff + offsetX
    let y = rect.y + my + 1.5
    tooltipRef.current.show(f, null, x, y)
  }, [offsetX, tipOrientation, width])

  const handleLeave = useCallback(() => {
    tooltipRef.current.hide()
  }, [])

  return (
    <div className="csn-line">
      <svg width={width} height={height} onMouseLeave={() => handleLeave()}>
        {path.length && yScale ? <g>

          {range(4, 15).map(o => {
            // let p = path.find(d => d.order == o)
            let facs = factorsByOrder[o]
            if(facs?.length) {  //  || o === chosenFactorOrder
              return <g key={o}
                 
                // onMouseLeave={() => handleLeave()}
                >
                  <rect
                  y={yScale(o)}
                  x={0}
                  height={rw}
                  width={width}
                  fill={ "white" }
                  strokeWidth={1}
                  stroke="lightgray"
                  fillOpacity={0.01}
                />
                
              </g>
            }
          })}
        </g> : null}

        {/* {showOrderLine ? <line 
          y1={yScale(or)} 
          y2={yScale(or)} 
          x1={0}
          x2={width}
          stroke="black"
          strokeWidth={2}
          pointerEvents="none"
          /> : null} */}
          
        {factors?.length && yScale ? <g>
          {range(4, 15).map(o => {
            let facs = factorsByOrder[o]
            if(facs?.length) {
              return facs.map((f,i) => {
                const rectSize = 8;
                const spacing = 2;
                const rectsPerRow = Math.floor(width / (rectSize + spacing));
                const row = Math.floor(i / rectsPerRow);
                const col = i % rectsPerRow;
                const x = 2 + col * (rectSize + spacing);
                const y = 2 + yScale(o) + row * (rectSize + spacing);
                
                return <rect
                  key={`${o}-${i}`}
                  onClick={(e) => handleClick(e, f.factor)}
                  onMouseMove={(e) => handleHover(e, f.factor)}
                  x={x}
                  y={y} 
                  width={rectSize}
                  height={rectSize}
                  fill={f.factor.color}
                  stroke="none"
                  style={{"cursor": "pointer"}}
                />;
              })
            }
          })}
        </g> : null}

        {chosenFactorOrder && subpathCollection?.length && (
          <g>
            <rect
              y={yScale(chosenFactorOrder)}
              x={0}
              height={rw}
              width={width}
              fill={ "white" }
              strokeWidth={1}
              stroke="lightgray"
              fillOpacity={0.01}
            />
            <text 
              onClick={onSubpathBack}
              x={rw * .25} 
              y={yScale(chosenFactorOrder) + rw * .67}
              style={{cursor: "pointer"}}
            >❌</text>
          </g>
        )}

      </svg>
      <Tooltip ref={tooltipRef} orientation={tipOrientation} contentFn={factorTooltipContent} enforceBounds={false} />
    </div>
  )
}