// A component to display some information below the map when hovering over hilbert cells
import { useState, useCallback, useEffect, useMemo } from 'react'
import { Link } from 'react-router-dom'
import { urlify } from '../lib/regions'
import { showKb } from '../lib/display'
import CSNSentence from './Narration/Sentence'
import CSNLine from './Narration/Line'
import ZoomLine from './Narration/ZoomLine'
import PowerModal from './Narration/Power'
import { scaleLinear } from 'd3-scale'

import './SelectedModal.css'

const SelectedModal = ({
  selected = null,
  k,
  crossScaleNarration = [],
  layers = [],
  loadingCSN = false,
  onCSNIndex=()=>{},
  onClose=()=>{},
  onZoom=()=>{},
  onZoomOrder=()=>{},
  onNarration=()=>{},
  children=null
} = {}) => {

  const powerWidth = 300

  const [minimized, setMinimized] = useState(false)
  const onMinimize = useCallback(() => {
    setMinimized(!minimized)
  }, [minimized, setMinimized])

  const [crossScaleNarrationIndex, setCrossScaleNarrationIndex] = useState(0)
  const [selectedNarrationIndex, setSelectedNarrationIndex] = useState(0)

  const handleChangeCSNIndex = useCallback((e) => {
    setCrossScaleNarrationIndex(e.target.value)
  }, [setCrossScaleNarrationIndex])

  const makeNarration = useCallback((c) => {
    let n = {...c}
    if(!n.path || n.path.length == 0) {
      return {}
    }
    n.path = n.path.filter(d => !!d).sort((a,b) => a.order - b.order)
    n.layers = layers
    return n
  }, [layers])

  const [narration, setNarration] = useState(makeNarration(crossScaleNarration[0]))

  useEffect(() => {
    onNarration(makeNarration(crossScaleNarration[selectedNarrationIndex]))
  }, [selectedNarrationIndex, crossScaleNarration, makeNarration])
  // useEffect(() => {
  //   onNarration(narration)
  // }, [narration])

  useEffect(() => {
    if(crossScaleNarration.length == 0) return
    let narration = makeNarration(crossScaleNarration[crossScaleNarrationIndex])
    setNarration(narration)
  }, [crossScaleNarration, crossScaleNarrationIndex, makeNarration])

  // useEffect(() => {
  //   console.log("selected CSN", crossScaleNarration)
  // }, [crossScaleNarration])

  const unselectedNarrations = useMemo(() => {
    return crossScaleNarration.filter((n,i) => i !== crossScaleNarrationIndex)
  }, [crossScaleNarration, crossScaleNarrationIndex])

  const orderZoomScale = scaleLinear().domain([0.85, 4000]).range([1, Math.pow(2, 10.999)])
  const [zoomOrder, setZoomOrder] = useState(4)
  useEffect(() => {
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
    setCrossScaleNarrationIndex(selectedNarrationIndex)
    setZoomOrder(or)
  }, [selectedNarrationIndex, setCrossScaleNarrationIndex, setZoomOrder])
  
  const handleLineClick = useCallback((c) => {
    // setNarration(c)
    let idx = crossScaleNarration.indexOf(c)
    setSelectedNarrationIndex(idx)
    setCrossScaleNarrationIndex(idx)
    onCSNIndex(idx)
    onZoomOrder(Math.floor(zoomOrder) + 0.5)
  }, [crossScaleNarration, onCSNIndex, onZoomOrder, zoomOrder])
  
  const handleLineHover = useCallback((i) => (or) => {
    // console.log("hover", or)
    if(crossScaleNarrationIndex !== i) {
      setCrossScaleNarrationIndex(i)
    }
    setZoomOrder(or)
  }, [crossScaleNarrationIndex, setCrossScaleNarrationIndex, setZoomOrder])
  
  return (
    <>
    {selected && (
    <div className="selected-modal">
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
        
        {loadingCSN ? <div>Loading CSN...</div> : 
        <div className="csn">
          <span className="csn-info">Hover over the visualization below to see the various cross-scale narrations. 
              Click to select the narration and zoom level.</span>
          {/* <div className="narration-slider">
            <input id="csn-slider" type='range' min={0} max={crossScaleNarration.length - 1} value={crossScaleNarrationIndex} onChange={handleChangeCSNIndex} />
            <label htmlFor="csn-slider">Narration: {crossScaleNarrationIndex}</label>
          </div> */}
       
          {/* <CSNLine 
            csn={narration} 
            order={selected.order} 
            highlight={true}
            selected={true}
            text={false}
            width={width} 
            height={25} 
            onClick={(c) => {
              console.log("selected", c)
            }}
            onHover={(c) => {
            }}
            /> */}

          <br></br>
          <div className="power-container">
            <ZoomLine 
              csn={crossScaleNarration[selectedNarrationIndex]} 
              order={zoomOrder} 
              highlight={true}
              selected={true}
              text={true}
              width={34} 
              height={powerWidth} 
              onClick={handleLineClick}
              onHover={handleMainLineHover}
              />
              {crossScaleNarration.slice(0, 50).map((n,i) => {
                return (<ZoomLine 
                  key={i}
                  csn={n} 
                  order={zoomOrder} 
                  highlight={true}
                  selected={crossScaleNarrationIndex === i || selectedNarrationIndex === i}
                  text={false}
                  width={8.5} 
                  height={powerWidth} 
                  onClick={handleLineClick}
                  onHover={handleLineHover(i)}
                  />)
                })}
            {/* <PowerModal csn={narration} 
              width={powerWidth} 
              height={powerWidth} 
              scroll={false} 
              oned={false} 
              userOrder={zoomOrder}
              onData={(data) => {
                // console.log("power data", data)
              }}
              onOrder={(order) => {
                // console.log("power order", order)
              }}
              /> */}
              
          </div>
          <div>
            <span>Cross-Scale Narration path: {crossScaleNarrationIndex + 1}, score: {narration.score?.toFixed(2)}</span>
            <CSNSentence
              crossScaleNarration={narration}
              order={selected.order}
            />
          </div>

        </div>}
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