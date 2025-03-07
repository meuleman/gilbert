import { useState, useCallback, useEffect, useRef, useMemo, useContext } from 'react'

import { fetchRegionSetFromFactor } from '../../lib/dataFiltering';
import FactorSearch from '../FactorSearch'
import Loading from '../Loading'
import RegionsContext from './RegionsContext'
import FiltersContext from '../ComboLock/FiltersContext'

import { download } from '../../lib/regionsets'
import { showKbOrder } from '../../lib/display'
import { fromIndex } from '../../lib/regions'
import { Tooltip } from 'react-tooltip';
import CloseIcon from "@/assets/close.svg?react"
import DownloadIcon from "@/assets/download.svg?react"
import UpDownChevronIcon from "@/assets/up-down-chevron.svg?react"
import UploadIcon from "@/assets/upload.svg?react"
import './HeaderRegionSetModal.css'

const HeaderRegionSetModal = ({
} = {}) => {
  const { activeSet, activeRegions, activeState, numTopRegions, setNumTopRegions, clearActive, saveSet } = useContext(RegionsContext)
  const { setFilters } = useContext(FiltersContext)
  const [searchShowing, setSearchShowing] = useState(false)

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
    setSearchShowing(false)
    if (!selected) return
    console.log("selected", selected)
    if (selected.factor) {
      // query for the paths for the factor
      let f = selected.factor
      fetchRegionSetFromFactor({ factor: f.index, dataset: f.layer.datasetName }, null)
        .then((response) => {
          let regions = response.regions.map(r => {
            return { ...fromIndex(r.chromosome, r.i, r.order), score: r.score }
          })
          saveSet(selected.factor.label, regions, { activate: true, type: "search", factor: selected.factor })
        })
    } 
  }, [saveSet, setSearchShowing])

  return (
    <div className="relative h-globalMenuBar flex items-center min-w-80">
      <div className="px-3.5 flex-1 flex items-center" role="button" onClick={() => setSearchShowing(!searchShowing)}>
        <div className="flex-1">
          <div className="text-bodyMuted">Active region set</div>
          <div>{activeSet?.name ?? "None selected"}</div>
        </div>
        <div className="ml-9">
          <UpDownChevronIcon />
        </div>
      </div>
      {activeSet && (
        <>
          <div className="h-2/5 w-px bg-separator" />
          <div className="h-globalMenuBar aspect-square flex items-center justify-center">
            <CloseIcon data-tooltip-id="header-active-deselect" role="button" onClick={handleDeselect} />
            <Tooltip id="header-active-deselect">
              Clear active region set
            </Tooltip>
          </div>
          <div className="h-2/5 w-px bg-separator" />
          <div className="h-globalMenuBar aspect-square flex items-center justify-center">
            <DownloadIcon data-tooltip-id="header-download-regions" role="button" onClick={handleDownload} />
            <Tooltip id="header-download-regions">
              Download {activeRegions?.length} regions to a BED file
            </Tooltip>
          </div>
          {/* <div className="h-2/5 w-px bg-separator" />
          <div className="h-globalMenuBar aspect-square flex items-center justify-center">
            <UploadIcon />
          </div> */}
        </>
      )}
      {searchShowing && (
        <div className="absolute z-50 top-full -left-px -right-px p-3 border border-separator bg-white">
          <FactorSearch onBlur={() => {
            setSearchShowing(false)
          }} onSelect={handleSelectFactor} />
        </div>
      )}
    </div>
  )

  // eslint-disable-next-line no-unreachable
  return (
    <div className={`header-regionset-modal`}>
      <div className={`content`}
        style={{
        }}
      >
        <div className="loading-info">
          {activeState ? <Loading text={activeState} /> : null}
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

          </div> : null}
      </div>
    </div>
  )
}
export default HeaderRegionSetModal
