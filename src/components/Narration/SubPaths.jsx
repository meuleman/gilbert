import { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { scaleLinear } from 'd3-scale';
import { range } from 'd3-array';
import { hierarchy, treemap, treemapDice } from 'd3-hierarchy';
import { variantChooser } from '../../lib/csn';
import { showKbOrder } from '../../lib/display';
import SelectedStatesStore from '../../states/SelectedStates'
import Loading from '../Loading';
import './SubPaths.css';

import Tooltip from '../Tooltips/Tooltip';

import PropTypes from 'prop-types';

function factorTooltipContent(factor) {
  return (
    <div className="flex flex-col gap-0.5" style={{borderColor: factor.color}}>
       <span>
        <span className="inline-block w-2.5 h-2.5 mr-1" style={{ backgroundColor: factor.color }}></span>
        <span>{factor.factorName} ({factor.topSegment.score.toFixed(2)})</span>
       </span>
       <span>{showKbOrder(factor.topSegment.order)}</span>
       <span>{factor.layer.name}</span>
    </div>
  )
}

SubPaths.propTypes = {
  csn: PropTypes.object,
  factors: PropTypes.array,
  order: PropTypes.number.isRequired,
  maxPathScore: PropTypes.number,
  highlight: PropTypes.bool,
  selected: PropTypes.bool,
  width: PropTypes.number,
  height: PropTypes.oneOfType([PropTypes.number, PropTypes.string]),
  tipOrientation: PropTypes.string,
  showScore: PropTypes.bool,
  onHover: PropTypes.func,
  onClick: PropTypes.func,
  onFactor: PropTypes.func,
  onSubpathBack: PropTypes.func
};

export default function SubPaths({
  csn,
  preview,
  order,
  highlight=false,
  selected=false,
  showOrderLine=true,
  highlightOrders=[],
  text=true,
  showScore=true,
  width = 50,
  height = '100%', // Changed to support percentage
  fontSize = 9,
  offsetX = 0,
  scoreHeight = 20,
  tipOrientation="left",
  onClick = () => {},
  onHover = () => {},
  selectSubpath = () => {},
}) {
  const containerRef = useRef(null);
  const [containerHeight, setContainerHeight] = useState(0);
  
  // Measure container height when it's mounted or when height prop changes
  useEffect(() => {
    if (!containerRef.current) return;
    
    const resizeObserver = new ResizeObserver(entries => {
      for (const entry of entries) {
        setContainerHeight(entry.contentRect.height);
      }
    });
    
    resizeObserver.observe(containerRef.current);
    setContainerHeight(containerRef.current.clientHeight);
    
    return () => {
      resizeObserver.disconnect();
    };
  }, []);

  const { subpaths, removeNarrationPreview, handleNarrationPreview } = SelectedStatesStore()
  
  const tooltipRef = useRef(null)
  
  const [or, setOr] = useState(order)
  useEffect(() => {
    setOr(order)
  }, [order])

  
  // Update the top factors (from subpaths) whenever the subpaths prop changes.
  const [factors, setFactors] = useState(null);
  useEffect(() => {
    setFactors(subpaths?.topFactors ?? null);
  }, [subpaths]);

  const factorsByOrder = useMemo(() => {
    let facs = {}
    if(!factors) return facs
    factors.forEach(f => {
      let o = f.topSegment.order
      let score = f.topSegment.score
      if(!facs[o]) facs[o] = []
      facs[o].push({factor: f, score} )
      facs[o].sort((a, b) => b.score - a.score)
    })
    return facs
  }, [factors])

  const [path, setPath] = useState([])
  const [chosenFactorOrder, setChosenFactorOrder] = useState(0)
  useEffect(() => {
    if(csn?.path){
      let mfo = 0 // max factor order
      let p = csn.path.filter(d => !!d).sort((a, b) => a.order - b.order) 
      if(csn.variants && csn.variants.length) {
        let v = variantChooser(csn.variants)
        p = p.filter(d => d.order !== 14);
        p.push({field: v.topField, layer: v.layer, order: 14, region: v})
      }
      setPath(p)
      p.forEach(d => {
        if(d?.field?.value && d.order > mfo) mfo = d.order
      })
      setChosenFactorOrder(mfo)
    }
  }, [csn, order])

  // Calculate scale based on container height
  const depth = (showScore ? 15 : 14) - 4
  const effectiveScoreHeight = !showScore ? -5 : scoreHeight
  const scoreOffset = !showScore ? -effectiveScoreHeight : effectiveScoreHeight
  
  const h = containerHeight - ((containerHeight - effectiveScoreHeight) / (depth + 1)) - 1
  const yScale = useMemo(() => 
    scaleLinear()
      .domain([4, 14])
      .range([5 + effectiveScoreHeight, h - scoreOffset + 2]), 
    [h, scoreOffset, effectiveScoreHeight, containerHeight]
  );
  
  const rw = useMemo(() => yScale(5) - yScale(4) - 2, [yScale]);

  const handleClick = useCallback((e, f) => {
    selectSubpath(f)
    tooltipRef.current.hide()
  }, [selectSubpath])

  const handleSubpathHover = useCallback((e, f) => {
    handleNarrationPreview(f)
    const rect = e.currentTarget.getBoundingClientRect();
    const my = e.clientY - rect.y;
    const xoff = tipOrientation === "left" ? -5 : width + 5;
    let x = rect.x + xoff + offsetX;
    let y = rect.y + my + 1.5;
    tooltipRef.current.show(f, null, x, y);
  }, [offsetX, tipOrientation, width, handleNarrationPreview])

  const handleZoom = useCallback((e, o) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const my = e.clientY - rect.y;
    const or = o + my/rw;
    onHover(or);
  }, [rw, onHover])

  const handleLeave = useCallback(() => {
    removeNarrationPreview()
    tooltipRef.current.hide()
  }, [removeNarrationPreview])

  const [subpathsLoading, setSubpathsLoading] = useState(false)
  useEffect(() => {
    if(factors===null) setSubpathsLoading(true)
    else setSubpathsLoading(false)
  }, [factors, setSubpathsLoading])

  return (
    <div 
      ref={containerRef}
      className="absolute w-full h-full" 
      style={{ width }}
    >
      {path.length && yScale && containerHeight > 0 &&
        subpathsLoading ? 
        <div
          className="absolute left-1/2 -translate-x-1/2 -translate-y-1/2"
          style={{
            // midpoint between end of max order and end of order 14
            top: yScale((Math.max(...path.map(d => d.order)) + 14) / 2 + 1),
          }}
        >
          <Loading/>
        </div> :
        range(4, 15).map(o => {
          let facs = factorsByOrder[o]
          // ensure that preview path is not already showing something for this order
          if(facs?.length && !preview?.path?.find(p => p?.order === o)) {
            // Create a treemap layout for the facs of this order group.
            const root = hierarchy({ children: facs }).sum(d => d.score);
            treemap()
              .size([width, rw])
              .tile(treemapDice)
              .padding(2)(root)
            return (
              <div
                key={o}
                className="absolute left-0 pointer-events-auto"
                style={{
                  top: yScale(o),
                  width: width,
                  height: rw
                }}
                onMouseMove={e => handleZoom(e, o)}
              >
                {root.leaves().map((leaf, i) => {
                  return (
                  <div
                    className="subpath-rect absolute"
                    key={`${o}-${i}`}
                    style={{
                      left: leaf.x0,
                      top: leaf.y0,
                      width: leaf.x1 - leaf.x0,
                      height: leaf.y1 - leaf.y0,
                      backgroundColor: leaf.data.factor.color,
                    }}
                    onClick={e => handleClick(e, leaf.data.factor)}
                    onMouseMove={e => handleSubpathHover(e, leaf.data.factor)}
                    onMouseLeave={handleLeave}
                  />
                )})}
              </div>
            )
          }
          return null
        })
      }

      <Tooltip ref={tooltipRef} orientation={tipOrientation} contentFn={factorTooltipContent} enforceBounds={false} />
    </div>
  )
}