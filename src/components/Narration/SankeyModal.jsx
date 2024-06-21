import { useState, useCallback, useEffect, useRef } from 'react'

import { showInt } from '../../lib/display'
import { max, sum } from 'd3-array'
import { csnLayers, variantLayers } from '../../layers'
import { sampleScoredRegions } from '../../lib/filters'
import { fetchDehydratedCSN, rehydrateCSN } from '../../lib/csn'
import VerticalSankey from './VerticalSankey';
import ZoomLine from './ZoomLine';


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
  filters = {},
  order = 4,
  width = 400,
  height = 320,
  shrinkNone = true
} = {}) => {

  const [loadingCSN, setLoadingCSN] = useState(false)
  const [numSamples, setNumSamples] = useState(-1)
  const [sampleStatus, setSampleStatus] = useState(0)
  const [sampleScoredStatus, setSampleScoredStatus] = useState(0)
  const [csns, setCSNs] = useState([])
  const [selectedCSN, setSelectedCSN] = useState(null)
  const csnRequest = useRef(0)
  useEffect(() => {
    //make a region set from each chromosome's indices
    if(filteredIndices.length > 0){
      setLoadingCSN(true)
      setNumSamples(-1)
      setSampleStatus(0)
      setSampleScoredStatus(0)
      setCSNs([])
      setSelectedCSN(null)
      csnRequest.current += 1
      const requestNum = csnRequest.current
      console.log("filtered indices", filteredIndices)

      sampleScoredRegions(filteredIndices, (done) => {
        setSampleScoredStatus(done)
      }).then(scoredIndices => {
        const scored = scoredIndices.flatMap(d => d.scores).sort((a,b) => b.score - a.score)
        const sample = scored.slice(0, 100)
        setNumSamples(sample.length);
        console.log("SAMPLE", sample);
        const handleCSNResults = (csns) => {
          if(csnRequest.current !== requestNum) {
            console.log("ABORTING CSN CALCULATION, stale request")
            return
          }
          const layers = [...csnLayers, ...variantLayers]
          const hydrated = csns.map(csn => rehydrateCSN(csn, layers))
          setSampleStatus(csns.length)
          console.log("hydrated", hydrated)
          setCSNs(hydrated)
        }
        const processFun = (r) => {
          if(csnRequest.current !== requestNum) {
            console.log("ABORTING CSN CALCULATION, stale request")
            return Promise.resolve([])
          }
          return fetchDehydratedCSN(r)
        }
        processInBatches(sample, 12, processFun, handleCSNResults).then(csns => {
          setLoadingCSN(false)
        })
      })
    } else {
      setNumSamples(-1)
      setCSNs([])
      setSelectedCSN(null)
      csnRequest.current += 1
    }
  }, [filteredIndices])

  const [maxPathScore, setMaxPathScore] = useState(null)
  useEffect(() => {
    if(csns.length) {
      setMaxPathScore(max(csns, d => d.score))
    }
  }, [csns])

  useEffect(() => {
    console.log("filters", filters)
  }, [filters])

  return (
    <div className="sankey-modal">
      <div className="content">
        <div className="loading-info">
            {/* {!loadingCSN && csns.length ? <p>{csns.length} unique paths from {sum(filteredIndices, d => d.regions.length)} top scoring paths across genome</p> : null } */}
            {loadingCSN && sampleStatus == 0 ? <p className="loading">Scoring paths... {sampleScoredStatus}/{filteredIndices.filter(d => d.regions.length).length}</p> : null}
            {loadingCSN && sampleStatus > 0 ? <p className="loading">Loading samples... {sampleStatus}/{numSamples}</p> : null}
        </div>
        {csns.length && loadingCSN ? 
          <div className="csn-lines">
            {csns.map((n,i) => {
              return (<ZoomLine 
                key={i}
                csn={n} 
                maxPathScore={maxPathScore}
                order={order}
                // highlight={true}
                // selected={crossScaleNarrationIndex === i || selectedNarrationIndex === i}
                text={false}
                width={4.25} 
                height={height}
                tipOrientation="right"
                showOrderLine={false}
                // highlightOrders={Object.keys(orderSelects).map(d => +d)} 
                onClick={() => setSelectedCSN(n)}
                // onHover={handleLineHover(i)}
                />)
              })
            }
        </div>: null }

        {csns.length && !loadingCSN ? 
          <div className="sankey-container">
            <VerticalSankey 
              width={width} 
              height={height} 
              csns={csns} 
              shrinkNone={shrinkNone} 
              nodeWidth={height/11 - 60}
              filters={filters}
            />
          </div> :null }
      </div>
    </div>
  )
}
export default SankeyModal
