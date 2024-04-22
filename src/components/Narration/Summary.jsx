import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { urlify } from '../../lib/regions'

import './Summary.css'

function processFactors(factors) {
  factors.sort((a, b) => b.field.value - a.field.value)
  const uniqueMap = {}
  factors.forEach(f => {
    if(!uniqueMap[f.field.field]) {
      uniqueMap[f.field.field] = f
    } else if (uniqueMap[f.field.field].field.value < f.field.value) {
      uniqueMap[f.field.field] = f
    }
  })
  return Object.values(uniqueMap)
}

function Factor({
  factor,
  onHover = () => {},
  onClick = () => {}
} = {}) {
  return <>
    { factor ? <div className="factor" onMouseEnter={() => onHover(factor.path)} onClick={() => onClick(factor.path)}>
      <b style={{color: factor.field.color}}>{factor.field.field}</b>: {factor.field.value.toFixed(2)} 
      (order {factor.order})
      <span className="summary-layer-links"> 
        <Link to={`/?region=${urlify(factor.region)}`}> 🗺️ </Link>
        <Link to={`/region?region=${urlify(factor.region)}`}> 📄 </Link>
      </span> 
    </div>
      : null }
  </> 

}

function Summary({
  order,
  paths = [],
  onHover = () => {},
  onClick = () => {}
} = {}) {

  const [aboveFactors, setAboveFactors] = useState([])
  const [orderFactors, setOrderFactors] = useState([])
  const [belowFactors, setBelowFactors] = useState([])

  useEffect(() => {
    const above = []
    const below = []
    const current = []
    paths.forEach(p => {
      p.path.forEach(d => {
        if(!d) return;
        if(d.order == order) {
          current.push({...d, path: p})
        } else if (d.order < order) {
          above.push({...d, path: p})
        } else if (d.order > order) {
          below.push({...d, path: p})
        }
      })
    })
    
    // console.log("above", above)
    // console.log("current", current)
    // console.log("below", below)
    // console.log("above", processFactors(above))
    // console.log("current", processFactors(current))
    // console.log("below", processFactors(below))
    setAboveFactors(processFactors(above))
    setBelowFactors(processFactors(below))
    setOrderFactors(processFactors(current))
  }, [order, paths])

  return <div className="region-summary" style={{"border": "1px solid gray", "margin": "1rem"}}>
    <div>
      <h3>Above</h3>
      <div className="factor-list">
        {aboveFactors.map(f => <Factor key={f.field.field} factor={f} onHover={onHover} onClick={onClick} />)}
      </div>
    </div>
    <div>
      <h3>Current</h3>
      <div className="factor-list">
        {orderFactors.map(f => <Factor key={f.field.field} factor={f} onHover={onHover} onClick={onClick} />)}
      </div>
    </div>
    <div>
      <h3>Below</h3>
      <div className="factor-list">
        {belowFactors.map(f => <Factor key={f.field.field} factor={f} onHover={onHover} onClick={onClick} />)}
      </div>
    </div>
  </div>
}

export default Summary