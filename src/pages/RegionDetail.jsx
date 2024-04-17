import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { useParams, useLocation, useNavigate, Link } from 'react-router-dom';
import { range, max } from 'd3-array';

import { showFloat, showPosition, showKb } from '../lib/display';
import { urlify, jsonify, parsePosition, fromPosition, sameHilbertRegion } from '../lib/regions';
import { getGenesInCell, getGenesOverCell } from '../lib/Genes'
import { HilbertChromosome, hilbertPosToOrder } from "../lib/HilbertChromosome" 
import { calculateCrossScaleNarration, walkTree, findUniquePaths } from '../lib/csn';
import Data from '../lib/data';

import layers from '../layers'

import DHS_Components_Sfc_max from '../layers/dhs_components_sfc_max'
import Chromatin_States_Sfc_max from '../layers/chromatin_states_sfc_max';

import LogoNav from '../components/LogoNav';
import SimSearchRegion from '../components/SimSearch/SimSearchRegion'
import SelectedModalSimSearch from '../components/SimSearch/SelectedModalSimSearch'
import SimSearchResultList from '../components/SimSearch/ResultList'
import CSNSentence from '../components/Narration/Sentence'
import RegionThumb from '../components/RegionThumb';
import RegionStrip from '../components/RegionStrip';
import Sankey from '../components/Narration/Sankey';
import CSNLine from '../components/Narration/Line';
import Summary from '../components/Narration/Summary';
import Power from '../components/Narration/Power';

import './RegionDetail.css';

const decoder = new TextDecoder('ascii');

