import { showFloat, showInt, showPosition, showKb } from '../../lib/display';

function tooltipContent(region, layer, orientation) {
  // let field = layer.fieldChoice(region)
  let fields = []
  if(!region.data) {
    // for dehydrated csns we dont have any actual data
    if(region.field) {
      fields.push(region.field)
    }
  } else if(region.data.max_field >= 0) {
    fields.push(layer.fieldChoice(region))
    // fields.push({ field: region.data.max_field, value: region.data.max_value })
  } else if(region.data.bp) {
    fields.push(layer.fieldChoice(region))
  } else {
    fields = Object.keys(region.data).map(key => { 
      let layers = region.layers
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
  let layers = region.layers;
  // figure out fullData, which is an object with layerIndex,fieldIndex for each key
  // console.log("FULL DATA", region, region.layers, region.fullData)
  let fullData = region.layers && region.fullData ? Object.keys(region.fullData).map(key => {
    let [layerIndex, fieldIndex] = key.split(",")
    let layer = layers[+layerIndex]
    let field = layer.fieldColor.domain()[+fieldIndex]
    let count = (region.counts && (layerIndex in region.counts)) ? region.counts[layerIndex][fieldIndex] : null
    return { layer, field, value: region.fullData[key], count }
  }).filter(d => fields.find(f => f.field !== d.field && layer.name !== d.layer.name))
  : []


  
  return (
    <div style={{display: 'flex', flexDirection: 'column'}}>
      <span>{showPosition(region)}</span>
      <span className="position">[{showKb(Math.pow(4, 14 - region.order))}]</span>
      {/* <span className="position">Order: {region.order}</span> */}
      <span style={{borderBottom: "1px solid gray", padding: "4px", margin: "4px 0"}}>{layer?.name || "-"}</span>
      {fields.map((f,i) => (
        <div key={i} style={{display: 'flex', flexDirection: 'row', justifyContent: 'space-between'}}>
          <span>
            <span style={{color: layer.fieldColor(f.field), marginRight: '4px'}}>⏺</span>
            {f.field} 
          </span>
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
          <span>
            <span style={{color: f.layer.fieldColor(f.field), marginRight: '4px'}}>⏺</span>
            {f.field} 
          </span>
          <span>{f.layer.name}</span>
          <span>
            {typeof f.value == "number" ? showFloat(f.value) : f.value}
            {typeof f.count == "number" && ` (${showInt(f.count)})`}
          </span>
        </div>
      ))}
      <span style={{borderTop: "1px solid gray", marginTop: "4px"}}>
        Path score: {showFloat(region.score)}</span>
    </div>

  )
}

export {
  tooltipContent
}