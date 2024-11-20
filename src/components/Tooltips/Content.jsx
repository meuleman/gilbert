
import { showPosition, showFloat} from '../../lib/display'

export function defaultContent(region, layer, orientation) {
  // let field = layer.fieldChoice(region)
  let fields = []
  if(!region?.data) return 
  if(region.data.max_field >= 0 && region.data.max_value >= 0) {
    fields.push(layer.fieldChoice(region))
    // fields.push({ field: region.data.max_field, value: region.data.max_value })
  } else if(region.data.bp) {
    fields.push(layer.fieldChoice(region))
  } else {
    fields = Object.keys(region.data).map(key => ({ field: key, value: region.data[key] }))
  }
  fields = fields.sort((a,b) => a.value - b.value)
    .filter(d => !!d.value && d.value > 0)
  if(orientation == "bottom") {
    fields = fields.reverse()
  }

  return (
    <div style={{display: 'flex', flexDirection: 'column'}}>
      <div style={{border: "1px solid lightgray", borderRadius: "4px", padding: "4px", marginBottom: "4px"}}>
        {orientation == "bottom" ? <div>
          {showPosition(region)}
          <br/>

          {region.genes?.length ? <div>
            {region.genes.map(g => (
              <div key={g.hgnc}>{g.hgnc} ({g.posneg})</div>
            ))}
          </div> : null}

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
        {!fields?.length ? <span>N/A</span> : null}

        {orientation !== "bottom" ? <div>
          <span style={{borderTop: "1px solid gray", padding: "4px", margin: "4px 0"}}>{layer.name}</span>
          <br/>
          {region.genes?.length ? <div>
            {region.genes.map(g => (
              <div key={g.hgnc}>{g.hgnc} ({g.posneg})</div>
            ))}
          </div> : null}
        </div> : null}
      </div>

      {region.actives ? <div style={{border: "1px solid lightgray", borderRadius: "4px", padding: "4px"}}>
        <span>{region.actives.length} active regions</span>
        {region.actives.map(a => (
          <div key={a.chromosome + ":" + a.start}>{showPosition(a)} - {showFloat(a.score)}</div>
        ))}
      </div> : null}

      {orientation !== "bottom" ? <div>
        {showPosition(region)}
      </div> : null}
    </div>
  )
}