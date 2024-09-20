import { showFloat, showInt, showPosition, showKb } from '../../lib/display';
import { csnLayerList } from '../../layers'
import './FactorTooltip.css'

import { csnLayerList as layers } from '../../layers'

function tooltipContent(region, layer, orientation) {
  // let field = layer.fieldChoice(region)
  let fields = []
  if(!region.data) {
    // for dehydrated csns we dont have any actual data
    if(region.field) {
      fields.push(region.field)
      let layer = region.layer
      let layerIndex = csnLayerList.findIndex(l => l.datasetName == layer.datasetName)
      let count = (region.counts && (region.counts[layerIndex]?.length)) ? region.counts[layerIndex][region.field.index] : null 
      // console.log("COUNT IN FIELD", count, layerIndex, region)
      region.field.count = count
    }
  } else if(region.data.max_field >= 0) {
    fields.push(layer.fieldChoice(region))
    // fields.push({ field: region.data.max_field, value: region.data.max_value })
  } else if(region.data.bp) {
    fields.push(layer.fieldChoice(region))
  } else {
    fields = Object.keys(region.data).map(key => { 
      // let layers = region.layers
      let factorCount = null
      if(layers && region['counts']) {
        let layer = layers[region['layerInd']]
        let factors = layer.fieldColor.domain()
        let factorIndex = factors.indexOf(key)
        factorCount = region['counts'][region['layerInd']][factorIndex]
      }
      return { field: key, value: region.data[key], count: factorCount}
    })
      .sort((a,b) => b.value - a.value)
      .filter(d => d.value > 0 && d.field !== "top_fields")
  }
  // console.log("TOOLTIP FIELDS", fields, region)
  // let layers = region.layers;
  // figure out fullData, which is an object with layerIndex,fieldIndex for each key
  // console.log("FULL DATA", region, region.fullData)
  let fullData = region.fullData ? Object.keys(region.fullData).map(key => {
    let [layerIndex, fieldIndex] = key.split(",")
    let layer = layers[+layerIndex]
    let field = layer.fieldColor.domain()[+fieldIndex]
    let count = (region.counts && (region.counts[layerIndex]?.length)) ? region.counts[layerIndex][fieldIndex] : null
    return { layer, field, value: region.fullData[key], count }
  // sort by score
  }).sort((a,b) => b.value - a.value)
  : []
  // remove the preferred factor
  fullData = (fields && layer) ? fullData.filter(
    d => fields.find(f => !(f.field === d.field && layer.name === d.layer.name))
  ) : fullData


  
  return (
    <div style={{display: 'flex', flexDirection: 'column'}}>
      <span>{showPosition(region)}</span>
      {/* <span className="position">[{showKb(Math.pow(4, 14 - region.order))}]</span> */}
      {/* <span className="position">Order: {region.order}</span> */}
      <span style={{borderBottom: "1px solid gray", padding: "4px", margin: "4px 0"}}>
        {/* {layer?.name || "-"} */}
        Preferred factor
      </span>
      {fields.map((f,i) => (
        <div key={i} style={{display: 'flex', flexDirection: 'row', justifyContent: 'space-between'}}>
          <span className="tooltip-factor-name">
            <span style={{color: layer.fieldColor(f.field), marginRight: '4px'}}>⏺</span>
            {f.field} 
          </span>
          <span className="tooltip-layer-name">{layer?.name}</span>
          <span>
            {typeof f.value == "number" ? showFloat(f.value) : f.value}
            {typeof f.count == "number" && ` (${showInt(f.count)})`}
          </span>
        </div>
      ))}
      {fields.length == 0 ? <div style={{display: 'flex', flexDirection: 'row', justifyContent: 'space-between'}}>
          <span>
            <span style={{marginRight: '4px'}}></span>
             -
          </span>
          <span>
            -
          </span>
        </div> : null}
      {fullData.length ? <span style={{borderBottom: "1px solid gray", padding: "4px", margin: "4px 0"}}>Other factors</span> : null}
      {fullData.map((f,i) => (
        <div key={i} style={{display: 'flex', flexDirection: 'row', justifyContent: 'space-between'}}>
          <span className="tooltip-factor-name"  >
            <span style={{color: f.layer.fieldColor(f.field), marginRight: '4px'}}>⏺</span>
            {f.field} 
          </span>
          <span className="tooltip-layer-name">{f.layer.name}</span>
          <span>
            {typeof f.value == "number" ? showFloat(f.value) : f.value}
            {typeof f.count == "number" && ` (${showInt(f.count)})`}
          </span>
        </div>
      ))}
      { /*
      <span style={{borderTop: "1px solid gray", marginTop: "4px"}}>
        Path score: {showFloat(region.score)}</span>
      */ }
    </div>

  )
}

export {
  tooltipContent
}