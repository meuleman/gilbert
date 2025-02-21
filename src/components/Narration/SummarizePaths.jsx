// A component to display narration when clicking over hilbert cells

import { useState, useEffect, useMemo } from 'react'
import { groups } from 'd3-array'
import {Tooltip} from 'react-tooltip';
import { showKbOrder } from '../../lib/display'
import './SummarizePaths.css'


const FactorBar = (factor, index) => {
  return (

    <div key={"factor-" + index}
    className='path-summary-factor'
    >
      <div
        data-tooltip-id={`factor-tooltip-${index}`}
        data-tooltip-html={`${factor.field}<br>${factor.layerName}<br>Count: ${factor.count}<br>Orders: ${factor.topOrders?.map(o => `${showKbOrder(o[0]).join("")}: ${o[1].length}`).join(', ')}`}
      >
      <div className="path-summary-factor-percent"
        style={{
          width: `${factor.count / factor.total * 100}%`,
          backgroundColor: factor.color,
        }}>
      </div>
      <div className="path-summary-factor-name">
        <span>{factor.field} ({showKbOrder(factor.order)})</span>
        <span>{Math.round(factor.count / factor.total * 100)}%</span>
      </div>

      </div>
      <Tooltip key={`tooltip-factor-${index}`} id={`factor-tooltip-${index}`} />
    </div>
  )
}

const SummarizePaths = ({
  topNarrations,
  show = false,
  N=5,
} = {}) => {
  // const [pathSummary, setPathSummary] = useState("")
  const [topFactors, setTopFactors] = useState([])
  useEffect(() => {
    if(!topNarrations || !topNarrations.length) return
    // collect all the factors that are preferentially listed in the top paths
    let preferentialFactors = topNarrations.flatMap(path => 
      path.path.filter(d => d.field)
      .map(s => 
        ({
          field: s.field?.field, 
          value: s.field?.value, 
          layerName: (s.layer?.labelName ? s.layer?.labelName : s.layer?.name), 
          dataType: s.layer?.name.toLowerCase().indexOf("occ") > -1 ? "occ" : s.layer?.name.toLowerCase().indexOf("enr") > -1 ? "enr" : "variant",
          order: s.order, 
          color: s.field?.color
        })
      )
      // TODO: do we want to filter these "low signal" or not?
      .filter(d => d.dataType === "enr" ? d.value > 1 : d.value > 0.2)
    )
    // count the occurrence of each factor, sort by count, and take the top N
    let topFactors = groups(preferentialFactors, d => d.field + "|" + d.layerName)
      .map(([key, values]) => {
        let [field, layerName] = key.split("|")
        let count = values.length
        let color = values[0].color
        let topOrders = groups(values, d => d.order)
          .sort((a, b) => b[1].length - a[1].length)
        return { field, layerName, count, color, topOrders, order: topOrders[0][0], total: topNarrations.length }
      })
      .sort((a, b) => b.count - a.count)
      // .slice(0, N)

    // add top N factors to the summary
    if (topFactors.length) {
      setTopFactors(topFactors)
    } else {
      setTopFactors([])
    }

  }, [topNarrations, N])

  const groupedFactors = useMemo(() => {
    let filtered = topFactors.filter(f => f.count / f.total > 0.10)
    return groups(filtered, d => d.layerName).sort((a, b) => b[1][0].count - a[1][0].count)
  }, [topFactors])

  return (
    <div className={'path-summary' + (show ? ' show' : ' hide')}>
      {!topFactors?.length && <div>No factors found</div>}
      {groupedFactors.map((g, j) => {
        return (
          <div key={"group-" + j}>
            <div className='path-summary-datatype'>
              {g[0]}s
            </div>
            {g[1].slice(0, N).map(FactorBar)}
          </div>
        )
      })}
      {/* {topFactors?.map(FactorBar)} */}

    </div>
  )
}
export default SummarizePaths