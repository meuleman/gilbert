import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { useParams, useLocation, useNavigate, Link } from 'react-router-dom';
import { range, max, groups, sum } from 'd3-array';
import { format } from 'd3-format';
import chroma from 'chroma-js';

import Select from 'react-select';

import { showFloat, showInt, showPosition, showKb } from '../lib/display';
import { urlify, jsonify, parsePosition, fromPosition, sameHilbertRegion } from '../lib/regions';
import { HilbertChromosome, hilbertPosToOrder } from "../lib/HilbertChromosome" 
import { calculateCrossScaleNarration, calculateCrossScaleNarrationInWorker, walkTree, findUniquePaths } from '../lib/csn';
import Data from '../lib/data';

import counts_native from "../data/counts.native_order_resolution.json"
import counts_order14 from "../data/counts.order_14_resolution.json"
console.log("native", counts_native)
console.log("order14", counts_order14)

import layers from '../layers'

import LogoNav from '../components/LogoNav';
import PowerModal from '../components/Narration/PowerModal';
import PowerOverlay from '../components/PowerOverlay';
import ZoomLine from '../components/Narration/ZoomLine';

const csnLayers = [
  layers.find(d => d.name == "DHS Components (ENR, Full)"),
  layers.find(d => d.name == "Chromatin States (ENR, Full)"),
  layers.find(d => d.name == "TF Motifs (ENR, Top 10)"),
  layers.find(d => d.name == "Repeats (ENR, Full)"),
  layers.find(d => d.name == "DHS Components (OCC, Ranked)"),
  layers.find(d => d.name == "Chromatin States (OCC, Ranked)"),
  layers.find(d => d.name == "TF Motifs (OCC, Ranked)"),
  layers.find(d => d.name == "Repeats (OCC, Ranked)"),
]
const variantLayers = [
  layers.find(d => d.datasetName == "variants_favor_categorical_rank"),
  layers.find(d => d.datasetName == "variants_favor_apc_rank"),
  layers.find(d => d.datasetName == "variants_gwas_rank"),
  // layers.find(d => d.datasetName == "grc"),
]

const orders = range(4, 15)

import './Filter.css';
import hilbert from 'd3-hilbert';



const dot = (color = 'transparent') => ({
  alignItems: 'center',
  display: 'flex',

  ':before': {
    backgroundColor: color,
    borderRadius: 2,
    content: '" "',
    display: 'block',
    marginRight: 8,
    height: 10,
    width: 10,
  },
});

const colourStyles = {
  control: (styles) => ({ ...styles, backgroundColor: 'white' }),
  option: (styles, { data, isDisabled, isFocused, isSelected }) => {
    const color = chroma(data.color);
    return {
      ...styles,
      backgroundColor: isDisabled
        ? undefined
        // : isSelected
        // ? data.color
        : isFocused
        ? color.alpha(0.1).css()
        : undefined,
      color: isDisabled
        ? '#ccc'
        // : isSelected
        // ? chroma.contrast(color, 'white') > 2
        //   ? 'white'
        //   : 'black'
        : data.color,
      cursor: isDisabled ? 'not-allowed' : 'default',

      ':active': {
        ...styles[':active'],
        backgroundColor: !isDisabled
          ? isSelected
            ? data.color
            : color.alpha(0.3).css()
          : undefined,
      },
    };
  },
  input: (styles) => ({ ...styles, ...dot() }),
  placeholder: (styles) => ({ ...styles, ...dot('#ccc') }),
  singleValue: (styles, { data }) => ({ ...styles, ...dot(data.color) }),
};

