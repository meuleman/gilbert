import { useState, useEffect, useCallback } from 'react';
import { scaleSequential } from 'd3-scale';
import { interpolateBlues } from 'd3-scale-chromatic';
import { max, min } from 'd3-array';

const useCanvasFilteredRegions = (rbos, topPathsMap = new Map()) => {
  const drawRegions = useCallback((canvasRef, scales, state) => {
    let {xScale ,yScale ,sizeScale} = scales
    let {data, transform, order} = state
    // console.log("going to render", regions.length, canvasRef.current)
    if (!data.length || !rbos.total || !canvasRef.current) return;

    // const maxC = max(regions, r => r?.path?.count || 0);
    // const minC = min(regions, r => r?.path?.count || 0);
    const customInterpolator = t => interpolateBlues(0.5 + t * 0.5);
    // const colorScale = scaleSequential(customInterpolator).domain([minC, maxC])
    const colorScale = scaleSequential(customInterpolator).domain([rbos.min, rbos.max])

    const ctx = canvasRef.current.getContext('2d');
    // console.log("drawing regions!", regions, scales, xScale(regions[0].x), yScale(regions[0].y))

    let t = {...transform}
    const step = Math.pow(0.5, order)
    
    ctx.globalAlpha = 1
    
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

    const inview = data.filter(d => d.inview == true)
    // for each region in view, lets see if it shows up in the rbos
    const inRbos = inview.map(d => {
      if(rbos.chrmsMap[d.chromosome] && rbos.chrmsMap[d.chromosome][d.i]) {
        return {...d, path: rbos.chrmsMap[d.chromosome][d.i]}
      } else {
        return null
      }
    }).filter(d => d)
  
    // first we punch out a hole from the maks
    inRbos.forEach(r => {
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
    
    // console.log("regions", regions, topPathsMap)
    inRbos.forEach(r => {
      let color = colorScale(r.path?.count || 0);
      if(topPathsMap.get(r.chromosome + ":" + r.i)) {
        color = "orange"
      }
      const sw = step
      const rw = sizeScale(sw) * t.k * 0.9 // * (r.path?.count || 0) / (maxC - minC)
      const srw = rw * 0.2 * ((r.path?.count || 0) / (rbos.max - rbos.min) + 0.1)
      // Drawing logic here
      // ctx.fillStyle = color
      ctx.strokeStyle = color
      ctx.lineWidth = srw 
      // ctx.fillRect(t.x + xScale(r.x) * t.k, t.y + yScale(r.y) * t.k, rw, rw)
      ctx.strokeRect(t.x + xScale(r.x) * t.k - rw/2, t.y + yScale(r.y) * t.k - rw/2, rw, rw)
    });
  }, [rbos, topPathsMap])

  return drawRegions
};

export default useCanvasFilteredRegions;