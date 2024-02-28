import { useState, useEffect, useCallback, useMemo } from 'react';
import { useParams, useLocation, useNavigate, Link } from 'react-router-dom';
import { range, max } from 'd3-array';
import { sankey, sankeyJustify, sankeyCenter, sankeyLinkHorizontal } from 'd3-sankey';

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

function walkTree(tree, node, path=[]) {
  if (node === undefined || node === null || tree === undefined || tree.length === 0) {
      return path;
  }
  path.unshift(node); // Add the current node to the beginning of the path
  const parentNodeIndex = tree[node][0]; // Get the parent node index
  // console.log("parent", parentNodeIndex, "path", path)
  if (parentNodeIndex) {
      return walkTree(tree, parentNodeIndex, path); // Recursively walk up the tree
  }
  return path; // Return the accumulated path when the root is reached or if there's no parent
}

const RegionDetail = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const queryParams = useMemo(() => new URLSearchParams(location.search), [location]);
  const region = useMemo(() => {return jsonify(queryParams.get('region'))}, [queryParams]);
  useEffect(() => { document.title = `Gilbert | Region Detail: ${region.chromosome}:${region.start}` }, [region]);
  const fetchData = useMemo(() => Data({debug: false}).fetchData, []);


  const sankeyHeight = 800

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
  const [csnPath, setCsnPath] = useState([])
  const [csnTree, setCsnTree] = useState([])
  const [sank, setSank] = useState(null)
  useEffect(() => {
    if(crossScaleNarration && crossScaleNarration.paths) {
      console.log("csn!!!", crossScaleNarration)
      // console.log("crossScaleNarrationIndex", crossScaleNarrationIndex, crossScaleNarration[crossScaleNarrationIndex])
      const paths = crossScaleNarration.paths
      const path = paths[crossScaleNarrationIndex]
      // const filtered = path.filter(d => !!d).sort((a,b) => a.order - b.order)
      setCsn(path)
      const tree = crossScaleNarration.tree
      setCsnTree(tree)

      setCsnPath(walkTree(tree, path.node, []))
      // we can setup our tree and sankey data here too
      // walk the tree for each path
      const trunks = paths.map(p => {
        return { trunk: walkTree(tree, p.node, []), score: p.score, path: p.path.filter(d => !!d).sort((a, b) => a.order - b.order) }
      })
      console.log("trunks", trunks)

      // the trunk array are the nodes of the tree starting at region.order + 1 and going till 12
      // the paths array contains the factor from order 4 to 12 unless the path is shorter
      // we want nodes that have the order and factor as the id and link to other nodes via the trunk indices
      const baseOrder = region.order + 1
      const linkId = (a,b) => `${a.id}=>${b.id}`
      let nodesMap = {}
      let linksMap = {}
      trunks.forEach(t => {
        let ns = t.trunk.map((b,i) => {
          // get the corresponding path element for this trunk node based on the order
          let p = t.path.find(d => d.order == baseOrder + i)
          // if no path, lets still place an empty node, these will acumulate
          if(!p) {
            p = { order: baseOrder + i, layer: { name: "None" }, field: { field: "None", value: 0 } }
          }
          let node = {
            id: `${p.order}-${p.field.field}`,
            // do we include "b" which is essentially the region id within the order?
            // id: `${b}-${p.order}-${p.field.field}`,
            node: b,
            order: p.order,
            dataLayer: p.layer,
            field: p.field.field,
            color: p.field.color,
            values: [p.field.value],
          }
          if(nodesMap[node.id]) {
            // lets save the field just in case
            nodesMap[node.id].values.push(p.field.value)
          } else {
            nodesMap[node.id] = node
          }
          return node
        })
        // create link to parent for each node we just made
        ns.forEach((n,i) => {
          if(i == 0) return
          let source = ns[i-1]
          let target = n
          if(linksMap[linkId(source, target)]) {
            linksMap[linkId(source, target)].value += t.score
          } else {
            linksMap[linkId(source, target)] = {
              source: source.id,
              target: target.id,
              value: t.score
            }
          }
        })
        return ns
      })

      // const nodes2 = Array.from(new Set(trunks.flatMap(t => t.trunk)))
      //   .map(i => ({ id: i }))

      const nodes = Object.values(nodesMap).sort((a,b) => a.order - b.order)
      const links = Object.values(linksMap)

      console.log("nodes", nodes)
      // create source target pairs
      // const links2 = trunks.flatMap(t => {
      //   return t.trunk.map((b,i) => {
      //     if(i == t.trunk.length - 1) return null
      //     return { source: b, target: t.trunk[i + 1], value: t.score}
      //   }).filter(d => !!d)
      // })
      console.log("links", links)

      const depth = 12 - region.order
      const spacing = stripsWidth/(depth + 1)
      const sankeyWidth = stripsWidth - spacing
      console.log("spacing", spacing, depth)
      const s = sankey()
        .nodeId(d => d.id)
        .nodeWidth(15)
        .nodePadding(5)
        // .nodeAlign(sankeyJustify)
        .nodeAlign(sankeyCenter)
        // .nodeSort((a,b) => b.value - a.value)
        .extent([[0, 20], [sankeyWidth, sankeyHeight - 20]])
        ({ nodes, links })
      console.log("sank", s)
      setSank(s)

    }
  }, [crossScaleNarrationIndex, crossScaleNarration, stripsWidth, region])

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
                let d;
                if(csn && csn.path) d = csn.path.find(d => d?.order == order)
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
                  { d ? <RegionThumb region={d.region} highlights={csn.path.filter(d => !!d).map(n => n.region)} layer={d.layer} width={200} height={200} />
                  : <RegionThumb region={({})} layer="" width={200} height={200} />}
                  {/* { layersData?.length && <RegionThumb region={d.region} highlights={csn.map(n => n.region)} layer={layersData[5].layer} width={200} height={200} />} */}
                </div> )
              })}
            </div>
            <div className="strips" id="strips">
              {range(4, 13).map((order, i) => {
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

            <div className="csn-sankey">
              <h3>Path Sankey</h3>
              <div onClick={() => {
                console.log(csn, csnTree[csn.node]);
                console.log(walkTree(csnTree, csn.node, []))
                console.log("sankey", sank)
              }}>
                {sank ? <svg className="path-sankey" width={stripsWidth - 10} height={sankeyHeight}>
                  <g className="orders">
                    {range(region.order+1, 13).map((order, i) => {
                      let x = sank.nodes.find(d => d.order == order)?.x0
                      return <text key={i} x={x} y={10} dy={".35em"}>Order: {order}</text>
                    })
                    }
                  </g>
                  <g className="nodes">
                    {sank.nodes.map(node => {
                      return <rect 
                        key={node.id} 
                          x={node.x0} 
                          y={node.y0} 
                          width={node.x1 - node.x0} 
                          height={node.y1 - node.y0} 
                          // fill={ csnPath.indexOf(node.id) >= 0 ? "orange": "gray" }
                          fill={ node.color }
                          stroke="black"
                          fillOpacity="0.75"
                          />
                    })}
                  </g>
                  <g className="node-labels">
                    {sank.nodes.map(node => {
                      return <text
                        key={node.id} 
                          x={node.x1 + 10} 
                          y={node.y0 + (node.y1 - node.y0)/2} 
                          dy={".35em"}
                          // fill={ csnPath.indexOf(node.id) >= 0 ? "orange": "gray" }
                          fill={ node.color }
                          >
                            {node.field} ({node.dataLayer.name})
                      </text>
                    })}
                  </g>
                  <g className="links">
                    {sank.links.map(link => {
                      return <path 
                        key={link.index} 
                        d={sankeyLinkHorizontal()(link)}
                        fill="none"
                        stroke="#aaa"
                        strokeWidth={Math.max(1, link.width)}
                        strokeOpacity={0.5}
                        />
                    })}
                  </g>

                </svg> : null}
              </div>
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