const FilterOrder = ({order, orderSums, showNone, showUniquePaths, disabled, selected, onSelect}) => {
  const [selectedField, setSelectedField] = useState(null)

  useEffect(() => {
    console.log("selected", selected)
    setSelectedField(selected || null)
  }, [selected])

  const [allFields, setAllFields] = useState([])

  const formatLabel = useCallback((option) => {
    return (
      <div>
        <span>{option.field} </span>
        <span> 
          {showUniquePaths ? showInt(option.unique_count) + "(segments)" : ""} 
        </span>

        {/* <span> 
          {showInt(showUniquePaths ? option.unique_count : option.count)} ({showUniquePaths ? option.unique_percent?.toFixed(2) + ")% unique" : option.percent?.toFixed(2)+")%"} 
        </span> */}
        <span>[{option.layer.name}]</span>
      </div>
    );
  }, [showUniquePaths]);

  useEffect(() => {
    const lyrs = csnLayers.concat(variantLayers.slice(0, 1))
    let newFields = lyrs.filter(d => d.orders[0] <= order && d.orders[1] >= order).flatMap(layer => {
      let oc = orderSums.find(o => o.order == order)
      let counts = null
      let unique_counts = null;
      let dsName = layer.datasetName
      if(dsName.includes("rank")){
        dsName = dsName.replace("_rank", "")
      }
      if(oc) {
        counts = oc.counts[dsName]
        unique_counts = oc.unique_counts[dsName]
      }
      // const counts = oc ? (showUniquePaths ? oc.unique_counts : oc.counts) : null
      // oc ? oc = counts[layer.datasetName] : oc = null
      let fields = layer.fieldColor.domain().map((f, i) => {
        return { 
          order,
          layer,
          // label: f + " (" + showInt(c) + " paths) " + layer.name, 
          label: f + " " + layer.name,
          field: f, 
          index: i, 
          color: layer.fieldColor(f), 
          count: counts ? counts[i] : "?",
          unique_count: unique_counts ? unique_counts[i] : "?",
          unique_percent: unique_counts ? unique_counts[i] / oc.totalSegments * 100 : "?",
          percent: counts ? counts[i] / oc.totalPaths * 100: "?",
          isDisabled: counts ? counts[i] == 0 || counts[i] == "?" : true
        }
      }).sort((a,b) => {
        return b.count - a.count
      })
      if(!showNone){
        fields = fields.filter(f => f.count > 0 && f.count != "?")
      }
      return fields
    })
    const grouped = groups(newFields, f => f.layer.name)
      .map(d => ({ label: d[0], options: d[1] }))
      .filter(d => d.options.length)
    setAllFields(grouped)
  }, [order, orderSums, showNone])

  // useEffect(() => {
  //   if(selectedField){
  //     console.log("SELECTED", selectedField)
  //     const selfield = allFields.flatMap(d => d.options).find(f => f.order == selectedField.order && f.field == selectedField.field && f.layer.name == selectedField.layer.name)
  //     console.log("selfield", selfield)
  //     if(selfield && (selfield !== selectedField)){
  //       setSelectedField(selfield)
  //     }
  //   }
  // }, [allFields, selectedField])

  useEffect(() => {
    onSelect(selectedField)
  }, [selectedField])

  return (
    <div className="filter-order">
      <span className="order-label">
        {/* Order {order} */}
        {showKb(Math.pow(4, 14 - order))}
      </span> 
      <div className="filter-group">
        <Select
          options={allFields}
          styles={colourStyles}
          value={selectedField}
          isDisabled={disabled}
          onChange={(selectedOption) => setSelectedField(selectedOption)}
          formatOptionLabel={formatLabel}
          formatGroupLabel={data => (
            <div style={{ fontWeight: 'bold' }}>
              {data.label}
            </div>
          )}
        />
      </div>
        {disabled ? <div className="disabled">Select at least one higher resolution filter</div> : null}
        {selectedField ? 
        <div>
          {/* <span className="selected-field">
            Selected: {selectedField.label}
          </span> */}
          <button onClick={() => setSelectedField(null)}>
            Deselect
          </button>
        </div>
      : null}
    </div>
  )
}

