import { useState, useEffect, useCallback } from 'react';
import { scaleSequential } from 'd3-scale';
import { interpolateBlues } from 'd3-scale-chromatic';
import { max, min } from 'd3-array';
import { hilbertPosToOrder } from '../../lib/HilbertChromosome';

const useCanvasFilteredRegions = (topPathsMap = new Map(), options = {}) => {
  const color = options.color || "orange"
  const opacity = options.opacity || 1
  const strokeScale = options.strokeScale || 1
  const mask = options.mask
  const dotFill = options.dotFill || false

  const drawRegions = useCallback((canvasRef, scales, state) => {
    let {xScale ,yScale ,sizeScale} = scales
    let {data, transform, order} = state
    // console.log("going to render", regions.length, canvasRef.current)
    if (!data.length || !canvasRef.current) return;
    if(!topPathsMap.size) return

    // count the number of regions per segment
    const numRegionsPerSegment = []
    topPathsMap.forEach(d => {numRegionsPerSegment.push(d.length)})
    const maxRegionsPerSegment = max(numRegionsPerSegment)

    const ctx = canvasRef.current.getContext('2d');

    let t = {...transform}
    const step = Math.pow(0.5, order)
    
    ctx.globalAlpha = 1

    const inview = data.filter(d => d.inview == true)

    // TODO: expand this logic for region sets with multiple orders
    // for now we are assuming everything in the region set is the same order
    const regionsOrder = topPathsMap.values().next().value[0]?.order

    // for each region in view, lets see if it shows up in the rbos
    const inTop = inview.map(d => {
      let di = d.i
      if(d.order > regionsOrder) {
        di = hilbertPosToOrder(d.i, {from: d.order, to: regionsOrder}) 
      }
      let t = topPathsMap.get(d.chromosome + ":" + di)
      if(t) {
        return {...d, path: { 
          i: d.i,
          count: t.length
        }}
      } else {
        return null
      }
    }).filter(d => d)
    
    if(mask) {
      // Create a temporary canvas
      const tempCanvas = document.createElement('canvas');
      let temp = tempCanvas.getContext('2d');
      tempCanvas.width = canvasRef.current.width;
      tempCanvas.height = canvasRef.current.height;
    
      // Draw the translucent mask on the temporary canvas
      temp.fillStyle = 'rgba(255, 255, 255, 0.9)';
      temp.fillRect(0, 0, tempCanvas.width, tempCanvas.height);
    
      // Set composite operation to 'destination-out' to punch holes
      temp.globalCompositeOperation = 'destination-out';

      // first we punch out a hole from the maks
      inTop.forEach(r => {
        const sw = step;
        const rw = sizeScale(sw) * t.k * 0.9;
        // Draw the hole
        temp.fillStyle = 'rgba(0, 0, 0, 1)'; // Solid color for the hole
        temp.fillRect(t.x + xScale(r.x) * t.k - rw/2, t.y + yScale(r.y) * t.k - rw/2, rw, rw);
      });
    
      // Reset composite operation to default
      temp.globalCompositeOperation = 'source-over';
    
      // Draw the temporary canvas onto the original canvas
      ctx.drawImage(tempCanvas, 0, 0);
    }
    
    // console.log("regions", regions, topPathsMap)
    ctx.globalAlpha = opacity
    inTop.forEach(r => {
      const sw = step
      const rw = sizeScale(sw) * t.k * 0.9
      const srw = rw * 0.4 * ((r.path?.count || 0) / (maxRegionsPerSegment || 1) + 0.1)
      // Drawing logic here
      // ctx.fillStyle = color
      ctx.strokeStyle = color
      ctx.fillStyle = color
      ctx.lineWidth = strokeScale < 1 ? strokeScale : srw * strokeScale
      // ctx.fillRect(t.x + xScale(r.x) * t.k, t.y + yScale(r.y) * t.k, rw, rw)
      if(dotFill) {
        // render dot instead of square
        ctx.beginPath();
        ctx.arc(t.x + xScale(r.x) * t.k, t.y + yScale(r.y) * t.k, rw / 2, 0, 2 * Math.PI);
        ctx.fill();
      }
      else ctx.strokeRect(t.x + xScale(r.x) * t.k - rw/2, t.y + yScale(r.y) * t.k - rw/2, rw, rw)
    });
  }, [topPathsMap, color, opacity, strokeScale, mask, dotFill])

  return drawRegions
};

export default useCanvasFilteredRegions;