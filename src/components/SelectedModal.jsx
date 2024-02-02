// A component to display some information below the map when hovering over hilbert cells
import { urlify } from '../lib/regions'
import { Link } from 'react-router-dom'
import { showKb } from '../lib/display'

import './SelectedModal.css'

const SelectedModal = ({
  selected = null,
  onClose=()=>{},
  onZoom=()=>{},
  children=null
} = {}) => {
  
  return (
    <>
    {selected && (
    <div className="selected-modal">
      <div className="header">
        <Link to={`/region?region=${urlify(selected)}`} target="_blank">Details ↗️</Link>
        <Link onClick={onZoom} alt="Zoom to region">🧭 Zoom to region</Link>         
        <div className="close" onClick={onClose}>x</div>
      </div>
      <div className="selected-modal-selected">
        🎯 {selected.chromosome}:{selected.start} - {selected.end} ({showKb(selected.end - selected.start)})
      </div>
      <div className="selected-modal-children">
        {children}
      </div>
    </div>
  )}
</>
  )
}
export default SelectedModal