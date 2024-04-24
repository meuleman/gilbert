// A component to display some information below the map when hovering over hilbert cells
import { useState, useCallback, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { urlify } from '../lib/regions'
import { showKb } from '../lib/display'
import CSNSentence from './Narration/Sentence'
import CSNLine from './Narration/Line'
import Power from './Narration/Power'

import './SelectedModal.css'

const SelectedModal = ({
  selected = null,
  csn = [],
  crossScaleNarration = {},
  loadingCSN = false,
  onClose=()=>{},
  onZoom=()=>{},
  children=null
} = {}) => {

  const width = 450

  const [minimized, setMinimized] = useState(false)
  const onMinimize = useCallback(() => {
    setMinimized(!minimized)
  }, [minimized, setMinimized])

  const [crossScaleNarrationIndex, setCrossScaleNarrationIndex] = useState(0)

  const handleChangeCSNIndex = useCallback((e) => {
    setCrossScaleNarrationIndex(e.target.value)
  }, [setCrossScaleNarrationIndex])

  const [narration, setNarration] = useState(csn)
  useEffect(() => {
    if(crossScaleNarration.length == 0) return
    console.log("SUP", crossScaleNarration)
    let narration = {...crossScaleNarration[crossScaleNarrationIndex]}
    narration.path = narration.path.filter(d => !!d).sort((a,b) => a.order - b.order)
    narration.layers = csn.layers
    console.log("narration", narration)
    setNarration(narration)
  }, [crossScaleNarration, crossScaleNarrationIndex, csn])

  useEffect(() => {
    console.log("selected modal csn", csn)
    console.log("selected CSN", crossScaleNarration)
  }, [crossScaleNarration, csn])
  
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
          <div className="narration-slider">
            <input id="csn-slider" type='range' min={0} max={crossScaleNarration.length - 1} value={crossScaleNarrationIndex} onChange={handleChangeCSNIndex} />
            <label htmlFor="csn-slider">Narration: {crossScaleNarrationIndex}</label>
          </div>
          <CSNSentence
            crossScaleNarration={narration}
            order={selected.order}
          />
          <br/>
          <CSNLine 
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
            />

          <br></br>
          <Power csn={narration} 
            width={width} 
            height={width} 
            scroll={false} 
            oned={false} 
            userOrder={selected.order}
            onData={(data) => console.log("power data", data)} />
              
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