
import { all } from 'axios'
import './LensModal.css'
import lenses from './Lenses/lenses.json'
import { useEffect, useState } from 'react'

const LensModal = ({
  layers,
  currentLayer,
  setLayerOrder,
  setLayer,
  setLayerLock,
  layerLock,
  setSearchByFactorInds,
  order,
  orders=[4,5,6,7,8,9,10,11,12,13,14]
} = {}) => {
  const lensNames = Object.keys(lenses)

  const [permanentLayer, setPermanentLayer] = useState(null)
  const [layerLockLayer, setLayerLockLayer] = useState(null)

  // finds the layer order for desired lens
  const getNewLens = (lens) => {
    let newLayerOrder = {}
    orders.forEach((order) => {
      const desiredName = lens[order]
      const desiredDatasetArr = layers.filter((d) => d.name === desiredName)
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
      if(permanentLayer && (permanentLayer.id !== id)) {
        setSearchByFactorInds([])
      }
      setLayerOrder(newLayerOrder)
      setLayer(newLayerOrder[order])
      setPermanentLayer({
        lens: lens,
        id: id
      })
    }
  }

  // setLayer to what desired lens defines at current order
  const onMouseOver = (lens, id) => {
    const newLayerOrder = getNewLens(lens, id)
    if(Object.keys(newLayerOrder).length === orders.length) {
      setLayer(newLayerOrder[order])
    }
  }

  const [selectedSublenses, setSelectedSublenses] = useState(new Array(lensNames.length).fill(null))
  // override layerLock and set lens
  const onClick = (lens, id, lensIndex, sublensIndex) => {
    setLayerLock(false)
    changeLensPermanent(lens, id)
    if((lensIndex !== null) && (sublensIndex !== null)) {
      let newSelectedSublenses = selectedSublenses
      newSelectedSublenses[lensIndex] = sublensIndex
      setSelectedSublenses(newSelectedSublenses)
    }
  }

  // set the layer or lens depending on layerLock
  const onMouseLeave = (lens, id) => {
    if(layerLock) {
      setLayer(layerLockLayer)
    } else {
      changeLensPermanent(lens, id)
    }
  }

  // on render, set the permanent layer to Basic
  useEffect(() => {
    changeLensPermanent(lenses[lensNames[0]], lensNames[0])
  }, [setLayerOrder])

  // handle when layerLock is toggled
  useEffect(() => {
    if(layerLock) {  // save the current layer (for MouseLeave)
      setLayerLockLayer(currentLayer)
    } else { // load the permanent layer
      setLayerLockLayer(null)
      if(permanentLayer) {
        changeLensPermanent(permanentLayer.lens, permanentLayer.id)
      }
    }
  }, [layerLock])

  let isDropdown = new Array(lensNames.length).fill(false)
  lensNames.map((l, i) => {
    if (typeof Object.values(lenses[l])[0] === "object") {
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

  return (
    <>
      {(
        <div className="lens-modal">
          <div className='lens-header'>Data Lenses</div>
          <div className="lens-modal-lenses">
            {lensNames.map((l, i) => {
              if (isDropdown[i]) {
                const sublenses = lenses[l]
                const sublensNames = Object.keys(sublenses)
                const id = 'dropdown-button-container' + i
                let sublensName, sublensLenses
                let buttonName = l
                if(selectedSublenses[i] !== null) {
                  sublensName = sublensNames[selectedSublenses[i]]
                  sublensLenses = sublenses[sublensName]
                  buttonName = sublensName
                }
                return (
                  <div id={id} key={id}>
                    <button
                      className={
                        (permanentLayer && (!layerLockLayer)) ? 
                          sublensNames.includes(permanentLayer.id) ? 'dropdown-button-selected' : 'dropdown-button'
                        : 'dropdown-button'
                      }
                      id={l}
                      key={l}
                      onDoubleClick={() => handleDropdownOpen(l)}
                      onClick={(sublensName && sublensLenses) && (() => onClick(sublensLenses, sublensName))}
                      onMouseOver={(sublensName && sublensLenses) && (() => onMouseOver(sublensLenses, sublensName))}
                      onMouseLeave={() => onMouseLeave(permanentLayer.lens, permanentLayer.id)}
                    >{buttonName}</button>
                    {dropdownOpen[i] ? (
                      <div  className='dropdown-container'>
                        {sublensNames.map((s, j) => {
                          const sublensLayers = sublenses[s]
                          return (
                            <button
                              className={
                                (permanentLayer && (!layerLockLayer)) ? 
                                  permanentLayer.id === s ? 'dropdown-lens-button-selected' : 'dropdown-lens-button'
                                : 'dropdown-lens-button'
                              }
                              key={s}
                              id={s}
                              onClick={() => onClick(sublensLayers, s, i, j)}
                              onMouseOver={() => onMouseOver(sublensLayers, s)}
                              onMouseLeave={() => onMouseLeave(permanentLayer.lens, permanentLayer.id)}
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
                return (
                  <button 
                    className={
                      (permanentLayer && (!layerLockLayer)) ? 
                        permanentLayer.id === l ? 'lens-button-selected' : 'lens-button'
                      : 'lens-button'
                    }
                    id={l} 
                    key={l} 
                    onClick={() => onClick(lensLayers, l)}
                    onMouseOver={() => onMouseOver(lensLayers, l)}
                    onMouseLeave={() => onMouseLeave(permanentLayer.lens, permanentLayer.id)}
                  >{l}</button>
                )
              }
            })}
          </div>
        </div>
      )}
    </>
  )
}
export default LensModal