
import './LensModal.css'
import lenses from './Lenses/lenses.json'
import { useEffect } from 'react'

const LensModal = ({
  width = 150,
  height = 220,
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
  const onClick = (lens, id) => {
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
    if(Object.keys(newLayerOrder).length === orders.length) {
      setLayerOrder(newLayerOrder)
      setLayer(newLayerOrder[order])
      setLayerLock(false)
      resetButtonFormats()
      // allButtons.style.fontWeight = 'normal';
      const clicked = document.getElementById(id)
      clicked.style.fontWeight = 'bold';
      clicked.style.border = '5px solid'
    }
  }

  return (
    <>
    {(
    <div className="lens-modal" style={{
      width: width + "px",
      height: height + "px"
    }}>
      <div className="lens-modal-lenses">
        {lensNames.map((l) => {
          const lensLayers = lenses[l]
          return (
            <button className='lens-button' id={l} key={l} onClick={() => onClick(lensLayers, l)}>{l}</button>
          )
        })}
      </div>
    </div>
  )}
</>
  )
}
export default LensModal