import { useEffect, useRef } from 'react';
import { scaleLinear } from 'd3-scale';
import * as Plot from "@observablehq/plot"

const ZoomLegend = ({
  width = 30,
  height = 640,
  margin = 10,
  zoomExtent = [0, 100],
  orderDomain = [4, 16],
  k = 1
} = {}) => {
  let orderZoomScale = scaleLinear()
    .domain(zoomExtent)
    // we pad out the maximum so we scroll to the end of the last order
    .range([1, Math.pow(2, orderDomain[1] - orderDomain[0] + 0.999)]); 

  let orderRaw = orderDomain[0] + Math.log2(orderZoomScale(k));
  let order = Math.floor(orderRaw);

  // calculate order data for plotting
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

  const containerRef = useRef();
  useEffect(() => {
    let plot = Plot.plot({
      marks: [
        Plot.rectY(orders, {
          y1: "z",
          y2: "z2",
          fill: "order",
          clip: true
        }),
        Plot.tickY([{ z: k, order }], {
          y: "z",
          stroke: "white",
          marker: "arrow"
        }),
        Plot.arrow([{ z: k, order }], {
          y1: "z",
          y2: "z",
          x1: 0,
          x2: 1,
          dx: -width + margin,
          marker: "arrow",
          fill: "black",
          stroke: "black"
        }),
        Plot.text(orders, {
          y: "z",
          dy: 7,
          text: "order",
          fill: "white",
          stroke: "black",
          paintOrder: "stroke"
        })
      ],
      y: { type: "log", axis: false, reverse: true, domain: zoomExtent },
      x: { axis: false },
      color: {
        scheme: "magma",
        domain: [orderDomain[0] - 2, orderDomain[1] + 2]
      },
      width,
      height,
      marginLeft: margin,
      marginTop: 0,
      marginBottom: 0
    });
    containerRef.current.append(plot)
    return () => plot.remove();
  }, [orders, k, width, height, margin])

  return (
    <div className="zoom-legend" ref={containerRef}>
    </div>
  )
};

export default ZoomLegend;