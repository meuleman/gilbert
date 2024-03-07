import { useState, useEffect, useCallback, useMemo } from 'react';
import { useParams, useLocation, useNavigate, Link } from 'react-router-dom';
import { range, max } from 'd3-array';

import { showFloat, showPosition } from '../lib/display';
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
import Power from '../components/Narration/Power';

import './RegionDetail.css';


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
  const [crossScaleNarrationFiltered, setCrossScaleNarrationFiltered] = useState([])
  const [crossScaleNarrationIndex, setCrossScaleNarrationIndex] = useState(0)
  const [csnSlice, setCsnSlice] = useState(20)
  

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

  useEffect(() => {
    if(region) {
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
        return fetchData(layer, region.order, rs)
      }))
      layersDataResult.then((response) => {
        setLayersData(response.map((d, i) => {
          const layer = matchingLayers[i]
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
            meta: d.metas[0],
            order: d.order
          }
        }))
      })

      // Sim search on DHS
      SimSearchRegion(rs[1], region.order, DHS_Components_Sfc_max, setFactorsDHS,[]).then((result) => {
        setSimSearchDHS(result)
        let similarRegions = result?.simSearch
        if(similarRegions && similarRegions.length)  {
          const similarRanges = similarRegions.map((d) => {
            const { chromosome, start, end } = parsePosition(d.coordinates)
            let range = fromPosition(chromosome, start, end)
            return range
          })
          // console.log("similar dhs ranges", similarRanges)
        }
      })
      // Sim search on Chromatin States
      SimSearchRegion(rs[1], region.order, Chromatin_States_Sfc_max, setFactorsChromatin, []).then((result) => {
        setSimSearchChromatin(result)
        let similarRegions = result?.simSearch
        if(similarRegions && similarRegions.length)  {
          const similarRanges = similarRegions.map((d) => {
            const { chromosome, start, end } = parsePosition(d.coordinates)
            let range = fromPosition(chromosome, start, end)
            return range
          })
          // console.log("similar chromatin ranges", similarRanges)
        }
      })


      calculateCrossScaleNarration(rs[1], [
        layers.find(d => d.name == "DHS Components"),
        layers.find(d => d.name == "Chromatin States"),
        layers.find(d => d.name == "TF Motifs"),
        layers.find(d => d.name == "Repeats"),
      ]).then(crossScaleResponse => {
        setCrossScaleNarration(crossScaleResponse)
        let uniques = findUniquePaths(crossScaleResponse.paths)
        setCrossScaleNarrationUnique(uniques)
        setMaxUniquePaths(uniques.uniquePaths.length)
      })
    }
  }, [region, fetchData])

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
        // we want to filter to only paths that match the nodeFilter if it has nodes in it
        // the nodeFilter can have 1 or more nodes. the nodes define an order and a field
        // we only let paths through if they have the field at that order
      if(nodeFilter.length) {
        filteredPaths = filteredPaths.filter(d => d.path.filter(p => !!p).filter(p => nodeFilter.find(n => n.order == p.order && n.field == p.field.field)).length === nodeFilter.length)
      } 
      setCrossScaleNarrationFiltered(filteredPaths)
      let topUniques = uniquePaths.slice(0, csnSlice)
      if(nodeFilter.length) {
        topUniques = topUniques.filter(d => d.path.filter(p => !!p).filter(p => nodeFilter.find(n => n.order == p.order && n.field == p.field.field)).length === nodeFilter.length)
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

  const handleChangeCSNIndex = (e) => {
    setCrossScaleNarrationIndex(e.target.value)
  }

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
          </div>
        </div>

        <div className="section csn">
          <h3>Cross-Scale Narration</h3>
          
          <div className="section-content">
            <div className="csn-sankey">
              <div >
                <div className="sankey-editorial-controls">
                  <div className="checkboxes">
                    <input type="checkbox" checked={shrinkNone} onChange={e => setShrinkNone(e.target.checked)} />
                    <label htmlFor="shrinkNone">Shrink "None" nodes</label>
                  </div>
                  <input id="csn-slice-slider" type='range' min={1} max={maxUniquePaths - 1} value={csnSlice} onChange={handleChangeCSNSlice} />
                  <label htmlFor="csn-slice-slider">Top {csnSlice} paths</label>
                  <br></br>
                  <input id="csn-threshold-slider" type='range' min={0} max={3} step="0.1" value={csnThreshold} onChange={handleChangeCSNThreshold} />
                  <label htmlFor="csn-threshold-slider">Factor score threshold: {csnThreshold}</label>
                  <br></br>
                </div>
                <Sankey 
                  width={stripsWidth}
                  height={800}
                  order={region.order}
                  paths={crossScaleNarrationFiltered}
                  tree={crossScaleNarration?.tree}
                  csn={csn}
                  csnThreshold={csnThreshold}
                  shrinkNone={shrinkNone}
                  onFilter={setNodeFilter} />

              </div>
            </div>
            {/* <h3>Narration</h3> */}
            <div>
              <b>Explore narrations of {topUniquePaths.length} unique top paths:</b>
            </div>
            <div className="narration-slider">
              <input id="csn-slider" type='range' min={0} max={topUniquePaths.length - 1} value={crossScaleNarrationIndex} onChange={handleChangeCSNIndex} />
              <label htmlFor="csn-slider">Narration: {crossScaleNarrationIndex}</label>
            </div>
            <CSNSentence
              crossScaleNarration={csn}
              order={region.order}
            />
            <Power csn={csn} width={300} height={300} />

            <div className="thumbs">
              {range(4, csnMaxOrder + 1).map((order, i) => {
                let d;
                let thumbSize = stripsWidth/12 - 48
                if(csn && csn.path) d = csn.path.find(d => d?.order == order)
                return (
                <div key={i} className={`csn-layer ${region.order == order ? "active" : ""}`} style={{width: (thumbSize+19) + "px", maxWidth: (thumbSize+19) + "px"}}>
                  <div className="csn-layer-header">
                    <span className="csn-order-layer">
                      {order}:<br></br> {d ? d.layer.name : ""} 
                    </span>
                    {/* {d ? <span className="csn-layer-links">
                      <Link to={`/?region=${urlify(d.region)}`}> 🗺️ </Link>
                      <Link to={`/region?region=${urlify(d.region)}`}> 📄 </Link>
                    </span> : null} */}
                  </div>
                  { d ? <div className="csn-field-value">
                    <span className="csn-field" style={{color: d.layer.fieldColor(d.field.field)}}>{d.field.field}</span>  
                    {/* <span className="csn-value">{showFloat(d.field.value)}</span> */}
                  </div> : null }
                  { d ? <RegionThumb region={d.region} highlights={csn.path.filter(d => !!d).map(n => n.region)} layer={d.layer} width={thumbSize} height={thumbSize} />
                  : <RegionThumb region={({})} layer={null} width={thumbSize} height={thumbSize} />}
                  {/* { layersData?.length && <RegionThumb region={d.region} highlights={csn.map(n => n.region)} layer={layersData[5].layer} width={200} height={200} />} */}
                </div> )
              })}
            </div>

            <div className="lines">
              {topUniquePaths.map((d, i) => {
                return <CSNLine 
                  key={i} 
                  csn={d} 
                  order={region.order} 
                  highlight={i == crossScaleNarrationIndex} 
                  width={stripsWidth} 
                  height={40} 
                  onHover={(c) => setCrossScaleNarrationIndex(topUniquePaths.findIndex(d => d == c))}
                  />
              })}
            </div>


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
                {simSearchChromatin ? <SelectedModalSimSearch
                  simSearch={simSearchChromatin}
                  searchByFactorInds={factorsChromatin}
                  handleFactorClick={(factor) => {console.log("Chromatin factor click", factor)}}
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
            {zoomedRegion && region && similarBy == "dhs" && <RegionStrip region={zoomedRegion} segments={32} layer={layersData[5].layer} width={500} height={40} /> }
            {zoomedRegion && region && similarBy == "chromatin" && <RegionStrip region={zoomedRegion} segments={32} layer={layersData[9].layer} width={500} height={40} /> }
            Hovered similar region zoomed to order {similarZoomedRegion?.order}
            {similarZoomedRegion && region && similarBy == "dhs" && <RegionStrip region={similarZoomedRegion} segments={32} layer={layersData[5].layer} width={500} height={40} /> }
            {similarZoomedRegion && region && similarBy == "chromatin" && <RegionStrip region={similarZoomedRegion} segments={32} layer={layersData[9].layer} width={500} height={40} /> }
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
