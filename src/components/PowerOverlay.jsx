import { useState, useCallback, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { urlify } from '../lib/regions'
import { showKb } from '../lib/display'
import CSNSentence from './Narration/Sentence'
import CSNLine from './Narration/Line'
import ZoomLine from './Narration/ZoomLine'
import ScoreBars from './Narration/ScoreBars'
import PowerModal from './Narration/PowerModal'
import { scaleLinear } from 'd3-scale'
import { variantChooser } from '../lib/csn'

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
  // tipOrientation="left",
  onCSNIndex=()=>{},
  onClose=()=>{},
  onZoom=()=>{},
  children=null
} = {}) => {

  const tipOrientation = "right"
  const powerWidth = 300
  const powerHeight = 300 //Math.round(powerWidth / mapWidth * mapHeight);

  const [minimized, setMinimized] = useState(false)
  const onMinimize = useCallback(() => {
    setMinimized(!minimized)
  }, [minimized, setMinimized])

  const [zOrder, setZoomOrder] = useState(zoomOrder)
  useEffect(() => {
    console.log("zoom order changed", zoomOrder)
    if(zoomOrder < 4) zoomOrder = 4
    setZoomOrder(zoomOrder)
  }, [zoomOrder])


  const handleZoom = useCallback((or) => {
    if(or < 4) or = 4
    setZoomOrder(or)
  }, [setZoomOrder])

  
  const [zoomedPathRegion, setZoomedPathRegion] = useState(null)
  useEffect(() => {
    if (narration && narration.path && narration.path.length) {
      const z = Math.floor(zOrder)
      let zr = narration.path.find(n => n.order == z)
      if(z == 14 && narration.variants && narration.variants.length) {
        let v = variantChooser(narration.variants)
        zr = {field: v.topField, layer: v.layer, order: 14, region: v}
      }
      setZoomedPathRegion(zr)
      // console.log("NARRATION IN OVERLAY", narration)
    }
  }, [narration, zOrder])
  
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
           
            {/* {tipOrientation == "left" ? <ZoomLine 
              csn={narration} 
              order={zOrder} 
              highlight={true}
              selected={true}
              text={true}
              width={34} 
              height={powerHeight} 
              tipOrientation={tipOrientation}
              onHover={handleZoom}
              onClick={(c) => { console.log("narration", c)}}
            /> : null} */}
            <PowerModal 
              csn={narration} 
              width={powerWidth} 
              height={powerHeight} 
              userOrder={zOrder}
              onOrder={handleZoom}
              />
            {/* {tipOrientation == "right" ?  */}
            <div className="zoom-scores">
              <ZoomLine 
                csn={narration} 
                order={zOrder} 
                highlight={true}
                selected={true}
                text={true}
                width={34} 
                height={powerHeight} 
                tipOrientation={tipOrientation}
                onHover={handleZoom}
                onClick={(c) => { console.log("narration", c)}}
                /> 
              <ScoreBars
                csn={narration} 
                order={zOrder} 
                highlight={true}
                selected={true}
                text={true}
                width={34} 
                height={powerHeight} 
                tipOrientation={tipOrientation}
                onHover={handleZoom}
                onClick={(c) => { console.log("narration", c)}}
                />
              </div>
            {/* : null} */}
              
          </div>
          <div className="zoom-text">
            At the {showKb(Math.pow(4, 14 - Math.floor(zOrder)))} scale, 
            {zoomedPathRegion ? " the dominant factor is " : "no factors are significant for this path at this scale."}
            {zoomedPathRegion ? <span>
              {zoomedPathRegion.layer.name}: {zoomedPathRegion.field.field}
            </span>: ""}
          </div>
          <div>
            {/* {zoomOrder} */}
            {/* {narration ? <CSNSentence
              crossScaleNarration={narration}
              order={selected.order}
            /> : null } */}
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