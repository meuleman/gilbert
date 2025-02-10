import { useState, useCallback, useEffect, useRef, useMemo, useContext } from 'react'

import { fetchFilteringWithoutOrder } from '../../lib/dataFiltering';
import FactorSearch from '../FactorSearch'
import Loading from '../Loading'
import RegionsContext from './RegionsContext'
import FiltersContext from '../ComboLock/FiltersContext'

import { download } from '../../lib/regionsets'
import { showKbOrder } from '../../lib/display'
import { fromIndex } from '../../lib/regions'
import {Tooltip} from 'react-tooltip';

import './HeaderRegionSetModal.css'

const HeaderRegionSetModal = ({
} = {}) => {
  const { activeSet, activeRegions, activeState, numTopRegions, setNumTopRegions, clearActive, saveSet } = useContext(RegionsContext)
  const { setFilters } = useContext(FiltersContext)

  function calculateCount(num, order) {
    let obp = Math.pow(4, 14 - order)
    let tbp = num * obp
    let percent = tbp / 3088269856 * 100
    return {
      num,
      obp,
      tbp,
      percent
    }
  }

  const handleDownload = useCallback(() => {
    download(activeRegions)
  }, [activeRegions])

  const handleNumTopRegions = useCallback((e) => {
    setNumTopRegions(+e.target.value)
  }, [setNumTopRegions])

  const handleDeselect = useCallback(() => {
    clearActive()
    setFilters({})
  }, [clearActive, setFilters])

  const handleSelectFactor = useCallback((selected) => {
    if (!selected) return
    console.log("selected", selected)
    let range = []
    // console.log("gencode", gencode)
    if(selected.factor) {
      // query for the paths for the factor
      let f = selected.factor
      fetchFilteringWithoutOrder([{factor: f.index, dataset: f.layer.datasetName}], null)
        .then((response) => {
          console.log("FILTERING WITHOUT ORDER", response)
          let regions = response.regions.map(r => {
            return {...fromIndex(r.chromosome, r.i, r.order), score: r.score}
          })
          saveSet(selected.factor.label, regions, { activate: true, type: "search", factor: selected.factor })
        })
    } 
  }, [saveSet])


  return (
    <div className={`header-regionset-modal`}>
      <div className={`content`}
        style={{
        }}
      >
        <div className="loading-info">
          {activeState ? <Loading text={activeState} /> : null }
        </div>
        {/* {activeRegions?.length ? <div className="query-info">
          Showing {numTopSegments} / {totalCounts.num} <i>{showKb(totalCounts.obp)}</i> regions (
          <span data-tooltip-id="region-percent-tooltip">{shownCounts.percent.toFixed(2)}% / {totalCounts.percent.toFixed(2)}% of the genome</span>)
          <Tooltip id="region-percent-tooltip">
            {totalCounts.num ? <span> Total {totalCounts.num} regions, representing {showInt(totalCounts.tbp)} basepairs, or {totalCounts.percent.toFixed(2)}% of the genome</span> : null}
          </Tooltip>
        </div>: null } */}
        {/* {!activeSet ? <FactorSearch onSelect={handleSelectFactor} /> : 
          <div>
            {activeSet.name}
          </div>
        } */}
      </div>
      <div className={`controls`}>
        {activeRegions?.length ? 
        <div className="query-controls">
          {/* <label>
            <span className="header-active-count" data-tooltip-id="header-active-count">{numTopRegions || ""}</span> / <span>{activeRegions?.length} (
             {activeRegions?.[0] ? showKbOrder(activeRegions?.[0]?.order) : ""}) regions</span>
            <Tooltip id="header-active-count">
              {numTopRegions} top regions used in visualizations
            </Tooltip>
            <input 
              type="range" 
              min="1" 
              max={Math.min(activeRegions?.length || 0, 100)}
              step={1}
              value={numTopRegions || 0} 
              onChange={handleNumTopRegions} 
            />
          </label> */}

          {/* <button data-tooltip-id="header-download-regions"
            onClick={handleDownload}
          >
            ⬇️
          </button>
          <Tooltip id="header-download-regions">
            Download {activeRegions?.length} regions to a BED file
          </Tooltip>

          <button data-tooltip-id={`header-active-deselect`} onClick={handleDeselect}>❌</button>
          <Tooltip id={`header-active-deselect`}>
            Clear active region set
          </Tooltip> */}

        </div> : null }
      </div>
    </div>
  )
}
export default HeaderRegionSetModal
