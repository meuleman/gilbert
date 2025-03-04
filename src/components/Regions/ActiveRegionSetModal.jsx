import { useState, useCallback, useEffect, useContext, memo } from 'react'

import { showPosition, showKbOrder } from '../../lib/display'
import { Tooltip } from 'react-tooltip';
import { download } from '../../lib/regionsets'
import RegionsContext from './RegionsContext'
import FactorSearch from '../FactorSearch';
import Loading from '../Loading';
import AccordionArrow from '@/assets/accordion-circle-arrow.svg?react';
import DetailsIcon from "@/assets/details.svg?react";
import FiltersIcon from "@/assets/filters.svg?react";

import styles from './ActiveRegionSetModal.module.css'

// const FILTER_MAX_REGIONS = 1000

function filterMatch(f1, f2) {
  return f1.index === f2.index && f1.layer.datasetName === f2.layer.datasetName
}
function inFilters(filters, f) {
  return filters.some(filter => filterMatch(filter, f))
}

const ActiveRegionSetModal = ({
  children,
  show = false,
  onSelect = () => { },
} = {}) => {

  const { 
    activeSet,
    activeRegions, 
    activeFilters,
    filteredRegionsLoading,
    filteredActiveRegions,
    setActiveSet,
    setActiveFilters,
    regionSetNarration,
    regionSetNarrationLoading,
    regionSetArticles,
  } = useContext(RegionsContext)

  const [regions, setRegions] = useState([])
  useEffect(() => {
    if (filteredActiveRegions) {
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

  const [activeTab, setActiveTab] = useState('table')

  if (!show) {
    return null
  }

  return (
    <div className="h-full w-dvw max-w-[26.9375rem] max-h-full flex flex-col overflow-hidden border-r-1 border-r-separator">
      <div className="flex-1 flex min-h-0">
        <div className="grow-0 shrink-0 w-[2.4375rem] flex justify-center p-1.5">
          <div className="w-full h-full bg-separator rounded">
            <div className="w-full aspect-square rounded flex items-center justify-center bg-primary">
              <DetailsIcon className="[&_path]:fill-primary-foreground" />
            </div>
            <div className="w-full aspect-square rounded flex items-center justify-center">
              <FiltersIcon />
            </div>
          </div>
        </div>
        <div className="flex-1 pl-1 py-1.5 min-h-0">
          <div className="pt-1 max-h-full overflow-auto text-xs">
            <div className="px-1.5 pb-2.75">
              <strong>{(() => {
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
                })()}</strong>
            </div>
            <div className="border-t-1 botder-t-separator px-1.5 py-2.75">
              <strong>AI Summary: </strong>
              <span>{regionSetNarrationLoading ? "loading..." : regionSetNarration}</span>
            </div>
            <div className="border-t-1 botder-t-separator py-2.75">
              <div className="grid grid-cols-regionSet gap-y-1.5">
                <div className='grid grid-cols-subgrid col-start-1 col-end-4 [&>div:last-child]:pr-1.5'>
                  <div className="col-span-2 px-1.5">
                    <strong>Position</strong>
                  </div>
                  <div className="col-start-3 col-end-4">
                    <strong>Score</strong>
                  </div>
                </div>
                {regions.map((region) => {
                  const regionKey = `${region.order}:${region.chromosome}:${region.i}`
                  // {
                  //   !!activeFilters.length && filteredActiveRegions?.length > 0 &&
                  //   <span
                  //     className={styles['effective-count']}
                  //     onClick={() => toggleExpand(regionKey)}
                  //     style={{ cursor: 'pointer' }}
                  //   >
                  //     {/* ({region.subregion ? 1 : 0} subregions) */}
                  //     {/* {expandedRows.has(regionKey) ? ' 🔽' : ' ▶️'} */}
                  //   </span>
                  // }
                  return (
                    <div className="grid grid-cols-subgrid col-start-1 col-end-4 border-t-separator border-t-1 pt-1.5 gap-y-1.5" key={regionKey}>
                      <div className="px-1.5 col-span-2 underline">
                        <a href="#gotoRegion" onClick={(event) => {
                          event.preventDefault()
                          onSelect(region, region)
                        }}>
                          {showPosition(region)}
                        </a>
                      </div>
                      <div>{region.score?.toFixed(3)}</div>
                    </div>
                  )
                })}
              </div>
            </div>
          </div>
        </div>
      </div>
      <div className="grow-0">
        {children}
      </div>
    </div>
  )


  // eslint-disable-next-line no-unreachable
  return (
    <div className="w-full max-w-[26.9375rem] max-h-full overflow-auto">
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
          <FactorSearch onSelect={(f) => handleFactorSelect(f.factor)} />

          {activeFilters?.length ? <div className={`${styles['active-filters']}`}>
            <span>Active filters: </span>
            <span className={styles['active-filters-list']}>
              {activeFilters.map((f, i) =>
                <span key={f.label} className={styles['active-filter']} style={{ border: `1px solid ${f.color}` }}>
                  <span className={styles['active-filter-color']} style={{ backgroundColor: f.color }}>
                  </span>
                  {f.label}
                  <button onClick={() => setActiveFilters(activeFilters.slice(0, i).concat(activeFilters.slice(i + 1)))}>❌</button>
                </span>)}
            </span>
          </div>
            : null}

          {regionSetEnrichmentsLoading ? <div className={`${styles['region-set-enrichments']}`}>
            <Loading text="Loading suggested filters..." />
          </div> : null}
          {!regionSetEnrichmentsLoading && regionSetEnrichments?.length ? <div className={`${styles['region-set-enrichments']}`}>
            <span>Suggested filters: </span>
            <span className={styles['region-set-enrichments-list']}>
              {regionSetEnrichments.filter(f => !inFilters(activeFilters, f)).map((f, i) =>
                <span onClick={() => handleFactorSelect(f)} key={"enrichment-" + f.label} className={styles['region-set-enrichment']} style={{ border: `1px solid ${f.color}` }}>
                  <span className={styles['active-filter-color']} style={{ backgroundColor: f.color }}>
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
            {filteredRegionsLoading ? <h3><Loading text="Loading filtered regions..." /> </h3> :
              <div>
                {/* <h3> {filteredActiveRegions?.length} / {activeRegions?.length} regions</h3> */}
                <h3>
                  {`${filteredActiveRegions?.length
                    } selected ${filteredActiveRegions?.length === 1 ? "region" : "regions"
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
              <p>{regionSetNarrationLoading ? "loading..." : regionSetNarration}</p>
              {!regionSetNarrationLoading && regionSetNarration !== "" ? <div><h3>{regionSetArticles.length} open access PubMed articles found: </h3>
              <p>
                {regionSetArticles.map((a,i) => {
                  return (<span key={a.pmc}> {i+1}) <a href={`https://pmc.ncbi.nlm.nih.gov/articles/${a.pmc}/`} target="_blank" rel="noreferrer">{a.full_title}</a><br></br></span>)
                })}
              </p> </div> : null }
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
        </div>
      </div>
    </div>
  )
}
export default memo(ActiveRegionSetModal)
