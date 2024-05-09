import { useRef, useEffect, useState, useImperativeHandle, forwardRef, useMemo } from 'react';
import { showPosition, showFloat } from '../../lib/display'


function defaultContent(region, layer, orientation) {
  // let field = layer.fieldChoice(region)
  let fields = []
  if(region.data.max_field) {
    fields.push(layer.fieldChoice(region))
    // fields.push({ field: region.data.max_field, value: region.data.max_value })
  } else if(region.data.bp) {
    fields.push(layer.fieldChoice(region))
  } else {
    fields = Object.keys(region.data).map(key => ({ field: key, value: region.data[key] }))
      .sort((a,b) => a.value - b.value)
      .filter(d => d.value > 0)
    if(orientation == "bottom") {
      fields = fields.reverse()
    }
  }
  
  return (
    <div style={{display: 'flex', flexDirection: 'column'}}>
      {orientation == "bottom" ? <div>
        {showPosition(region)}
        <br/>
        <span className="position">Order: {region.order}</span>
        <br/>
        <span style={{borderBottom: "1px solid gray", padding: "4px", margin: "4px 0"}}>{layer.name}</span>
      </div> : null}
      {fields.map((f,i) => (
        <div key={i} style={{display: 'flex', flexDirection: 'row', justifyContent: 'space-between'}}>
          <span>
            <span style={{color: layer.fieldColor(f.field), marginRight: '4px'}}>⏺</span>
            {f.field} 
          </span>
          <span>
            {typeof f.value == "number" ? showFloat(f.value) : f.value}
          </span>
        </div>
      ))}
      
      {orientation !== "bottom" ? <div>
        <span style={{borderTop: "1px solid gray", padding: "4px", margin: "4px 0"}}>{layer.name}</span>
        <br/>
        <span className="position">Order: {region.order}</span>
        <br/>
        {showPosition(region)}
      </div> : null}
    </div>
  )
}

const Tooltip = forwardRef(({ 
  orientation: defaultOrientation, 
  contentFn,
  bottomOffset = 0, 
  enforceBounds = true 
}, ref) => {
  const tooltipRef = useRef(null);
  const arrowRef = useRef(null);
  const [isVisible, setIsVisible] = useState(false);
  const [content, setContent] = useState('');
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [orientation, setOrientation] = useState(defaultOrientation);
  const cfn = useMemo(() => contentFn, [contentFn])

  useImperativeHandle(ref, () => ({
    show: (region, layer, x, y) => {
      if(contentFn) {
        setContent(cfn(region, layer, defaultOrientation))
      } else if(layer.tooltip) {
        setContent(layer.tooltip(region, layer, defaultOrientation))
      } else {
        setContent(defaultContent(region, layer, defaultOrientation))
      }
      setPosition({ x, y });
      setIsVisible(true);
    },
    hide: () => {
      setIsVisible(false);
    }
  }))

  useEffect(() => {
    const tooltip = tooltipRef.current;
    if(tooltip) {
      tooltip.style.display = isVisible ? 'block' : 'none'
    }
  }, [isVisible])

  useEffect(() => {
    const updatePosition = () => {
      const tooltip = tooltipRef.current;
      const arrow = arrowRef.current
      if (tooltip) {
        tooltip.style.top = '-1000px'
        tooltip.style.left = '-1000px'
        // tooltip.style.display = isVisible ? 'block' : 'none'
        const tooltipRect = tooltip.getBoundingClientRect();
        const { width, height } = tooltipRect;
        const { x, y } = position;

        let newOrientation = defaultOrientation;
        let tooltipX = x;
        let tooltipY = y;

        if (defaultOrientation === 'top') {
          tooltipX = x - width / 2;
          if(enforceBounds) {
            if (y - height < 0 && y + height < window.innerHeight) {
              newOrientation = 'bottom';
              tooltipY = y + bottomOffset; 
            } else {
              tooltipY = y - height; // Adjust the offset as needed
            }
          }
        } else if (defaultOrientation === 'bottom') {
          tooltipX = x - width / 2;
          if(enforceBounds) {
            if (y + height > window.innerHeight) {
              newOrientation = 'top';
              tooltipY = y - height - 10; // Adjust the offset as needed
            } else {
              tooltipY = y + 10; // Adjust the offset as needed
            }
          }
        } else if (defaultOrientation === 'left') {
          tooltipY = y - height / 2;
          tooltipX = x - width;
          if(enforceBounds) {
            if (x - width < 0) {
              newOrientation = 'right';
              tooltipX = x + 10; // Adjust the offset as needed
            } else {
              tooltipX = x - width - 10; // Adjust the offset as needed
            }
          }
        } else if (defaultOrientation === 'right') {
          tooltipY = y - height / 2;
          tooltipX = x;
          if(enforceBounds) {
            if (x + width > window.innerWidth) {
              newOrientation = 'left';
              tooltipX = x - width - 10; // Adjust the offset as needed
            } else {
              tooltipX = x + 10; // Adjust the offset as needed
            }
          }
        }

        // Ensure the tooltip stays within the viewport horizontally

        if (tooltipX < 0) {
          if(newOrientation == 'top' || newOrientation == 'bottom') {
            arrow.style.marginLeft = tooltipX + "px"
          }
          if(enforceBounds) tooltipX = 0;
        } else if (tooltipX + width > window.innerWidth) {
          if(enforceBounds) {
            let dX = tooltipX - (window.innerWidth - width)
            tooltipX = window.innerWidth - width;
            if(newOrientation == 'top' || newOrientation == 'bottom') {
              // arrow.style.marginLeft = dX + "px"
            }
          }
        }

        // console.log("tooltip", tooltipX, newOrientation, width)
        setOrientation(newOrientation);
        tooltip.style.left = `${tooltipX}px`;
        tooltip.style.top = `${tooltipY}px`;
        // tooltip.style.display = isVisible ? 'block' : 'none'
      }
      // if(!isVisible) {
      //   tooltip.style.display = 'none'
      // }
    };
    

    updatePosition();
    window.addEventListener('scroll', updatePosition);
    window.addEventListener('resize', updatePosition);

    return () => {
      window.removeEventListener('scroll', updatePosition);
      window.removeEventListener('resize', updatePosition);
    };
  }, [position, defaultOrientation, bottomOffset, enforceBounds]);

  const getArrowStyle = () => {
    const arrowSize = 5;
    const halfSize = arrowSize / 2;

    // const color = "#efefef"
    const color = "black"
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
          top: '50%',
          marginTop: `-${halfSize}px`,
          borderTop: `${halfSize}px solid transparent`,
          borderBottom: `${halfSize}px solid transparent`,
          borderLeft: `${arrowSize}px solid ${color}`,
        };
      case 'right':
        return {
          left: '-5px',
          top: '50%',
          marginTop: `-${halfSize}px`,
          borderTop: `${halfSize}px solid transparent`,
          borderBottom: `${halfSize}px solid transparent`,
          borderRight: `${arrowSize}px solid ${color}`,
        };
      default:
        return {};
    }
  };

  return (
    <div
      ref={tooltipRef}
      style={{
        position: 'fixed',
        zIndex: 1000,
        background: '#efefef',
        border: `1px solid black`,
        color: 'black',
        padding: '5px',
        borderRadius: '4px',
        pointerEvents: "none",
        display: 'none'
        // display: isVisible ? 'block' : 'none',
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

