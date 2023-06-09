const LayerDropdown = ({
  activeLayer,
  layers = [],
  order,
  onLayer = () => {},
} = {}) => {
  if(!layers || !activeLayer) return null;

  const disabledKeys = layers
    .filter(d => order < d.orders[0] || order > d.orders[1])
    .map(d => d.name);

  const handleChange = (event) => {
    const layer = layers.find((layer) => layer.name === event.target.value)
    onLayer(layer)
  }

  let tlayer = activeLayer
  // if(disabledKeys.indexOf(activeLayer.name) > -1) {
  //   let nextActiveLayer = LayerConfig.layers.filter(d => disabledKeys.indexOf(d.name) === -1)[0]
  //   console.log("nextActiveLayer", nextActiveLayer, activeLayer, disabledKeys)
  //   tlayer = nextActiveLayer
  //   setTimeout(() => onLayer(nextActiveLayer), 1)
  // }


  return (
    <>
    <select value={tlayer.name} onChange={handleChange}>
      {layers.map((layer) => (
        <option 
          key={layer.name} 
          value={layer.name}
          disabled={disabledKeys.includes(layer.name)}
        >
          {layer.name} ({layer.orders[0]}-{layer.orders[1]})
        </option>
      ))}
    </select>
    <span className="warning" style={{color: "red"}}>
    {disabledKeys.includes(tlayer.name) && "⚠️ Layer out bounds"}
    </span>
    </>
  );
}

export default LayerDropdown