const RegionDetail = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const queryParams = useMemo(() => new URLSearchParams(location.search), [location]);
  const region = useMemo(() => {return jsonify(queryParams.get('region'))}, [queryParams]);
  useEffect(() => { document.title = `Gilbert | Region Detail: ${region.chromosome}:${region.start}` }, [region]);
  const fetchData = useMemo(() => Data({debug: false}).fetchData, []);

  const [inside, setInside] = useState([]);
  const [outside, setOutside] = useState([]);
  const [ranges, setRanges] = useState([]);
    
  // sim search related state
  const [simSearchDHS, setSimSearchDHS] = useState(null)
  const [simSearchChromatin, setSimSearchChromatin] = useState(null)
  const [factorsDHS, setFactorsDHS] = useState([])
  const [factorsChromatin, setFactorsChromatin] = useState([])
  const [similarDHSRegions, setSimilarDHSRegions] = useState([])
  const [similarChromatinRegions, setSimilarChromatinRegions] = useState([])
  const [similarBy, setSimilarBy] = useState('dhs')
  const [layersData, setLayersData] = useState([])
  const [crossScaleNarration, setCrossScaleNarration] = useState(null)
  const [crossScaleNarrationUnique, setCrossScaleNarrationUnique] = useState(null)
  const [crossScaleNarrationUnfiltered, setCrossScaleNarrationUnfiltered] = useState([])
  const [crossScaleNarrationFiltered, setCrossScaleNarrationFiltered] = useState([])
  const [crossScaleNarrationIndex, setCrossScaleNarrationIndex] = useState(0)
  const [csnMethod, setCsnMethod] = useState('sum')
  const [csnSlice, setCsnSlice] = useState(20)

  const csnLayers = [
    layers.find(d => d.name == "DHS Components (ENR)"),
    layers.find(d => d.name == "Chromatin States (ENR)"),
    layers.find(d => d.name == "TF Motifs (ENR)"),
    layers.find(d => d.name == "Repeats (ENR)"),
    layers.find(d => d.name == "DHS Components (OCC)"),
    layers.find(d => d.name == "Chromatin States (OCC)"),
    layers.find(d => d.name == "TF Motifs (OCC)"),
    layers.find(d => d.name == "Repeats (OCC)"),
  ]
  const variantLayers = [
    layers.find(d => d.datasetName == "variants_favor_categorical"),
    layers.find(d => d.datasetName == "variants_favor_apc"),
    layers.find(d => d.datasetName == "variants_gwas"),
    // layers.find(d => d.datasetName == "grc"),
  ]
  

  const [stripsWidth, setStripsWidth] = useState(0);
  useEffect(() => {
    const handleResize = () => {
      // const stripsElement = document.querySelector('#strips');
      const stripsElement = document.querySelector('.region-detail');
      if(stripsElement) {
      const { height, width } = stripsElement.getBoundingClientRect()
      // console.log("width", stripsElement.offsetWidth, stripsElement.width)
      setStripsWidth(width)
      }
    };
    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);
  const regionRef = useRef(null);

  useEffect(() => {
    if(regionRef.current !== region) {
      regionRef.current = region;
      console.log("region", region)
      setInside(getGenesInCell(region, region.order))
      setOutside(getGenesOverCell(region, region.order))
      // grab the ranges before and after this region
      const hilbert = new HilbertChromosome(region.order)
      const rs = hilbert.fromRange(region.chromosome, region.i - 1, region.i + 1)
      // console.log("ranges", rs)
      setRanges(rs)

      // fetch data for each layer
      const matchingLayers = layers.filter(d => d.orders[0] <= region.order && d.orders[1] >= region.order)
      const layersDataResult = Promise.all(matchingLayers.map((layer) => {
        // console.log("layer", layer)
        if(layer.layers) {
          return Promise.all(layer.layers.map(l => fetchData(l, region.order, rs)))
        } else {
          return fetchData(layer, region.order, rs)
        }
      }))
      layersDataResult.then((response) => {
        setLayersData(response.map((d, i) => {
          const layer = matchingLayers[i]
          if(layer.layers) {
            d = layer.combiner(d)
          }
          let data = d.map(r => {
            const field = layer.fieldChoice(r)
            return {
              ...r,
              field: field,
              color: layer.fieldColor(field.field)
            }
          })
          return {
            layer,
            data,
            meta: d.metas ? d.metas[0] : {},
            order: d.order
          }
        }))
      })

      // Sim search on DHS
      SimSearchRegion(rs[1], region.order, DHS_Components_Sfc_max, setFactorsDHS,[]).then((result) => {
        setSimSearchDHS(result)
        // let similarRegions = result?.simSearch
        // if(similarRegions && similarRegions.length)  {
        //   const similarRanges = similarRegions.map((d) => {
        //     const { chromosome, start, end } = parsePosition(d.coordinates)
        //     let range = fromPosition(chromosome, start, end)
        //     return range
        //   })
        //   // console.log("similar dhs ranges", similarRanges)
        // }
      })
      // Sim search on Chromatin States
      SimSearchRegion(rs[1], region.order, Chromatin_States_Sfc_max, setFactorsChromatin, []).then((result) => {
        setSimSearchChromatin(result)
        // let similarRegions = result?.simSearch
        // if(similarRegions && similarRegions.length)  {
        //   const similarRanges = similarRegions.map((d) => {
        //     const { chromosome, start, end } = parsePosition(d.coordinates)
        //     let range = fromPosition(chromosome, start, end)
        //     return range
        //   })
        //   // console.log("similar chromatin ranges", similarRanges)
        // }
      })

      if(region.order < 14) {
        calculateCrossScaleNarration(rs[1], csnMethod, csnLayers, variantLayers).then(crossScaleResponse => {
          setCrossScaleNarration(crossScaleResponse)
          console.log("CSN", crossScaleResponse)
          let uniques = findUniquePaths(crossScaleResponse.paths)
          setCrossScaleNarrationUnique(uniques)
          setMaxUniquePaths(uniques.uniquePaths.length)
        })
      } 
    }
  }, [region, fetchData, csnMethod])

  // We have special logic for making a "CSN" path from order 14
  // it's mostly about finding the highest factor for every region "above" the order 14 region
  // then we grab the layerdata at order 14 and add the variants
  useEffect(() => {
    if(region.order == 14) {
      // we calculate the path up from the basepair and fetch each corresponding data
      // we also fetch the order 14 data
      const orders = range(14, 3, -1).map(o => {
        const hilbert = new HilbertChromosome(o)
        const rs = hilbert.fromRegion(region.chromosome, region.start, region.end-1)[0]
        return rs
      })
      // console.log("orders", orders)
      const topFieldsAllLayers = Promise.all(orders.slice(1).map(orderRegion => {
        return Promise.all(csnLayers.map((layer) => {
          return fetchData(layer, orderRegion.order, [orderRegion])
            .then((response) => {
              // top field per segment
              // console.log(layer, orderRegion.order, orderRegion, "response", response)
              const topFields = response.map(d => {
                let topField = layer.fieldChoice(d)
                // store layer as integer
                d.layer = layer
                d.topField = topField
                return d
              })
              return topFields[0]
            })
            .catch((error) => {
              console.error(`Error fetching CSN data: ${error}`);
              return null
            })
          }))
      }))
      topFieldsAllLayers.then((response) => {
        // console.log("top fields all layers response", response)
        const topFieldsByOrder = response.map((d, i) => {
          let o = orders[i+1]
          // find the maximum topField.value in each element of d
          let top = d.sort((a,b) => b.topField?.value - a.topField?.value)[0]
          // console.log("top", top)
          if(top.topField.field) {
            o.topField = top.topField
            return {field: top.topField, layer: top.layer, order: o.order, region: o }
          } else {
            return {field: top.topField, layer: null, order: o.order, region: o }
          }
        })
        // console.log("top fields by order", topFieldsByOrder)
        // let nl = layersData.find(d => d.layer.datasetName == "grc")
        // let n = nl.data[1]
        // n.topField = n.field
        // n.layer = nl.layer
        let cl = layersData.find(d => d.layer.datasetName == "variants_favor_categorical")
        let c = cl?.data[1] || {}
        c.topField = c?.field
        c.layer = cl?.layer
        let apcl = layersData.find(d => d.layer.datasetName == "variants_favor_apc")
        let apc = apcl.data[1]
        apc.topField = apc.field
        apc.layer = apcl.layer
        let gwasl = layersData.find(d => d.layer.datasetName == "variants_gwas")
        let gwas = gwasl.data[1]
        gwas.topField = gwas.field
        gwas.layer = gwasl.layer
        let csn14 = { path: topFieldsByOrder, variants: [c, apc, gwas].filter(d => !!d) }
        console.log("csn 14", csn14)
        setCsn(csn14)
      })
    }
  }, [region, layersData])

  const [csn, setCsn] = useState({})
  const [topUniquePaths, setTopUniquePaths] = useState([])
  const [maxUniquePaths, setMaxUniquePaths] = useState(0)
  const [csnMaxOrder, setCsnMaxOrder] = useState(14)
  const [csnThreshold, setCsnThreshold] = useState(0)
  const [sank, setSank] = useState(null)

  const [removeNone, setRemoveNone] = useState(false)
  const [shrinkNone, setShrinkNone] = useState(true)

  const [nodeFilter, setNodeFilter] = useState([])

  useEffect(() => {
    if(crossScaleNarrationUnique) {
      // filter our full set of paths to just ones that map to a top unique path
      // console.log("NARRATION", crossScaleNarration)
      const members = crossScaleNarrationUnique.uniquePathMemberships
      const uniquePaths = crossScaleNarrationUnique.uniquePaths
      if(uniquePaths.length < csnSlice) setCsnSlice(uniquePaths.length)
      let filteredPaths = members
        .slice(0, csnSlice).flat()
        .filter(d => d.path.filter(p => !!p).filter(p => p.field.value > csnThreshold).length === d.path.filter(p => !!p).length)
      
      // "unfiltered" may be a misnomer, but its not the sankey node filter
      setCrossScaleNarrationUnfiltered(filteredPaths)
        // we want to filter to only paths that match the nodeFilter if it has nodes in it
        // the nodeFilter can have 1 or more nodes. the nodes define an order and a field
        // we only let paths through if they have the field at that order
      if(nodeFilter.length) {
        // filteredPaths = filteredPaths.filter(d => d.path.filter(p => !!p).filter(p => nodeFilter.find(n => n.order == p.order && n.field == p.field.field)).length === nodeFilter.length)
        filteredPaths = filteredPaths.filter(d => {
          let ff = nodeFilter.map(nf => {
            return d.path.find(p => p?.order == nf.order && p?.field.field == nf.field)
              || (nf.field == "None" && !d.path.find(p => p?.order == nf.order))
          })
          return ff.filter(d => d).length
        })
      } 
      setCrossScaleNarrationFiltered(filteredPaths)
      let topUniques = uniquePaths.slice(0, csnSlice)
      if(nodeFilter.length) {
        topUniques = topUniques.filter(d => {
          let ff = nodeFilter.map(nf => {
            return d.path.find(p => p?.order == nf.order && p?.field.field == nf.field)
              || (nf.field == "None" && !d.path.find(p => p?.order == nf.order))
          })
          return ff.filter(d => d).length
        })
      }
      // console.log("top uniques", topUniques)
      setTopUniquePaths(topUniques)
    }
  }, [crossScaleNarrationUnique, csnSlice, csnThreshold, nodeFilter])

  useEffect(() => {
    if(crossScaleNarration && topUniquePaths.length) {
      // adjust the index if it's out of bounds (ie if we've reduced down to less paths than the index)
      const newCSNIndex = Math.min(crossScaleNarrationIndex, topUniquePaths.length - 1)
      // setCrossScaleNarrationIndex(newCSNIndex)
      const path = topUniquePaths[newCSNIndex]
      if(!path) {
        console.log("NO PATH?")
      } else {
        const filtered = path.path.filter(d => !!d).sort((a,b) => a.order - b.order)
        setCsn({...path, path: filtered})
      }
    }
  }, [crossScaleNarrationIndex, crossScaleNarration, topUniquePaths])


  const [zoomedRegion, setZoomedRegion] = useState(null)
  const [similarZoomedRegion, setSimilarZoomedRegion] = useState(null)
  function zoomARegion(region) {
    if(!region) return null
    let order = region.order + 2
    if(order > 14) order = 14
    const hilbert = new HilbertChromosome(order)
    const range = hilbert.fromRegion(region.chromosome, region.start, region.end)
    const zr = range[Math.round(range.length / 2)]
    return zr
  }

  useEffect(() => {
    const zr = zoomARegion(region)
    setZoomedRegion(zr)
  }, [region])

  const handleChangeCSNIndex = (e) => setCrossScaleNarrationIndex(e.target.value)
  const handleCsnMethodChange = (e) => setCsnMethod(e.target.value)

  const handleChangeCSNSlice = useCallback((e) => {
    setCsnSlice(e.target.value)
  }, [setCsnSlice])

  const handleChangeCSNThreshold = useCallback((e) => {
    setCsnThreshold(+e.target.value)
  }, [setCsnThreshold])

  const handleNodeFilter = useCallback((node) => {
    setNodeFilter((oldNodeFilter) => {
      if(oldNodeFilter.find(n => n.order == node.order && n.field.field == node.field.field)) {
        const filtered = oldNodeFilter.filter(n => n.order != node.order && n.field.field != node.field.field)
        console.log("filtering out", filtered)
        return [...filtered]
      } else {
        return [...oldNodeFilter, node]
      }
    })
  }, [setNodeFilter])

  const [o14, setOrder14Data] = useState(null)
  useEffect(() => {
    if(region.order == 14) {
      let n = layersData.find(d => d.layer.name == "Nucleotides")
      // console.log("n", n)
      let c = layersData.find(d => d.layer.datasetName == "variants_favor_categorical")
      // console.log("c", c)
      let apc = layersData.find(d => d.layer.datasetName == "variants_favor_apc")
      // console.log("apc", apc)
      let gwas = layersData.find(d => d.layer.datasetName == "variants_gwas")
      if(n && c && apc) {
        let o14d = {
          ndata: n.data[1],
          n,
          cdata: c.data[1], 
          c,
          apcdata: apc.data[1],
          apc,
          gwasdata: gwas.data[1],
          gwas
        }
        console.log("o14", o14d)
        setOrder14Data(o14d)
      }
    }
  }, [region, layersData])

  const [powerData, setPowerData] = useState(null)


  const badgeColors = {
    "Protein Function": "#D34747",
    "ClinVar Sig": "#D38647",
    "Conservation": "#2B7E7E",
    "GWAS": "#39A939"
  }

  function getProteinFunction(d) {
    if(d["SIFT: deleterious"]) return 3
    if(d["PolyPhen: probably damaging"]) return 2
    if(d["PolyPhen: possibly damaging"]) return 1
    return 0
  }
  function getClinVarSig(d) {
    let keys = Object.keys(d)
    for(let i = 0; i < keys.length; i++) {
      let k = keys[i]
      if((k.indexOf("ClinVar Sig") >= 0) && d[k]) {
        return d[k]
      }
    }
    return 0
  }

  return (
    <div className="region-detail">
      <div className="header">
        <div className="header--brand">
          <LogoNav />
        </div>
        {/* <div className="header--navigation">
          <Link to={`/?region=${urlify(region)}`}>Back to map</Link>
        </div> */}
      </div>
      <div className="content">
        <div className="section">
          <h3>
            {showPosition(region)} <Link to={`/?region=${urlify(region)}`}>🗺️</Link>
          </h3>
          <div className="section-content">
            Order: {region.order}
            {/* {JSON.stringify(region)} */}
            {o14 && <div className="order-14-data">
              <span className="nucleotides">
                Nucleotide: {decoder.decode(o14.ndata.bytes)[0]}
              </span>
              <div className="badge-prototype">
                Badge Prototype:<br></br>
                Protein Function: <span style={{color: badgeColors["Protein Function"]}}>{getProteinFunction(o14.cdata.data) ? "⏺" : ""}</span><br></br>
                ClinVar Sig: <span style={{color: badgeColors["ClinVar Sig"]}}>{getClinVarSig(o14.cdata.data) ? "⏺" : ""}</span><br></br>
                Conservation: <span style={{color: badgeColors["Conservation"]}}>{o14.apcdata.data["apc_conservation_v2"] ? "⏺" : ""}</span><br></br>
                GWAS: <span style={{color: badgeColors["GWAS"]}}>{o14.gwasdata.data.max_value ? "⏺" : ""}</span>

              </div>
              <span className="categorical">
                <h4>FAVOR Categorical</h4>
                {Object.keys(o14.cdata.data).map(factor => {
                  let color = o14.c.layer.fieldColor(factor)
                  let value = o14.cdata.data[factor]
                  return <div className="factor" key={factor} style={{opacity: value > 0 ? 1 : 0.35, backgroundColor: value > 0 ? "white" : "#f0f0f0"}}>
                    <b style={{color}}>{factor}</b><span> {value} </span>
                  </div>
                })}
              </span>
              <span className="apc">
                <h4>FAVOR aPC</h4>
                {Object.keys(o14.apcdata.data).map(factor => {
                  let color = o14.apc.layer.fieldColor(factor)
                  let value = o14.apcdata.data[factor]
                  return <div className="factor" key={factor} style={{opacity: value > 0 ? 1 : 0.35, backgroundColor: value > 0 ? "white" : "#f0f0f0"}}>
                    <b style={{color}}>{factor}</b><span> {value.toFixed(2)} </span>
                  </div>
                })}
              </span>
              <span className="gwas">
                <h4>GWAS</h4>
                {[o14.gwasdata].map(d => {
                  let fieldIndex = o14.gwasdata.data.max_field
                  let field = o14.gwas.layer.fieldColor.domain()[fieldIndex]
                  let value = o14.gwasdata.data.max_value
                  return <div key={field}className="factor" style={{opacity: value > 0 ? 1 : 0.35, backgroundColor: value > 0 ? "white" : "#f0f0f0"}}>
                    {value > 0 ? <b style={{color: o14.gwas.layer.fieldColor(field)}}>{field}</b>:""}<span> {value.toFixed(2)} </span>

                  </div>
                })}
                {/* {Object.keys(o14.gwasdata.data).map(factor => {
                  let color = "black"//o14.gwas.layer.fieldColor(factor)
                  let value = o14.gwasdata.data[factor]
                  return <div className="factor" key={factor} style={{opacity: value > 0 ? 1 : 0.35, backgroundColor: value > 0 ? "white" : "#f0f0f0"}}>
                    <b style={{color}}>{factor}</b><span> {value.toFixed(2)} </span>
                  </div>
                })} */}
              </span>
            </div>}
          </div>
        </div>

        <div className="section csn">
          <h3>Cross-Scale Narration</h3>
          
          <div className="section-content">
            {region?.order < 14 ? <div className="csn-sankey">
              <div >
                <div className="sankey-editorial-controls">
                  <div className="checkboxes">
                    <input type="checkbox" checked={shrinkNone} onChange={e => setShrinkNone(e.target.checked)} />
                    <label htmlFor="shrinkNone">Shrink "None" nodes</label>
                  </div>
                  <input id="csn-slice-slider" type='range' min={1} max={maxUniquePaths - 1} value={csnSlice} onChange={handleChangeCSNSlice} />
                  <label htmlFor="csn-slice-slider">{crossScaleNarrationFiltered.length} paths ({csnSlice} unique)</label>

                  <br></br>
                  <input id="csn-threshold-slider" type='range' min={0} max={3} step="0.1" value={csnThreshold} onChange={handleChangeCSNThreshold} />
                  <label htmlFor="csn-threshold-slider">Factor score threshold: {csnThreshold}</label>
                  <br></br>
                  
                  <label>
                    <select id="csn-method-select" onChange={handleCsnMethodChange}>
                      <option value="sum">Sum</option>
                      <option value="normalizedSum">Normalized Sum</option>
                      <option value="max">Max</option>
                    </select>
                  </label>
                  <label htmlFor="csn-method-select">Method Select</label>
                  <br></br>
                </div>
                <Sankey 
                  width={stripsWidth}
                  height={800}
                  order={region.order}
                  paths={crossScaleNarrationUnfiltered}
                  filteredPaths={crossScaleNarrationFiltered}
                  tree={crossScaleNarration?.tree}
                  csn={csn}
                  csnThreshold={csnThreshold}
                  shrinkNone={shrinkNone}
                  filter={nodeFilter}
                  onFilter={setNodeFilter} />

              </div>
            </div> : null }
            {/* <h3>Narration</h3> */}


            { region?.order < 14 ? <div className="lines">
              {topUniquePaths.map((d, i) => {
                return <CSNLine 
                  key={i} 
                  csn={d} 
                  order={region.order} 
                  highlight={i == crossScaleNarrationIndex} 
                  width={stripsWidth} 
                  height={25} 
                  onHover={(c) => setCrossScaleNarrationIndex(topUniquePaths.findIndex(d => d == c))}
                  />
              })}
            </div> : null }
            
            { region?.order < 14 ? <Summary
              order={region.order}
              paths={topUniquePaths}
              onHover={(c) => setCrossScaleNarrationIndex(topUniquePaths.findIndex(d => d == c))}
            /> : null }

            { region?.order < 14 ? <div>
              <b>Explore narrations of {topUniquePaths.length} unique top paths:</b>
            <div className="narration-slider">
              <input id="csn-slider" type='range' min={0} max={topUniquePaths.length - 1} value={crossScaleNarrationIndex} onChange={handleChangeCSNIndex} />
              <label htmlFor="csn-slider">Narration: {crossScaleNarrationIndex}</label>
            </div>
            </div> : null }
            <CSNSentence
              crossScaleNarration={csn}
              order={region.order}
            />
            <div className="thumbs">
              {powerData && range(4, 15).map((order, i) => {
                let d = powerData.find(d => d?.order == order)
                // console.log("D", d)
                let thumbSize = stripsWidth/12 - 34
                // if(csn && csn.path) d = csn.path.find(d => d?.order == order)
                return (
                <div key={i} className={`csn-layer ${region.order == order ? "active" : ""}`} style={{width: (thumbSize+19) + "px", maxWidth: (thumbSize+19) + "px"}}>
                  <div className="csn-layer-header">
                    <span className="csn-order-layer">
                      {showKb(4 ** (14 - order))} (order {order})
                      <br></br> 
                      {d.layer ? d.layer.name : <span>N/A</span>} 
                    </span>
                    
                  </div>
                  
                  { d.layer ? <div className="csn-field-value">
                    <span className="csn-field" style={{color: d.layer.fieldColor(d.region.topField?.field)}}>{d.region.topField?.field}</span>  
                    {/* <span className="csn-value">{showFloat(d.field.value)}</span> */}
                  </div> : <span> N/A </span> }
                  { d.layer ? <RegionThumb region={d.region} highlights={powerData.map(n => n.region)} layer={d.layer} width={thumbSize} height={thumbSize} />
                  : <RegionThumb region={d.region} layer={null} width={thumbSize} height={thumbSize} />}
                  {/* { layersData?.length && <RegionThumb region={d.region} highlights={csn.map(n => n.region)} layer={layersData[5].layer} width={200} height={200} />} */}
                  {d ? <span className="csn-layer-links">
                      <Link to={`/?region=${urlify(d.region)}`}> 🗺️ </Link>
                      <Link to={`/region?region=${urlify(d.region)}`}> 📄 </Link>
                    </span> : null}
                </div> )

            })}
            </div>
            <br></br>
            <Power csn={csn} width={(stripsWidth-450)/2} height={(stripsWidth-450)/2} onData={(data) => setPowerData(data)} />

            


            {/* <div className="strips" id="strips">
              {range(4, csnMaxOrder + 1).map((order, i) => {
                let d
                if(csn && csn.path) d = csn.path.find(d => d?.order == order)
                return (<div key={i} className={`csn-layer ${region.order == order ? "active" : ""}`}>
                  <div className="csn-layer-header">
                    <span className="csn-order-layer">
                      {order}: {d ? d.layer.name : ""} 
                    </span>
                    { d ? <span className="csn-layer-links">
                      <Link to={`/?region=${urlify(d.region)}`}> 🗺️ </Link>
                      <Link to={`/region?region=${urlify(d.region)}`}> 📄 </Link>
                    </span> : null }
                    { d ? <div className="csn-field-value">
                      <span className="csn-field" style={{color: d.layer.fieldColor(d.field.field)}}>{d.field.field}</span>  
                      <span className="csn-value">{showFloat(d.field.value)}</span>
                    </div> : null }
                  </div>
                  { d ? <RegionStrip region={d.region} highlights={csn.path.filter(d => !!d).map(n => n?.region)} layer={d.layer} width={stripsWidth - 500} height={40} />
                  : <div className="region-strip" style={{height: "40px"}}></div>}
                </div> )
            }) }
            </div>
 */}
            
            {/* { crossScaleNarration.length ? 
              <RegionThumb region={crossScaleNarration[1].region} layer={crossScaleNarration[1].layer} width={200} height={200} />
              : null } */}
          </div>
        </div>

        <div className="section genes">
          <h3>Genes</h3>
          <div className="section-content">
            <div>
              Genes inside region: {inside.length}
              {inside.length ? inside.map((d,i) => (
                <div key={d.hgnc} className="gene">
                  <span className="hgnc">{d.hgnc}</span> &nbsp;
                  {showPosition(d)}
                </div>)) 
              : null }
            </div>
            <div>
              Genes overlapping region: {outside.length}
            </div>
          </div>
        </div>

        <div className="section similar">
          <h3>Similar regions</h3>
          <div className="section-content">
            <div className="radio-buttons">
              Show similar regions based on:
              <input type="radio" id="dhs" name="regionType" value="dhs" checked={similarBy === 'dhs'} onChange={() => setSimilarBy('dhs')}/>
              <label htmlFor="dhs">DHS</label>
              <input type="radio" id="chromatin" name="regionType" value="chromatin" checked={similarBy === 'chromatin'} onChange={() => setSimilarBy('chromatin')}/>
              <label htmlFor="chromatin">Chromatin</label>
            </div>
            { similarBy == "dhs" ? <div className="similar-dhs-regions">
                {/* <>{simSearchDHS ? <SelectedModalSimSearch
                  simSearch={simSearchDHS}
                  searchByFactorInds={factorsDHS}
                  handleFactorClick={(factor) => {console.log("dhs factor click", factor)}}
                  onZoom={(region) => { console.log("dhs on zoom", region)}}
                  selectedOrder={region?.order}
                  setRegion={(region) => {console.log("dhs set region", region)}}
                  onHover={(region) => {setSimilarZoomedRegion(zoomARegion(region))}}
                /> : <div>No similar regions found</div>} */}
                {simSearchDHS ? <SimSearchResultList
                  simSearch={simSearchDHS}
                  searchByFactorInds={factorsDHS}
                  onFactorClick={(factor) => {console.log("dhs factor click", factor)}}
                  onZoom={(region) => { console.log("dhs on zoom", region)}}
                  selectedOrder={region?.order}
                  setRegion={(region) => {console.log("dhs set region", region)}}
                  onHover={(region) => {setSimilarZoomedRegion(zoomARegion(region))}}
                /> : <div>No similar regions found</div>}
                {/* </> */}
            </div>
            :
            <div className="similar-chromatin-regions">
                {/* {simSearchChromatin ? <SelectedModalSimSearch
                  simSearch={simSearchChromatin}
                  searchByFactorInds={factorsChromatin}
                  handleFactorClick={(factor) => {console.log("Chromatin factor click", factor)}}
                  onZoom={(region) => { console.log("Chromatin on zoom", region)}}
                  selectedOrder={region?.order}
                  setRegion={(region) => {console.log("Chromatin set region", region)}}
                  onHover={(region) => {setSimilarZoomedRegion(zoomARegion(region))}}
                /> : <div>No similar regions found</div>} */}
                {simSearchChromatin ? <SimSearchResultList
                  simSearch={simSearchChromatin}
                  searchByFactorInds={factorsChromatin}
                  onFactorClick={(factor) => {console.log("Chromatin factor click", factor)}}
                  onZoom={(region) => { console.log("Chromatin on zoom", region)}}
                  selectedOrder={region?.order}
                  setRegion={(region) => {console.log("Chromatin set region", region)}}
                  onHover={(region) => {setSimilarZoomedRegion(zoomARegion(region))}}
                /> : <div>No similar regions found</div>}
            </div>
            }
          </div>
          {layersData && layersData.length && <div className="zoomed-region">
            Region zoomed to order {zoomedRegion?.order}
            {zoomedRegion && region && similarBy == "dhs" && <RegionStrip region={zoomedRegion} segments={32} layer={layers.find(d => d.name == "DHS Components")} width={500} height={40} /> }
            {zoomedRegion && region && similarBy == "chromatin" && <RegionStrip region={zoomedRegion} segments={32} layer={layers.find(d => d.name == "Chromatin States")} width={500} height={40} /> }
            Hovered similar region zoomed to order {similarZoomedRegion?.order}
            {similarZoomedRegion && region && similarBy == "dhs" && <RegionStrip region={similarZoomedRegion} segments={32} layer={layers.find(d => d.name == "DHS Components")} width={500} height={40} /> }
            {similarZoomedRegion && region && similarBy == "chromatin" && <RegionStrip region={similarZoomedRegion} segments={32} layer={layers.find(d => d.name == "Chromatin States")} width={500} height={40} /> }
          </div>}
        </div>
        
        <div className="section layers">
          <h3>Data Layers at order {region.order}</h3>
          <div className="section-content">
            {/* <span>{ranges.map(r => <>{showPosition(r)}<br/></>)}</span> */}
            <span>{showPosition(region)}</span>

            {layersData.length ? layersData.map((d, i) => {
              return (<div key={i} className="layer">
                <b>{d.layer.name}</b>
                <RegionStrip region={region} segments={100} layer={d.layer} width={stripsWidth - 500} height={40} />
                {d.data.map((r, j) => {
                  return j >= 0 ? (<div key={j} className="region">
                    {/* {showPosition(r)} -  */}
                    {/* <span style={{color: r.color}}>{r.field.field}</span> - {r.field.value} */}
                  </div>) : null
                })}
              </div> )
            }) : null}
          </div>
        </div>


      </div>
    </div>
  );
};

export default RegionDetail;
