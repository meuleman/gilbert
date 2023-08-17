
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
  order,
  orders=[4,5,6,7,8,9,10,11,12,13,14]
} = {}) => {
  const lensNames = Object.keys(lenses)

  // sets the styles for all lens buttons to unselected state
  const resetButtonFormats = () => {
    const allButtons = document.querySelectorAll('.lens-button');
    allButtons.forEach((button) => {
      button.style.fontWeight = 'normal';
      button.style.border = '2px solid'
    })
  }

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
      setLayerOrder(newLayerOrder)
      setLayer(newLayerOrder[order])
      resetButtonFormats()
      const clicked = document.getElementById(id)
      clicked.style.fontWeight = 'bold';
      clicked.style.border = '5px solid'
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

  // override layerLock and set lens
  const onClick = (lens, id) => {
    setLayerLock(false)
    changeLensPermanent(lens, id)
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

  return (
    <>
    {(
    <div className="lens-modal">
      <div className='lens-header'>Data Lenses</div>
      <div className="lens-modal-lenses">
        {lensNames.map((l) => {
          const lensLayers = lenses[l]
          return (
            <button 
            className='lens-button' 
            id={l} 
            key={l} 
            onClick={() => onClick(lensLayers, l)}
            onMouseOver={() => onMouseOver(lensLayers, l)}
            onMouseLeave={() => onMouseLeave(permanentLayer.lens, permanentLayer.id)}
            >{l}</button>
          )
        })}
      </div>
    </div>
  )}
</>
  )
}
export default LensModal