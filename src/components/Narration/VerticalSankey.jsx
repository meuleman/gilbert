import { useEffect, useState, useCallback, useRef, useContext} from 'react'
import { sankey, sankeyJustify, sankeyCenter, sankeyLinkHorizontal } from 'd3-sankey';
import { range, max } from 'd3-array';
import { path as d3path } from 'd3-path';
import Tooltip from '../Tooltips/Tooltip';
import { showKb } from '../../lib/display'
import { makeField } from '../../layers'
import FiltersContext from '../ComboLock/FiltersContext'

// TODO: make this drop in for sankeyLinkVertical()
function sankeyLinkPath(link, offset=0, debug=false) {
  // this is a drop in replacement for d3.sankeyLinkHorizontal()
  // well, without the accessors/options
  let sx = link.source.x1
  let tx = link.target.x0 + 1
  let lw2 = link.width/2
  let sw2 = (link.source.y1 - link.source.y0)/2
  let tw2 = (link.target.y1 - link.target.y0)/2
  let slw2 = sw2 < lw2 ? sw2 : lw2
  let tlw2 = tw2 < lw2 ? tw2 : lw2
  if(debug) console.log("lw2", lw2, "sw2", sw2, "tw2", tw2, "slw2", slw2, "tlw2", tlw2)
  let sy0 = link.y0 - slw2
  let sy1 = link.y0 + slw2
  let ty0 = link.y1 - tlw2
  let ty1 = link.y1 + tlw2
  
  let halfx = (tx - sx)/2

  let path = d3path()  
  path.moveTo(sx, sy0)

  let cpx1 = sx + halfx
  let cpy1 = sy0 + offset
  let cpx2 = sx + halfx
  let cpy2 = ty0 - offset
  path.bezierCurveTo(cpx1, cpy1, cpx2, cpy2, tx, ty0)
  path.lineTo(tx, ty1)

  cpx1 = sx + halfx
  cpy1 = ty1 - offset
  cpx2 = sx + halfx
  cpy2 = sy1 + offset
  path.bezierCurveTo(cpx1, cpy1, cpx2, cpy2, sx, sy1)
  path.lineTo(sx, sy0)
  return path.toString()
}


function tooltipContent(node, layer, orientation) {
  if(node.children) {
    node.children.sort((a,b) => b.count - a.count)
  }
  return (
    <div style={{display: 'flex', flexDirection: 'column'}}>
      <span>
        {showKb(Math.pow(4, 14 - node.order))}
      </span>
      <span>
        <span style={{color: node.color, marginRight: '4px'}}>⏺</span>
        {node.field}: {node.value} paths</span>
      <span style={{borderBottom: "1px solid gray", padding: "4px", margin: "4px 0"}}>{layer?.name}</span>
      {node.children ? node.children.map(c => {
        return <div key={c.id}>{c.field}: {c.count} paths</div>
      }) : null}
    </div>
  )
}

import PropTypes from 'prop-types';

CSNVerticalSankey.propTypes = {
  width: PropTypes.number.isRequired,
  height: PropTypes.number.isRequired,
  csns: PropTypes.array.isRequired,
  selected: PropTypes.object,
  filters: PropTypes.object,
  shrinkNone: PropTypes.bool,
  filter: PropTypes.array,
  onFilter: PropTypes.func
};


