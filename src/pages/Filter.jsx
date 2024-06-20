import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { useParams, useLocation, useNavigate, Link } from 'react-router-dom';
import { max, range, groups, sum } from 'd3-array';
import { format } from 'd3-format';
import chroma from 'chroma-js';

import Select from 'react-select';

import { showFloat, showInt, showPosition, showKb } from '../lib/display';
import { urlify, jsonify, parsePosition, fromPosition, sameHilbertRegion } from '../lib/regions';
import { fetchDehydratedCSN, rehydrateCSN } from '../lib/csn';
import Data from '../lib/data';

import { 
  calculateOrderSums, 
  filterIndices, 
  sampleRegions,
  regionsByOrder,
  sampleScoredRegions
} from '../lib/filters';

import { csnLayers, variantLayers} from '../layers'

import LogoNav from '../components/LogoNav';
import PowerModal from '../components/Narration/Power';
import VerticalSankey from '../components/Narration/VerticalSankey';
import PowerOverlay from '../components/PowerOverlay';
import ZoomLine from '../components/Narration/ZoomLine';
import Selects from '../components/ComboLock/Selects';


import './Filter.css';



const Filter = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const queryParams = useMemo(() => new URLSearchParams(location.search), [location]);
  const region = useMemo(() => {return jsonify(queryParams.get('region'))}, [queryParams]);
  useEffect(() => { document.title = `Gilbert | Filter` }, []);
  // const fetchData = useMemo(() => Data({debug: false}).fetchData, []);

  const [showNone, setShowNone] = useState(false)
  const [showUniquePaths, setShowUniquePaths] = useState(true)

  const [orderSums, setOrderSums] = useState([])
  const [orderSelects, setOrderSelects] = useState({})

  useEffect(() => { 
    const orderSums = calculateOrderSums() 
    console.log("orderSums", orderSums)
    setOrderSums(orderSums)
  }, [])

  const [filterLoadingMessage, setFilterLoadingMessage] = useState("")
  const [filteredPathCount, setFilteredPathCount] = useState(0)
  const [chrFilteredIndices, setChrFilteredIndices] = useState([]) // the indices for each chromosome at highest order
  useEffect(() => {

    let totalIndices = 0
    let indexCount = 0
    let loadingMessage = ""
    filterIndices(orderSelects, function(state, value) {
      // console.log("progress", state, value)
      if(state == "loading_filters_start") {
        loadingMessage = "Loading filters..."
      }
      else if(state == "grouped_selects") {
        totalIndices = value.flatMap(d => d[1].map(a => a)).length
        loadingMessage = `Loading filters 0/${totalIndices}`
      } else if(state == "got_index"){
        indexCount += 1
        loadingMessage = `Loading filters ${indexCount}/${totalIndices}`
      } else if(state == "filtering_start") {
        loadingMessage = "Filtering..."
      } else if(state == "filtering_end") {
        loadingMessage = "Filtering Complete"
      }
      setFilterLoadingMessage(loadingMessage)

    }, function(results) {
      const { filteredIndices, segmentCount, pathCount} = results
      if(results.filteredIndices.length > 0) {
        setFilterLoadingMessage("")
        setChrFilteredIndices(filteredIndices)
        setFilteredPathCount(pathCount)
      } else {
        setFilterLoadingMessage("")
        setChrFilteredIndices([])
        setFilteredPathCount(0)

        setNumSamples(-1)
        setCSNs([])
      }
    }, 100) //number of regions to keep per chromosome
  }, [orderSelects])

  // calculate the regions at each order
  // const rbo = useMemo(() => {
  //   if(chrFilteredIndices.length === 0) return []
  //   const rbo = range(4, 14).map(o => regionsByOrder(chrFilteredIndices, o))
  //   console.log("RBO", rbo)
  //   return rbo
  // }, [chrFilteredIndices])

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

  const [loadingCSN, setLoadingCSN] = useState(false)
  const [numSamples, setNumSamples] = useState(-1)
  const [sampleStatus, setSampleStatus] = useState(0)
  const [sampleScoredStatus, setSampleScoredStatus] = useState(0)
  const [csns, setCSNs] = useState([])
  const [selectedCSN, setSelectedCSN] = useState(null)
  const csnRequest = useRef(0)
  useEffect(() => {
    //make a region set from each chromosome's indices
    if(chrFilteredIndices.length > 0){
      console.log("chrFilteredIndices", chrFilteredIndices)
      setLoadingCSN(true)
      setNumSamples(-1)
      setSampleStatus(0)
      setSampleScoredStatus(0)
      setCSNs([])
      setSelectedCSN(null)
      csnRequest.current += 1
      const requestNum = csnRequest.current

      // const sample = sampleRegions(chrFilteredIndices, 48, 2)
      sampleScoredRegions(chrFilteredIndices, (done) => {
        console.log("done??", done)
        setSampleScoredStatus(done)
      }).then(scoredIndices => {
        console.log("scored indices", scoredIndices)
        const scored = scoredIndices.flatMap(d => d.scores).sort((a,b) => b.score - a.score)
        console.log("SCOREDDD", scored)
        // setNumSamples(sample.length);
        const sample = scored.slice(0, 100)
      
        // const sample = sampleRegions(chrFilteredIndices, 12, 2)
        setNumSamples(sample.length);
        console.log("SAMPLE", sample);

        const handleCSNResults = (csns) => {
          if(csnRequest.current !== requestNum) {
            console.log("ABORTING CSN CALCULATION, stale request")
            return
          }
          // console.log("csns", csns)
          const layers = [...csnLayers, ...variantLayers]
          // const hydrated = csns.map(csn => range(0, 11).map(i => rehydrate(csn.csn[i], layers)))
          const hydrated = csns.map(csn => rehydrateCSN(csn, layers))
          setSampleStatus(csns.length)
          console.log("hydrated", hydrated)
          setCSNs(hydrated)
          // setSelectedCSN(hydrated[0])
        }
        const processFun = (r) => {
          if(csnRequest.current !== requestNum) {
            console.log("ABORTING CSN CALCULATION, stale request")
            return Promise.resolve([])
          }
          return fetchDehydratedCSN(r)
        }
        processInBatches(sample, 12, processFun, handleCSNResults).then(csns => {
          // console.log("CSNS", csns)
          setLoadingCSN(false)
          // setSelectedCSN(csns[0])
        })
        // const handleCSNResults = (csns) => {
        //   if(csnRequest.current !== requestNum) {
        //     console.log("ABORTING CSN CALCULATION, stale request")
        //     return
        //   }
        //   setSampleStatus(csns.length)
        //   // console.log("csns", csns)
        //   let uniques = csns.flatMap(d => findUniquePaths(d.paths)).flatMap(d => d.uniquePaths)
        //   uniques.sort((a,b) => b.score - a.score)
        //   setCSNs(uniques)
        //   // setCSNs(csns.flatMap(d => d))
        // }
        // const processFn = (r) => {
        //   if(csnRequest.current !== requestNum) {
        //     console.log("ABORTING CSN CALCULATION, stale request")
        //     return Promise.resolve([])
        //   }
        //   return calculateCrossScaleNarrationInWorker(r, 'sum', enrThreshold, csnLayers, variantLayers, countLayers, orderSelects)
        // }
        // processInBatches(sample, 4, processFn, handleCSNResults)
        //   .then(csns => {
        //     setLoadingCSN(false)
        //     let uniques = csns.flatMap(d => findUniquePaths(d.paths || [])).flatMap(d => d.uniquePaths)
        //     uniques.sort((a,b) => b.score - a.score)
        //     uniques.forEach(u => u.layers = csnLayers)
        //     setSelectedCSN(uniques[0])
        //   })
      })
      
    } else {
      setNumSamples(-1)
      setCSNs([])
      setSelectedCSN(null)
      csnRequest.current += 1
    }
      // TODO: we dont depend on orderSelects here, chrFilteredIndices will always update but we should probably use a ref then?
  }, [chrFilteredIndices])

  const [maxPathScore, setMaxPathScore] = useState(null)
  useEffect(() => {
    if(csns.length) {
      setMaxPathScore(max(csns, d => d.score))
    }
  }, [csns])

  return (
    <div className="filter-page">
      <div className="header">
        <div className="header--brand">
          <LogoNav />
        </div>
      </div>
      <div className="content">
        <div className="section">
          <h3>
            Filter
          </h3>
          <div className="section-content">
            <div className="filter-group">
              {/* <button onClick={() => setShowUniquePaths(!showUniquePaths)}>
                {showUniquePaths ? "hide segments" : "show segments (debug)"}
              </button>
              <button onClick={() => setShowNone(!showNone)}>
                {showNone ? "Hide Hidden Fields" : "Show Hidden Fields"}
              </button> */}
            </div>
            <Selects
              selected={orderSelects}
              orderSums={orderSums} 
              layers={csnLayers.concat(variantLayers.slice(0,1))}
              showNone={showNone} 
              showUniquePaths={showUniquePaths}
              onSelect={(os) => {
                setOrderSelects(os)
              }}
            />
          
          </div>
        </div>
        <div className="section">
          <h3>
            Filter Results
          </h3>
          <div className="section-content">
            {filterLoadingMessage ? filterLoadingMessage : 
            <>
              
              <h4>Paths</h4>
              <p>{showInt(filteredPathCount)} ({(filteredPathCount/orderSums[4]?.totalPaths*100).toFixed(2)}%) paths found</p>

              <h4>{numSamples >= 0 ? numSamples : ""} CSN Samples</h4>
              <p>{csns.length} unique paths from {sum(chrFilteredIndices, d => d.regions.length)} top scoring paths across genome</p>
              {loadingCSN && sampleStatus == 0 ? <p className="loading">Scoring paths... {sampleScoredStatus}/{chrFilteredIndices.filter(d => d.regions.length).length}</p> : null}
              {loadingCSN && sampleStatus > 0 ? <p className="loading">Loading samples... {sampleStatus}/{numSamples}</p> : null}
              {csns.length ? 
              <div className="csn-lines">
                {selectedCSN ?
                  <ZoomLine 
                    csn={selectedCSN} 
                    order={max(Object.keys(orderSelects), d => +d) + 0.5} // max order
                    maxPathScore={maxPathScore}
                    highlight={true}
                    // selected={crossScaleNarrationIndex === i || selectedNarrationIndex === i}
                    text={true}
                    width={32} 
                    height={300}
                    tipOrientation="right"
                    showOrderLine={false}
                    highlightOrders={Object.keys(orderSelects).map(d => +d)} 
                    // onClick={() => setSelectedCSN(n)}
                    // onHover={handleLineHover(i)}
                    /> : null}
                {csns.map((n,i) => {
                  return (<ZoomLine 
                    key={i}
                    csn={n} 
                    maxPathScore={maxPathScore}
                    order={max(Object.keys(orderSelects), d => +d) + 0.5} // max order
                    // highlight={true}
                    // selected={crossScaleNarrationIndex === i || selectedNarrationIndex === i}
                    text={false}
                    width={4.25} 
                    height={300}
                    tipOrientation="right"
                    showOrderLine={false}
                    // highlightOrders={Object.keys(orderSelects).map(d => +d)} 
                    onClick={() => setSelectedCSN(n)}
                    // onHover={handleLineHover(i)}
                    />)
                  })
                }

              <div className="sankey-container" style={{marginTop: "30px"}}>
                <VerticalSankey width={600} height={320} csns={csns} shrinkNone={true} />
              </div>
              </div>: null }
              
              {selectedCSN ? 
              <div className="selected-csn">
                <h4>Selected CSN</h4>
                <p>Index: {csns.indexOf(selectedCSN)}</p>
                <p>Score: {selectedCSN.score} </p>
                <PowerOverlay 
                  selected={selectedCSN} 
                  zoomOrder={max(Object.keys(orderSelects), d => +d) + 0.5}
                  narration={selectedCSN}
                  maxPathScore={maxPathScore}
                  layers={csnLayers}
                  loadingCSN={loadingCSN}
                  mapWidth={340}
                  mapHeight={340}
                  tipOrientation="right"
                  modalPosition={{top: 0, left: 0}}
                  onClose={() => {}}
                ></PowerOverlay>
                {/* <PowerModal 
                  csn={selectedCSN} 
                  width={400} 
                  height={400} 
                  userOrder={max(Object.keys(orderSelects), d => +d) + 0.5}
                  onOrder={(o) => {
                    // console.log("o", o)
                  }}
                  /> */}
              </div>
              : null }

              {/* <h4>Segments (debug)</h4>
              <p>{showInt(filteredSegmentCount)} segments found at order {max(Object.keys(orderSelects), d => +d)}</p> */}

              <h4>By Chromosome</h4>
              <div className="by-chromosome">
              {chrFilteredIndices.map(d => {
                return <div className="chromosome-paths" key={d.chromosome}>
                  <span>{d.chromosome}: {d.indices.length} paths ({d.regions.length} sampled, {sum(d.regions, r => r.representedPaths)} represented)</span>
                  <div className="chromosome-regions">
                    {d.regions.slice(0,10).map(r => {
                      return <span className="chromosome-region" key={r.i}>
                        <Link to={`/region?region=${urlify(r)}`} target="_blank">📄 </Link>
                        <Link to={`/?region=${urlify(r)}`}>🗺️</Link>
                        {showPosition(r)} ({r.representedPaths})
                      </span>
                    })}
                  </div>
                </div>
              })}
              </div>
            </>
            }
          </div>
        </div>
        <div className="section">
          <h3>
            Summary
          </h3>
          <div className="section-content">
            <h4>Paths (order 14 resolution)</h4>
            <table className="order-sums-table">
              <thead>
                <tr>
                  <th>order</th>
                  <th>total paths</th>
                  <th>paths found</th>
                  {Object.keys(orderSums[0]?.layer_total || {}).map(l => <th key={l}>{l} total</th>)}
                </tr>
              </thead>

              <tbody>
                {orderSums.map(o => {
                  return (
                      <tr key={o.order}>
                        <td>{o.order}</td>
                        <td>{showInt(o.totalPaths)}</td>
                        <td>{showInt(o.total)}</td>
                        {Object.keys(o.layer_total).map(l => {
                          return (
                            <td key={l}>{showInt(o.layer_total[l])}</td>
                          )
                        })}
                      </tr>
                    )
                  })}
              </tbody>
            </table>


            <h4>Segments (native resolution)</h4>
            <table className="order-sums-table">
              <thead>
                <tr>
                  <th>order</th>
                  <th>total segments</th>
                  <th>segments found</th>
                  {Object.keys(orderSums[0]?.layer_total_segments || {}).map(l => <th key={l}>{l} total</th>)}
                </tr>
              </thead>

              <tbody>
                {orderSums.map(o => {
                  return (
                      <tr key={o.order}>
                        <td>{o.order}</td>
                        <td>{showInt(o.totalSegments)}</td>
                        <td>{showInt(o.total_segments_found)}</td>
                        {Object.keys(o.layer_total_segments).map(l => {
                          return (
                            <td key={l}>{showInt(o.layer_total_segments[l])}</td>
                          )
                        })}
                      </tr>
                    )
                  })}
              </tbody>
            </table>
          </div>
        </div>


      </div>
    </div>
  );
};

export default Filter;