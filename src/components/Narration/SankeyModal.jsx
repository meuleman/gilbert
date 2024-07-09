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
  csns = [],
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
  // const [csns, setCSNs] = useState([])
  const [selectedCSN, setSelectedCSN] = useState(null)
  // const csnRequest = useRef(0)
  // const { filters } = useContext(FiltersContext);

  // useEffect(() => {

  //   setLoadingCSN(true)
  //   setNumSamples(-1)
  //   setSampleStatus(0)
 
  //   fetchTopCSNs(filters, [], "full", true, 100).then(csns=> {
  //       const layers = [...csnLayers, ...variantLayers]
  //       const hydrated = csns.map(csn => rehydrateCSN(csn, layers))
  //       setCSNs(hydrated)
  //       setSampleStatus(csns.length)
  //       setLoadingCSN(false)
  //   })
  // }, [filters])

  // useEffect(() => {
  //   //make a region set from each chromosome's indices
  //   if(filteredIndices.length > 0){
  //     setLoadingCSN(true)
  //     setNumSamples(-1)
  //     setSampleStatus(0)
  //     setSampleScoredStatus(0)
  //     setCSNs([])
  //     setSelectedCSN(null)
  //     csnRequest.current += 1
  //     const requestNum = csnRequest.current
  //     console.log("filtered indices", filteredIndices)

  //     sampleScoredRegions(filteredIndices, (done) => {
  //       setSampleScoredStatus(done)
  //     }).then(scoredIndices => {
  //       const scored = scoredIndices.flatMap(d => d.scores).sort((a,b) => b.score - a.score)
  //       const sample = scored.slice(0, 100)
  //       setNumSamples(sample.length);
  //       console.log("SAMPLE", sample);
  //       const handleCSNResults = (csns) => {
  //         if(csnRequest.current !== requestNum) {
  //           console.log("ABORTING CSN CALCULATION, stale request")
  //           return
  //         }
  //         const layers = [...csnLayers, ...variantLayers]
  //         const hydrated = csns.map(csn => rehydrateCSN(csn, layers))
  //         setSampleStatus(csns.length)
  //         // console.log("hydrated", hydrated)
  //         setCSNs(hydrated)
  //       }
  //       const processFun = (r) => {
  //         if(csnRequest.current !== requestNum) {
  //           console.log("ABORTING CSN CALCULATION, stale request")
  //           return Promise.resolve([])
  //         }
  //         return fetchDehydratedCSN(r)
  //       }
  //       processInBatches(sample, 12, processFun, handleCSNResults).then(csns => {
  //         setLoadingCSN(false)
  //       })
  //     })
  //   } else {
  //     setNumSamples(-1)
  //     setCSNs([])
  //     setSelectedCSN(null)
  //     csnRequest.current += 1
  //   }
  // }, [filteredIndices])

  const [maxPathScore, setMaxPathScore] = useState(null)
  useEffect(() => {
    if(csns.length) {
      setMaxPathScore(max(csns, d => d.score))
    }
  }, [csns])
  
  // useEffect(() => {
  //   if(!loadingCSN && csns.length) {
  //     console.log("emitting csns")
  //     onCSNS(csns)
  //   }
  // }, [csns, loadingCSN])

  const [view, setView] = useState("sankey")
  const [sort, setSort] = useState("factor")
  useEffect(() => {
    onSort(sort)
  }, [sort])


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
            {csns.map((n,i) => {
              return (<ZoomLine 
                key={i}
                csn={n} 
                maxPathScore={maxPathScore}
                order={order}
                // highlight={true}
                // selected={crossScaleNarrationIndex === i || selectedNarrationIndex === i}
                text={false}
                width={4.05} 
                height={height-80}
                tipOrientation="right"
                showOrderLine={false}
                // highlightOrders={Object.keys(orderSelects).map(d => +d)} 
                onClick={() => onSelectedCSN(n)}
                onHover={() => onHoveredCSN(n)}
                />)
              })
            }
        </div>: null }

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
