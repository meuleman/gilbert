
import './LensModal.css'
import lenses from './Lenses/lenses.json'
import { useEffect, useState } from 'react'

const LensModal = ({
  layers,
  setLayerOrder,
  setLayer,
  setLayerLock,
  layerLock,
  order,
  orders=[4,5,6,7,8,9,10,11,12,13,14]
} = {}) => {
  const lensNames = Object.keys(lenses)
  const resetButtonFormats = () => {
    const allButtons = document.querySelectorAll('.lens-button');
    allButtons.forEach((button) => {
      button.style.fontWeight = 'normal';
      button.style.border = '2px solid'
    })
  }
  useEffect(() => {
    if(layerLock) {
      resetButtonFormats()
    }
  }, [layerLock])

  const [permanentLayer, setPermanentLayer] = useState(null)

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

  const changeLensPermanent = (lens, id) => {
    const newLayerOrder = getNewLens(lens)
    if(Object.keys(newLayerOrder).length === orders.length) {
      // TODO: what to do when layer lock is already set, especially with onMouseLeave
      setLayerOrder(newLayerOrder)
      setLayer(newLayerOrder[order])
      setLayerLock(false)
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

  const changeLensTemp = (lens, id) => {
    const newLayerOrder = getNewLens(lens, id)
    if(Object.keys(newLayerOrder).length === orders.length) {
      setLayer(newLayerOrder[order])
    }
  }

  useEffect(() => {
    changeLensPermanent(lenses[lensNames[0]], lensNames[0])
  }, [setLayerOrder])

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
            onClick={() => changeLensPermanent(lensLayers, l)}
            onMouseOver={() => changeLensTemp(lensLayers, l)}
            onMouseLeave={() => changeLensPermanent(permanentLayer.lens, permanentLayer.id)}
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