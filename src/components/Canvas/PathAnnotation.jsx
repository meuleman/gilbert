import { useCallback } from 'react';

// This component renders paths on canvas for either hover arrow or gene paths
const useCanvasPathAnnotation = (ranges, options = {}) => {
  const stroke = options.stroke || "gray";
  const strokeWidthMultiplier = options.strokeWidthMultiplier || 0.2;
  const opacity = options.opacity || 1.0;
  const startMarker = options.startMarker || false;
  const endMarker = options.endMarker || false;
  const limitLength = options.limitLength || false;
  
  const drawPaths = useCallback((canvasRef, scales, state) => {
    if (!canvasRef.current || !ranges || ranges.length === 0) return;
    
    let {xScale, yScale, sizeScale} = scales;
    let {transform, order} = state;
    
    let step = Math.pow(0.5, order);
    let rw = sizeScale(step);
    let sw = rw * strokeWidthMultiplier;
    let radius = rw * 0.9; // want to match the radiusMultiplier in Annotation
    
    const ctx = canvasRef.current.getContext('2d');
    
    ctx.save(); // Save the context state
    let t = {...transform};
    ctx.globalAlpha = opacity;
    
    // Draw each range as a path
    ranges.forEach(range => {
      if (range.length < 2) return;
      
      // Draw path
      ctx.beginPath();
      ctx.moveTo(t.x + xScale(range[0].x) * t.k, t.y + yScale(range[0].y) * t.k);
      
      for (let i = 1; i < range.length - 1; i++) {
        ctx.lineTo(t.x + xScale(range[i].x) * t.k, t.y + yScale(range[i].y) * t.k);
      }
      
      // Handle the last line segment
      const lastPoint = range[range.length - 1];
      const secondLastPoint = range[range.length - 2];
      
      // Calculate angle between last two points
      const angle = Math.atan2(
        yScale(lastPoint.y) - yScale(secondLastPoint.y),
        xScale(lastPoint.x) - xScale(secondLastPoint.x)
      );
      
      // Calculate distance between last two points
      const dx = xScale(lastPoint.x) - xScale(secondLastPoint.x);
      const dy = yScale(lastPoint.y) - yScale(secondLastPoint.y);
      const distance = Math.sqrt(dx * dx + dy * dy);
      
      // Determine the endpoint for the last segment
      let endX, endY;
      if (limitLength && distance > sw) {
        // Limit the length to sw
        endX = xScale(secondLastPoint.x) + Math.cos(angle) * radius;
        endY = yScale(secondLastPoint.y) + Math.sin(angle) * radius;
      } else {
        endX = xScale(lastPoint.x);
        endY = yScale(lastPoint.y);
      }
      
      // Draw the last line segment
      ctx.lineTo(t.x + endX * t.k, t.y + endY * t.k);
      
      ctx.lineWidth = sw * t.k;
      ctx.strokeStyle = stroke;
      ctx.lineCap = "round";
      ctx.lineJoin = "round";
      ctx.stroke();
      
      // Draw start marker if requested
      if (startMarker) {
        const firstPoint = range[0];
        ctx.beginPath();
        ctx.arc(
          t.x + xScale(firstPoint.x) * t.k, 
          t.y + yScale(firstPoint.y) * t.k, 
          sw * 1.5 * t.k, 0, 2 * Math.PI
        );
        ctx.fillStyle = stroke;
        ctx.fill();
      }
      
      // Draw end marker if requested
      if (endMarker && range.length > 1) {
        // Use the limited endpoint position for the marker
        const extension = sw * 1.5;
        const extendedX = t.x + (endX + Math.cos(angle) * extension) * t.k;
        const extendedY = t.y + (endY + Math.sin(angle) * extension) * t.k;
        
        // Draw triangle for the arrow
        const arrowSize = sw * 2.5 * t.k;
        
        ctx.save();
        ctx.translate(extendedX, extendedY);
        ctx.rotate(angle);
        
        ctx.beginPath();
        ctx.moveTo(0, 0);
        ctx.lineTo(-arrowSize, arrowSize / 2);
        ctx.lineTo(-arrowSize, -arrowSize / 2);
        ctx.closePath();
        
        ctx.fillStyle = stroke;
        ctx.fill();
        ctx.restore();
      }
    });
    
    ctx.restore(); // Restore the context state
  }, [ranges, stroke, strokeWidthMultiplier, opacity, startMarker, endMarker, limitLength]);

  return drawPaths;
};

export default useCanvasPathAnnotation; 