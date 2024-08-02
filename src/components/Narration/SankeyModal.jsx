import { useState, useCallback, useEffect, useRef, useContext } from 'react'
import FiltersContext from '../ComboLock/FiltersContext'

import { showInt } from '../../lib/display'
import { max, sum } from 'd3-array'
import { csnLayers, variantLayers } from '../../layers'
import { sampleScoredRegions } from '../../lib/filters'
import { fetchDehydratedCSN, rehydrateCSN } from '../../lib/csn'
import VerticalSankey from './VerticalSankey';
import ZoomLine from './ZoomLine';
import Loading from '../Loading'
import { fetchTopCSNs } from '../../lib/csn'


import './SankeyModal.css'

const processInBatches = async (items, batchSize, processFunction, statusFunction) => {
  let results = [];
  for (let i = 0; i < items.length; i += batchSize) {
    const batch = items.slice(i, i + batchSize);
    const batchResults = await Promise.all(batch.map(processFunction));
    results = results.concat(batchResults);
    if(statusFunction) statusFunction(results)
  }
  return results;
};


const SankeyModal = ({
  filteredIndices = [],
  factorCsns = [],
  fullCsns = [],
  loading = "",
  order = 4,
  show = true,
  width = 400,
  height = 320,
  shrinkNone = true,
  onSelectedCSN = () => {},
  onHoveredCSN = () => {},
  onSort = () => {},
  // onCSNS = () => {}
} = {}) => {

  const [loadingCSN, setLoadingCSN] = useState(false)
  const [numSamples, setNumSamples] = useState(-1)
  const [sampleStatus, setSampleStatus] = useState(0)
  const [sampleScoredStatus, setSampleScoredStatus] = useState(0)
  const [selectedCSN, setSelectedCSN] = useState(null)


  const [view, setView] = useState("sankey")
  const [sort, setSort] = useState("factor")
  useEffect(() => {
    onSort(sort)
  }, [sort])

  const [csns, setCSNs] = useState([])
  const [maxPathScore, setMaxPathScore] = useState(null)
  useEffect(() => {
    const csns = sort === "factor" ? factorCsns : fullCsns
    const maxscore = max(factorCsns.concat(fullCsns), d => d.score)
    // console.log("MAX SCORE", maxscore)
    // console.log("FACTOR", factorCsns)
    // console.log("FULL", fullCsns)
    setMaxPathScore(maxscore || 0)
    if(csns.length) {
      setCSNs(csns)
    } else {
      setCSNs([])
    }
  }, [factorCsns, fullCsns, sort])

  const [onlyInTopFactor, setOnlyInTopFactor] = useState([])
  const [onlyInTopFull, setOnlyInTopFull] = useState([])
  const [inBoth, setInBoth] = useState([])
  useEffect(() => {
    const onlyInTopFactor = factorCsns.filter(a => !fullCsns.some(b => a.chromosome === b.chromosome && a.i === b.i));
    const onlyInTopFull = fullCsns.filter(a => !factorCsns.some(b => a.chromosome === b.chromosome && a.i === b.i));
    const inBoth = factorCsns.filter(a => fullCsns.some(b => a.chromosome === b.chromosome && a.i === b.i));
    setOnlyInTopFactor(onlyInTopFactor)
    setOnlyInTopFull(onlyInTopFull)
    setInBoth(inBoth)
  }, [factorCsns, fullCsns])
  
  // useEffect(() => {
  //   if(!loadingCSN && csns.length) {
  //     console.log("emitting csns")
  //     onCSNS(csns)
  //   }
  // }, [csns, loadingCSN])

  const zlheight = height - 120

  return (
    <div className={`sankey-modal ${show ? "show" : "hide"}`}>
      <div className="content">
        <div className="loading-info">
            {!loading && csns.length ? <span>{csns.length} unique paths</span> : null }
            {/* {loadingCSN && sampleStatus == 0 ? <p className="loading">Scoring paths... {sampleScoredStatus}/{filteredIndices.filter(d => d.regions.length).length}</p> : null} */}
            {/* {loadingCSN && sampleStatus > 0 ? <p className="loading">Loading samples... {sampleStatus}/{numSamples}</p> : null} */}
            {loading === "fetching" ? <Loading text={"Fetching CSNs..."} /> : null}
            {loading === "hydrating" ? <Loading text={"Hydrating CSNs..."} /> : null}
            {!loading ? 
              <div className="sort-options">
                Sort:
                <label>
                  <input 
                    type="radio" 
                    value="factor" 
                    checked={sort === "factor"} 
                    onChange={() => setSort("factor")} 
                  />
                  Factor score
                </label>
                <label>
                  <input 
                    type="radio" 
                    value="full" 
                    checked={sort === "full"} 
                    onChange={() => setSort("full")} 
                  />
                  Full path score
                </label>
              </div>
            : null }
            {!loading && csns.length ? 
              <div className="view-options">
                Vis:
                <label>
                  <input 
                    type="radio" 
                    value="sankey" 
                    checked={view === "sankey"} 
                    onChange={() => setView("sankey")} 
                  />
                  Sankey
                </label>
                <label>
                  <input 
                    type="radio" 
                    value="heatmap" 
                    checked={view === "heatmap"} 
                    onChange={() => setView("heatmap")} 
                  />
                  Heatmap
                </label>
              </div>
            : null }
        </div>
        {view === "heatmap" || ( csns.length && loadingCSN ) ? 
          <div className={`csn-lines ${loading ? "loading-csns" : ""}`}>
            <div className="only-top-factor line-column">
              <h4>factor</h4>
              <div className="csn-lines">
                {onlyInTopFactor.map((n,i) => {
                  return (<ZoomLine 
                    key={i}
                    csn={n} 
                    maxPathScore={maxPathScore}
                    order={order}
                    // highlight={true}
                    // selected={crossScaleNarrationIndex === i || selectedNarrationIndex === i}
                    text={false}
                    width={2.05} 
                    height={zlheight}
                    tipOrientation="right"
                    showOrderLine={false}
                    // highlightOrders={Object.keys(orderSelects).map(d => +d)} 
                    onClick={() => onSelectedCSN(n)}
                    onHover={() => onHoveredCSN(n)}
                    />)
                  })
                }
              </div>
            </div>
            <div className="in-both line-column">
              <h4>both</h4>
              <div className="csn-lines">
                {inBoth.map((n,i) => {
                  return (<ZoomLine 
                    key={i}
                    csn={n} 
                    maxPathScore={maxPathScore}
                    order={order}
                    // highlight={true}
                    // selected={crossScaleNarrationIndex === i || selectedNarrationIndex === i}
                    text={false}
                    width={2.05} 
                    height={zlheight}
                    tipOrientation="right"
                    showOrderLine={false}
                    // highlightOrders={Object.keys(orderSelects).map(d => +d)} 
                    onClick={() => onSelectedCSN(n)}
                    onHover={() => onHoveredCSN(n)}
                    />)
                  })
                }
              </div>
            </div>
            <div className="only-top-full line-column">
              <h4>full</h4>
              <div className="csn-lines">
                {onlyInTopFull.map((n,i) => {
                    return (<ZoomLine 
                  key={i}
                  csn={n} 
                  maxPathScore={maxPathScore}
                  order={order}
                  // highlight={true}
                  // selected={crossScaleNarrationIndex === i || selectedNarrationIndex === i}
                  text={false}
                  width={2.05} 
                  height={zlheight}
                  tipOrientation="right"
                  showOrderLine={false}
                  // highlightOrders={Object.keys(orderSelects).map(d => +d)} 
                  onClick={() => onSelectedCSN(n)}
                  onHover={() => onHoveredCSN(n)}
                  />)
                  })
                }
              </div>
            </div>
          </div>
        : null }

        {view == "sankey" && csns.length && !loadingCSN ? 
          <div className={`sankey-container ${loading ? "loading-csns" : ""}`}>
            <VerticalSankey 
              width={width} 
              height={height - 100} 
              csns={csns} 
              shrinkNone={shrinkNone} 
              nodeWidth={height/11 - 60}
            />
          </div> :null }
      </div>
    </div>
  )
}
export default SankeyModal
