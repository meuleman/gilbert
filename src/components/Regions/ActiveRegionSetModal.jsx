import { useState, useCallback, useEffect, useContext, memo } from 'react'

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
  onSelect = () => {},
} = {}) => {

  const { 
    activeSet, 
    activeRegions, 
    activeFilters,
    filteredRegionsLoading,
    filteredActiveRegions,
    regionSetEnrichments,
    regionSetEnrichmentsLoading,
    setActiveSet,
    setActiveFilters,
  } = useContext(RegionsContext)

  const [regions, setRegions] = useState([])
  useEffect(() => {
    if(filteredActiveRegions) {
      setRegions(filteredActiveRegions)
    } else if (activeRegions) {
      setRegions(activeRegions)
    } else {
      setRegions([])
    }
  }, [activeRegions, filteredActiveRegions])

  const handleDeselect = useCallback(() => {
    setActiveSet(null)
    setActiveFilters([])
  }, [setActiveSet, setActiveFilters])

  const handleDownload = useCallback((set) => {
    download(activeRegions, set.name)
  }, [activeRegions])

  const handleFactorSelect = useCallback((f) => {
    const exists = activeFilters.some(filter => 
      filter.index === f.index && 
      filter.layer.datasetName === f.layer.datasetName
    )
    if (!exists) {
      setActiveFilters([...activeFilters, f])
    }
  }, [setActiveFilters, activeFilters])

  const [expandedRows, setExpandedRows] = useState(new Set())

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

  const [activeTab, setActiveTab] = useState('table')

  return (
    <div className={`${styles['active-regionsets-modal']} ${show ? styles.show : ''}`}>
      <div className={styles.content}>
        {/* <div className={styles.manage}>
          <span className={styles['set-name']}>{activeSet?.name}</span>
          {filteredActiveRegions ? 
            <span className={styles['set-count']}>{filteredActiveRegions?.length} / {activeRegions?.length} total regions</span> :
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
                  {f.label}: {f.score.toFixed(3)}, ~{f.percent.toFixed(0)}%
                <button>➕</button>
              </span>)}
              </span>
            </div>
          : null}
         </div>

         
        
        <div className={`${styles.section} ${styles['region-sets']}`}>
          <div className={styles['region-sets-header']}>
            {filteredRegionsLoading ? <h3><Loading text="Loading filtered regions..."/> </h3> :
            <div>
              {/* <h3> {filteredActiveRegions?.length} / {activeRegions?.length} regions</h3> */}
              <h3>
                {`${
                  filteredActiveRegions?.length
                } selected ${
                  filteredActiveRegions?.length === 1 ? "region" : "regions"
                }${activeFilters?.length > 0 ? ` showing ${activeFilters.map(f => f.field).join(", ")}` : ""}`}
              </h3>
            </div>
            }
          </div>

          <div className={styles.tabs}>
            <button 
              className={`${styles.tab} ${activeTab === 'table' ? styles.active : ''}`}
              onClick={() => setActiveTab('table')}
            >
              Table
            </button>
            <button 
              className={`${styles.tab} ${activeTab === 'summary' ? styles.active : ''}`}
              onClick={() => setActiveTab('summary')}
            >
              Summary
            </button>
          </div>

          {activeTab === 'summary' ? (
            <div className={styles['summary-view']}>
              <p>Summary view placeholder</p>
            </div>
          ) : (
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
                  // const effectiveRegions = []  // can get rid of
    
                  return (
                    <>
                      <tr key={index}>
                        <td style={{ width: '80%' }}>
                          {showPosition(region)} 
                          {!!activeFilters.length && filteredActiveRegions?.length > 0 && 
                            <span 
                              className={styles['effective-count']}
                              onClick={() => toggleExpand(regionKey)}
                              style={{ cursor: 'pointer' }}
                            >
                              {/* ({region.subregion ? 1 : 0} subregions) */}
                              {/* {expandedRows.has(regionKey) ? ' 🔽' : ' ▶️'} */}
                            </span>
                          }
                        </td>
                        {regions?.[0]?.score && <td style={{ width: '10%' }}>{region.score?.toFixed(3)}</td>}
                        <td style={{ width: '10%' }}>
                          <button onClick={() => onSelect(region, region)}>🔍</button>
                        </td>
                      </tr>
                      {/* {expandedRows.has(regionKey) && [region.subregion].map((subregion, subregionIndex) => (
                        <tr 
                          key={`${regionKey}-effective-${subregionIndex}`}
                          className={styles['effective-row']}
                        >
                          <td style={{ width: '80%', paddingLeft: '2em' }}>
                            {showPosition(subregion)}
                          </td>
                          {<td style={{ width: '10%' }}>{region.score?.toFixed(3)}</td>}
                          <td style={{ width: '10%' }}>
                            <button onClick={() => onSelect(subregion, region)}>🔍</button>
                          </td>
                        </tr>
                      ))} */}
                    </>
                  )
                })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
export default memo(ActiveRegionSetModal)
