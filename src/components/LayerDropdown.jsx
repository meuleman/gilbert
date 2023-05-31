const LayerDropdown = ({
  activeLayer,
  LayerConfig,
  order,
  onLayer = () => {},
} = {}) => {
  if(!LayerConfig || !activeLayer) return null;

  const disabledKeys = [];

  const handleChange = (event, val) => {
    const layer = LayerConfig.layers.find((layer) => layer.name === event.target.value)
    onLayer(layer)
  }

  return (
    <select onChange={handleChange}>
      {LayerConfig.layers.map((layer) => (
        <option 
          key={layer.name} 
          value={layer.name} 
          defaultValue={activeLayer.name}
          disabled={disabledKeys.includes(layer.name)}
        >
          {layer.name}
        </option>
      ))}
    </select>
  );
}

export default LayerDropdown