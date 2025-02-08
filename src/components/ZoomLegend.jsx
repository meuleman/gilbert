import { useEffect, useMemo, useRef, useState, useCallback } from 'react';
import { scaleLinear } from 'd3-scale';
import { group, range } from 'd3-array';
import { cn } from "@/lib/utils"

import { debounceNamed, debouncerTimed } from '../lib/debounce'
import { HilbertChromosome, hilbertPosToOrder } from '../lib/HilbertChromosome'
import Data from '../lib/data'
import { getKb, showKb } from '../lib/display'

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
  layerLock,
  lensHovering,
  crossScaleNarration,
  onZoom = () => { },
  setLayer = () => { },
  setLayerOrder = () => { }
} = {}) => {

  const [CSNView, setCSNView] = useState(false)
  // const [naturalLayerOrder, setNaturalLayerOrder] = useState(null)
  // useEffect(() => {
  //   let newLayerOrder = Object.assign({}, layerOrder)
  //   if(CSNView) {
  //     crossScaleNarration.forEach(d => {
  //       newLayerOrder[d?.order] = d?.layer
  //     })
  //   }
  //   console.log("new layer order use effect", newLayerOrder)
  //   setInternalLayerOrder(newLayerOrder)
  // }, [CSNView, layerOrder, crossScaleNarration, setInternalLayerOrder])


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
    setActiveLayer((layerLock && !lensHovering) ? layer : layerOrder && layerOrder[order])
  }, [layer, layerOrder, layerLock, lensHovering, order])

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

  // console.log("station map", stationsMap)
  // console.log("ORDERS", orders)


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
                  "flex-1 h-full border-l-separator border-l-1 py-1.5 px-2.5 text-2xs",
                  d.order == order && "font-bold"
                )}>
                  <div>
                    {(layerLock && !lensHovering) ? layer?.name : layerOrder && layerOrder[d.order]?.name}
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
                    >
                      {d.field && d.field.field}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )

  // eslint-disable-next-line no-unreachable
  return (
    <div>
      <div className="zoom-indicator-arrow" style={{
        position: "relative",
        display: "block",
        height: "1px",
        borderBottom: "2px solid black",
        top: `${orderHeight * (orderRaw - orderDomain[0]) - 1.5}px`,
        zIndex: 1000
      }}></div>
      <div className="zoom-legend-orders" style={{
        position: "relative",
        marginTop: "-3px"
      }}>
        {orders && orders.map(d => {
          return <div key={"order" + d.order} className="zoom-legend-order" style={{
            width: "100%",
            height: `${orderHeight}px`,
            display: "flex",
            flexDirection: "row",
          }}>

            <div className="zoom-indicator" style={{
              backgroundColor: `rgba(0.5, 0.5, 0.5, ${d.order == effectiveOrder ? 0.4 : 0.3})`,
              // height: "100%",
              width: "40px",
              maxWidth: "40px",
              // fontFamily: "Gilbert",
              fontFamily: "monospace",
              fontSize: d.order == effectiveOrder ? "12px" : "10px",
              //fontWeight: d.order == effectiveOrder ? "bold" : "normal",
              color: d.order == effectiveOrder ? "black" : "white",
              //color: "white",
              // stroke: d.order == effectiveOrder ? "white" : "none",
              //strokeWidth: d.order == effectiveOrder ? "15px" : "0px",
              textShadow: d.order == effectiveOrder ? "0px 0px 10px gold" : "none",
              // textAlign: "center",
              borderTop: "1px solid lightgray",
              display: "flex",
              flexDirection: "row",
              justifyContent: "center",
              alignItems: "center",
              // display: "inline-block"
            }}>
              {/* {d.order}  */}
              {showKb(4 ** (14 - d.order))}
            </div>

            <div className="label-box"
              style={{
                backgroundColor: `rgba(0.5, 0.5, 0.5, ${d.order == effectiveOrder ? 0.4 : 0.1})`,
                width: "100%",
              }}
            >
              {/* <div className="basepair-size">{showKb(4 ** (14 - d.order))}</div> */}
              <div className="dataset-label"
                style={{
                  fontWeight: (d.order == effectiveOrder && !CSNView) ? "bold" : "normal",
                  color: d.order == effectiveOrder ? "black" : "gray",
                }}
              >
                {(layerLock && !lensHovering) ? layer?.name : layerOrder && layerOrder[d.order]?.name}
              </div>

              <div className="station" style={{
                // color: d.color
              }}>
                <div className="station-square" onClick={() => CSNView && handleSelectStation(d)} style={{
                  backgroundColor: d.color,
                  marginRight: "5px",
                  width: "10px",
                  height: "10px",
                  display: "inline-block",
                  // border: "1px solid gray"
                  cursor: `${CSNView ? "pointer" : "default"}`
                }}></div>
                {d.field && d.field.field}
                {/* {d.field && d.field.value} */}
              </div>
              {/* <div className='cross-scale-narration-layer'>{crossScaleNarrationPerOrder[d.order]?.layer}</div>
              <div className='cross-scale-narration-field'>{crossScaleNarrationPerOrder[d.order]?.field}</div> */}
              {
                // (
                //   csnPerOrder[d.order] ? 
                //   <div className='csn-box' onClick={handleCSNClick} style={{cursor: 'pointer'}}>...</div> 
                //   :null
                // )
              }
              {/* <div className='csn-box'>...</div> */}
            </div>

          </div>
        })}
      </div>

    </div>
  )
};

export default ZoomLegend;