// A component to display some information below the map when hovering over hilbert cells
import { useState, useCallback, useEffect, useMemo } from 'react'
import { Link } from 'react-router-dom'
import { urlify } from '../lib/regions'
import { showKb } from '../lib/display'
import CSNSentence from './Narration/Sentence'
import CSNLine from './Narration/Line'
import ZoomLine from './Narration/ZoomLine'
import PowerModal from './Narration/PowerModal'
import { scaleLinear } from 'd3-scale'

import './PowerOverlay.css'

const PowerOverlay = ({
  selected = null,
  narration = null,
  zoomOrder,
  layers = [],
  loadingCSN = false,
  mapWidth,
  mapHeight,
  modalPosition,
  onCSNIndex=()=>{},
  onClose=()=>{},
  onZoom=()=>{},
  children=null
} = {}) => {

  const powerWidth = 300
  const powerHeight = 300 //Math.round(powerWidth / mapWidth * mapHeight);

  const [minimized, setMinimized] = useState(false)
  const onMinimize = useCallback(() => {
    setMinimized(!minimized)
  }, [minimized, setMinimized])

  const [zOrder, setZoomOrder] = useState(zoomOrder)
  useEffect(() => {
    setZoomOrder(zoomOrder)
  }, [zoomOrder])
  
  return (
    <>
    {selected && (
    <div className="power-overlay" style={{
      position: "absolute", 
      top: modalPosition.y - powerHeight/2 - 62, 
      left: modalPosition.x - powerWidth/2
      }}>
      <div className="header">
        <div className="power-modal-selected">
          {/* 🎯 {selected.chromosome}:{selected.start} - {selected.end} ({showKb(selected.end - selected.start)})
          <span className="autocomplete-info">
            {selected.description && selected.description.type == "gene" ? ` [${selected.description.name}]` : ""}
            {selected.description && selected.description.type == "annotation" ? ` [${selected.description.name}]` : ""}
          </span> */}
          <button onClick={() => setZoomOrder(selected.order + 0.5)}>reset zoom</button>
        </div>
        <div className="header-buttons">
          {/* <div className={`minimize ${minimized ? "active" : ""}`} onClick={onMinimize}>_</div> */}
          <div className="close" onClick={onClose}>x</div>
        </div>
      </div>
      <div className={`content ${minimized ? "minimized" : ""}`}>
        {/* <div className="controls">
          <Link to={`/region?region=${urlify(selected)}`} target="_blank">📄 Details️ Page</Link>
          <Link onClick={() => onZoom(selected)} alt="Zoom to region">🔍 Zoom to region</Link>         
        </div> */}
        
        {loadingCSN ? <div>Loading CSN...</div> : 
        <div className="csn">
          <div className="power-container">
           
            <ZoomLine 
              csn={narration} 
              order={zOrder} 
              highlight={true}
              selected={true}
              text={true}
              width={18} 
              height={powerHeight} 
              onClick={(c) => {
                // setNarration(c)
                // setCrossScaleNarrationIndex(0)
              }}
              onHover={(or) => {
                setZoomOrder(or)
              }}
            />
            <PowerModal 
              csn={narration} 
              width={powerWidth} 
              height={powerHeight} 
              userOrder={zOrder}
              onData={(data) => {
                // console.log("power data", data)
              }}
              onOrder={(order) => {
                setZoomOrder(order)
              }}
              />
              
          </div>
          <div>
            {/* {zoomOrder} */}
            {narration ? <CSNSentence
              crossScaleNarration={narration}
              order={selected.order}
            /> : null }
          </div>

        </div>}
        <div className="power-modal-children">
          {children}
        </div>
      </div>
    </div>
  )}
</>
  )
}
export default PowerOverlay