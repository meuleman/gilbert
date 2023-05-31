// A component to display some information below the map when hovering over hilbert cells

const HoverBar = ({
  hover = null,
  layer
} = {}) => {
  let sample = null
  if(layer && hover && hover.data)
    sample = layer.fieldChoice(hover.data)

  return (
    <div className="hover-bar">
      {hover && (
        <div>
          {hover.chromosome}:{hover.start} (hilbert index: {hover.i})
          <span className="hover-bar-data">
            {sample && sample.field}: {sample && sample.value}
          </span>
        </div>
      )}
    </div>
  )
}
export default HoverBar