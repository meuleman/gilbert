// A component to display narration when clicking over hilbert cells

import { useState, useEffect } from 'react'
import { groups } from 'd3-array'
import {Tooltip} from 'react-tooltip';
import { showKbOrder } from '../../lib/display'
import './SummarizePaths.css'

const SummarizePaths = ({
  topFullCSNS,
  N=5,
} = {}) => {
  const [pathSummary, setPathSummary] = useState("")
  const [topFactors, setTopFactors] = useState([])
  useEffect(() => {
    if(!topFullCSNS || !topFullCSNS.length) return
    // collect all the factors that are preferentially listed in the top paths
    let preferentialFactors = topFullCSNS.flatMap(path => 
      path.path.filter(d => d.field)
      .map(s => 
        ({field: s.field?.field, layerName: s.layer?.name, order: s.order, color: s.field?.color})
      )
    )
    // count the occurrence of each factor, sort by count, and take the top N
    let topFactors = groups(preferentialFactors, d => d.field + "|" + d.layerName)
      .map(([key, values]) => {
        let [field, layerName] = key.split("|")
        let count = values.length
        let color = values[0].color
        let topOrders = groups(values, d => d.order)
          .sort((a, b) => b[1].length - a[1].length)
        return { field, layerName, count, color, topOrders, order: topOrders[0][0] }
      })
      .sort((a, b) => b.count - a.count)
      .slice(0, N)

    // add top N factors to the summary
    if (topFactors.length) {
      setTopFactors(topFactors)
    } else {
      setTopFactors([])
    }

  }, [topFullCSNS, N])

  return (
    <div className='path-summary'>
      {topFactors.map((factor, index) => (
        <div key={factor.factor}
          className='path-summary-factor'
          data-tooltip-id={`factor-tooltip-${index}`}
          data-tooltip-html={`Field: ${factor.field}<br>Layer: ${factor.layerName}<br>Count: ${factor.count}<br>Orders: ${factor.topOrders?.map(o => `${showKbOrder(o[0])}: ${o[1].length}`).join(', ')}`}
        >
          <div className="path-summary-factor-percent"
          style={{
            width: `${factor.count / topFullCSNS.length * 100}%`,
            backgroundColor: factor.color,
          }}>
          </div>
          <div className="path-summary-factor-name">
            <span>{factor.field} ({showKbOrder(factor.order)})</span>
            <span>{Math.round(factor.count / topFullCSNS.length * 100)}%</span>
          </div>
        </div>
      ))}

      {topFactors.map((factor, index) => (
        <Tooltip key={`tooltip-factor-${index}`} id={`factor-tooltip-${index}`} />
      ))}
    </div>
  )
}
export default SummarizePaths