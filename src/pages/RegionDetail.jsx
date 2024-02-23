import { useState, useEffect, useCallback, useMemo } from 'react';
import { useParams, useLocation, useNavigate, Link } from 'react-router-dom';
import { range } from 'd3-array';

import { showFloat, showPosition } from '../lib/display';
import { urlify, jsonify, parsePosition, fromPosition, sameHilbertRegion } from '../lib/regions';
import { getGenesInCell, getGenesOverCell } from '../lib/Genes'
import { HilbertChromosome, hilbertPosToOrder } from "../lib/HilbertChromosome" 
import Data from '../lib/data';

import layers from '../layers'

import DHS_Components_Sfc_max from '../layers/dhs_components_sfc_max'
import Chromatin_States_Sfc_max from '../layers/chromatin_states_sfc_max';

import LogoNav from '../components/LogoNav';
import SimSearchRegion from '../components/SimSearch/SimSearchRegion'
import SelectedModalSimSearch from '../components/SimSearch/SelectedModalSimSearch'
import SimSearchResultList from '../components/SimSearch/ResultList'
import CrossScaleNarration from '../components/Narration/CrossScaleNarration'
import CSNSentence from '../components/Narration/CSNSentence'
import RegionThumb from '../components/RegionThumb';
import RegionStrip from '../components/RegionStrip';

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
  const [crossScaleNarration, setCrossScaleNarration] = useState([])
  const [crossScaleNarrationIndex, setCrossScaleNarrationIndex] = useState(0)
  

  const [stripsWidth, setStripsWidth] = useState(0);
  useEffect(() => {
    const handleResize = () => {
      const stripsElement = document.querySelector('#strips');
      if (stripsElement)  setStripsWidth(stripsElement.offsetWidth)
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
      console.log("ranges", rs)
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
          console.log("similar dhs ranges", similarRanges)
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
          console.log("similar chromatin ranges", similarRanges)
        }
      })


      CrossScaleNarration(rs[1], [
        layers.find(d => d.name == "DHS Components"),
        layers.find(d => d.name == "Chromatin States"),
        layers.find(d => d.name == "TF Motifs"),
        layers.find(d => d.name == "Repeats"),
      ]).then(crossScaleResponse => {
        console.log("crossScaleResponse", crossScaleResponse)
        setCrossScaleNarration(crossScaleResponse)
      })
    }
  }, [region, fetchData])

  const [csn, setCsn] = useState([])
  const [csnTree, setCsnTree] = useState([])
  useEffect(() => {
    if(crossScaleNarration && crossScaleNarration.paths) {
      console.log("csn!!!", crossScaleNarration)
      // console.log("crossScaleNarrationIndex", crossScaleNarrationIndex, crossScaleNarration[crossScaleNarrationIndex])
      try {
        const paths = crossScaleNarration.paths
        const path = paths[crossScaleNarrationIndex]?.path
        const filtered = path.filter(d => !!d).sort((a,b) => a.order - b.order)
        setCsn(filtered)
        setCsnTree(crossScaleNarration.tree)

      } catch(e) {console.error(e)}
    }
  }, [crossScaleNarrationIndex, crossScaleNarration])

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
            <div className="narration-slider">
              <input id="csn-slider" type='range' min={0} max={crossScaleNarration?.paths?.length - 1} value={crossScaleNarrationIndex} onChange={handleChangeCSNIndex} />
              <label htmlFor="csn-slider">Narration: {crossScaleNarrationIndex}</label>
            </div>
            <CSNSentence
              crossScaleNarration={csn}
              order={region.order}
            />
            <div className="thumbs">
              {range(4, 13).map((order, i) => {
                const d = csn.find(d => d.order == order)
                return (<div key={i} className={`csn-layer ${region.order == order ? "active" : ""}`}>
                  <div className="csn-layer-header">
                    <span className="csn-order-layer">
                      {order}: {d ? d.layer.name : ""} 
                    </span>
                    {d ? <span className="csn-layer-links">
                      <Link to={`/?region=${urlify(d.region)}`}> 🗺️ </Link>
                      <Link to={`/region?region=${urlify(d.region)}`}> 📄 </Link>
                    </span> : null}
                  </div>
                  { d ? <div className="csn-field-value">
                    <span className="csn-field" style={{color: d.layer.fieldColor(d.field.field)}}>{d.field.field}</span>  
                    <span className="csn-value">{showFloat(d.field.value)}</span>
                  </div> : null }
                  { d ? <RegionThumb region={d.region} highlights={csn.map(n => n.region)} layer={d.layer} width={200} height={200} />
                  : <RegionThumb region={({})} layer="" width={200} height={200} />}
                  {/* { layersData?.length && <RegionThumb region={d.region} highlights={csn.map(n => n.region)} layer={layersData[5].layer} width={200} height={200} />} */}
                </div> )
              })}
            </div>
            <div className="strips" id="strips">
              {range(4, 13).map((order, i) => {
                const d = csn.find(d => d.order == order)
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
                  { d ? <RegionStrip region={d.region} highlights={csn.map(n => n.region)} layer={d.layer} width={stripsWidth - 500} height={40} />
                  : <RegionStrip region={({})} layer="" width={stripsWidth - 500} height={40} /> }
                </div> )
            }) }
            </div>

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
                <>{simSearchDHS ? <SelectedModalSimSearch
                  simSearch={simSearchDHS}
                  searchByFactorInds={factorsDHS}
                  handleFactorClick={(factor) => {console.log("dhs factor click", factor)}}
                  onZoom={(region) => { console.log("dhs on zoom", region)}}
                  selectedOrder={region?.order}
                  setRegion={(region) => {console.log("dhs set region", region)}}
                  onHover={(region) => {setSimilarZoomedRegion(zoomARegion(region))}}
                /> : <div>No similar regions found</div>}
                {simSearchDHS ? <SimSearchResultList
                  simSearch={simSearchDHS}
                  searchByFactorInds={factorsDHS}
                  onFactorClick={(factor) => {console.log("dhs factor click", factor)}}
                  onZoom={(region) => { console.log("dhs on zoom", region)}}
                  selectedOrder={region?.order}
                  setRegion={(region) => {console.log("dhs set region", region)}}
                  onHover={(region) => {setSimilarZoomedRegion(zoomARegion(region))}}
                /> : <div>No similar regions found</div>}
                </>
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
