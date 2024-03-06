// A component to display some information below the map when hovering over hilbert cells
import { useState, useCallback } from 'react'
import { Link } from 'react-router-dom'
import { urlify } from '../lib/regions'
import { showKb } from '../lib/display'
import CSNSentence from './Narration/Sentence'

import './SelectedModal.css'

const SelectedModal = ({
  selected = null,
  csn = [],
  onClose=()=>{},
  onZoom=()=>{},
  children=null
} = {}) => {

  const [minimized, setMinimized] = useState(false)
  const onMinimize = useCallback(() => {
    setMinimized(!minimized)
  }, [minimized, setMinimized])
  
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
        
        <div className="csn">
          <CSNSentence
            crossScaleNarration={csn}
            order={selected.order}
          />
        </div>
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