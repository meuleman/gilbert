import { useEffect, useMemo, useRef, useState, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { scaleLinear } from 'd3-scale';
import { group, range } from 'd3-array';
import { cn } from "@/lib/utils"

import { debounceNamed, debouncerTimed } from '../lib/debounce'
import { HilbertChromosome, hilbertPosToOrder } from '../lib/HilbertChromosome'
import Data from '../lib/data'
import { getKb, showKb } from '../lib/display'
import { showKbHTML } from '../lib/display'
import { dropdownList } from '../layers/index'
import ComponentSizeStore from '../states/ComponentSizes';
import useLayerEffects from './hooks/useLayerEffects';

import LockOpenIcon from "@/assets/lock-open.svg?react"
import LockClosedIcon from "@/assets/lock-closed.svg?react"

import './ZoomLegend.css';

const debounceTimed = debouncerTimed()

const ZoomLegend = ({
  height = 640,
  effectiveOrder = 4,
  zoomExtent = [0, 100],
  orderDomain = [4, 16],
  k = 1,
  selected,
  hovered,
  layerOrder,
  layer,
  crossScaleNarration,
  onZoom = () => { },
  setLayer = () => { },
  setLayerOrder = () => { }
} = {}) => {

  const { 
    statusBarSize
  } = ComponentSizeStore();

  const [CSNView, setCSNView] = useState(false)
  const dropdownRefs = useRef({});

  const { createLayerOrder, currentLens } = useLayerEffects();

  const [stations, setStations] = useState([])
  // this debounced function fetches the data and updates the state
  const fetchLayerData = useMemo(() => {
    const dataClient = Data({
      debug: false
    })
    return (layer, order, bbox, key, setter) => {
      // we dont want to fetch data if the order is not within the layer order range
      if (order < layer.orders[0] || order > layer.orders[1]) return;

      let hilbert = HilbertChromosome(order, { padding: 2 })
      let points = hilbert.fromBbox(bbox)

      let myPromise = dataClient.fetchData(layer, order, points)
      let myCallback = (data) => {
        // console.log("got data", data, order)
        if (data) {
          setter({ data, layer, order })
        }
      }
      // debounce a function call with a name to make sure no collisions
      // collision would be accidentally debouncing a different data call because we reuse this function
      debounceNamed(myPromise, myCallback, 50, key + ":" + layer.name + ":" + order) // layer.name + order makes unique call 
    }
  }, []);

  // When data or selected changes, we want to update the zoom legend
  let updateStations = useCallback((hit) => {
    // console.log("updating stations", hit)
    if (!hit || !layerOrder) return
    debounceTimed(() => {
      // console.log("actually updating", layerLockRef.current, layerRef.current)
      let promises = range(4, hit.order).map(order => {
        return new Promise((resolve) => {
          // get the layer at this order
          let orderLayer = layerOrder[order]
          // calculate the bbox from the selected hilbert cell that would fetch just the cell for the region
          let hilbert = HilbertChromosome(order, { padding: 2 })
          let step = hilbert.step
          let bbox = {
            x: hit.x - step / 2,
            y: hit.y - step / 2,
            width: step * 2,
            height: step * 2
          }
          // console.log("bbox", bbox)
          fetchLayerData(orderLayer, order, bbox, "station", (response) => {
            // get the appropriate datum by looking at the corresponding hilbert pos from the selected.start
            let pos = hilbertPosToOrder(hit.start, { from: orderDomain[1], to: order })
            let point = hilbert.get2DPoint(pos, hit.chromosome)
            let datum = response.data.find(d => d.i == point.i)
            // console.log("pos", pos, "point", point, "datum", datum)
            resolve({ layer: orderLayer, station: datum })
          })
        })
      })
      return Promise.all(promises)
    }, (responses) => {
      // console.log("got stations", responses)
      setStations(responses)
    }, 150)
  }, [layerOrder, setStations, fetchLayerData, orderDomain])

  useEffect(() => {
    // console.log("sup use effect?", selected)
    if (selected) {
      setCSNView(true)
      updateStations(selected)
    } else if (hovered) {
      setCSNView(false)
      updateStations(hovered)
    } else {
      setCSNView(false)
      setStations([])
    }
  }, [selected, hovered, updateStations, setStations, setCSNView])

  // zoom to cross-scale narration region and change layer
  const handleSelectStation = useCallback((d) => {
    const regions = crossScaleNarration?.path?.filter(n => n?.order == d.order)
    if (regions.length == 1) {
      const orderRegion = regions[0]
      const region = orderRegion.region
      onZoom({ chromosome: region.chromosome, start: region.start, end: region.start + 4 ** (14 - region.order) })
    }
  }, [crossScaleNarration, onZoom])

  let orderZoomScale = useMemo(() => {
    return scaleLinear()
      .domain(zoomExtent)
      // we pad out the maximum so we scroll to the end of the last order
      .range([1, Math.pow(2, orderDomain[1] - orderDomain[0] + 0.999)]);
  }, [zoomExtent, orderDomain])


  const [orderRaw, setOrderRaw] = useState(orderDomain[0] + Math.log2(orderZoomScale(k)));
  const [order, setOrder] = useState(Math.floor(orderRaw))
  useEffect(() => {
    let or = orderDomain[0] + Math.log2(orderZoomScale(k))
    setOrderRaw(or)
    setOrder(Math.floor(or))
  }, [k, orderDomain, orderZoomScale, setOrderRaw, setOrder])

  const [activeLayer, setActiveLayer] = useState(null)
  useEffect(() => {
    setActiveLayer(layerOrder ? layerOrder[order] : layer)
  }, [layerOrder, order])

  // calculate order data for plotting
  const [orders, setOrders] = useState([])
  useEffect(() => {
    const stationsMap = group(stations, d => d.station?.order)
    // console.log("stations map", stationsMap, CSNView)
    let ords = [];
    let lastOrder = 0;
    let or, o;
    for (let z = zoomExtent[0]; z <= zoomExtent[1]; z += 0.1) {
      or = orderDomain[0] + Math.log2(orderZoomScale(z));
      o = Math.floor(or);
      if (o > lastOrder) {
        ords.push({
          z,
          order: o
        })
        lastOrder = o
      }
    }
    ords.forEach((o, i) => {
      if (i > 0)
        ords[i - 1].z2 = o.z
      if (i == ords.length - 1) o.z2 = zoomExtent[1]
      if (!CSNView) {
        let station = stationsMap.get(o.order)
        // console.log(station)
        if (station && station[0]) {
          o.station = station[0].station
          o.layer = station[0].layer
          o.field = o.layer.fieldChoice(o.station)
          o.color = o.layer.fieldColor(o.field.field)
          // console.log("ORDER", o)
        }
        let hit = selected || hovered
        if (o.order == order && activeLayer && hit && hit.data && Object.keys(hit?.data).length) {
          o.layer = activeLayer
          o.station = hit
          o.field = o.layer.fieldChoice(o.station)
          o.color = o.layer.fieldColor(o.field.field)
        }
      } else {
        const scaleNarration = crossScaleNarration?.path.filter(n => n?.order == o.order)
        if (scaleNarration?.length == 1) {
          o.layer = scaleNarration[0].layer
          o.field = scaleNarration[0].field
          o.color = o.field?.color
        }
      }
    })
    // console.log("set orders2")
    setOrders(ords)
  }, [order, zoomExtent, orderDomain, orderZoomScale, stations, CSNView, crossScaleNarration, activeLayer, selected, hovered])

  const orderHeight = useMemo(() => {
    return 100 / (orderDomain[1] - orderDomain[0] + 1)
  }, [orderDomain])

  const [csnPerOrder, setCSNPerOrder] = useState({})
  useEffect(() => {
    if (crossScaleNarration) {
      let csnf = crossScaleNarration.path?.filter(n => n !== null)
      let csnp = {}
      if (csnf?.length > 0) {
        csnf.forEach(n => csnp[n.order] = n)
      }
      setCSNPerOrder(csnp)
    }
  }, [crossScaleNarration, setCSNPerOrder])

  const orderHeightPercent = 100 / (orderDomain[1] - orderDomain[0] + 1)
  const minPercent = (order - orderDomain[0]) * orderHeightPercent
  const orderPercent = orderHeightPercent * (orderRaw - order)
  const markerPosition = minPercent + orderPercent

  // tracks the open state of dropdowns
  const [openDropdowns, setOpenDropdowns] = useState({});

  // handles changing the layer for a given order
  const handleLayerChange = (order, newLayer) => {
    // Create a new layerOrder object with the updated layer for the specific order
    const updatedLayerOrder = {
      ...layerOrder,
      [order]: newLayer
    };
    
    // Call the setLayerOrder function from props to update the parent state
    setLayerOrder(updatedLayerOrder);
  };

  // calculate the max height of a dropdown
  const calculateMaxHeight = useCallback((element, maxHeight = 300) => {
    if (!element) return `${maxHeight}px`;
    
    // Get bottom position of trigger element
    const dropdown = element.getBoundingClientRect();
    
    // Calculate available space (viewport height minus dropdown top position minus status bar)
    const availableHeight = window.innerHeight - dropdown.bottom - statusBarSize.height;
    
    // Return the smaller of desired height or available height
    return `${Math.min(maxHeight, availableHeight)}px`;
  }, [statusBarSize]);

  useEffect(() => {
    // Only add listener if any dropdown is open
    if (Object.keys(openDropdowns).length === 0) return;
    
    function handleClickOutside(event) {
      // Check if click was inside any dropdown or its button
      const isDropdownClick = Object.keys(openDropdowns).some(orderId => {
        // Skip if dropdown isn't open
        if (!openDropdowns[orderId]) return false;
        
        // Check if click was on the dropdown button
        const buttonEl = dropdownRefs.current[orderId];
        if (buttonEl && buttonEl.contains(event.target)) return true;
        
        // Check if click was inside a dropdown menu
        // We identify dropdown menus by their data attribute
        const dropdownMenu = document.querySelector(`[data-dropdown-for="${orderId}"]`);
        if (dropdownMenu && dropdownMenu.contains(event.target)) return true;
        
        return false;
      });
      
      // If click was outside all dropdowns and their buttons, close all dropdowns
      if (!isDropdownClick) {
        setOpenDropdowns({});
      }
    }

    document.addEventListener('mousedown', handleClickOutside, true);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside, true);
    };
  }, [openDropdowns]);

  const [ordersLocked, setOrdersLocked] = useState({});
  const lockLayer = useCallback((order) => {
    // find layer for order
    const layer = layerOrder ? layerOrder[order] : null;
    if (!layer) return;

    let newLayerOrder = { ...layerOrder };
    let newOrdersLocked = { ...ordersLocked }

    // if the layer is not locked, we lock it
    if (ordersLocked[order]) {
      // reset relevant orders to the lens layer order
      const lensLayers = createLayerOrder(currentLens)
      range(layer.orders[0], layer.orders[1] + 1).forEach(o => {
        newLayerOrder[o] = lensLayers[o] || layerOrder[o];
        newOrdersLocked[o] = false;
      })
    } else {
      // lock the layer for the range of orders
      range(layer.orders[0], layer.orders[1] + 1).forEach(o => {
        newLayerOrder[o] = layer
        newOrdersLocked[o] = true;
      });
    }

    setLayerOrder(newLayerOrder);
    setOrdersLocked(prev => ({
      ...prev,
      ...newOrdersLocked
    }));
  }, [layerOrder, setLayerOrder, ordersLocked, setOrdersLocked]);
  

  return (
    <div className="w-[12.5rem] overflow-hidden">
      <div className="h-full relative w-[12.5rem] grid grid-cols-1">
        <div
          className="absolute z-50 h-px bg-black w-full"
          style={{ top: `${markerPosition}%` }}
        >
          <div className="absolute left-0 w-[1px] h-[5px] -top-[2px] bg-black" />
          <div className="absolute left-px w-[1px] h-[3px] -top-[1px] bg-black" />
        </div>
        {orders && orders.map(d => {
          const { value, scaleSuffix } = getKb(4 ** (14 - d.order))

          return (
            <div
              key={d.order}
              className={cn(
                "relative z-0 border-t-separator border-t-1",
                d.order == order && "bg-activeOrder",
              )}
            >
              <div className="absolute w-full h-full top-0 left-0 flex items-center">
                <div className={cn(
                  "grow-0 h-full w-9 flex flex-col justify-center border-l-separator border-l-1 text-center font-mono",
                  d.order == order && "font-bold",
                )}>
                  <p className="text-sm">{value}</p>
                  <p className="text-2xs">{scaleSuffix}</p>
                </div>
                <div className={cn(
                  "flex-1 h-full border-l-separator border-l-1 py-1.5 px-1 text-2xs truncate",
                  d.order == order && "font-bold"
                )}>
                  <div className="relative w-full flex flex-row gap-1" ref={ref => dropdownRefs.current[d.order] = ref}>
                    <div 
                      className="cursor-pointer"
                      onClick={() => lockLayer(d.order)}
                    >
                      {
                        ordersLocked[d.order] ? 
                        <LockClosedIcon className="w-3 h-3 flex-shrink-0 hover:text-red-500"/> : 
                        <LockOpenIcon className="w-3 h-3 flex-shrink-0 hover:text-red-500"/>
                      }
                    </div>
                    <div className="flex-1 overflow-hidden">
                      <button 
                        className="flex items-center gap-1 focus:outline-none w-full"
                        onClick={() => setOpenDropdowns(prev => ({
                          // ...prev,
                          [d.order]: !prev[d.order]
                        }))}
                      >
                        <svg 
                          className={`h-3 w-3 flex-shrink-0 transition-transform ${openDropdowns[d.order] ? 'rotate-180' : ''}`} 
                          viewBox="0 0 20 20" 
                          fill="currentColor"
                        >
                          <path 
                            fillRule="evenodd" 
                            d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" 
                            clipRule="evenodd" 
                          />
                        </svg>
                        <span className="truncate">
                        {layerOrder ? layerOrder[d.order]?.labelName : layer?.labelName}
                        </span>
                      </button>
                    </div>
                  
                    {/* Dropdown menu */}
                    {openDropdowns[d.order] && createPortal(
                      <div 
                        className="fixed shadow-lg rounded-md bg-white ring-1 ring-black ring-opacity-5 z-[100]"
                        data-dropdown-for={d.order}
                        style={{
                          top: dropdownRefs.current[d.order]?.getBoundingClientRect().bottom,
                          left: dropdownRefs.current[d.order]?.getBoundingClientRect().left,
                          width: dropdownRefs.current[d.order]?.offsetWidth,
                          maxHeight: calculateMaxHeight(dropdownRefs.current[d.order]),
                        }}
                      >
                        <div key={`${d.order}-dropdown-menu`} className="py-1 overflow-y-auto" style={{ maxHeight: "inherit" }}>
                          {dropdownList.map((layerOption) => { 
                            const nameToUse = layerOption.labelName;
                            return (
                            <div key={`${d.order}-dropdown-element-${nameToUse}`}>
                              {layerOption?.orders[0] <= d.order && layerOption?.orders[1] >= d.order && (
                                <button
                                  key={nameToUse}
                                  onClick={() => {
                                    handleLayerChange(d.order, layerOption);
                                    setOpenDropdowns(prev => ({...prev, [d.order]: false}));
                                  }}
                                  className={cn(
                                    'block px-4 py-2 text-2xs w-full text-left hover:bg-gray-100',
                                    nameToUse === (layerOrder?.[d.order]?.labelName || layer?.labelName) && 'font-bold'
                                  )}
                                >
                                  {nameToUse}
                                </button>
                              )}
                            </div>
                          )})}
                        </div>
                      </div>,
                      document.body
                    )}
                  </div>
                  <div className="station">
                    <div
                      onClick={() => CSNView && handleSelectStation(d)}
                      style={{
                        backgroundColor: d.color,
                        marginRight: "5px",
                        width: "10px",
                        height: "10px",
                        display: "inline-block",
                        cursor: `${CSNView ? "pointer" : "default"}`
                      }}
                    />
                    {d.field && d.field.field}
                  </div>
                </div>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
};

export default ZoomLegend;