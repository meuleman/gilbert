import React, { createContext, useContext, useState, useMemo, useEffect, useRef, useCallback } from 'react';
import { scaleLinear } from 'd3-scale';
import { zoomIdentity } from 'd3-zoom';
import { interpolateObject } from 'd3-interpolate';
import { easeCubicInOut } from 'd3-ease';

const ZoomContext = createContext();

export function ZoomProvider({ children}) {
  const orderMin = 4
  const orderMax = 14
  const zoomMin = 0.85
  const zoomMax = 4000

  const [transform, setTransform] = useState(zoomIdentity);
  const [panning, setPanning] = useState(false);
  const [order, setOrder] = useState(orderMin);
  const [orderOffset, setOrderOffset] = useState(0);
  const previousOrderRef = useRef(order);
  const [zooming, setZooming] = useState(false);
  const [center, setCenter] = useState(null);

  const orderZoomScale = useMemo(() => 
    scaleLinear()
      .domain([zoomMin, zoomMax])
      .range([1, Math.pow(2, orderMax - orderMin + 0.999)]),
    [orderMin, orderMax, zoomMin, zoomMax]
  );

  const orderRaw = useMemo(() => {
    return orderMin + Math.log2(orderZoomScale(transform.k));
  }, [orderZoomScale, transform.k])

  useEffect(() => {
    let newOrder = Math.floor(orderRaw);
    if (orderOffset) {
      newOrder += orderOffset;
    }
    newOrder = Math.max(orderMin, Math.min(newOrder, orderMax));
    
    if (newOrder !== previousOrderRef.current) {
      setOrder(newOrder);
      previousOrderRef.current = newOrder;
    }
  }, [transform, orderZoomScale, orderMin, orderMax, orderOffset, orderRaw]);

  const easeZoom = useCallback((oldTransform,newTransform, callback, duration = 750, ease = easeCubicInOut, rateLimit = 1) => {
    const startTime = Date.now();
    const interpolator = interpolateObject(oldTransform, newTransform);
    // console.log("interpolator", interpolator(0.5))
    let lastUpdateTime = 0;
    setZooming(true)

    const animate = () => {
      const currentTime = Date.now();
      const elapsed = Date.now() - startTime;
      const t = Math.min(1, elapsed / duration);
      const easedT = ease(t);
      // console.log("t", t, easedT, elapsed/duration)
      
      if (currentTime - lastUpdateTime >= rateLimit) {
        let newT = interpolator(easedT)
        requestAnimationFrame(() => {
          setTransform({...newT});
          lastUpdateTime = currentTime;
        })
      }

      if (t < 1) {
        requestAnimationFrame(animate);
      } else {
        setZooming(false)
        callback()
      }
    };

    requestAnimationFrame(animate);
  }, [setTransform])

  // useEffect(() => {
  //   console.log("transform has updated", transform)
  // }, [transform])


  // Controls the current zoom order (numeric display level) for selected region in IG
  const [selectedZoomOrder, setSelectedZoomOrder] = useState(orderMin + 0.5);

  // Callback to update the zoom order.
  // Ensures the order never goes below 4.
  const handleSelectedZoom = useCallback((order) => {
    if (order < 4) {
      order = 4;
    }
    setSelectedZoomOrder(order);
  }, []);

  const value = {
    transform,
    setTransform,
    panning,
    setPanning,
    order,
    orderRaw,
    setOrder,
    orderOffset,
    setOrderOffset,
    zooming,
    setZooming,
    center,
    setCenter,
    orderZoomScale,
    orderMin,
    orderMax,
    zoomMin,
    zoomMax,
    easeZoom,
    selectedZoomOrder,
    setSelectedZoomOrder,
    handleSelectedZoom,
  };

  return <ZoomContext.Provider value={value}>{children}</ZoomContext.Provider>;
}

export const useZoom = () => {
  const context = useContext(ZoomContext);
  if (context === undefined) {
    throw new Error('useZoom must be used within a ZoomProvider');
  }
  return context;
};