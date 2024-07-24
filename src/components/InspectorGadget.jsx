import { useState, useCallback, useEffect, useContext } from 'react'
import FiltersContext from './ComboLock/FiltersContext'
import { Link } from 'react-router-dom'
import { urlify } from '../lib/regions'
import { showKb } from '../lib/display'
import CSNSentence from './Narration/Sentence'
import CSNLine from './Narration/Line'
import ZoomLine from './Narration/ZoomLine'
import ScoreBars from './Narration/ScoreBars'
import Power from './Narration/Power'
import Loading from './Loading'
import { scaleLinear } from 'd3-scale'
import { variantChooser } from '../lib/csn'
import { makeField } from '../layers'

import './InspectorGadget.css'

const InspectorGadget = ({
  selected = null,
  narration = null,
  zoomOrder,
  maxPathScore,
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

  const { filters, handleFilter } = useContext(FiltersContext);

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
    }
  }, [narration, zOrder])
  
  return (
    <>
    {selected && (
    <div className="power-overlay" style={{
      position: "absolute", 
      top: modalPosition?.y - powerHeight/2 - 62, 
      left: modalPosition?.x - powerWidth/2
      }}>
      <div className="header">
        <div className="power-modal-selected">
          <button onClick={() => setZoomOrder(selected.order + 0.5)}>reset zoom</button>
        </div>
        <div className="header-buttons">
          <div className="close" onClick={onClose}>x</div>
        </div>
      </div>
      <div className={`content ${minimized ? "minimized" : ""}`}>
        {loadingCSN ? <div style={{height: `${powerHeight}px`}}><Loading text={"Loading CSN..."}></Loading></div> : 
         selected && narration ? <div className="csn">
          <div className="power-container">
            <Power 
              csn={narration} 
              width={powerWidth} 
              height={powerHeight} 
              userOrder={zOrder}
              onOrder={handleZoom}
              />
            <div className="zoom-scores">
              <ZoomLine 
                csn={narration} 
                order={zOrder} 
                maxPathScore={maxPathScore}
                highlight={true}
                selected={true}
                text={true}
                width={34} 
                offsetX={34}
                height={powerHeight} 
                tipOrientation={tipOrientation}
                onHover={handleZoom}
                onClick={(c) => { console.log("narration", c)}}
                onFactor={(p) => {
                  let field = makeField(p.layer, p.field.index, p.order)
                  handleFilter(field, p.order)
                }}
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
              
          </div>
          <div className="zoom-text">
            At the {showKb(Math.pow(4, 14 - Math.floor(zOrder)))} scale, 
            {zoomedPathRegion ? " the dominant factor is " : "no factors are significant for this path."}
            {zoomedPathRegion ? <span>
              {zoomedPathRegion.layer?.name}: {zoomedPathRegion.field?.field}
            </span>: ""}
          </div>
        </div> : null }
        <div className="power-modal-children">
          {children}
        </div>
      </div>
    </div>
  )}
</>
  )
}
export default InspectorGadget