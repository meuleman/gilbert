import { useState, useCallback, useEffect, useContext } from 'react'

import { showPosition, showKbOrder } from '../../lib/display'
import {Tooltip} from 'react-tooltip';
import { download } from '../../lib/regionsets'
import RegionsContext from './RegionsContext'
import FactorSearch from '../FactorSearch';
import Loading from '../Loading';

import styles from './ActiveRegionSetModal.module.css'

// const FILTER_MAX_REGIONS = 1000

function filterMatch(f1, f2) {
  return f1.index === f2.index && f1.layer.datasetName === f2.layer.datasetName
}
function inFilters(filters, f) {
  return filters.some(filter => filterMatch(filter, f))
}

const ActiveRegionSetModal = ({
  show = false,
  selectedRegion = null,
  hoveredRegion = null,
  onSelect = () => {},
} = {}) => {

  const { 
    activeSet, 
    activeRegions, 
    activeFilters,
    effectiveRegions,
    effectiveRegionsLoading,
    effectiveMap,
    filteredBaseRegions,
    regionSetEnrichments,
    regionSetEnrichmentsLoading,
    numTopRegions, 
    setNumTopRegions, 
    activePaths, 
    setActiveSet,
    setActiveFilters,
  } = useContext(RegionsContext)

  // const { hasFilters, setFilters, listFilters } = useContext(FiltersContext)

  const [regions, setRegions] = useState([])
  useEffect(() => {
    if(filteredBaseRegions) {
      setRegions(filteredBaseRegions)
    } else if (activeRegions) {
      setRegions(activeRegions)
    } else {
      setRegions([])
    }
  }, [activeRegions, filteredBaseRegions])

  const handleDeselect = useCallback(() => {
    setActiveSet(null)
    setActiveFilters([])
    // setFilters({})
  }, [setActiveSet])

  const handleDownload = useCallback((set) => {
    download(activeRegions, set.name)
  }, [activeRegions])

  const handleNumRegions = useCallback((e) => {
    setNumTopRegions(+e.target.value)
  }, [setNumTopRegions])

  const handleFactorSelect = useCallback((f) => {
    // Check if factor with same index and dataset already exists
    console.log("add factor", f)
    const exists = activeFilters.some(filter => 
      filter.index === f.index && 
      filter.layer.datasetName === f.layer.datasetName
    )
    if (!exists) {
      setActiveFilters([...activeFilters, f])
    }
  }, [setActiveFilters, activeFilters])

  // Add new state for tracking expanded rows
  const [expandedRows, setExpandedRows] = useState(new Set())

  // Add toggle handler
  const toggleExpand = useCallback((regionKey) => {
    setExpandedRows(prev => {
      const next = new Set(prev)
      if (next.has(regionKey)) {
        next.delete(regionKey)
      } else {
        next.add(regionKey)
      }
      return next
    })
  }, [])

  return (
    <div className={`${styles['active-regionsets-modal']} ${show ? styles.show : ''}`}>
      <div className={styles.content}>
        {/* <div className={styles.manage}>
          <span className={styles['set-name']}>{activeSet?.name}</span>
          {filteredBaseRegions ? 
            <span className={styles['set-count']}>{filteredBaseRegions?.length} / {activeRegions?.length} total regions</span> :
            <span className={styles['set-count']}>{activeRegions?.length} total regions</span>}
          
          <div className={styles.buttons}>
            <button data-tooltip-id={`active-deselect`} onClick={handleDeselect}>❌</button>
            <Tooltip id={`active-deselect`}>
              Deselect active region set
            </Tooltip>
            <button data-tooltip-id={`active-download-regions`}
              onClick={() => handleDownload(activeSet)}
            >
              ⬇️
            </button>
            <Tooltip id={`active-download-regions`}>
              Download {activeRegions?.length} regions to BED file
            </Tooltip>

          </div>
        </div> */}

        <div className={styles.section}>
          <h3>Filter</h3>
          <FactorSearch onSelect={(f) => handleFactorSelect(f.factor)}/>
          
          {activeFilters?.length ? <div className={`${styles['active-filters']}`}>
              <span>Active filters: </span>
              <span className={styles['active-filters-list']}>
              {activeFilters.map((f,i) => 
                <span key={f.label} className={styles['active-filter']} style={{border: `1px solid ${f.color}`}}>
                  <span className={styles['active-filter-color']} style={{backgroundColor: f.color}}>
                  </span>
                  {f.label}
                <button onClick={() => setActiveFilters(activeFilters.slice(0, i).concat(activeFilters.slice(i+1)))}>❌</button>
              </span>)}
              </span>
            </div>
          : null}

          {regionSetEnrichmentsLoading ? <div className={`${styles['region-set-enrichments']}`}>
            <Loading text="Loading suggested filters..."/>
          </div> : null}
          {!regionSetEnrichmentsLoading && regionSetEnrichments?.length ? <div className={`${styles['region-set-enrichments']}`}>
              <span>Suggested filters: </span>
              <span className={styles['region-set-enrichments-list']}>
              {regionSetEnrichments.filter(f => !inFilters(activeFilters, f)).map((f,i) => 
                <span onClick={() => handleFactorSelect(f)} key={"enrichment-" + f.label} className={styles['region-set-enrichment']} style={{border: `1px solid ${f.color}`}}>
                  <span className={styles['active-filter-color']} style={{backgroundColor: f.color}}>
                  </span>
                  {f.label}: {f.score.toFixed(3)}, ~{f.count}%
                <button>➕</button>
              </span>)}
              </span>
            </div>
          : null}
         </div>

         
        
        <div className={`${styles.section} ${styles['region-sets']}`}>
          <div className={styles['region-sets-header']}>
            {effectiveRegionsLoading ? <h3><Loading text="Loading filtered regions..."/> </h3> :
            <div>
              <h3> {filteredBaseRegions?.length} / {activeRegions?.length} base regions</h3>
              {effectiveRegions?.length ? <h4> {effectiveRegions?.length} effective regions</h4> : null}
            </div>
            }

          </div>
          {/* <h4>Top {numTopRegions} regions used in visualizations</h4> */}

          {/* <div className="top-paths-selector">
            <label>
            <input 
              type="range" 
              min="1" 
              max={Math.min(regions.length, FILTER_MAX_REGIONS)}
              step={1}
              value={numTopRegions} 
              onChange={handleNumRegions} 
            />
          </label> 
        </div>*/}

          <div className={styles['table-body-container']} style={{ fontSize: '12px' }}>
            <table style={{ width: '100%', tableLayout: 'fixed' }}>
              <thead>
                <tr>
                  <th style={{ width: '80%' }}>Position</th>
                  {regions?.[0]?.score && <th style={{ width: '10%' }}>Score</th>}
                  <th style={{ width: '10%' }}>Select</th>
                  {/* <th style={{ width: '10%' }}>Path Score</th> */}
                </tr>
              </thead>
              <tbody>
              {regions.map((region, index) => {
                const regionKey = `${region.order}:${region.chromosome}:${region.i}`
                const effectiveRegions = effectiveMap?.get(regionKey) || []
    
                return (
                  <>
                    <tr key={index}>
                      <td style={{ width: '80%' }}>
                        {showPosition(region)} 
                        {!!activeFilters.length && effectiveRegions.length > 0 && 
                          <span 
                            className={styles['effective-count']}
                            onClick={() => toggleExpand(regionKey)}
                            style={{ cursor: 'pointer' }}
                          >
                            ({effectiveRegions.length} effective)
                            {expandedRows.has(regionKey) ? ' 🔽' : ' ▶️'}
                          </span>
                        }
                      </td>
                      {regions?.[0]?.score && <td style={{ width: '10%' }}>{region.score?.toFixed(3)}</td>}
                      <td style={{ width: '10%' }}>
                        <button onClick={() => onSelect(region, region)}>🔍</button>
                      </td>
                    </tr>
                    {expandedRows.has(regionKey) && effectiveRegions.map((effectiveRegion, effectiveIndex) => (
                      <tr 
                        key={`${regionKey}-effective-${effectiveIndex}`}
                        className={styles['effective-row']}
                      >
                        <td style={{ width: '80%', paddingLeft: '2em' }}>
                          {showPosition(effectiveRegion)}
                        </td>
                        {<td style={{ width: '10%' }}>{effectiveRegion.score?.toFixed(3)}</td>}
                        <td style={{ width: '10%' }}>
                          <button onClick={() => onSelect(effectiveRegion, region)}>🔍</button>
                        </td>
                      </tr>
                    ))}
                  </>
                )
              })}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  )
}
export default ActiveRegionSetModal
