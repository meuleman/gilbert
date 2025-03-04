import { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { scaleLinear } from 'd3-scale';
import { range } from 'd3-array';
import { hierarchy, treemap, treemapDice } from 'd3-hierarchy';
import { variantChooser } from '../../lib/csn';
import { showKbOrder } from '../../lib/display';
import './Line.css';

import Tooltip from '../Tooltips/Tooltip';

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
  preview,
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
  fontSize = 9,
  offsetX = 0,
  scoreHeight = 20,
  tipOrientation="left",
  onClick = () => {},
  onHover = () => {},
  onFactor= () => {},
  handleNarrationPreview = () => {},
  removeNarrationPreview = () => {},
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
    // console.log("factors", factors)
    // console.log("facs", facs)
    return facs
  }, [factors])

  const [path, setPath] = useState([])
  const [chosenFactorOrder, setChosenFactorOrder] = useState(0)
  useEffect(() => {
    if(csn?.path){
      let mfo = 0 // max factor order
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

  const handleSubpathHover = useCallback((e, f) => {
    handleNarrationPreview(f)
    const rect = e.currentTarget.getBoundingClientRect();
    const my = e.clientY - rect.y;
    const xoff = tipOrientation === "left" ? -5 : width + 5;
    let x = rect.x + xoff + offsetX;
    let y = rect.y + my + 1.5;
    tooltipRef.current.show(f, null, x, y);
  }, [offsetX, tipOrientation, width, rw, yScale])

  const handleZoom = useCallback((e, o) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const my = e.clientY - rect.y;
    const or = o + my/rw;
    onHover(or);
  }, [rw])

  const handleLeave = useCallback(() => {
    removeNarrationPreview()
    tooltipRef.current.hide()
  }, [])

  return (
    <div className="subpath-container" style={{ width, height, position: "absolute" }}>
      {path.length && yScale
        ? range(4, 15).map(o => {
            let facs = factorsByOrder[o]
            // ensure that preview path is not already showing something for this order
            if(facs?.length && !preview?.path?.find(p => p?.order === o)) {  //  || o === chosenFactorOrder
              // Create a treemap layout for the facs of this order group.
              const root = hierarchy({ children: facs }).sum(d => d.score);
              treemap()
                .size([width, rw])
                .tile(treemapDice)
                .padding(2)(root)
              return (
                <div
                  key={o}
                  onMouseMove={e => handleZoom(e, o)}
                  style={{
                    position: "absolute",
                    left: 0,
                    top: yScale(o),
                    width: width,
                    height: rw,
                    pointerEvents: "all",
                  }}
                >
                  {root.leaves().map((leaf, i) => {
                    return (
                    <div
                      key={`${o}-${i}`}
                      onClick={e => handleClick(e, leaf.data.factor)}
                      onMouseMove={e => handleSubpathHover(e, leaf.data.factor)}
                      onMouseLeave={handleLeave}
                      style={{
                        position: "absolute",
                        left: leaf.x0,
                        top: leaf.y0,
                        width: leaf.x1 - leaf.x0,
                        height: leaf.y1 - leaf.y0,
                        backgroundColor: leaf.data.factor.color,
                        opacity: 0.5,
                        cursor: "pointer",
                        border: "1px solid black",
                      }}
                    />
                  )})}
                </div>
              )
            }
            return null
          })
        : null}

      {chosenFactorOrder && subpathCollection?.length ? (
        <div
          style={{
            position: "absolute",
            left: rw * 0.25 - 4,
            top: yScale(chosenFactorOrder) + rw - 2 * fontSize - 4,
            width: fontSize * 8,
            height: fontSize + 6,
            backgroundColor: "rgba(255, 0, 0, 0.1)",
            border: "1px solid white",
            borderRadius: 3,
            pointerEvents: "all",
          }}
        >
          <span
            onClick={onSubpathBack}
            style={{
              display: "block",
              textAlign: "center",
              fontSize: fontSize,
              cursor: "pointer",
              pointerEvents: "auto",
              lineHeight: `${fontSize + 6}px`,
              opacity: 1,
            }}
          >
            ❌ remove pin
          </span>
        </div>
      ) : null}

      <Tooltip ref={tooltipRef} orientation={tipOrientation} contentFn={factorTooltipContent} enforceBounds={false} />
    </div>
  )
}