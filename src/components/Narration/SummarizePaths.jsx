// A component to display narration when clicking over hilbert cells

import { useState, useEffect, useMemo, useContext, useCallback } from 'react'
import { groups } from 'd3-array'
import {Tooltip} from 'react-tooltip';
import { showKbOrder } from '../../lib/display'
import './SummarizePaths.css'
import RegionsContext from '../Regions/RegionsContext'
import Loading from '../Loading';


const FactorBar = ({ factor, index, handleFactorSelect, handleFactorDeselect }) => {
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
      {!factor.isBlacklisted && (!factor.isFilter ? 
        <button className="filter-button" onClick={() => handleFactorSelect(factor)}>➕</button> :
        <button className="filter-button" onClick={() => handleFactorDeselect(factor)}>❌</button>
      )}

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
  const { activeFilters, setActiveFilters, filteredRegionsLoading, activeSet } = useContext(RegionsContext)

  const handleFactorSelect = useCallback((f) => {
    const exists = activeFilters.some(filter => 
      filter.index === f.index && 
      filter.layer.labelName === f.layer.labelName
    )
    if (!exists) {
      setActiveFilters([...activeFilters, f])
    }
  }, [setActiveFilters, activeFilters])

  const handleFactorDeselect = useCallback((f) => {
    const exists = activeFilters.some(filter => 
      filter.index === f.index && 
      filter.layer.labelName === f.layer.labelName
    )
    if (exists) {
      setActiveFilters(activeFilters.filter(filter => 
        !(filter.index === f.index && 
        filter.layer.labelName === f.layer.labelName)
      ))
    }
  }, [setActiveFilters, activeFilters])
  
  useEffect(() => {
    if(!topNarrations || !topNarrations.length || filteredRegionsLoading) {
      setTopFactors([])
      return
    }
    // collect all the factors that are preferentially listed in the top paths
    let preferentialFactors = topNarrations.flatMap(path => 
      path.path.filter(d => d.field)
      .map(s => 
        ({
          field: s.field?.field, 
          value: s.field?.value, 
          index: s.field?.index,
          layerName: (s.layer?.labelName ? s.layer?.labelName : s.layer?.name), 
          layer: s.layer,
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
        let layer = values[0].layer
        let index = values[0].index
        let label = `${field} ${layer.name}`
        let id = `${layer.name}:${index}`
        let topOrders = groups(values, d => d.order)
          .sort((a, b) => b[1].length - a[1].length)
        return { 
          field, layerName, layer, index, label, 
          id, count, color, topOrders, order: topOrders[0][0], 
          total: topNarrations.length, 
          isFilter: activeFilters.some(filter => 
            filter.index === index && 
            filter.layer.labelName === layer.labelName
          ),
          isBlacklisted: activeSet?.factor?.field === field && activeSet?.factor?.layer?.labelName === layer.labelName
        }
      })
      // .slice(0, N)

    // add any active filters that are no longer in the top factors
    let extraFilters = activeFilters.filter(f =>
      !topFactors.some(d => d.field === f.field && d.layer.labelName === f.layer.labelName)
    )
    extraFilters.forEach(f => {
      f.isFilter = true,  // ensure isFilter is true
      f.count = 0  // count is now 0 by definition, but need to reset
    })
    // sort by whether it is a filter, then by count
    topFactors = topFactors.concat(extraFilters).sort((a, b) => {
      if (a.isFilter && !b.isFilter) {
        return -1
      } else if (!a.isFilter && b.isFilter) {
        return 1
      } else {
        return b.count - a.count
      }
    })
    if (topFactors.length) {
      setTopFactors(topFactors)
    } else {
      setTopFactors([])
    }

  }, [topNarrations, N, filteredRegionsLoading])

  const groupedFactors = useMemo(() => {
    let filtered = topFactors.filter(f => f.count / f.total > 0 || f.isFilter)
    return groups(filtered, d => d.layerName).sort((a, b) => b[1][0].count - a[1][0].count)
  }, [topFactors])

  return (
    <div className={'path-summary' + (show ? ' show' : ' hide')}>
      {filteredRegionsLoading ? <Loading text="Loading top factors..."/> : !topFactors?.length && <div>No factors found</div>}
      {groupedFactors.map((g, j) => {
        return (
          <div key={"group-" + j}>
            <div className='path-summary-datatype'>
              {g[0]}s
            </div>
            {/* {g[1].slice(0, N).map(FactorBar)} */}
            {g[1].slice(0, N + g[1].filter(d => d.isFilter).length).map((factor, index) => (
              <FactorBar 
                factor={factor} 
                index={index} 
                handleFactorSelect={handleFactorSelect} 
                handleFactorDeselect={handleFactorDeselect}
              />
            ))}
          </div>
        )
      })}
      {/* {topFactors?.map(FactorBar)} */}

    </div>
  )
}
export default SummarizePaths