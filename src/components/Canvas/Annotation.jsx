import { useState, useEffect, useCallback } from 'react';
import { scaleSequential } from 'd3-scale';
import { interpolateBlues } from 'd3-scale-chromatic';
import { max, min } from 'd3-array';
import { hilbertPosToOrder } from '../../lib/HilbertChromosome';

const useCanvasAnnotatedRegion = (hit, type, options = {}) => {
  const stroke = options.stroke || "orange"
  const fill = options.fill || ""
  const showGenes = options.showGenes || false
  const highlightPath = options.highlightPath || false
  const strokeWidthMultiplier = options.strokeWidthMultiplier || 0.2
  const radiusMultiplier = options.radiusMultiplier || 1.25
  const mask = options.mask

  const drawRegions = useCallback((canvasRef, scales, state) => {
    let {xScale ,yScale ,sizeScale} = scales
    let {data, transform, order} = state
    // console.log("going to render", regions.length, canvasRef.current)
    if (!data.length || !canvasRef.current) return;
    if(!hit) return

    let stateOrder = order

    order = hit.order
    if(type == "hover") order = stateOrder

    let loading = false
    if(type == "hover" && state.loading) loading = true

    let step = Math.pow(0.5, order)
    let rw = sizeScale(step)
    let sw = rw * strokeWidthMultiplier

    const radius = rw * radiusMultiplier;
    const circumference = radius * 2 * Math.PI;
 
    const ctx = canvasRef.current.getContext('2d');

    let t = {...transform}
    
    ctx.globalAlpha = 1

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
      const rr = rw * t.k * 0.9;
      // Draw the hole
      temp.fillStyle = 'rgba(0, 0, 0, 1)'; // Solid color for the hole
      temp.fillRect(t.x + xScale(hit.x) * t.k - rr/2, t.y + yScale(hit.y) * t.k - rr/2, rr, rr);
    
      // Reset composite operation to default
      temp.globalCompositeOperation = 'source-over';
    
      // Draw the temporary canvas onto the original canvas
      ctx.drawImage(tempCanvas, 0, 0);
    }
    
    ctx.beginPath();
    ctx.arc(t.x + xScale(hit.x) * t.k, t.y + yScale(hit.y) * t.k, radius * t.k, 0, 2 * Math.PI, false);
    if(fill) {
      ctx.fillStyle = fill;
      ctx.fill();
    }
    if(stroke) {
      ctx.lineWidth = sw * t.k;
      ctx.strokeStyle = stroke;
      ctx.stroke();
    }
 
  }, [hit, type, stroke, fill, showGenes, highlightPath, strokeWidthMultiplier, radiusMultiplier, mask])

  return drawRegions
};

export default useCanvasAnnotatedRegion;