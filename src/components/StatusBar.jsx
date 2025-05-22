// A component to display some information below the map when hovering over hilbert cells
import { useEffect, useMemo, useState } from 'react';
import { getGenesInCell, getGenesOverCell } from '../lib/Genes'
import { sum } from 'd3-array'
import './StatusBar.css'
import { format } from "d3-format"
import { showPosition } from '../lib/display';
import SelectedStatesStore from '../states/SelectedStates';
import ComponentSizeStore from '../states/ComponentSizes';
import { useZoom } from '../contexts/ZoomContext';

const StatusBar = ({
  width = 800,
  hover = null,
  regionsByOrder = {},
  topCSNS = new Map(),
  layer,
  orderOffset,
  onOrderOffset = () => { },
} = {}) => {

  const { 
    leftToolbarSize, mainMapSize, zoomLegendSize, 
    powerSize, csnSize, activeRegionSetModalSize 
  } = ComponentSizeStore();
  const { selected, currentPreferred } = SelectedStatesStore();
  const [regionHighlight, setRegionHighlight] = useState(null)
  const { order } = useZoom()

  // calculate the position to align status bar regional content
  const centerPosition = useMemo(() => {
    let position = leftToolbarSize.width
    if(selected) {
      position += powerSize.width / 2
    } else {
      position += mainMapSize.width / 2
    }
    return position
  }, [leftToolbarSize, mainMapSize, powerSize, selected])

  let sample = null
  let sampleSummary = ""
  if (layer && hover && hover.data) {
    sample = layer.fieldChoice(hover)
  }

  let numformat = (x) => x
  if (sample) {
    let value = sample.value
    numformat = format(",d")
    if (value && value !== Math.floor(value)) {
      numformat = format(".4f")
    }
    if (typeof value === "string") {
      numformat = (x) => x
    }
  }

  if (sample) {
    sampleSummary = `${sample.field}: ${numformat(sample.value)}`
    if (layer.fieldSummary) {
      sampleSummary = layer.fieldSummary(hover)
    }
  }

  useEffect(() => {
    if(currentPreferred) setRegionHighlight(currentPreferred)
    else if(!selected && hover) setRegionHighlight(hover)
    else setRegionHighlight(null)
  }, [hover, currentPreferred, selected, setRegionHighlight])

  const inside = useMemo(() => {
    if (regionHighlight) {
      const genes = getGenesInCell(regionHighlight, order)
      return genes.length > 3 ? genes.length : genes.map(d => d.hgnc).join(", ")
    }
    return null
  }, [regionHighlight, order, getGenesInCell])

  const outside = useMemo(() => {
    if (regionHighlight) {
      const genes = getGenesOverCell(regionHighlight, order)
      return genes.length > 3 ? genes.length : genes.map(d => d.hgnc).join(", ")
    }
    return null
  }, [regionHighlight, order, getGenesOverCell])

  return (
    <div className="bg-statusBar h-6 px-6 text-xs font-mono font-bold flex gap-6 items-center relative">
      <div 
        className="grid grid-cols-3 w-full gap-x-2 max-w-5xl mx-auto items-center absolute"
        style={{ 
          left: `${centerPosition}px`, 
          transform: 'translateX(-50%)', 
        }}
      >
        <div className="justify-self-end min-w-0 overflow-hidden whitespace-nowrap">
          {inside && (<span>Genes in region: {inside}{outside ? ";" : null} </span>)}
          {outside && (<span>Genes overlapping region: {outside}</span>)}
        </div>
        <div className="status-position-override justify-self-center min-w-0 overflow-hidden whitespace-nowrap">
          {regionHighlight ? showPosition(regionHighlight) : null}
        </div>
        <div className="justify-self-start">
          <div className="text-center min-w-0 overflow-hidden whitespace-nowrap">
            {currentPreferred?.field ? (
              <>
                <span style={{ color: currentPreferred?.field?.color, marginRight: '4px' }}>
                  ⏺
                </span>
                {currentPreferred?.field?.field} {currentPreferred?.layer?.labelName}
              </>
            ) : null}
          </div>
        </div>
      </div>

      {!selected ? <div className="absolute right-6">
        <div className="flex gap-1">
          <div>Order offset</div>
          <div>
            <input
              className="rounded border border-bodyMuted w-7 text-center"
              type="number"
              value={orderOffset}
              maxLength="2"
              min={-2}
              max={2}
              onChange={(e) => onOrderOffset(+e.target.value)}
            />
          </div>
        </div>
      </div> : null
      }
    </div>
  )

}
export default StatusBar