export default function CSNVerticalSankey({
  width,
  height,
  csns,
  selected,
  shrinkNone = true,
  collapseThreshold = 10,
  tipOrientation = "bottom",
  nodeWidth = 15,
  nodePadding = 5,
  filter = [],
  onFilter=() => {},
}) {
  const tooltipRef = useRef(null)

  const [sank, setSank] = useState(null)
  const [maxOrder, setMaxOrder] = useState(0)

  const { filters, handleFilter } = useContext(FiltersContext)

  useEffect(() => {
    if(csns.length) {
      // console.log("CSNS", csns)

      const linkId = (a,b) => `${a.id}=>${b.id}`
      let nodesMap = {}
      let linksMap = {}
      // loop over all the csns
      csns.forEach(csn => {
        // go through the path and make nodes for each order if they need to exist. add links for the path
        let ns = csn.path.map(pp => {
          let p = pp;
          if(!pp.field) {
            p = { order: pp.order, layer: { name: "ZNone" }, field: { field: "None", color: "lightgray" } }
          }
          let id = `${p.order}-${p.field.field}`
          if(!nodesMap[id]) {
            nodesMap[id] = {
              id: id,
              order: p.order,
              dataLayer: p.layer,
              field: p.field.field,
              color: p.field.color,
              count: 1
            }
          } else {
            nodesMap[id].count += 1
          }
          return nodesMap[id]
        })
        // create link to parent for each node we just made
        ns.forEach((n,i) => {
          if(i == 0) return
          let source = ns[i-1]
          let target = n
          if(linksMap[linkId(source, target)]) {
            // linksMap[linkId(source, target)].value += t.score
            linksMap[linkId(source, target)].value += 1//t.score
            // linksMap[linkId(source, target)].value += target.fieldValue
          } else {
            linksMap[linkId(source, target)] = {
              source: source.id,
              target: target.id,
              value: 1,
              // value: t.score
              // value: target.fieldValue
            }
          }
        })
      })

      // we want to collapse nodes into their layer if they have less than collapseThreshold paths
      Object.keys(nodesMap).forEach(id => {
        let n = nodesMap[id]
        if(n.count < collapseThreshold) {
          let lid = `${n.order}-${n.dataLayer.name}`
          // first we either update the layer node or create a new one
          let nl = nodesMap[lid]
          if(nl) {
            nl.value += n.value
            let mv = max(nl.children, d => d.value)
            if(n.value > mv) {
              nl.color = n.color
            }
            nl.children.push(n)
          } else {
            // create a new layer node
            nodesMap[lid] = {
              id: lid,
              order: n.order,
              dataLayer: n.dataLayer,
              field: "Layer",
              children: [n],
              color: n.color
            }
          }
          nl = nodesMap[lid]
          // remove the factor node from the nodesMap
          delete nodesMap[id]

          // now we need to update any links affected
          Object.keys(linksMap).forEach(linkId => {
            let l = linksMap[linkId]
            if(l.source == n.id) {
              l.source = nl.id
            }
            if(l.target == n.id) {
              l.target = nl.id
            }
          })

        }
      })

      // for each of the collapsed layers, lets set the color of the node to be the color of the child with highest count
      Object.keys(nodesMap).forEach(id => {
        let n = nodesMap[id]
        if(n.field == "Layer") {
          // find the child with the highest count
          let mc;
          n.children.forEach(c => {
            if(!mc || c.count > mc.count) {
              mc = c
            }
          })
          n.color = mc.color
        }
      })

      const nodes = Object.values(nodesMap).sort((a,b) => a.order - b.order)
      const links = Object.values(linksMap)

      // console.log("nodes", nodes)
      // console.log("links", links)

      // const depth = maxOrder - order
      const depth = 11
      const spacing = height/(depth + 1)
      const s = sankey()
        .nodeId(d => d.id)
        .nodeWidth(nodeWidth)
        .nodePadding(nodePadding)
        .nodeAlign(sankeyJustify)
        // .nodeAlign(sankeyCenter)
        // .nodeSort((a,b) => b.value - a.value)
        .nodeSort((a,b) => a.dataLayer.name.localeCompare(b.dataLayer.name))
        .extent([[5, 5], [height - 5, width - 5]])
        ({ nodes, links })
      // console.log("sank", s)

      if(shrinkNone) {
        // artificially shrink the None nodes
        s.nodes.forEach(n => {
          if(n.field == "None") {
            n.originalHeight = n.y1 - n.y0 - 10
            n.y0 = n.y1  - 10
          }
        })
        s.links.forEach(l => {
          if(l.source.field == "None") {
            l.y0 = l.source.y1 - 5
            // l.y1 = l.target.y1 - 15
          }
          if(l.target.field == "None") {
            // l.y0 = l.target.y1 - 15
            l.y1 = l.target.y1 - 5
          }
        })

        // rearrange the nodes to spread out and fill the space left by the None node
        // loop through the nodes at each order where there is a none node
        range(4, 15).forEach(order => {
          let none = s.nodes.find(d => d.order == order && d.field == "None")
          if(none) {
            let nodes = s.nodes.filter(d => d.order == order && d.field != "None")
            // console.log("space out", nodes, y0, y1)
            let dy = none.originalHeight/nodes.length
            nodes.forEach((n,i) => {
              n.y0 = n.y0 + i*dy
              n.y1 = n.y1 + i*dy
              s.links.forEach(l => {
                if(l.source == n) {
                  l.y0 = l.y0 + i*dy
                }
                if(l.target == n) {
                  l.y1 = l.y1 + i*dy
                }
              })
            })
          }
        })
      }

      // // figure out which links are also filtered
      // filteredPaths.forEach(path => {
      //   range(4, 14).forEach(o => {
      //     let p = path.path.find(d => d?.order == o)
      //     let np = path.path.find(d => d?.order == o + 1)
      //     let field = p?.field.field || "None"
      //     let nfield = np?.field.field || "None"
      //     let l = s.links.find(l => l.source.order == o && l.source.field == field && l.target.order == o+1 && l.target.field == nfield)
      //     if(l) {
      //       l.highlight = true
      //     }
      //   })
      // })

      nodes.forEach(d => {
        if(!d.children && d.dataLayer.name !== "ZNone") {
          d.strokeWidth = 1
        } else {
          d.strokeWidth = 0
        }
        if(filters[d.order]?.field == d.field) {
          d.strokeWidth = 3
        }
      })

      setSank(s)
    }
  }, [ csns, shrinkNone, width, height, filters])

  const handleNodeFilter = useCallback((node) => {
    console.log("handling filter", node)
    if(node.field == "Layer") return;
    let field = makeField(node.dataLayer, node.field, node.order)
    console.log("field!", field)
    handleFilter(field, node.order)
    // onFilter((oldNodeFilter) => {
    //   if(oldNodeFilter.find(n => n.id == node.id)) {
    //     const filtered = oldNodeFilter.filter(n => n.id != node.id)
    //     console.log("filtering out", filtered)
    //     return [...filtered]
    //   } else {
    //     // check that any of the possible paths go thru the node
    //     const found = filteredPaths.filter(p => p.path.find(d => d?.order == node.order && d?.field?.field == node.field))
    //     console.log("paths", found.length)
    //     if(found.length) { 
    //       return [...oldNodeFilter, node]
    //     } else {
    //       return [node]
    //     }
    //   }
    // })
  }, [])
  const handleHover = useCallback((e, n) => {
    const svg = e.target.ownerSVGElement
    const rect = e.target.getBoundingClientRect();
    const my = e.clientY - rect.y
    const mx = e.clientX - rect.x
    if(n) {
      // const xoff = tipOrientation === "left" ? -5 : width + 5
      const xoff = 5
      tooltipRef.current.show(n, n.dataLayer, rect.x + xoff + mx, rect.y + height/24 + 5)
    }
    // tooltipRef.current.show(tooltipRef.current, csn)
  }, [height])

  const handleLeave = useCallback(() => {
    tooltipRef.current.hide()
  }, [])

  return (
    <div className="path-sankey-container">
      {sank ? <svg className="path-sankey" width={width} height={height} onClick={() => {
        console.log("sankey", sank)
      }}>
        <g className="rotate" 
          // transform={`translate(0, ${width/4})rotate(90, ${width/2}, ${width/2})`}
          transform={`rotate(90, ${width/2}, ${width/2})`}
          >
          {/* <g className="orders">
            {range(4, 15).map((o, i) => {
              let x = sank.nodes.find(d => d.order == o)?.x0
              return <text 
                key={i} 
                x={x} 
                y={10} 
                // fontWeight={o == order ? "bold" : "normal"}
                dy={".35em"}>
                  Order: {o}
                </text>
            })
            }
          </g> */}
          <g className="links">
            {sank.links.map(link => {
              // check if link connects nodes in the csn
              return <path 
                key={link.index} 
                onClick={() => console.log("LINK", link, sankeyLinkPath(link, 0, true))}
                d={sankeyLinkPath(link)}
                fill={link.highlight ? "#aaa" : "#ccc" }
                stroke={"none"}
                // d={useHorizontal ? sankeyLinkHorizontal()(link) : sankeyLinkPath(link)}
                // fill={useHorizontal ? "none" : "#aaa" }
                // stroke={useHorizontal ? "#aaa" : "none"}
                // strokeWidth={useHorizontal ? Math.max(1, link.width) : 0 }
                opacity={link.highlight ? .65: 0.45}
                />
            })}
          </g>
          {/* <g className="highlight-path-hovered">
            {range(4, 14).map((o) => {
              if(!hoveredCsn?.path) return null
              let p = hoveredCsn.path.find(d => d.order == o)
              let np = hoveredCsn.path.find(d => d.order == o+1)
              let field = p ? p.field.field : "None"
              let nfield = np ? np.field.field : "None"
              let l = sank.links.find(l => l.source.order == o && l.source.field == field && l.target.order == o+1 && l.target.field == nfield)
              if(!l) return null
              return <path
                key={l.index}
                d={sankeyLinkHorizontal()(l)}
                strokeWidth="2"
                stroke="#999"
                fill="none"
              ></path>
            })}
          </g> */}
          {/* <g className="highlight-path">
            {range(4, 14).map((o) => {
              let p = csn.path.find(d => d.order == o)
              let np = csn.path.find(d => d.order == o+1)
              let field = p ? p.field.field : "None"
              let nfield = np ? np.field.field : "None"
              let l = sank.links.find(l => l.source.order == o && l.source.field == field && l.target.order == o+1 && l.target.field == nfield)
              if(!l) return null
              return <path
                key={l.index}
                d={sankeyLinkHorizontal()(l)}
                strokeWidth="2"
                stroke="#333"
                fill="none"
              ></path>
            })}
          </g> */}
          <g className="nodes">
            {sank.nodes.map(node => {
              return <rect 
                  key={node.id} 
                  x={node.x0} 
                  y={node.y0} 
                  width={node.x1 - node.x0} 
                  height={node.y1 - node.y0} 
                  fill={ node.color }
                  stroke="black"
                  fillOpacity={node.children ? .5 : .75}
                  strokeWidth={node.strokeWidth}
                  cursor={node.children ? "default" : "pointer"}
                  onClick={() => handleNodeFilter(node)}
                  onMouseMove={(e) => handleHover(e, node)}
                  onMouseLeave={handleLeave}
                  />
            })}
          </g>
          {/* <g className="node-labels">
            {sank.nodes.map(node => {
              return <text
                key={node.id} 
                  x={node.x1 + 10} 
                  // y={node.y0 + (node.y1 - node.y0)/2} 
                  y={node.y0 + 15} 
                  dy={".35em"}
                  fill="#333"
                  // fill={ node.color }
                  // stroke="black"
                  // strokeWidth="1"
                  // paintOrder="stroke"
                  >
                    {node.field} 
                    {node.y1 - node.y0 > 30 ? <tspan dy="1.05em" x={node.x1 + 10}>{node.value} paths</tspan> :null }
                    {node.y1 - node.y0 > 50 ? <tspan dy="1.05em" x={node.x1 + 10}>{node.field == "None" ? "" : `${node.dataLayer.name}`}</tspan> :null }
              </text>
            })}
          </g> */}
        </g>
    </svg> : <svg></svg>}
    <Tooltip ref={tooltipRef} orientation={tipOrientation} contentFn={tooltipContent} enforceBounds={false} />
  </div>)
}
