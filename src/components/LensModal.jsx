import { all } from 'axios'
import './LensModal.css'
import lenses from './Lenses/lenses.json'
import { useEffect, useState, useCallback, useMemo, useRef } from 'react'
import LayerLegend from './LayerLegend'
import { memo } from 'react'

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
  orders = [4,5,6,7,8,9,10,11,12,13,14]
}) => {
  // Move DOM queries outside component or use refs
  const zoomLegendRef = useRef(null);
  
  // Memoize static values
  const lensNames = useMemo(() => Object.keys(lenses), []);

  const [permanentLens, setPermanentLens] = useState(null);
  const [layerLockLayer, setLayerLockLayer] = useState(null);
  const [selectedSublenses, setSelectedSublenses] = useState(() => 
    new Array(lensNames.length).fill(0)
  );
  const [dropdownOpen, setDropdownOpen] = useState(() => 
    new Array(lensNames.length).fill(false)
  );

  // Memoize complex calculations
  const getNewLens = useMemo(() => (lens) => {
    const newLayerOrder = {};
    orders.forEach((order) => {
      const desiredName = lens[order];
      const desiredDataset = layers.find((d) => d.name === desiredName);
      if (desiredDataset) {
        newLayerOrder[order] = desiredDataset;
      } else {
        console.error(`No matching dataset found for ${desiredName}`);
      }
    });
    return newLayerOrder;
  }, [layers, orders]);

  const changeLensPermanent = useCallback((lens, id) => {
    const newLayerOrder = getNewLens(lens);
    if (Object.keys(newLayerOrder).length === orders.length) {
      if (permanentLens?.id !== id) {
        setSearchByFactorInds([]);
      }
      setLayerOrder(newLayerOrder);
      setLayer(newLayerOrder[order]);
      setPermanentLens({ lens, id });
    }
  }, [getNewLens, order, orders.length, permanentLens?.id, setLayer, setLayerOrder, setSearchByFactorInds]);

  // positioning with zoom legend label boxes
  const zoomLegendElement = document.querySelector('.label-box');
  const xPos = zoomLegendElement?.getBoundingClientRect().left
  const buttonWidth = zoomLegendElement?.getBoundingClientRect().width

  // setLayer to what desired lens defines at current order
  const onMouseOver = useCallback((lens, id) => {
    setLensHovering(true)
    const newLayerOrder = getNewLens(lens, id)
    if(Object.keys(newLayerOrder).length === orders.length) {
      setLayer(newLayerOrder[order])
      setLayerOrder(newLayerOrder)
    }
  }, [setLayer, setLayerOrder])

  // override layerLock and set lens
  const onClick = useCallback((lens, id, lensIndex, sublensIndex) => {
    setLayerLock(false)
    setLayerLockFromIcon(null)
    changeLensPermanent(lens, id)
    if((lensIndex !== null) && (sublensIndex !== null)) {
      let newSelectedSublenses = selectedSublenses
      newSelectedSublenses[lensIndex] = sublensIndex
      setSelectedSublenses(newSelectedSublenses)
    }
  }, [layerLock, layerLockLayer, setLayer, changeLensPermanent])

  // set the layer or lens depending on layerLock
  const onMouseLeave = useCallback((lens, id) => {
    setLensHovering(false)
    if(layerLock) {
      setLayer(layerLockLayer)
    } else {
      changeLensPermanent(lens, id)
    }
  }, [layerLock, layerLockLayer, setLayer, changeLensPermanent])

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

  // Memoize the dropdown state calculation
  const isDropdown = useMemo(() => 
    lensNames.map(lensName => 
      typeof Object.values(lenses[lensName])[0] === "object"
    ),
  [lensNames]);

  // Extract dropdown button component
  const DropdownButton = memo(({ lensName, isSelected, onClick, onMouseOver, onMouseLeave }) => (
    <button
      className={isSelected ? 'dropdown-button-selected' : 'dropdown-button'}
      id={lensName}
      onClick={onClick}
      onMouseOver={onMouseOver}
      onMouseLeave={onMouseLeave}
    >
      {lensName}
    </button>
  ));

  // Extract lens button component
  const LensButton = memo(({ lensName, isSelected, onClick, onMouseOver, onMouseLeave }) => (
    <button 
      className={isSelected ? 'lens-button-selected' : 'lens-button'}
      id={lensName}
      onClick={onClick}
      onMouseOver={onMouseOver}
      onMouseLeave={onMouseLeave}
    >
      {lensName}
    </button>
  ));

  // when the lock icon is clicked
  const handleLayerLock = useCallback(() => {
    if(!layerLock) {
      // setLayerLockLens(permanentLens)
      setLayerLockFromIcon(true)
    } else {
      // setLayerLockLens(null)
      setLayerLockFromIcon(null)
    }
    setLayerLock(!layerLock)
  }, [layerLock, setLayerLock, setLayerLockFromIcon])

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
        <div className="lens-panel">
          <div className='lens-header'>Lenses</div>
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
                    <DropdownButton
                      lensName={l}
                      isSelected={(layerLockFromIcon != false) && sublensNames.includes(permanentLens?.id)}
                      onClick={
                        ((permanentLens?.id == sublensName) && (layerLockFromIcon != false)) ? 
                          (() => handleDropdownOpen(l)) 
                          :((sublensName && sublensLenses) && (() => onClick(sublensLenses, sublensName)))
                      }
                      onMouseOver={(sublensName && sublensLenses) && (() => onMouseOver(sublensLenses, sublensName))}
                      onMouseLeave={() => onMouseLeave(permanentLens.lens, permanentLens.id)}
                    />
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
                              // style={{width: buttonWidth}}
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
                    <LensButton
                      lensName={l}
                      isSelected={(layerLockFromIcon != false) && permanentLens?.id == l}
                      onClick={() => onClick(lensLayers, l)}
                      onMouseOver={() => onMouseOver(lensLayers, l)}
                      onMouseLeave={() => onMouseLeave(permanentLens.lens, permanentLens.id)}
                    />
                  </div>
                )
              }
            })}
          </div>
        </div>
      )}
    </>
  )
}
export default memo(LensModal)