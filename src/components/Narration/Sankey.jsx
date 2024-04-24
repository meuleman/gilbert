import { useEffect, useState, useCallback } from 'react'
import { sankey, sankeyJustify, sankeyCenter, sankeyLinkHorizontal } from 'd3-sankey';
import { range } from 'd3-array';
import { path as d3path } from 'd3-path';

import { walkTree } from '../../lib/csn';

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

import PropTypes from 'prop-types';

CSNSankey.propTypes = {
  width: PropTypes.number.isRequired,
  height: PropTypes.number.isRequired,
  paths: PropTypes.array.isRequired,
  filteredPaths: PropTypes.array.isRequired,
  order: PropTypes.number.isRequired,
  tree: PropTypes.array,
  csn: PropTypes.object,
  csnThreshold: PropTypes.number,
  shrinkNone: PropTypes.bool,
  filter: PropTypes.array,
  onFilter: PropTypes.func
};


export default function CSNSankey({
  width,
  height,
  paths,
  filteredPaths, // really only use this to check validity of filter logic
  tree,
  order,
  csn,
  hoveredCsn = {},
  csnThreshold = 0,
  shrinkNone = true,
  filter = [],
  onFilter=() => {},
}) {

  const [sank, setSank] = useState(null)
  const [maxOrder, setMaxOrder] = useState(0)

  useEffect(() => {
    if(paths.length && tree) {
      // walk the tree for each path
      const trunks = paths.map(p => {
        return { trunk: walkTree(tree, p.node, []), score: p.score, path: p.path.filter(d => !!d).sort((a, b) => a.order - b.order) }
      })
      // console.log("trunks", trunks)

      // the trunk array are the nodes of the tree starting at order + 1 and going till maxOrder
      // the paths array contains the factor from order 4 to maxOrder unless the path is shorter
      // we want nodes that have the order and factor as the id and link to other nodes via the trunk indices
      const baseOrder = order + 1
      const firstPath = paths[0].path || [] // TODO this should never be empty
      const maxOrder = Math.max(...firstPath.filter(d => !!d).map(d => d?.order))
      setMaxOrder(maxOrder)

      const linkId = (a,b) => `${a.id}=>${b.id}`
      let nodesMap = {}
      let linksMap = {}
      trunks.forEach(t => {
        let ns = t.trunk.map((b,i) => {
          // get the corresponding path element for this trunk node based on the order
          let p = t.path.find(d => d.order == baseOrder + i)
          // if no path, lets still place an empty node, these will acumulate
          if(!p || p.field.value < csnThreshold) {
            p = { order: baseOrder + i, layer: { name: "ZNone" }, field: { field: "None", value: 0, color: "lightgray" } }
          }
          let node = {
            id: `${p.order}-${p.field.field}`,
            // do we include "b" which is essentially the region id within the order?
            // id: `${b}-${p.order}-${p.field.field}`,
            node: b,
            order: p.order,
            dataLayer: p.layer,
            field: p.field.field,
            color: p.field.color,
            values: [p.field.value],
            fieldValue: p.field.value
          }
          if(nodesMap[node.id]) {
            // lets save the field just in case
            nodesMap[node.id].values.push(p.field.value)
          } else {
            nodesMap[node.id] = node
          }
          return node
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
        return ns
      })


      const filtered = paths[0].path.filter(d => !!d).sort((a,b) => a.order - b.order)
      // manually add nodes and links for the orders above and including the region
      range(order, 3, -1).forEach(order => {
        // we use the currently selected CSN path, since all paths will have the higher order objects we need
        let factor = filtered.find(d => d.order == order)
        if(!factor) {
          // console.log("uh oh", order, filtered)
          factor = { order: order, layer: { name: "ZNone" }, field: { field: "None", value: 0, color: "lightgray" } }
          // return
        }
        let n = {
          id: `${order}-${factor.field.field}`,
          order: order,
          dataLayer: { name: factor.layer.name },
          field: factor.field.field,
          color: factor.field.color,
          values: [factor.field.value],
          fieldValue: factor.field.value
        }
        nodesMap[n.id] = n
        // find all the nodes in the next higher order
        // let tolinkNodes = Object.values(nodesMap).filter(d => d.order == order+1)
        let tolink = Object.values(linksMap).filter(d => nodesMap[d.source].order == order+1)
        // count up the number of each source
        let counts = {}
        tolink.forEach(t => {
          if(counts[t.source]) {
            counts[t.source] += t.value
          } else {
            counts[t.source] = t.value
          }
        })
        Object.keys(counts).forEach(t => {
          linksMap[linkId(n,{id:t})] = {
            source: n.id,
            target: t,
            value: counts[t]
          }
        })
      })
      // check if order 13 and 14 are present. if no nodes for those orders we make them
      range(13, 15).forEach(order => {
        let hasOrder = Object.values(nodesMap).filter(d => d.order == order)
        if(hasOrder.length) return;
        // we use the currently selected CSN path, since all paths will have the higher order objects we need
        let n = {
          id: `${order}-None`,
          order: order,
          dataLayer: { name: "ZNone" }, 
          field: "None",
          color: "lightgray",
          values: [0],
          fieldValue: 0
        }
        nodesMap[n.id] = n
        // find all the nodes in the next higher order
        // let tolinkNodes = Object.values(nodesMap).filter(d => d.order == order+1)
        let tolink = Object.values(linksMap).filter(d => nodesMap[d.target].order == order-1)
        // count up the number of each source
        let counts = {}
        tolink.forEach(t => {
          if(counts[t.target]) {
            counts[t.target] += t.value
          } else {
            counts[t.target] = t.value
          }
        })
        Object.keys(counts).forEach(t => {
          linksMap[linkId({id:t},n)] = {
            target: n.id,
            source: t,
            value: counts[t]
          }
        })
      })

      const nodes = Object.values(nodesMap).sort((a,b) => a.order - b.order)
      const links = Object.values(linksMap)

      // console.log("nodes", nodes)
      // console.log("links", links)

      // const depth = maxOrder - order
      const depth = 15 - 4
      const spacing = width/(depth + 1)
      const sankeyWidth = width - spacing*2
      const s = sankey()
        .nodeId(d => d.id)
        .nodeWidth(15)
        .nodePadding(5)
        .nodeAlign(sankeyJustify)
        // .nodeAlign(sankeyCenter)
        // .nodeSort((a,b) => b.value - a.value)
        .nodeSort((a,b) => a.dataLayer.name.localeCompare(b.dataLayer.name))
        .extent([[0, 20], [sankeyWidth, height - 20]])
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


      // figure out which links are also filtered
      filteredPaths.forEach(path => {
        range(4, 14).forEach(o => {
          let p = path.path.find(d => d?.order == o)
          let np = path.path.find(d => d?.order == o + 1)
          let field = p?.field.field || "None"
          let nfield = np?.field.field || "None"
          let l = s.links.find(l => l.source.order == o && l.source.field == field && l.target.order == o+1 && l.target.field == nfield)
          if(l) {
            l.highlight = true
          }
        })
      })

      setSank(s)
    }
  }, [ paths, tree, order, csnThreshold, shrinkNone, width, height])

  const handleNodeFilter = useCallback((node) => {
    console.log("handling filter", node)
    onFilter((oldNodeFilter) => {
      if(oldNodeFilter.find(n => n.id == node.id)) {
        const filtered = oldNodeFilter.filter(n => n.id != node.id)
        console.log("filtering out", filtered)
        return [...filtered]
      } else {
        // check that any of the possible paths go thru the node
        const found = filteredPaths.filter(p => p.path.find(d => d?.order == node.order && d?.field?.field == node.field))
        console.log("paths", found.length)
        if(found.length) { 
          return [...oldNodeFilter, node]
        } else {
          return [node]
        }
      }
    })
  }, [onFilter, filteredPaths])


  return (
    <div className="path-sankey-container">
      {sank ? <svg className="path-sankey" width={width - 10} height={height} onClick={() => {
        console.log("sankey", sank)
      }}>
      <g className="orders">
        {range(4, 15).map((o, i) => {
          let x = sank.nodes.find(d => d.order == o)?.x0
          return <text 
            key={i} 
            x={x} 
            y={10} 
            fontWeight={o == order ? "bold" : "normal"}
            dy={".35em"}>
              Order: {o}
            </text>
        })
        }
      </g>
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
      <g className="highlight-path-hovered">
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
      </g>
      <g className="highlight-path">
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
      </g>
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
              fillOpacity="0.75"
              strokeWidth={filter.find(d => d.id == node.id) ? 2 : 1 }
              onClick={() => handleNodeFilter(node)}
              />
        })}
      </g>
      <g className="node-labels">
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
      </g>
    </svg> : <svg></svg>}
  </div>)
}
