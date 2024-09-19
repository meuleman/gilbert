import { useState, useCallback, useEffect, useContext, useMemo } from 'react'
import FiltersContext from './ComboLock/FiltersContext'
import { Link } from 'react-router-dom'
import { urlify } from '../lib/regions'
import { showKbOrder, showPosition } from '../lib/display'
import GoogleSearchLink from './Narration/GoogleSearchLink'
import ZoomLine from './Narration/ZoomLine'
import ScoreBars from './Narration/ScoreBars'
import Power from './Narration/Power'
import Loading from './Loading'
import { scaleLinear } from 'd3-scale'
import { retrieveFullDataForCSN, variantChooser } from '../lib/csn'
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
  // useEffect(() => {
  //   console.log("zoom order changed", zoomOrder)
  //   if(zoomOrder < 4) zoomOrder = 4
  //   setZoomOrder(zoomOrder)
  // }, [zoomOrder])
  useEffect(() => {
    // console.log("zoom order changed", zoomOrder)
    if(!narration) return
    let zr = narration.region.order + 0.5
    if(zr < 4) zr = 4
    setZoomOrder(zr)
  }, [narration])

  const handleZoom = useCallback((or) => {
    if(or < 4) or = 4
    setZoomOrder(or)
  }, [setZoomOrder])
  
  const [opacity, setOpacity] = useState(1)
  useEffect(() => {
    if(Math.floor(zOrder) == Math.floor(zoomOrder)) {
      setOpacity(0.25)
    } else {
      setOpacity(1)
    }
  }, [zOrder, zoomOrder])

  
  const [zoomedPathRegion, setZoomedPathRegion] = useState(null)
  useEffect(() => {
    if (narration && narration.path && narration.path.length) {
      let z = Math.floor(zOrder)
      if(z > 14) z = 14
      let zr = narration.path.find(n => n.order == z)
      if(z == 14 && narration.variants && narration.variants.length) {
        let v = variantChooser(narration.variants)
        zr = {field: v.topField, layer: v.layer, order: 14, region: v}
      }
      setZoomedPathRegion(zr)
    }
  }, [narration, zOrder])

  const modalTop = useMemo(() => {
    let top = modalPosition?.y - powerHeight/2 - 62
    if(top < 0) top = 0
    return top
  }, [modalPosition, powerHeight])
  const modalLeft = useMemo(() => {
    let left = modalPosition?.x - powerWidth/2 - 12
    if(left < 0) left = 0
    return left
  }, [modalPosition, powerWidth])

  const [fullNarration, setFullNarration] = useState(null)
  const [loadingFullNarration, setLoadingFullNarration] = useState(false)
  useEffect(()=> {
    // defaults to the un-annotated Narration passed in
    setFullNarration(narration)
    setLoadingFullNarration(true)
  }, [narration])

  const handlePowerData = useCallback((data) => {
    // when the power data is done loading (when Narration changes)
    // then we load full
    console.log("IG: power data", data)
    console.log("IG: narration", narration)
    retrieveFullDataForCSN(narration).then((response) => {
      console.log("IG: full narration", response)
      setFullNarration(response)
      setLoadingFullNarration(false)
    })
  }, [narration])


  
  return (
    <>
    {selected && (
    <div className="power-overlay" style={{
      position: "absolute", 
      top: modalTop, 
      left: modalLeft,
      // backgroundColor: `rgba(255, 255, 255, ${opacity})`
      }}>
      <div className="header">
        <div className="power-modal-selected">
        {/* {showPosition(selected)} */}
          { narration && showPosition(narration.region) }
          { /* <button onClick={() => setZoomOrder(selected.order + 0.5)}>reset zoom</button> */ }
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
              onData={handlePowerData}
              />
            <div className="zoom-scores">
              <ZoomLine 
                csn={fullNarration} 
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
                // onFactor={(p) => {
                //   let field = makeField(p.layer, p.field.index, p.order)
                //   handleFilter(field, p.order)
                // }}
                /> 
              <ScoreBars
                csn={loadingFullNarration ? narration : fullNarration} 
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
          { /* 
          <div className="zoom-text">
            At the {showKbOrder(zOrder)} scale, 
            {zoomedPathRegion?.field ? " the dominant factor is " : "no factors are significant for this path."}
            {zoomedPathRegion?.field ? <span>
              {zoomedPathRegion.layer?.name}: {zoomedPathRegion.field?.field}
            </span>: ""}
          </div>
          */ }
          {/* { loadingFullNarration ? <Loading text={"📊 Preparing literature search..."} /> : <GoogleSearchLink narration={fullNarration} /> } */}
          <GoogleSearchLink narration={narration} />
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