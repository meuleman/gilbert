import { useState, useEffect, useCallback } from 'react';
import { scaleSequential } from 'd3-scale';
import { interpolateBlues } from 'd3-scale-chromatic';
import { max, min } from 'd3-array';
import { hilbertPosToOrder } from '../../lib/HilbertChromosome';

const useCanvasBbox = (bbox, options = {}) => {
  const color = options.color || "black"
  const opacity = options.opacity || 1
  const strokeScale = options.strokeScale || 1

  const drawBbox = useCallback((canvasRef, scales) => {
    if(!bbox) return;
    
    let { xScale, yScale, sizeScale } = scales

    const ctx = canvasRef.current.getContext('2d');

    const tempCanvas = document.createElement('canvas');
    let temp = tempCanvas.getContext('2d');
    tempCanvas.width = canvasRef.current.width;
    tempCanvas.height = canvasRef.current.height;
  
    // Draw the translucent mask on the temporary canvas
    temp.fillStyle = 'rgba(255, 255, 255, 0.7)';
    temp.fillRect(0, 0, tempCanvas.width, tempCanvas.height);
  
    // Set composite operation to 'destination-out' to punch holes
    temp.globalCompositeOperation = 'destination-out';
    
    // bbox size
    let tX = xScale(bbox.x)
    let tY = yScale(bbox.y)
    let tWidth = sizeScale(bbox.width)
    let tHeight = sizeScale(bbox.height)

    // create punchout
    temp.fillRect(tX, tY, tWidth, tHeight);
   
    // Reset composite operation to default
    temp.globalCompositeOperation = 'source-over';
    
    // Draw the bounding box
    temp.strokeStyle = color
    temp.lineWidth = strokeScale
    temp.strokeRect(tX, tY, tWidth, tHeight);

    // Draw the temporary canvas onto the original canvas
    ctx.drawImage(tempCanvas, 0, 0);

  }, [color, opacity, strokeScale, bbox])

  return drawBbox
};

export default useCanvasBbox;