import React, { createContext, useContext, useState, useMemo, useEffect, useRef } from 'react';
import { scaleLinear } from 'd3-scale';
import { zoomIdentity } from 'd3-zoom';

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