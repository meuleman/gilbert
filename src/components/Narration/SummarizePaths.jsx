// A component to display narration when clicking over hilbert cells

import { useState, useEffect, useMemo, useContext, useCallback } from 'react'
import { groups } from 'd3-array'
import {Tooltip} from 'react-tooltip';
import { showKbOrder } from '../../lib/display'
import RegionsContext from '../Regions/RegionsContext'
import RegionSetModalStatesStore from '../../states/RegionSetModalStates'
import Loading from '../Loading';
import FactorSearch from '../FactorSearch';


const FactorBar = ({ factor, index, handleFactorSelect, handleFactorDeselect }) => {
  return (
    <div key={"factor-" + index}
      className="relative w-full h-5 border border-separator rounded-sm my-0.5 overflow-hidden"
    >
      <div
        data-tooltip-id={`factor-tooltip-${index}`}
        data-tooltip-html={`${factor.field}<br>${factor.layerName}<br>Count: ${factor.count}<br>Orders: ${factor.topOrders?.map(o => `${showKbOrder(o[0]).join("")}: ${o[1].length}`).join(', ')}`}
        className="h-full w-full"
      >
        <div className="absolute h-5 opacity-50 rounded-sm"
          style={{
            width: `${factor.count / factor.total * 100}%`,
            backgroundColor: factor.color,
          }}>
        </div>
        <div className="absolute inset-0 flex flex-row justify-between px-1 py-0.5 text-xs">
          <span className="truncate pr-6 flex-1">{factor.field}{factor.count ? ` (${showKbOrder(factor.order).join("")})` : ""}</span>
          <span className="whitespace-nowrap pr-6">{factor.score ? `${factor.score?.toFixed(2)}, ` : ""} {Math.round(factor.count / factor.total * 100)}%</span>
        </div>
        {!factor.isBlacklisted && (!factor.isFilter ? 
          <button className="absolute top-0 h-5 right-1 bg-transparent hover:bg-muted rounded px-1.5 py-0 items-center text-xs cursor-pointer" 
            onClick={() => handleFactorSelect(factor)}>➕</button> :
          <button className="absolute top-0 h-5 right-1 bg-transparent hover:bg-muted rounded px-1.5 py-0 items-center text-xs cursor-pointer" 
            onClick={() => handleFactorDeselect(factor)}>❌</button>
        )}
      </div>
    </div>
  )
}

const SummarizePaths = ({
  N=5,
} = {}) => {
  // const [pathSummary, setPathSummary] = useState("")
  const [topFactors, setTopFactors] = useState([])
  const { 
    activeFilters, setActiveFilters, filteredRegionsLoading, 
    topNarrationsLoading, activeSet, regionSetEnrichments, 
    regionSetNarrationLoading, regionSetNarration, regionSetArticles,
    topNarrations
  } = useContext(RegionsContext)

  const { showSummary } = RegionSetModalStatesStore()

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
    if(!topNarrations || !topNarrations.length) return
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
        let score = regionSetEnrichments?.find(e => e.field === field && e.layer.labelName === layer.labelName)?.score
        let topOrders = groups(values, d => d.order)
          .sort((a, b) => b[1].length - a[1].length)
        return { 
          field, layerName, layer, index, label, score,
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
    let extraFilters = activeFilters
    .filter(f =>!topFactors.some(d => d.field === f.field && d.layer.labelName === f.layer.labelName))
    .map(f => {
      return {
        ...f,
        isFilter: true,  // ensure isFilter is true
        count: 0,  // count is now 0 by definition, but need to reset
        layerName: f.layer.labelName ? f.layer.labelName : f.layer.name,
        total: topNarrations.length,
        score: regionSetEnrichments?.find(e => e.field === f.field && e.layer.labelName === f.layer.labelName)?.score,
      }
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

  }, [topNarrations, N, filteredRegionsLoading, regionSetEnrichments])

  const groupedFactors = useMemo(() => {
    let filtered = topFactors.filter(f => f.count / f.total > 0 || f.isFilter)
    return groups(filtered, d => d.layerName).sort((a, b) => b[1][0].count - a[1][0].count)
  }, [topFactors])

  const [activeTab, setActiveTab] = useState('summary')

  const [showArticles, setShowArticles] = useState(false)
  const handleShowArticles = () => {
    setShowArticles(!showArticles)
  }

  return (
    // TODO: remove hardcoded width
    <div className={`h-full w-[24.9375rem] flex-1 overflow-hidden ${showSummary ? 'flex flex-col' : 'hidden'}`}>
      <div className="flex border-b border-separator">
        <button 
          className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${activeTab === 'summary' ? 'border-primary text-primary' : 'border-transparent text-muted-foreground hover:text-foreground'}`}
          onClick={() => setActiveTab('summary')}
        >
          Summary
        </button>
        <button 
          className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${activeTab === 'factors' ? 'border-primary text-primary' : 'border-transparent text-muted-foreground hover:text-foreground'}`}
          onClick={() => setActiveTab('factors')}
        >
          Top Factors
        </button>
      </div>

      {activeTab === 'factors' ? 
      <div className="flex-1 overflow-y-auto p-3 w-full min-w-0">
        <h3 className="text-sm font-semibold mb-2">Filter</h3>
        <div className="mb-2 w-full">
          <FactorSearch onSelect={(f) => handleFactorSelect(f.factor)}/>
        </div>
        {
          filteredRegionsLoading ? <Loading text="Loading top regions..."/> : 
          topNarrationsLoading && <Loading text="Loading top factors..."/>
        }
        <div className="space-y-2">
          {groupedFactors.map((g, j) => {
            return (
              <div key={"group-" + j}>
                <div className="text-xs font-semibold mt-2.5 mb-1">
                  {g[0]}s
                </div>
                {g[1].slice(0, N + g[1].filter(d => d.isFilter).length).map((factor, index) => (
                  <div>
                    <FactorBar 
                      key={index}
                      factor={factor} 
                      index={index} 
                      handleFactorSelect={handleFactorSelect} 
                      handleFactorDeselect={handleFactorDeselect}
                    />
                    <Tooltip key={`tooltip-factor-${index}`} id={`factor-tooltip-${index}`} className="z-10" />
                  </div>
                ))}
              </div>
            )
          })}
        </div>
      </div> : 
      <div className="flex-1 overflow-y-auto p-3">
        <p className="text-sm text-foreground">{regionSetNarrationLoading ? "loading..." : regionSetNarration}</p>
        {!regionSetNarrationLoading && regionSetNarration !== "" &&
        <div className="mt-4">
          <button 
            className="px-2 py-1 text-sm rounded bg-secondary text-secondary-foreground hover:bg-secondary/80 transition-colors"
            onClick={handleShowArticles}
          >
            {showArticles ? "Hide Supporting Articles" : "Show Supporting Articles"}
          </button>
          {showArticles && <div className="mt-3">
            <h3 className="text-sm font-semibold">{regionSetArticles.length} open access PubMed articles found: </h3>
            <div className="mt-2 space-y-2">
              {regionSetArticles.map((a,i) => {
                return (
                  <div key={a.pmc} className="text-xs">
                    <span className="mr-1">{i+1})</span>
                    <a 
                      href={`https://pmc.ncbi.nlm.nih.gov/articles/${a.pmc}/`} 
                      target="_blank" 
                      rel="noreferrer"
                      className="text-primary hover:underline"
                    >
                      {a.full_title}
                    </a>
                  </div>
                )
              })}
            </div>
          </div>}
        </div>}
      </div>
      }
    </div>
  )
}
export default SummarizePaths