const Filter = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const queryParams = useMemo(() => new URLSearchParams(location.search), [location]);
  const region = useMemo(() => {return jsonify(queryParams.get('region'))}, [queryParams]);
  useEffect(() => { document.title = `Gilbert | Filter` }, []);
  const fetchData = useMemo(() => Data({debug: false}).fetchData, []);

  const [showNone, setShowNone] = useState(false)
  const [showUniquePaths, setShowUniquePaths] = useState(true)

  const [orderSums, setOrderSums] = useState([])
  const [orderSelects, setOrderSelects] = useState({})

  useEffect(() => { 
    // const counts = showUniquePaths ? counts_native : counts_order13
    const orderSums = Object.keys(counts_order14).map(o => {
      let chrms = Object.keys(counts_order14[o])//.map(chrm => counts[o][chrm])
      // combine each of the objects in each key in the chrms array
      let total = 0
      let total_segments_found = 0
      let layer_total = {}
      let layer_total_segments = {}
      let ret = {}
      let uret = {}
      let maxf = { value: 0 }
      chrms.forEach(c => {
        if(c == "totalSegmentCount") return
        const chrm = counts_order14[o][c]
        const layers = Object.keys(chrm)
        layers.forEach(l => {
          if(!ret[l]) {
            ret[l] = {}
            layer_total[l] = 0
            Object.keys(chrm[l]).forEach(k => {
              ret[l][k] = 0
            })
          }
          Object.keys(chrm[l]).forEach(k => {
            ret[l][k] += chrm[l][k]
            total += chrm[l][k]
            layer_total[l] += chrm[l][k]
            if(chrm[l][k] > maxf.value){
              maxf.value = chrm[l][k]
              maxf.layer = l
              maxf.field = k
            }
          })
        })
        // get the unique counts
        const uchrm = counts_native[o][c]
        layers.forEach(l => {
          if(!uret[l]) {
            uret[l] = {}
            layer_total_segments[l] = 0
            Object.keys(uchrm[l]).forEach(k => {
              uret[l][k] = 0
            })
          }
          Object.keys(uchrm[l]).forEach(k => {
            uret[l][k] += uchrm[l][k]
            layer_total_segments[l] += uchrm[l][k]
            total_segments_found += uchrm[l][k]
          })
        })
      })
      return { 
        order: o, 
        counts: ret, 
        total, 
        totalPaths: counts_order14[o].totalSegmentCount, 
        totalSegments: counts_native[o].totalSegmentCount, 
        total_segments_found,
        layer_total, 
        layer_total_segments, 
        unique_counts: uret, 
        maxField: maxf 
      }
    })
    console.log("orderSums", orderSums)
    setOrderSums(orderSums)
  }, [])


  const handleOrderSelect = useCallback((field, order) => {
    if(!field) {
      delete orderSelects[order]
      const hasOrdersGreaterThanSix = Object.keys(orderSelects).some(order => +order > 6);
      if (!hasOrdersGreaterThanSix) {
        setOrderSelects({})
      } else {
        setOrderSelects({...orderSelects})
      }
    } else {
      setOrderSelects({...orderSelects, [order]: field})
    }
  }, [orderSelects])


  // intersect a pair of indices arrays {order, indices}
  // this version of the function expects the indices to be in native order
  // that is: each index is in the order given by the orderSelects
  const intersectIndices = (lower, higher) => {
    const stride = Math.pow(4, higher.order - lower.order)
    // turn the lower.indices into ranges to intersect
    const ranges = lower.indices.map(i => ({start: i*stride, end: (i+1)*stride}))
    // console.log(lower, higher, stride, ranges)
    // we filter the higher indices to only keep the ones that are in a range
    return { order: higher.order, chromosome: higher.chromosome, indices: higher.indices.filter(i => {
      return ranges.some(r => r.start <= i && r.end >= i)
    })}
  }

  // this version of the intersection function expects the indices to be order 14
  // this means we can directly compare the indices without converting them to ranges
  const intersectIndices14 = (lower, higher) => {
    const lowerSet = new Set(lower.indices);
    const commonIndices = higher.indices.filter(index => lowerSet.has(index));
    return { order: higher.order, chromosome: higher.chromosome, indices: commonIndices };
  }

  const [loadingFilters, setLoadingFilters] = useState(false)
  const [filteredSegmentCount, setFilteredSegmentCount] = useState(0)
  const [filteredPathCount, setFilteredPathCount] = useState(0)
  const [chrFilteredIndices, setChrFilteredIndices] = useState([]) // the indices for each chromosome at highest order
  let chromosomes = Object.keys(counts_native[4]).filter(d => d !== "totalSegmentCount")
  useEffect(() => {
    console.log("orderSelects", orderSelects)
    const orders = Object.keys(orderSelects)
    console.log("orders", orders)
    // lets make objects for each of the selects, but pulling chromosomes from orderSums
    const selects = orders.flatMap(o => {
      let os = orderSelects[o]
      let oc = counts_native[o]
      return chromosomes.map(c => {
        let chrm = oc[c]
        let l = os.layer.datasetName
        if(l.includes("rank")){
          l = l.replace("_rank", "")
        }
        let i = os.index
        return {
          ...os,
          chromosome: c,
          chromosome_count: chrm[l][i]
        }
      }).filter(d => d?.chromosome_count > 0)
    })
    console.log("selects", selects)

    // group by chromosome, we only want to include chromosomes where we have at least one path
    const groupedSelects = groups(selects, d => d.chromosome)
    console.log("groupedSelects", groupedSelects)
    const filteredGroupedSelects = groupedSelects.filter(g => g[1].length == orders.length)
    console.log("filteredGroupedSelects", filteredGroupedSelects)

    // as long as we have more than one order, we want to do this
    if(orders.length){
      setLoadingFilters(true)
      Promise.all(filteredGroupedSelects.map(g => {
        return Promise.all(g[1].map(os => {
          // const base = `https://d2ppfzsmmsvu7l.cloudfront.net/20240516/csn_index_files`
          const base = `https://resources.altius.org/~ctrader/public/gilbert/data/precomputed_csn_paths/index_files`
          // const base = `https://d2ppfzsmmsvu7l.cloudfront.net/20240509/csn_index_files`
          let dsName = os.layer.datasetName
          if(dsName.includes("rank")){
            dsName = dsName.replace("_rank", "")
          }
          const url = `${base}/${os.order}.${os.chromosome}.${dsName}.${os.index}.native_order_resolution.indices.int32.bytes`
          // const url = `${base}/${os.order}.${os.chromosome}.${os.layer.datasetName}.${os.index}.order_14_resolution.indices.int32.bytes`
          return fetch(url).then(r => r.arrayBuffer().then(buffer => {
            const int32Array = new Int32Array(buffer);
            return {...os, indices: Array.from(int32Array)}//.filter(d => d)};
          }))
        }))
      }))
      .then(groups => {
        console.log("GROUPS", groups)
        // loop through each group (chromosome), fetch its indices and then filter each pair of indices
        const filteredIndices = groups.map(g => {
          const indices = g.map(d => ({order: d.order, chromosome: d.chromosome, indices: d.indices }))
          // we compare each pair going down until we are left with the indices that go up all the way to the top
          let result = indices[0];
          for (let i = 0; i < indices.length - 1; i++) {
            result = intersectIndices(result, indices[i+1])
            // result = intersectIndices14(result, indices[i+1])
          }
          return result;
        })
        console.log("intersected indices", filteredIndices)
        // now we can count everything in a couple ways
        // 1. count the number of segments by counting the length of indices for each group
        // 2. count the number of paths by multiplying stride (4^13-order) times the count of segments
        const segmentCounts = filteredIndices.map(d => d.indices.length)
        console.log("counts", segmentCounts)
        const totalSegmentCount = sum(segmentCounts)
        let order = filteredIndices[0].order // will all have the same order (the highest of the orderSelects)
        const stride = Math.pow(4, 13 - order)
        const pathCount = totalSegmentCount * stride
        console.log("totalSegmentCount", totalSegmentCount)
        console.log("pathCount", pathCount)

        // get regions for each index
        const hilbert = new HilbertChromosome(order)
        filteredIndices.forEach(d => {
          d.regions = d.indices.map(i => hilbert.fromRange(d.chromosome, i, i+1)[0])
        })

        setLoadingFilters(false)
        setChrFilteredIndices(filteredIndices)
        setFilteredSegmentCount(totalSegmentCount)
        setFilteredPathCount(pathCount)
      })
    // } else if(orders.length == 1) {
    //   setFilteredSegmentCount(orderSelects[orders[0]].unique_count)
    //   setFilteredPathCount(orderSelects[orders[0]].count)
    } else {
      console.log("deselecting everything")
      setChrFilteredIndices([])
      setFilteredSegmentCount(0)
      setFilteredPathCount(0)
      setNumSamples(-1)
      setCSNs([])
    }

  }, [orderSelects, orderSums])

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

  const [selectedOrders, setSelectedOrders] = useState([])
  useEffect(() => {
    setSelectedOrders(Object.keys(orderSelects).map(d => +d))
  }, [orderSelects])

  const [loadingCSN, setLoadingCSN] = useState(false)
  const [numSamples, setNumSamples] = useState(-1)
  const [sampleStatus, setSampleStatus] = useState(0)
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
      setCSNs([])
      setSelectedCSN(null)
      csnRequest.current += 1
      const requestNum = csnRequest.current
      // calculate csn for a sample of regions, lets start with 1 per chromosome
      const sample = chrFilteredIndices.flatMap(d => {
        return d.regions.slice(0,1)//.map(r => r)
      })
      setNumSamples(sample.length)
      console.log("SAMPLE", sample)
      // Promise.all(sample.slice(0,2).map(r => calculateCrossScaleNarration(r, 'sum', csnLayers, variantLayers,0.01, 0.1, orderSelects)))
      const handleCSNResults = (csns) => {
        if(csnRequest.current !== requestNum) {
          console.log("ABORTING CSN CALCULATION, stale request")
          return
        }
        setSampleStatus(csns.length)
        console.log("csns", csns)
        let uniques = csns.flatMap(d => findUniquePaths(d.paths)).flatMap(d => d.uniquePaths)
        uniques.sort((a,b) => b.score - a.score)
        setCSNs(uniques)
        // setCSNs(csns.flatMap(d => d))
      }
      const processFn = (r) => {
        if(csnRequest.current !== requestNum) {
          console.log("ABORTING CSN CALCULATION, stale request")
          return Promise.resolve([])
        }
        return calculateCrossScaleNarrationInWorker(r, 'sum', csnLayers, variantLayers, 0.1, orderSelects)
      }
      processInBatches(sample, 3, processFn, handleCSNResults)
        .then(csns => {
          setLoadingCSN(false)
          let uniques = csns.flatMap(d => findUniquePaths(d.paths)).flatMap(d => d.uniquePaths)
          uniques.sort((a,b) => b.score - a.score)
          setSelectedCSN(uniques[0])
        })
      
    } else {
      setNumSamples(-1)
      setCSNs([])
      setSelectedCSN(null)
      csnRequest.current += 1
    }
      // TODO: we dont depend on orderSelects here, chrFilteredIndices will always update but we should probably use a ref then?
  }, [chrFilteredIndices, csnLayers, variantLayers])

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
              <button onClick={() => setShowUniquePaths(!showUniquePaths)}>
                {showUniquePaths ? "hide segments" : "show segments (debug)"}
              </button>
              <button onClick={() => setShowNone(!showNone)}>
                {showNone ? "Hide Hidden Fields" : "Show Hidden Fields"}
              </button>
            </div>
            {orders.map(order => (
              <FilterOrder key={order} 
                order={order} 
                orderSums={orderSums} 
                showNone={showNone} 
                showUniquePaths={showUniquePaths}
                selected={orderSelects[order]}
                disabled={order < 7 && selectedOrders.length === 0}
                onSelect={(field) => {
                  handleOrderSelect(field, order)
                }} 
              />
            ))}
          </div>
        </div>
        <div className="section">
          <h3>
            {loadingFilters ? "Loading..." : "Filter Results"}
          </h3>
          <div className="section-content">
            {loadingFilters ? "Loading..." : 
            <>
              
              <h4>Paths</h4>
              <p>{showInt(filteredPathCount)} ({(filteredPathCount/orderSums[4]?.totalPaths*100).toFixed(2)}%) paths found</p>

              <h4>{numSamples >= 0 ? numSamples : ""} CSN Samples</h4>
              <p>{csns.length} unique paths sampled</p>
              {loadingCSN ? `Loading... ${sampleStatus}/${numSamples}` : null}
              {csns.length ? 
              <div className="csn-lines">
                {selectedCSN ?
                  <ZoomLine 
                    csn={selectedCSN} 
                    order={max(Object.keys(orderSelects), d => +d) + 0.5} // max order
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
                    order={max(Object.keys(orderSelects), d => +d) + 0.5} // max order
                    // highlight={true}
                    // selected={crossScaleNarrationIndex === i || selectedNarrationIndex === i}
                    text={false}
                    width={8.5} 
                    height={300}
                    tipOrientation="right"
                    showOrderLine={false}
                    // highlightOrders={Object.keys(orderSelects).map(d => +d)} 
                    onClick={() => setSelectedCSN(n)}
                    // onHover={handleLineHover(i)}
                    />)
                  })
                }
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

              <h4>Segments (debug)</h4>
              <p>{showInt(filteredSegmentCount)} segments found at order {max(Object.keys(orderSelects), d => +d)}</p>

              <h4>By Chromosome</h4>
              <div className="by-chromosome">
              {chrFilteredIndices.map(d => {
                return <div className="chromosome-paths" key={d.chromosome}>
                  <span>{d.chromosome}: {d.indices.length}</span>
                  <div className="chromosome-regions">
                    {d.regions.slice(0,10).map(r => {
                      return <span className="chromosome-region" key={r.i}>
                        <Link to={`/region?region=${urlify(r)}`} target="_blank">📄 </Link>
                        <Link to={`/?region=${urlify(region)}`}>🗺️</Link>
                        {showPosition(r)}
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
            <h4>Paths (order 13 resolution)</h4>
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