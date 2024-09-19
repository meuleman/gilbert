import { useState, useCallback, useEffect, useRef, useContext } from 'react'

import { max } from 'd3-array'
import VerticalSankey from './VerticalSankey';
import ZoomLine from './ZoomLine';
import Loading from '../Loading'
import FiltersContext from '../ComboLock/FiltersContext'
import {showPosition} from '../../lib/display'
import {Tooltip} from 'react-tooltip';


import './SankeyModal.css'


const SankeyModal = ({
  show = false,
  selectedRegion = null,
  hoveredRegion = null,
  factorCsns = [],
  fullCsns = [],
  loading = "",
  order = 4,
  width = 400,
  height = 320,
  numPaths = 100,
  shrinkNone = true,
  onSelectedCSN = () => {},
  onHoveredCSN = () => {},
  onSort = () => {},
  onNumPaths = () => {},
  onClearRegion = () => {},
  // onCSNS = () => {}
} = {}) => {

  const [loadingCSN, setLoadingCSN] = useState(false)

  const [showPanel, setShowPanel] = useState(true)
  const [showControls, setShowControls] = useState(false)

  const { filters, hasFilters } = useContext(FiltersContext)

  useEffect(() => {
    setShowPanel(show)
  }, [show])


  useEffect(() => {
    if(!hasFilters()){
      setSort("full")
    }
  }, [filters])

  const [view, setView] = useState("sankey")
  const [sort, setSort] = useState("full")
  useEffect(() => {
    onSort(sort)
  }, [sort])

  const [csns, setCSNs] = useState([])
  const [maxPathScore, setMaxPathScore] = useState(null)
  useEffect(() => {
    const csns = sort === "factor" ? factorCsns : fullCsns
    const maxscore = max(factorCsns.concat(fullCsns), d => d.score)
    // console.log("MAX SCORE", maxscore)
    // console.log("FACTOR", factorCsns)
    // console.log("FULL", fullCsns)
    setMaxPathScore(maxscore || 0)
    if(csns.length) {
      setCSNs(csns)
    } else {
      setCSNs([])
    }
  }, [factorCsns, fullCsns, sort])

  const zlheight = height

  useEffect(() => {
    // console.log("selectedRegion", selectedRegion)
    // console.log("hoveredRegion", hoveredRegion)
  }, [selectedRegion, hoveredRegion])

  const handleShowControl = useCallback(() => {
    setShowControls(!showControls)
  }, [showControls])

  const handleSwitchView = useCallback(() => {
    setView(view == "heatmap" ? "sankey" : "heatmap")
  }, [view])

  return (
    <div className={`sankey-modal ${show ? "show" : "hide"}`}>
        <div className={`control-buttons`}>
          <button 
            onClick={useCallback(() => setShowPanel(!showPanel), [showPanel])}
            data-tooltip-id="sankey-show-visualization"
            disabled={!csns.length}
            >
              <span style={{
                // transform: "rotate(90deg)", 
                display:"block",
                filter: csns.length ? 'none' : 'grayscale(100%)' // Apply grayscale if csns is empty
              }}>{showPanel ? "➡️" : "⬅️"}</span>
          </button>
          <Tooltip id="sankey-show-visualization">
            {showPanel ? "Hide Path Narration Panel" : "Show Path Narration Panel"}
          </Tooltip>
  
          {showPanel ? <button 
            onClick={handleShowControl}
            disabled={!csns.length}
            data-tooltip-id="sankey-show-control"
            >⚙️</button>: null}
            <Tooltip id="sankey-show-control">
              Show Controls
            </Tooltip>
  
          {showPanel ? <button 
            onClick={handleSwitchView}
            data-tooltip-id="sankey-switch-visualization"
            disabled={!csns.length}
            >
              <span style={{
                // transform: "rotate(90deg)", 
                display:"block",
                filter: csns.length ? 'none' : 'grayscale(100%)' // Apply grayscale if csns is empty
              }}>{view == "sankey" ? "📊" : "🌊"}</span>
          </button> : null }
          <Tooltip id="sankey-switch-visualization">
            Switch Visualization to {view == "heatmap" ? "Sankey" : "Heatmap"}
          </Tooltip>

          {showPanel && selectedRegion ? <button 
            // onClick={handleSwitchView}
            onClick={onClearRegion}
            data-tooltip-id="sankey-clear-region"
            style={{
              position: "relative",
            }}
            >
              <span style={{
                // transform: "rotate(90deg)", 
                display:"block",
                
              }}>🗺️</span>
              <span style={{
                display:"block",
                position: "absolute",
                top: "9px",
              }}>❌</span>
          </button> : null }
          {selectedRegion ? <Tooltip id="sankey-clear-region">
            Remove selected region {showPosition(selectedRegion)} as a filter
          </Tooltip> : null}
 
        </div>
        <div className={`controls ${showControls ? "show" : "hide"}`}>
            <div>
              <div className="num-paths">
                <label>
                  <input 
                    type="number" 
                    value={numPaths}
                    style={{ width: '60px' }}
                    onChange={(e) => onNumPaths(+e.target.value)} 
                  />
                  &nbsp; # Paths
                </label>
              </div>
              <div className="sort-options">
                <div>
                Sort:
                <label>
                  <input 
                    type="radio" 
                    value="factor" 
                    checked={sort === "factor"} 
                    disabled={!hasFilters()}
                    onChange={() => setSort("factor")} 
                  />
                  Factor
                </label>
                <label>
                  <input 
                    type="radio" 
                    value="full" 
                    checked={sort === "full" || !hasFilters()} 
                    onChange={() => setSort("full")} 
                  />
                  Full
                </label>
                </div>
              </div>
          </div>
        </div>
      <div className={`content ${showPanel ? "show" : "hide"}`}
        style={{
          width: csns.length || loading ? "400px" : "0px",
        }}
      >
        <div className="loading-info">
            {loading ? <Loading text={loading} /> : null}
        </div>
        {view === "heatmap" ? 
          <div className={`csn-lines ${loading ? "loading-csns" : ""}`}>
            <div className="only-top-factor line-column">
              <div className="csn-lines">
                {csns.slice(0,40).map((n,i) => {
                  // console.log("n", n)
                  return (<ZoomLine 
                    key={i}
                    csn={n} 
                    maxPathScore={maxPathScore}
                    order={order}
                    showScore={false}
                    // highlight={!selectedRegion && !!n.path.find(r => hoveredRegion && r && r.order === hoveredRegion.order && r.region.chromosome === hoveredRegion.chromosome && r.region.i === hoveredRegion.i)}
                    highlight={!selectedRegion && hoveredRegion && n.region && n.region.order === hoveredRegion.order && n.region.chromosome === hoveredRegion.chromosome && n.region.i === hoveredRegion.i}
                    selected={selectedRegion && n.region && n.region.order === selectedRegion.order && n.region.chromosome === selectedRegion.chromosome && n.region.i === selectedRegion.i}
                    // selected={crossScaleNarrationIndex === i || selectedNarrationIndex === i}
                    text={false}
                    width={9.5} 
                    height={zlheight}
                    tipOrientation="right"
                    showOrderLine={false}
                    // highlightOrders={Object.keys(orderSelects).map(d => +d)} 
                    onClick={() => onSelectedCSN(n)}
                    onHover={() => onHoveredCSN(n)}
                    />)
                  })
                }
              </div>
            </div>
            {/* <div className="only-top-factor line-column">
              <h4>factor</h4>
              <div className="csn-lines">
                {onlyInTopFactor.map((n,i) => {
                  return (<ZoomLine 
                    key={i}
                    csn={n} 
                    maxPathScore={maxPathScore}
                    order={order}
                    // highlight={true}
                    // selected={crossScaleNarrationIndex === i || selectedNarrationIndex === i}
                    text={false}
                    width={2.05} 
                    height={zlheight}
                    tipOrientation="right"
                    showOrderLine={false}
                    // highlightOrders={Object.keys(orderSelects).map(d => +d)} 
                    onClick={() => onSelectedCSN(n)}
                    onHover={() => onHoveredCSN(n)}
                    />)
                  })
                }
              </div>
            </div> */}
            {/* <div className="in-both line-column">
              <h4>both</h4>
              <div className="csn-lines">
                {inBoth.map((n,i) => {
                  return (<ZoomLine 
                    key={i}
                    csn={n} 
                    maxPathScore={maxPathScore}
                    order={order}
                    text={false}
                    width={2.05} 
                    height={zlheight}
                    tipOrientation="right"
                    showOrderLine={false}
                    // highlightOrders={Object.keys(orderSelects).map(d => +d)} 
                    onClick={() => onSelectedCSN(n)}
                    onHover={() => onHoveredCSN(n)}
                    />)
                  })
                }
              </div>
            </div>
            <div className="only-top-full line-column">
              <h4>full</h4>
              <div className="csn-lines">
                {onlyInTopFull.map((n,i) => {
                    return (<ZoomLine 
                  key={i}
                  csn={n} 
                  maxPathScore={maxPathScore}
                  order={order}
                  text={false}
                  width={2.05} 
                  height={zlheight}
                  tipOrientation="right"
                  showOrderLine={false}
                  // highlightOrders={Object.keys(orderSelects).map(d => +d)} 
                  onClick={() => onSelectedCSN(n)}
                  onHover={() => onHoveredCSN(n)}
                  />)
                  })
                }
              </div> */}
            {/* </div> */}
          </div>
        : null }

        {view == "sankey" && csns.length ? 
          <div className={`sankey-container ${loading ? "loading-csns" : ""}`}>
            <VerticalSankey 
              width={width} 
              height={height} 
              csns={csns} 
              shrinkNone={shrinkNone} 
              nodeWidth={height/11 - 28}
              nodePadding={5}
            />
          </div> :null }
      </div>
    </div>
  )
}
export default SankeyModal
