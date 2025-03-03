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
    setActiveSet,
    setActiveFilters,
  } = useContext(RegionsContext)

  const [regions, setRegions] = useState([])
  useEffect(() => {
    if(filteredActiveRegions) {
      setRegions(filteredActiveRegions)
    // } else if (activeRegions) {
    //   setRegions(activeRegions)
    } else {
      setRegions([])
    }
  }, [filteredActiveRegions])  // activeRegions

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

  return (
    <div className={`${styles['active-regionsets-modal']} ${show ? styles.show : ''}`}>
      <div className={styles.content}>        
        <div className={`${styles.section} ${styles['region-sets']}`}>
          <div className={styles['region-sets-header']}>
            {filteredRegionsLoading ? <h3><Loading text="Loading filtered regions..."/> </h3> :
            <div>
              {/* <h3> {filteredActiveRegions?.length} / {activeRegions?.length} regions</h3> */}
              <h3>
                {(() => {
                  // Get region count and text
                  const regionCount = filteredActiveRegions?.length || 0;
                  const regionText = regionCount === 1 ? "region" : "regions";
                  
                  // Build filter fields list if needed
                  let filterInfo = "";
                  if (!!activeSet?.factor || activeFilters?.length > 0) {
                    // Collect all fields from activeSet and activeFilters
                    const fields = [];
                    // Add activeSet factor field if it exists
                    if (activeSet?.factor?.field) fields.push(activeSet.factor.field)
                    // Add all fields from activeFilters
                    fields.push(...activeFilters.map(f => f.field));
                    filterInfo = ` showing ${fields.join(", ")}`;
                  }
                  // Return the full string
                  return `${regionCount} selected ${regionText}${filterInfo}`;
                })()}
              </h3>
            </div>
            }
          </div>
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
        </div>
      </div>
    </div>
  )
}
export default memo(ActiveRegionSetModal)
