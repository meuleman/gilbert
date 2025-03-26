import { useRef, useEffect, useState, useImperativeHandle, forwardRef, useMemo, useCallback } from 'react';
import { defaultContent } from './Content';

// Helper function to clamp a value between min and max.
const clamp = (value, min, max) => Math.max(min, Math.min(value, max));

const Tooltip = forwardRef(({
  orientation: defaultOrientation,
  contentFn,
  topOffset = 40,
  bottomOffset = 20,
  enforceBounds = true,
}, ref) => {
  const tooltipRef = useRef(null);
  const arrowRef = useRef(null);
  const [isVisible, setIsVisible] = useState(false);
  const [content, setContent] = useState('');
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [orientation, setOrientation] = useState(defaultOrientation);
  const [yDiff, setYDiff] = useState(0);

  // Cache content function.
  const cfn = useMemo(() => contentFn, [contentFn]);

  useImperativeHandle(ref, () => ({
    show: (region, layer, x, y) => {
      if (contentFn) {
        setContent(cfn(region, layer, defaultOrientation));
      } else if (layer.tooltip) {
        setContent(layer.tooltip(region, layer, defaultOrientation));
      } else {
        setContent(defaultContent(region, layer, defaultOrientation));
      }
      setPosition({ x, y });
      setIsVisible(true);
    },
    hide: () => setIsVisible(false)
  }), [cfn, defaultOrientation]);

  useEffect(() => {
    if (tooltipRef.current) {
      tooltipRef.current.style.display = isVisible ? 'block' : 'none';
    }
  }, [isVisible]);

  // Memoized arrow style calculation.
  const getArrowStyle = useCallback(() => {
    const arrowSize = 5, halfSize = arrowSize / 2, color = 'black';
    switch (orientation) {
      case 'top':
        return {
          bottom: '-5px',
          left: '50%',
          marginLeft: `-${halfSize}px`,
          borderLeft: `${halfSize}px solid transparent`,
          borderRight: `${halfSize}px solid transparent`,
          borderTop: `${arrowSize}px solid ${color}`,
        };
      case 'bottom':
        return {
          top: '-5px',
          left: '50%',
          marginLeft: `-${halfSize}px`,
          borderLeft: `${halfSize}px solid transparent`,
          borderRight: `${halfSize}px solid transparent`,
          borderBottom: `${arrowSize}px solid ${color}`,
        };
      case 'left':
        return {
          right: '-5px',
          top: `calc(50% - ${yDiff}px)`,
          marginTop: `-${halfSize}px`,
          borderTop: `${halfSize}px solid transparent`,
          borderBottom: `${halfSize}px solid transparent`,
          borderLeft: `${arrowSize}px solid ${color}`,
        };
      case 'right':
        return {
          left: '-5px',
          top: `calc(50% - ${yDiff}px)`,
          marginTop: `-${halfSize}px`,
          borderTop: `${halfSize}px solid transparent`,
          borderBottom: `${halfSize}px solid transparent`,
          borderRight: `${arrowSize}px solid ${color}`,
        };
      default:
        return {};
    }
  }, [orientation, yDiff]);

  // Memoized updatePosition callback.
  const updatePosition = useCallback(() => {
    const tooltip = tooltipRef.current;
    if (!tooltip) return;
  
    // Move off-screen to measure tooltip size.
    tooltip.style.top = '-1000px';
    tooltip.style.left = '-1000px';
    const { width, height } = tooltip.getBoundingClientRect();
    const { x, y } = position;
    let newOrientation = defaultOrientation;
    let tooltipX, tooltipY;
  
    // Calculate initial position based on defaultOrientation.
    if (defaultOrientation === 'top') {
      tooltipX = x - width / 2;
      tooltipY = y - height;
      if (enforceBounds && tooltipY < topOffset) {
        newOrientation = 'bottom';
        tooltipY = y + bottomOffset;
      }
    } else if (defaultOrientation === 'bottom') {
      tooltipX = x - width / 2;
      tooltipY = y + height;
      if (enforceBounds && tooltipY > window.innerHeight - height - bottomOffset) {
        newOrientation = 'top';
        tooltipY = y - height - 40;
      }
    } else if (defaultOrientation === 'left') {
      tooltipX = x - width;
      tooltipY = y - height / 2;
      if (enforceBounds && tooltipX < 0) {
        newOrientation = 'right';
        tooltipX = x + 10;
      }
    } else if (defaultOrientation === 'right') {
      tooltipX = x + 10;
      tooltipY = y - height / 2;
      if (enforceBounds && tooltipX + width > window.innerWidth) {
        newOrientation = 'left';
        tooltipX = x - width - 10;
      }
    } else {
      tooltipX = x;
      tooltipY = y;
    }
  
    // Clamp horizontal and vertical positions.
    if (enforceBounds) {
      tooltipX = clamp(tooltipX, 0, window.innerWidth - width);
      tooltipY = clamp(tooltipY, topOffset, window.innerHeight - height - bottomOffset);
    }
  
    // Adjust tooltip if it sits exactly at the top boundary.
    if (tooltipY === topOffset) {
      setYDiff(topOffset - (y - height));
    } else {
      setYDiff(0);
    }
  
    // Extra safeguard for top boundary.
    if (tooltipY < topOffset) {
      setYDiff(topOffset - tooltipY);
      tooltipY = topOffset;
    }
  
    // Ensure tooltipX doesn't fall below 0.
    if (tooltipX < 0) tooltipX = 0;
  
    // Prevent tooltip from extending off the bottom of the viewport.
    if (tooltipY + height > window.innerHeight) {
      tooltipY = window.innerHeight - height;
    }
  
    setOrientation(newOrientation);
    tooltip.style.left = `${tooltipX}px`;
    tooltip.style.top = `${tooltipY}px`;
    // (Optional: adjust arrow styling if needed.)
  }, [position, defaultOrientation, topOffset, bottomOffset, enforceBounds]);
  useEffect(() => {
    updatePosition();
    window.addEventListener('scroll', updatePosition);
    window.addEventListener('resize', updatePosition);
    return () => {
      window.removeEventListener('scroll', updatePosition);
      window.removeEventListener('resize', updatePosition);
    };
  }, [updatePosition]);

  return (
    <div
      ref={tooltipRef}
      style={{
        position: 'fixed',
        zIndex: 2000,
        background: '#efefef',
        border: '1px solid black',
        color: 'black',
        padding: '5px',
        borderRadius: '4px',
        pointerEvents: 'none',
        display: 'none',
      }}
    >
      {content}
      <div
        ref={arrowRef}
        style={{
          position: 'absolute',
          width: 0,
          height: 0,
          ...getArrowStyle(),
        }}
      ></div>
    </div>
  );
});

Tooltip.displayName = 'Tooltip';
export default Tooltip;