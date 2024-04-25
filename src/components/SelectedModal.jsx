// A component to display some information below the map when hovering over hilbert cells
import { useState, useCallback, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { urlify } from '../lib/regions'
import { showKb } from '../lib/display'
import CSNSentence from './Narration/Sentence'
import CSNLine from './Narration/Line'
import ZoomLine from './Narration/ZoomLine'
import PowerModal from './Narration/PowerModal'

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

  const powerWidth = 350

  const [minimized, setMinimized] = useState(false)
  const onMinimize = useCallback(() => {
    setMinimized(!minimized)
  }, [minimized, setMinimized])

  const [crossScaleNarrationIndex, setCrossScaleNarrationIndex] = useState(0)

  const handleChangeCSNIndex = useCallback((e) => {
    setCrossScaleNarrationIndex(e.target.value)
  }, [setCrossScaleNarrationIndex])

  const [narration, setNarration] = useState(csn)

  const makeNarration = useCallback((c) => {
    let n = {...c}
    n.path = n.path.filter(d => !!d).sort((a,b) => a.order - b.order)
    n.layers = csn.layers
    return n
  }, [csn])

  useEffect(() => {
    if(crossScaleNarration.length == 0) return
    let narration = makeNarration(crossScaleNarration[crossScaleNarrationIndex])
    console.log("narration", narration)
    setNarration(narration)
  }, [crossScaleNarration, crossScaleNarrationIndex, csn])

  useEffect(() => {
    console.log("selected modal csn", csn)
    console.log("selected CSN", crossScaleNarration)
  }, [crossScaleNarration, csn])

  const [zoomOrder, setZoomOrder] = useState(selected.order + 0.5)
  
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
          {/* <div className="narration-slider">
            <input id="csn-slider" type='range' min={0} max={crossScaleNarration.length - 1} value={crossScaleNarrationIndex} onChange={handleChangeCSNIndex} />
            <label htmlFor="csn-slider">Narration: {crossScaleNarrationIndex}</label>
          </div> */}
          <CSNSentence
            crossScaleNarration={narration}
            order={selected.order}
          />
          <br/>
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
              csn={crossScaleNarration[0]} 
              order={zoomOrder} 
              highlight={true}
              selected={true}
              text={true}
              width={18} 
              height={powerWidth} 
              onClick={(c) => {
                // setNarration(c)
                setCrossScaleNarrationIndex(0)
              }}
              onHover={(or) => {
                // console.log("hover", or)
                if(crossScaleNarrationIndex !== 0) {
                  setCrossScaleNarrationIndex(0)
                }
                setZoomOrder(or)
              }}
              />
              {crossScaleNarration.slice(1, 16).map((n,i) => {
                return (<ZoomLine 
                  key={i}
                  csn={n} 
                  order={zoomOrder} 
                  highlight={true}
                  selected={crossScaleNarrationIndex === i}
                  text={false}
                  width={6} 
                  height={powerWidth} 
                  onClick={(c) => {
                    // setNarration(c)
                    setCrossScaleNarrationIndex(i)
                  }}
                  onHover={(or) => {
                    // console.log("hover", or)
                    if(crossScaleNarrationIndex !== i) {
                      setCrossScaleNarrationIndex(i)
                    }
                    setZoomOrder(or)
                  }}
                  />)
                })}
            <PowerModal csn={narration} 
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
              />
              
          </div>
          <div>
            {/* {zoomOrder} */}
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