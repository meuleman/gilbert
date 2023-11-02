
import { all } from 'axios'
import './LensModal.css'
import lenses from './Lenses/lenses.json'
import { useEffect, useState } from 'react'
import LayerLegend from './LayerLegend'

const LensModal = ({
  layers,
  currentLayer,
  setLayerOrder,
  setLayer,
  setLayerLock,
  layerLock,
  setLayerLockFromIcon,
  layerLockFromIcon,
  setSearchByFactorInds,
  setLensHovering,
  lensHovering,
  order,
  orders=[4,5,6,7,8,9,10,11,12,13,14]
} = {}) => {

  // "Integrative" : {
  //   "4": "DHS Components", 
  //   "5": "DHS Components", 
  //   "6": "DHS Components", 
  //   "7": "DHS Components", 
  //   "8": "Chromatin States", 
  //   "9": "Chromatin States", 
  //   "10": "TF Motifs", 
  //   "11": "GC Content", 
  //   "12": "GC Content", 
  //   "13": "GC Content", 
  //   "14": "Nucleotides"
  // },
  // positioning with zoom legend label boxes
  const zoomLegendElement = document.querySelector('.label-box');
  const xPos = zoomLegendElement?.getBoundingClientRect().left
  const buttonWidth = zoomLegendElement?.getBoundingClientRect().width

  const lensNames = Object.keys(lenses)

  const [permanentLens, setPermanentLens] = useState(null)
  const [layerLockLayer, setLayerLockLayer] = useState(null)

  // finds the layer order for desired lens
  const getNewLens = (lens) => {
    let newLayerOrder = {}
    orders.forEach((order) => {
      const desiredName = lens[order]
      const desiredDatasetArr = layers.filter((d) => d.name == desiredName)
      if(desiredDatasetArr.length === 1) {
        const desiredDataset = desiredDatasetArr[0]
        newLayerOrder[order] = desiredDataset
      } else {
        console.error(`error: ${desiredDatasetArr.length} matching datasets found, expected 1`);
      }
    })
    return newLayerOrder
  }

  // change layerOrder to desired lens
  const changeLensPermanent = (lens, id) => {
    const newLayerOrder = getNewLens(lens)
    if(Object.keys(newLayerOrder).length === orders.length) {
      if(permanentLens?.id !== id) {
        setSearchByFactorInds([])
      }
      setLayerOrder(newLayerOrder)
      setLayer(newLayerOrder[order])
      setPermanentLens({
        lens: lens,
        id: id
      })
    }
  }

  // setLayer to what desired lens defines at current order
  const onMouseOver = (lens, id) => {
    setLensHovering(true)
    const newLayerOrder = getNewLens(lens, id)
    if(Object.keys(newLayerOrder).length === orders.length) {
      setLayer(newLayerOrder[order])
      setLayerOrder(newLayerOrder)
    }
  }

  const [selectedSublenses, setSelectedSublenses] = useState(new Array(lensNames.length).fill(0))
  // override layerLock and set lens
  const onClick = (lens, id, lensIndex, sublensIndex) => {
    setLayerLock(false)
    setLayerLockFromIcon(null)
    changeLensPermanent(lens, id)
    if((lensIndex !== null) && (sublensIndex !== null)) {
      let newSelectedSublenses = selectedSublenses
      newSelectedSublenses[lensIndex] = sublensIndex
      setSelectedSublenses(newSelectedSublenses)
    }
  }

  // set the layer or lens depending on layerLock
  const onMouseLeave = (lens, id) => {
    setLensHovering(false)
    if(layerLock) {
      setLayer(layerLockLayer)
    } else {
      changeLensPermanent(lens, id)
    }
  }

  // on render, set the permanent layer to Default
  useEffect(() => {
    changeLensPermanent(lenses[lensNames[0]], lensNames[0])
  }, [setLayerOrder])

  // handle when layerLock is toggled
  useEffect(() => {
    if(layerLock) {  // save the current layer (for MouseLeave)
      setLayerLockLayer(currentLayer)
    } else { // load the permanent layer
      setLayerLockLayer(null)
      if(permanentLens) {
        changeLensPermanent(permanentLens.lens, permanentLens.id)
      }
    }
  }, [layerLock])

  // handle when a layer changes when layerLock is true
  useEffect(() => {
    // save the current layer (for MouseLeave)
    // make sure layerLock is true, we are not hovering over a lens, and it is a different layer than what is already set
    if(layerLock && !lensHovering && layerLockLayer?.name !== currentLayer?.name) {
      setLayerLockLayer(currentLayer)
    }
  }, [currentLayer])

  let isDropdown = new Array(lensNames.length).fill(false)
  lensNames.map((l, i) => {
    if (typeof Object.values(lenses[l])[0] == "object") {
      isDropdown[i] = true
    }
  })

  const [dropdownOpen, setDropdownOpen] = useState(new Array(lensNames.length).fill(false))

  const handleDropdownOpen = (buttonName) => {
    let openArr = [...dropdownOpen]
    const lensIndex = lensNames.indexOf(buttonName)

    // rotate dropdown arrow
    const dropdownButtonElement = document.getElementById(buttonName)
    if (dropdownOpen[lensIndex]) {
      dropdownButtonElement.style.setProperty('--rotation', 'rotate(0deg)'); 
    } else {
      dropdownButtonElement.style.setProperty('--rotation', 'rotate(180deg)'); 
    }

    // set open
    openArr[lensIndex] = !dropdownOpen[lensIndex]
    setDropdownOpen(openArr)
  }

  // when the lock icon is clicked
  const handleLayerLock = () => {
    if(!layerLock) {
      // setLayerLockLens(permanentLens)
      setLayerLockFromIcon(true)
    } else {
      // setLayerLockLens(null)
      setLayerLockFromIcon(null)
    }
    setLayerLock(!layerLock)
  }

  // let tooltip = document.getElementById('label-tooltip')
  // const labelMouseOver = (label) => {
  //   tooltip.style.zIndex = 1
  //   tooltip.style.opacity = 1
  //   tooltip.textContent = label
  // }

  // const labelMouseLeave = () => {
  //   tooltip.style.zIndex = -10
  //   tooltip.style.opacity = 0
  // }

  // const labelMouseMove = (e) => {
  //   const xOffset = 0
  //   const yOffset = 0

  //   tooltip.style.left = e.pageX + xOffset + 'px'
  //   tooltip.style.top = e.pageY + yOffset + 'px'
  // }

  return (
    <>
      {(
        <div className="lens-panel" style={{left: xPos}}>
          {/* <div className={
            (layerLock) ? 
              'layer-locked'
            : 'layer-unlocked'
          }
          onClick={() => handleLayerLock()}/> */}
          {/* onMouseOver={() => labelMouseOver('Lock Layer')}
          onMouseLeave={() => labelMouseLeave()}
          onMouseMove={(e) => labelMouseMove(e)}/> */}
          {/* <div className='label-tooltip' id='label-tooltip'></div> */}
          <div className="lens-panel-lenses">
            {lensNames.map((l, i) => {
              if (isDropdown[i]) {
                const sublenses = lenses[l]
                const sublensNames = Object.keys(sublenses)
                const id = 'dropdown-button-container' + i
                const sublensName = sublensNames[selectedSublenses[i]]
                const sublensLenses = sublenses[sublensName]
                let orderLayer = sublensLenses[order]
                if(permanentLens?.id == sublensName && layerLockFromIcon) {
                  orderLayer = layerLockLayer?.name
                }
                return (
                  <div className='lens-row' id={id} key={id}>
                    {/* <div className='lens-label'>
                      {l}
                    </div> */}
                    <button
                      className={
                        ((layerLockFromIcon != false) && sublensNames.includes(permanentLens?.id)) ? 
                          'dropdown-button-selected' 
                        : 'dropdown-button'
                      }
                      id={l}
                      key={l}
                      style={{width: buttonWidth}}
                      onClick={
                        ((permanentLens?.id == sublensName) && (layerLockFromIcon != false)) ? 
                          (() => handleDropdownOpen(l)) 
                          :((sublensName && sublensLenses) && (() => onClick(sublensLenses, sublensName)))
                      }
                      onMouseOver={(sublensName && sublensLenses) && (() => onMouseOver(sublensLenses, sublensName))}
                      onMouseLeave={() => onMouseLeave(permanentLens.lens, permanentLens.id)}
                    >{l}</button>
                    {dropdownOpen[i] ? (
                      <div  className='dropdown-container'>
                        {sublensNames.map((s, j) => {
                          const sublensLayers = sublenses[s]
                          return (
                            <button
                              className={
                                ((layerLockFromIcon != false) && permanentLens?.id == s) ? 
                                  'dropdown-lens-button-selected'
                                : 'dropdown-lens-button'
                              }
                              key={s}
                              id={s}
                              style={{width: buttonWidth}}
                              onClick={() => onClick(sublensLayers, s, i, j)}
                              onMouseOver={() => onMouseOver(sublensLayers, s)}
                              onMouseLeave={() => onMouseLeave(permanentLens.lens, permanentLens.id)}
                            >
                              {s}
                            </button>
                          )
                        })}
                      </div>
                    ): <div/>}
                  </div>
                )

              } else {
                const lensLayers = lenses[l]
                let orderLayer = lensLayers[order]
                if(permanentLens?.id == l && layerLockFromIcon) {
                  orderLayer = layerLockLayer?.name
                }

                const id = 'button-container' + i
                return (
                  <div className='lens-row' id={id} key={id}>
                    {/* <div className='lens-label'>
                      {l}
                    </div> */}
                    <button 
                      className={
                        ((layerLockFromIcon != false) && permanentLens?.id == l) ? 
                        'lens-button-selected'
                        : 'lens-button'
                      }
                      id={l} 
                      key={l} 
                      style={{width: buttonWidth}}
                      onClick={() => onClick(lensLayers, l)}
                      onMouseOver={() => onMouseOver(lensLayers, l)}
                      onMouseLeave={() => onMouseLeave(permanentLens.lens, permanentLens.id)}
                    >{l}</button>
                  </div>
                )
              }
            })}
          </div>
          <div className='lens-header'>Lenses</div>
        </div>
      )}
    </>
  )
}
export default LensModal