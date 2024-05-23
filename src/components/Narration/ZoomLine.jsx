import { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { scaleLinear } from 'd3-scale';
import { range } from 'd3-array';
import { showFloat, showPosition, showKb } from '../../lib/display';
import { variantChooser } from '../../lib/csn';
import './Line.css';

import Tooltip from '../Tooltips/Tooltip';

import PropTypes from 'prop-types';



function tooltipContent(region, layer, orientation) {
  // let field = layer.fieldChoice(region)
  let fields = []
  if(region.data.max_field >= 0) {
    fields.push(layer.fieldChoice(region))
    // fields.push({ field: region.data.max_field, value: region.data.max_value })
  } else if(region.data.bp) {
    fields.push(layer.fieldChoice(region))
  } else {
    fields = Object.keys(region.data).map(key => ({ field: key, value: region.data[key] }))
      .sort((a,b) => b.value - a.value)
      .filter(d => d.value > 0 && d.field !== "top_fields")
  }
  let layers = region.layers;
  // figure out fullData, which is an object with layerIndex,fieldIndex for each key
  let fullData = region.layers && region.fullData ? Object.keys(region.fullData).map(key => {
    let [layerIndex, fieldIndex] = key.split(",")
    let layer = layers[+layerIndex]
    let field = layer.fieldColor.domain()[+fieldIndex]
    return { layer, field, value: region.fullData[key] }
  }).filter(d => fields.find(f => f.field !== d.field && layer.name !== d.layer.name))
  : []


  
  return (
    <div style={{display: 'flex', flexDirection: 'column'}}>
      <span>{showPosition(region)}</span>
      <span className="position">Order: {region.order}</span>
      <span style={{borderBottom: "1px solid gray", padding: "4px", margin: "4px 0"}}>{layer.name}</span>
      {fields.map((f,i) => (
        <div key={i} style={{display: 'flex', flexDirection: 'row', justifyContent: 'space-between'}}>
          <span>
            <span style={{color: layer.fieldColor(f.field), marginRight: '4px'}}>⏺</span>
            {f.field} 
          </span>
          <span>
            {typeof f.value == "number" ? showFloat(f.value) : f.value}
          </span>
        </div>
      ))}
      <span style={{borderBottom: "1px solid gray", padding: "4px", margin: "4px 0"}}>Other factors</span>
      {fullData.map((f,i) => (
        <div key={i} style={{display: 'flex', flexDirection: 'row', justifyContent: 'space-between'}}>
          <span>
            <span style={{color: f.layer.fieldColor(f.field), marginRight: '4px'}}>⏺</span>
            {f.field} 
          </span>
          <span>{f.layer.name}</span>
          <span>
            {typeof f.value == "number" ? showFloat(f.value) : f.value}
          </span>
        </div>
      ))}
    </div>
  )
}
ZoomLine.propTypes = {
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

export default function ZoomLine({
  csn,
  order,
  highlight=false,
  selected=false,
  showOrderLine=true,
  highlightOrders=[],
  text=true,
  width = 50,
  height = 400,
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
  const h = height - spacing - 1
  const yScale = useMemo(() => scaleLinear().domain([4, 14]).range([1, h]), [h])
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

      const xoff = tipOrientation === "left" ? -5 : width + 5
      tooltipRef.current.show({...p.region, fullData: p.fullData, layers: csn.layers}, p.layer, rect.x + xoff, rect.y + my)
    }
    // tooltipRef.current.show(tooltipRef.current, csn)
  }, [csn, path, yScale, rw, onHover])

  const handleLeave = useCallback(() => {
    tooltipRef.current.hide()
  }, [])

  return (
    <div className="csn-line" onClick={() => onClick(csn)}>
      <svg width={width} height={height}>


        {path.length && yScale ? <g>

          {/* {highlightOrders.map(o => {
            return <line 
            key={o}
            y1={yScale(o) + rw/2} 
            y2={yScale(o) + rw/2} 
            x1={0}
            x2={width}
            stroke="black"
            strokeWidth={rw}
            pointerEvents="none"
            />
          })} */}

          {range(4, 15).map(o => {
            let p = path.find(d => d.order == o)
            return <g key={o} onMouseMove={(e) => handleHover(e, o)} onMouseLeave={() => handleLeave()}>
              <rect
                y={yScale(o)}
                x={0}
                height={rw}
                width={width}
                fill={ p ? p.field.color : "white"}
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
                >
                {bp}
              </text>
            </g>
          })}
        </g> : null}

      </svg>
      <Tooltip ref={tooltipRef} orientation={tipOrientation} contentFn={tooltipContent} enforceBounds={false} />
    </div>
  )
}