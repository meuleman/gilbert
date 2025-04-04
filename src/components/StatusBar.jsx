// A component to display some information below the map when hovering over hilbert cells
import { useEffect, useState } from 'react';
import { getGenesInCell, getGenesOverCell } from '../lib/Genes'
import { sum } from 'd3-array'
import './StatusBar.css'
import { format } from "d3-format"
import { showPosition } from '../lib/display';
import SelectedStatesStore from '../states/SelectedStates';

const StatusBar = ({
  width = 800,
  hover = null,
  regionsByOrder = {},
  topCSNS = new Map(),
  layer,
  zoom,
  orderOffset,
  onOrderOffset = () => { },
} = {}) => {

  const { selected, currentPreferred } = SelectedStatesStore();
  const [regionHighlight, setRegionHighlight] = useState(null)

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

  let inside, outside;
  let filteredPathCount = 0;
  let topCSNCount = 0;
  let topCSNRepresented = 0;
  if (hover) {
    inside = getGenesInCell(hover, zoom.order)
    if (inside.length > 3) {
      inside = inside.length
    } else {
      inside = inside.map(d => d.hgnc).join(", ")
    }
    outside = getGenesOverCell(hover, zoom.order)
    if (outside.length > 3) {
      outside = outside.length
    } else {
      outside = outside.map(d => d.hgnc).join(", ")
    }
    if (regionsByOrder?.total) {
      if (regionsByOrder.chrmsMap[hover.chromosome] && regionsByOrder.chrmsMap[hover.chromosome][hover.i]) {
        let filteredRegion = regionsByOrder.chrmsMap[hover.chromosome][hover.i]
        filteredPathCount = filteredRegion?.count
      }
    } else {
      filteredPathCount = 0
    }
    let topCSN = topCSNS.get(hover.chromosome + ":" + hover.i)
    if (topCSN) {
      topCSNCount = topCSN.length
      topCSNRepresented = sum(topCSN, d => d.representedPaths)
    }
  } else {
    filteredPathCount = 0
    topCSNCount = 0
    topCSNRepresented = 0
  }

  useEffect(() => {
    if(currentPreferred) setRegionHighlight(currentPreferred.region)
    else if(!selected && hover) setRegionHighlight(hover)
    else setRegionHighlight(null)
  }, [hover, currentPreferred, selected, setRegionHighlight])

  return (
    <div className="bg-statusBar h-6 px-6 text-xs font-mono font-bold flex gap-6 items-center">
      {regionHighlight && (
        <div className="status-position-override">
          {showPosition(regionHighlight)}
        </div>
      )}
      <div className="flex items-center">
        <div className="flex-1 text-center whitespace-nowrap overflow-hidden text-ellipsis">
          {currentPreferred?.field ? (
            <>
              <span style={{ color: currentPreferred?.layer?.fieldColor(currentPreferred?.field?.field), marginRight: '4px' }}>
                ⏺
              </span>
              {currentPreferred?.field?.field} {currentPreferred?.layer?.labelName}
            </>
          ) : null}
        </div>
      </div>

      {inside && (<div>Genes in region: {inside} &nbsp;</div>)}
      {outside && (<div>Genes overlapping region: {outside}</div>)}

      {!selected ? <div className="ml-auto">
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