import { useEffect, useMemo, useRef, useState } from 'react';
import { scaleLinear } from 'd3-scale';
import { group } from 'd3-array';
import * as Plot from "@observablehq/plot"

import './ZoomLegend.css';

const ZoomLegend = ({
  width = 50,
  height = 640,
  margin = 10,
  effectiveOrder = 4,
  zoomExtent = [0, 100],
  orderDomain = [4, 16],
  k = 1,
  selected,
  layerOrder,
  setLayerOrder=()=>{},
  layer,
  layerLock,
  lensHovering,
  stations = [],
  crossScaleNarration,
  onZoom=()=>{},
  setLayer=()=>{}
} = {}) => {

  const [CSNView, setCSNView] = useState(false)
  const [naturalLayerOrder, setNaturalLayerOrder] = useState(null)

  const setWithCSN = (newLayerOrder) => {
    // setNaturalLayerOrder(Object.assign({}, layerOrder))
    crossScaleNarration.forEach(d => {
      newLayerOrder[d.order] = d.layer
    })
    setLayerOrder(newLayerOrder)
    return newLayerOrder
  }

  const setWithNatural = (newLayerOrder) => {
    newLayerOrder = Object.assign({}, naturalLayerOrder)
    setLayerOrder(Object.assign({}, naturalLayerOrder))
    return newLayerOrder
  }

  const naturalCSNSwitch = () => {
    let newLayerOrder = Object.assign({}, layerOrder)
    if(!CSNView) {
      setNaturalLayerOrder(Object.assign({}, layerOrder))
      // crossScaleNarration.forEach(d => {
      //   newLayerOrder[d.order] = d.layer
      // })
      // setLayerOrder(newLayerOrder)
      newLayerOrder = setWithCSN(newLayerOrder)
    } else {
      // newLayerOrder = Object.assign({}, naturalLayerOrder)
      // setLayerOrder(Object.assign({}, naturalLayerOrder))
      newLayerOrder = setWithNatural(newLayerOrder)
    }
    setLayer(newLayerOrder[effectiveOrder])
    setCSNView(!CSNView)
  }

  const cycleCSN = () => {
    if(CSNView) {
      let newLayerOrder = Object.assign({}, layerOrder)
      newLayerOrder = setWithCSN(newLayerOrder)
      setLayer(newLayerOrder[effectiveOrder])
    }
  }

  useEffect(() => {
    cycleCSN()
  }, [crossScaleNarration])

  const handleCSNClick = () => {
    naturalCSNSwitch()
  }

  // zoom to cross-scale narration region and change layer
  const handleSelectStation = (d) => { 
    const regions = crossScaleNarration.filter(n => n?.order == d.order)
    if(regions.length == 1) {
      const orderRegion = regions[0]
      const region = orderRegion.region
      onZoom({chromosome: region.chromosome, start: region.start, end: region.start + 4 ** (14 - region.order)})
    }
  }

  let orderZoomScale = useMemo(() => {
    return scaleLinear()
    .domain(zoomExtent)
    // we pad out the maximum so we scroll to the end of the last order
    .range([1, Math.pow(2, orderDomain[1] - orderDomain[0] + 0.999)]); 
  }, [zoomExtent, orderDomain])

  let stationsMap = useMemo(() => {
    return group(stations, d => d.station?.order)
  })

  let orderRaw = orderDomain[0] + Math.log2(orderZoomScale(k));
  let order = Math.floor(orderRaw);
  let activeLayer = (layerLock && !lensHovering) ? layer : layerOrder && layerOrder[order]

  // calculate order data for plotting
  let orders = useMemo(() => {
    let orders = [];
    let lastOrder = 0;
      let or, o;
      for(let z = zoomExtent[0]; z <= zoomExtent[1]; z+= 0.1) {
        or = orderDomain[0] + Math.log2(orderZoomScale(z));
        o = Math.floor(or);
        if(o > lastOrder) {
          orders.push({
            z,
            order: o
          })
          lastOrder = o
        }
      }
      orders.forEach((o,i) => {
        if(i > 0)
          orders[i - 1].z2 = o.z
        if(i == orders.length - 1) o.z2 = zoomExtent[1]
        if (!CSNView) {
          let station = stationsMap.get(o.order)
          // console.log(station)
          if(station && station[0]) {
            o.station = station[0].station
            o.layer = station[0].layer
            o.field = o.layer.fieldChoice(o.station)
            o.color = o.layer.fieldColor(o.field.field)
            // console.log("ORDER", o)
          }
          if(o.order == order && activeLayer && selected && selected.data && Object.keys(selected?.data).length) {
            o.layer = activeLayer
            o.station = selected
            o.field = o.layer.fieldChoice(o.station)
            o.color = o.layer.fieldColor(o.field.field)
          }
        } else {
          const scaleNarration = crossScaleNarration.filter(n => n?.order == o.order)
          if(scaleNarration.length == 1) {
            o.layer = scaleNarration[0].layer
            o.field = scaleNarration[0].field
            o.color = o.field?.color
          }
        }
      })
    return orders
  }, [order, zoomExtent, orderDomain, orderZoomScale, stationsMap])

  // console.log("station map", stationsMap)
  // console.log("ORDERS", orders)



  let orderHeight = height/(orderDomain[1] - orderDomain[0] + 1) 

  const segmentSizeFromOrder = function(order) {
    let size = 4 ** (14 - order)
    
    let sizeText = ''
    if(size < 1000) {
      sizeText = size + 'bp'
    } else if(size < 1000000) {
      sizeText = '~' + Math.floor(size / 1000) + 'kb'
    } else {
      sizeText = '~' + Math.floor(size / 1000000) + 'Mb'
    }
    return sizeText
  }

  let crossScaleNarrationFiltered = crossScaleNarration?.filter(n => n !== null)
  let crossScaleNarrationPerOrder = {}
  if(crossScaleNarrationFiltered?.length > 0) {
    crossScaleNarrationFiltered.forEach(n => crossScaleNarrationPerOrder[n.order] = n)
  }

  return (
    <div className="zoom-legend">
      <div className="zoom-indicator-arrow" style={{
        position: "relative",
        display: "block",
        width: "30px",
        height: "1px",
        borderBottom: "2px solid black",
        top: `${orderHeight * (orderRaw - orderDomain[0])}px`,
        zIndex: 1000
      }}></div>
      <div className="zoom-legend-orders" style={{
        position: "relative",
        marginTop: "-3px"
      }}>
        {orders && orders.map(d => {
          return <div key={"order"+d.order} className="zoom-legend-order" style={{
            width: "100%",
            height: `${orderHeight}px`,
            display: "flex",
            flexDirection: "row",
          }}>

            <div className="zoom-indicator" style={{
              backgroundColor: `rgba(0.5, 0.5, 0.5, ${d.order == effectiveOrder ? 0.4 : 0.3})`,
              // height: "100%",
              width: "30px",
              fontFamily: "Gilbert",
              fontSize: d.order == effectiveOrder ? "24px" : "20px",
              //fontWeight: d.order == effectiveOrder ? "bold" : "normal",
              color: d.order == effectiveOrder ? "black" : "white",
              //color: "white",
              // stroke: d.order == effectiveOrder ? "white" : "none",
              //strokeWidth: d.order == effectiveOrder ? "15px" : "0px",
              textShadow: d.order == effectiveOrder ? "0px 0px 10px gold" : "none",
              // textAlign: "center",
              display: "flex",
              flexDirection: "row",
              justifyContent: "center",
              alignItems: "start",
              // display: "inline-block"
            }}>
              {d.order} 
            </div>

            <div className="label-box"
              style={{
                backgroundColor: `rgba(0.5, 0.5, 0.5, ${d.order == effectiveOrder ? 0.4 : 0.1})`,
                width: "100%",
              }}
            >
              <div className="basepair-size">{segmentSizeFromOrder(d.order)}</div>
              <div className="dataset-label"
                style={{
                  fontWeight: (d.order == effectiveOrder && !CSNView) ? "bold" : "normal",
                  color: d.order == effectiveOrder ? "black" : "gray",
                }}
              >
                {CSNView ? d.layer?.name : (layerLock && !lensHovering) ? layer?.name : layerOrder && layerOrder[d.order].name}
              </div>
              
              <div className="station" style={{
                // color: d.color
              }}>
                <div className="station-square" onClick={() => CSNView && handleSelectStation(d)} style={{
                  backgroundColor: d.color,
                  marginRight: "5px",
                  width: "10px",
                  height:"10px",
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
                (
                  crossScaleNarrationPerOrder[d.order] ? 
                  <div className='csn-box' onClick={handleCSNClick} style={{cursor: 'pointer'}}>...</div> 
                  :null
                )
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