import { useEffect, useMemo, useRef } from 'react';
import { scaleLinear } from 'd3-scale';
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
  layerOrder,
  layer,
  layerLock
} = {}) => {

  let orderZoomScale = useMemo(() => {
    return scaleLinear()
    .domain(zoomExtent)
    // we pad out the maximum so we scroll to the end of the last order
    .range([1, Math.pow(2, orderDomain[1] - orderDomain[0] + 0.999)]); 
  }, [zoomExtent, orderDomain])

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
      })
    return orders
  }, [zoomExtent, orderDomain, orderZoomScale])

  let orderRaw = orderDomain[0] + Math.log2(orderZoomScale(k));
  let order = Math.floor(orderRaw);

  let orderHeight = height/(orderDomain[1] - orderDomain[0] + 1) 

  return (
    <div className="zoom-legend" style={{
      height: height+"px"
      }}>
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
              height: "100%",
              width: "30px",
              fontFamily: "Gilbert",
              fontSize: d.order == effectiveOrder ? "24px" : "20px",
              fontWeight: d.order == effectiveOrder ? "bold" : "normal",
              color: d.order == effectiveOrder ? "black" : "white",
              stroke: d.order == effectiveOrder ? "white" : "none",
              textAlign: "center",
              // display: "inline-block"
            }}>
              {d.order} 
            </div>

            <div className="basepair-size"> 1 megabase </div>
            
            <div className="dataset-label">
              {layerLock ? layer?.name : layerOrder && layerOrder[d.order].name}
            </div>

          </div>
        })}
      </div>
      
    </div>
  )
};

export default ZoomLegend;