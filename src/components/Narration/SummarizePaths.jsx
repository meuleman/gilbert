// A component to display narration when clicking over hilbert cells

import { useState, useEffect } from 'react'
import { showKb } from '../../lib/display'
import './SummarizePaths.css'

const SummarizePaths = ({
  topFullCSNS,
  N=3,
} = {}) => {
  const [pathSummary, setPathSummary] = useState("")
  useEffect(() => {
    // collect all the factors that are preferentially listed in the top paths
    let preferentialFactors = topFullCSNS.flatMap(path => path.path.map(s => ({field: s.field?.field, layerName: s.layer?.name, order: s.order})))
    // count the occurrence of each factor, sort by count, and take the top N
    let topFactors = Object.entries(preferentialFactors.reduce((acc, factor) => {
      if (factor.field && factor.layerName) {
        let key = `${factor.field}|${factor.layerName}`
        acc[key] = {count: (acc[key]?.count || 0) + 1, orders: (acc[key]?.orders || []).concat(factor.order)}
      }
      return acc
    }, {})).map(([factor, value]) => ({factor, count: value.count, orders: value.orders})).sort((a, b) => b.count - a.count).slice(0, N)

    // add top N factors to the summary
    if (topFactors.length) {
      // let summary = `Out of ${topFullCSNS.length} paths, `
      let summary = ""
      topFactors.forEach((factor, i) => {
        let [factorName, dataset] = factor.factor.split("|")
        // find the most prominent order for this factor
        let topOrder = Object.entries(factor.orders.reduce((acc, order) => {
          acc[order] = (acc[order] || 0) + 1
          return acc
        }, {})).map(([order, count]) => ({order, count})).sort((a, b) => b.count - a.count)[0]
        // convert order to scale
        let topScale = showKb(4 ** (14 - parseInt(topOrder.order)))
        summary += `${factorName} (${parseInt((factor.count / topFullCSNS.length) * 100)}%, ${topScale})`

        // summary += `${factor.count} preferentially list ${factorName} (${dataset}, ${topScale})`
        
        // if ((i < topFactors.length - 1) && (topFactors.length > 2)) {
        //   summary += ", "
        // } 
        // if (i == topFactors.length - 2) {
        //   summary += " and "
        // }
        // if (i == topFactors.length - 1) {
        //   summary += "."
        // }
        if (i < topFactors.length - 1) {
          summary += ", "
        } else {
          summary += "."
        }
      })

      setPathSummary(summary)
    } else {setPathSummary("")}

  }, [topFullCSNS])

  return (
    <div className='path-summary'>{pathSummary}</div>
  )
}
export default SummarizePaths