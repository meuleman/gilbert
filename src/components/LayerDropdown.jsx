const LayerDropdown = ({
  activeLayer,
  LayerConfig,
  order,
  onLayer = () => {},
} = {}) => {
  if(!LayerConfig || !activeLayer) return null;

  const disabledKeys = LayerConfig.layers
    .filter(d => order < d.orders[0] || order > d.orders[1])
    .map(d => d.name);

  const handleChange = (event, val) => {
    const layer = LayerConfig.layers.find((layer) => layer.name === event.target.value)
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
    <select value={tlayer.name} onChange={handleChange}>
      {LayerConfig.layers.map((layer) => (
        <option 
          key={layer.name} 
          disabled={disabledKeys.includes(layer.name)}
        >
          {layer.name}
        </option>
      ))}
    </select>
  );
}

export default LayerDropdown