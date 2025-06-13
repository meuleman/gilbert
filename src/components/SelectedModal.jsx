// A component to display some information below the map when hovering over hilbert cells
import { useState, useCallback, useEffect, useMemo, useContext } from 'react'
import FiltersContext from './ComboLock/FiltersContext'
import { Link } from 'react-router-dom'
import { urlify } from '../lib/regions'
import { showKb } from '../lib/display'
import { makeField } from '../layers'
import CSNSentence from './Narration/Sentence'
import ZoomLine from './Narration/ZoomLine'
import Loading from './Loading'
import { scaleLinear } from 'd3-scale'
import { max } from 'd3-array'

import './SelectedModal.css'

const SelectedModal = ({
  showFilter = false,
  selected = null,
  regionCSNS = new Map(),
  topCSNS = [],
  regionsByOrder = {},
  selectedTopCSN = null,
  loadingRegionCSNS = false,
  loadingSelectedCSN = false,
  k,
  diversity=true,
  onCSNSelected=()=>{},
  onClose=()=>{},
  onZoom=()=>{},
  onZoomOrder=()=>{},
  onNarration=()=>{},
  onDiversity=()=>{},
  children=null
} = {}) => {

  const powerWidth = 300

  const [minimized, setMinimized] = useState(false)
  const onMinimize = useCallback(() => {
    setMinimized(!minimized)
  }, [minimized, setMinimized])

  // const [crossScaleNarrationIndex, setCrossScaleNarrationIndex] = useState(0)
  // const [selectedNarrationIndex, setSelectedNarrationIndex] = useState(0)

  // const handleChangeCSNIndex = useCallback((e) => {
  //   setCrossScaleNarrationIndex(e.target.value)
  // }, [setCrossScaleNarrationIndex])

  const makeNarration = useCallback((c) => {
    if(!c) return {}
    let n = {...c}
    if(!n.path || n.path.length == 0) {
      return {}
    }
    n.path = n.path.filter(d => !!d).sort((a,b) => a.order - b.order)

    // TODO: add the data (and full data?) to the path
    return n
  }, [])

  const [narration, setNarration] = useState({})
  const [csns, setCSNs] = useState([])
  const [regionCSNSLeft, setRegionCSNSLeft] = useState([])
  useEffect(() => {
    const maxPaths = 50
    if(!selected) {
      setCSNs([])
      setRegionCSNSLeft([])
      onCSNSelected(null)
      return;
    }
    // filter the top paths to match only the selected region
    // console.log("TOP CSNS", topCSNS)
    let csns = topCSNS.get(selected.chromosome + ":" + selected.i) || []
    // console.log("CSNS", csns)
    // append any region path that isn't found in the top paths
    let rcsl = regionCSNS.filter(d => {
      return !csns.some(t => t.chromosome == d.chromosome && t.i == d.i)
    })
    // console.log("USEEFFECT", csns, rcsl)
    setCSNs(csns.slice(0, maxPaths))
    setRegionCSNSLeft(rcsl.slice(0, maxPaths - csns.length))
    if(csns.length > 0) {
      // console.log("SETTING CSN")
      onCSNSelected(csns[0])
    } else if(rcsl.length > 0) {
      // console.log("SETTING RCSL")
      onCSNSelected(rcsl[0])
    } else if(loadingRegionCSNS) {
      // console.log("SETTING NULL")
      onCSNSelected(null)
    }
  }, [topCSNS, regionCSNS, selected])

  // useEffect(() => {
  //   if(selectedTopCSN) {
  //     let narration = makeNarration(selectedTopCSN)
  //     setNarration(narration)
  //     onNarration(narration)
  //   } else {
  //     setNarration(null)
  //     onNarration(null)
  //   }
  // }, [selectedTopCSN, makeNarration])

  const { filters, handleFilter } = useContext(FiltersContext);

  const [zoomOrder, setZoomOrder] = useState(4)
  useEffect(() => {
    const orderZoomScale = scaleLinear().domain([0.85, 4000]).range([1, Math.pow(2, 10.999)])
    let or = 4 + Math.log2(orderZoomScale(k))
    if(selected.order + 0.5 > or) {
      or = selected.order + 0.5
    } 
    setZoomOrder(or)
  }, [selected, k])

  // emit the initial zoom order based on the selected region
  useEffect(() => {
    onZoomOrder(selected.order + 0.5)
  }, [selected])


  const handleMainLineHover = useCallback((or) => {
    // console.log("hover", or)
    // setCrossScaleNarrationIndex(selectedNarrationIndex)
    setZoomOrder(or)
  }, [setZoomOrder])
  
  const handleLineClick = useCallback((c) => {
    // setNarration(c)
    // let idx = crossScaleNarration.indexOf(c)
    // setSelectedNarrationIndex(idx)
    // setCrossScaleNarrationIndex(idx)
    // onCSNIndex(idx)
    // onZoomOrder(Math.floor(zoomOrder) + 0.5)
  }, [onZoomOrder, zoomOrder])
  
  const handleLineHover = useCallback((i) => (or) => {
    // console.log("hover", or)
    // if(crossScaleNarrationIndex !== i) {
    //   setCrossScaleNarrationIndex(i)
    // }
    setZoomOrder(or)
  }, [setZoomOrder])

  const filtered = useMemo(() => {
    if(!selected || !regionsByOrder.total) return null
    let filtered = null
    if(regionsByOrder.chrmsMap[selected.chromosome] && regionsByOrder.chrmsMap[selected.chromosome][selected.i]) {
      filtered = regionsByOrder.chrmsMap[selected.chromosome][selected.i]
    }
    return filtered
  }, [regionsByOrder, selected])

  useEffect(() => {
    console.log("TOP CSNS", topCSNS)
    console.log("REGION CSNS", regionCSNS)
    console.log("SELECTED TOP CSN", selectedTopCSN)
    console.log("SELECTED", selected)
  }, [selected, topCSNS, regionCSNS, selectedTopCSN])



  const [maxPathScore, setMaxPathScore] = useState(0)
  useEffect(() => {
    if(csns.length > 0 || regionCSNSLeft.length > 0) {
      setMaxPathScore(max(csns.concat(regionCSNSLeft), n => n.score))
    }
  }, [csns, regionCSNSLeft])

  const handleDiversityChange = useCallback((e) => {
    onDiversity(!diversity)
  }, [diversity, onDiversity])

  
  return (
    <>
    {selected && (
    <div className={`selected-modal ${showFilter ? "filter-offset" : ""}`}>
      <div className="header">
        <div className="selected-modal-selected">
          🎯 {selected.chromosome}:{selected.start} - {selected.end} ({showKb(selected.end - selected.start)})
          <span className="autocomplete-info">
            {selected.description && selected.description.type == "gene" ? ` [${selected.description.name}]` : ""}
            {selected.description && selected.description.type == "annotation" ? ` [${selected.description.name}]` : ""}
          </span>
        </div>
        <div className="header-buttons">
          <div className={`minimize ${minimized ? "active" : ""}`} onClick={onMinimize}>_</div>
          <div className="close" onClick={onClose}>x</div>
        </div>
      </div>
      {minimized}
      <div className={`content ${minimized ? "minimized" : ""}`}>
        <div className="controls">
          <Link to={`/region?region=${urlify(selected)}`} target="_blank">📄 Details️ Page</Link>
          <Link onClick={() => onZoom(selected)} alt="Zoom to region">🔍 Zoom to region</Link>         
        </div>

        {filtered ? <div>
          {filtered.count} filtered paths in this region.
        </div>: null}
        {/* <div>
          {maxPathScore} max path score
        </div> */}
        {selected && selected.description && selected.description.type == "gene" ? 
          <p>Gene: <b>{selected?.description?.name}</b></p>
        : null}
        {loadingSelectedCSN ? <div><Loading text="Loading Selected Narration..."/></div> : null}
        {loadingRegionCSNS ? <div style={{height: `${powerWidth + 100}px`}}><Loading text="Loading Region Narrations..."/></div> : null}
        {csns.length || regionCSNSLeft.length ? 
        <div className="csn">
          <label>Path Diversity:</label><input type="checkbox" name="diversity" checked={diversity} onChange={handleDiversityChange} /> 
          <br/>
          <span className="csn-info">Hover over the visualization below to see the various cross-scale narrations. 
              Click to select the narration and zoom level.</span>
          <br></br>
          <div className="csns-container">
            { selectedTopCSN && !loadingSelectedCSN ? <ZoomLine 
              csn={selectedTopCSN} 
              order={zoomOrder} 
              maxPathScore={maxPathScore}
              highlight={true}
              selected={true}
              text={true}
              width={32} 
              height={powerWidth} 
              onFactor={(p) => {
                console.log("CLICKED", p)
                let field = makeField(p.layer, p.field.index, p.order)
                handleFilter(field, p.order)
                // onCSNSelected(selectedTopCSN)
                // onNarration(makeNarration(selectedTopCSN))
              }}
              onHover={handleMainLineHover}
              /> : null}
          <div className="top-csns-container">
            
              {csns.map((n,i) => {
                return (<ZoomLine 
                  key={i}
                  csn={n} 
                  order={zoomOrder} 
                  maxPathScore={maxPathScore}
                  highlight={true}
                  selected={selectedTopCSN === n}
                  text={false}
                  width={8} 
                  height={powerWidth} 
                  onClick={() => {
                    onCSNSelected(n)
                  }}
                  onHover={handleLineHover(i)}
                  />)
                })}

            </div> 
            <div className="region-csns-container">
                  {regionCSNSLeft.length && regionCSNSLeft.map((n,i) => {
                  return (<ZoomLine 
                    key={i}
                    csn={n} 
                    order={zoomOrder} 
                    maxPathScore={maxPathScore}
                    highlight={true}
                    selected={selectedTopCSN === n}
                    text={false}
                    width={8} 
                    height={powerWidth} 
                    onClick={() => {
                      onCSNSelected(n)
                    }}
                    onHover={handleLineHover(i)}
                    />)
                  })}
            </div> 
          </div>
              
          
          {selectedTopCSN?.score >= 0 ? <div>
            <span>score: {selectedTopCSN.score?.toFixed(2)}</span>
            <CSNSentence
              crossScaleNarration={selectedTopCSN}
              order={selected.order}
              />
          </div> : null}

        </div> : null }
        <div className="selected-modal-children">
          {children}
        </div>
      </div>
    </div>
  )}
</>
  )
}
export default SelectedModal