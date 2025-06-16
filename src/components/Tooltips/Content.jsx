import { showPosition, showFloat} from '../../lib/display'

export function defaultContent(region, layer, orientation, showCoordinates=true, showLayerName=true) {
  let fields = []
  if(!region?.data) return 
  if(region.data.max_field >= 0 && region.data.max_value >= 0) {
    fields.push(layer?.fieldChoice(region))
  } else if(region.data.bp) {
    fields.push(layer?.fieldChoice(region))
  } else {
    fields = Object.keys(region.data).map(key => ({ field: key, value: region.data[key] }))
  }
  fields = fields.sort((a,b) => a.value - b.value)
    .filter(d => !!d.value && d.value > 0)
  if(orientation == "bottom") {
    fields = fields.reverse()
  }

  if(!fields.length && !region.genes?.length && !region.actives && !showCoordinates && !showLayerName) {
    return null
  }

  return (
    <div className="flex flex-col">
      {region.genes?.length || fields?.length || (showCoordinates && orientation == "bottom") ? 
      <div className={`p-1 mb-1 ${region.genes?.length || fields?.length ? "border border-gray-200 rounded" : null}`}>
        {orientation == "bottom" ? <div>
          {showCoordinates ? showPosition(region) : null}

          {region.genes?.length ? 
            <div className='border-b border-gray-400'>
              {region.genes.map(g => (
                <div key={g.hgnc}>{g.hgnc} ({g.posneg})</div>
              ))}
            </div> : 
            null
          }
        </div> : null}

        {showLayerName && fields?.length ? <span className="border-b border-gray-400 block w-full">{layer?.labelName || layer?.name}</span> : null}
        {fields?.length ? 
          <div className="py-1">
            {fields.map((f,i) => (
              <div key={i} className="flex flex-row justify-between gap-4">
                <span>
                  <span className="mr-1" style={{color: layer?.fieldColor(f.field)}}>⏺</span>
                  {f.field} 
                </span>
                <span>
                  {typeof f.value == "number" ? showFloat(f.value) : f.value}
                </span>
              </div>
            ))}
          </div> : null
        }

        {orientation !== "bottom" ? <div>
          {
            region.genes?.length ? 
            <div className={fields?.length ? "border-t border-gray-400 pt-1" : null}>
              {region.genes.map(g => (
                <div key={g.hgnc}>{g.hgnc} ({g.posneg})</div>
              ))}
            </div> : 
            null
          }
        </div> : null}
      </div> : null}

      {region.actives ? <div className="border border-gray-200 rounded p-1">
        <span>{region.actives.length} active regions</span>
        {region.actives.map(a => (
          <div key={a.chromosome + ":" + a.start}>{showPosition(a)} - {showFloat(a.score)}</div>
        ))}
      </div> : null}

      {orientation !== "bottom" && showCoordinates ? <div>
        {showPosition(region)}
      </div> : null}
    </div>
  )
}