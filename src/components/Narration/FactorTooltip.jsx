import { showFloat, showInt, showPosition, showKb } from '../../lib/display';
import { csnLayerList, fullDataLayers } from '../../layers';
import './FactorTooltip.css';

function tooltipContent(region, layer, orientation) {
  // Preferred factor(s)
  let fields = [];
  if (!region.data) {
    if (region.field) {
      // Prefer the region.field from the region, and set the count.
      fields.push(region.field);
      const regionLayer = region.layer;
      const layerIndex = csnLayerList.findIndex(l => l.datasetName === regionLayer.datasetName);
      const count = region.counts && region.counts[layerIndex]?.length
        ? region.counts[layerIndex][region.field.index]
        : null;
      region.field.count = count;
    }
  } else if (region.data.max_field >= 0 || region.data.bp) {
    fields.push(layer.fieldChoice(region));
  } else {
    fields = Object.keys(region.data)
      .map(key => {
        let factorCount = null;
        if (region.counts) {
          const currentLayer = csnLayerList[region.layerInd];
          const factors = currentLayer.fieldColor.domain();
          const factorIndex = factors.indexOf(key);
          factorCount = region.counts[region.layerInd][factorIndex];
        }
        return { field: key, value: region.data[key], count: factorCount };
      })
      .sort((a, b) => b.value - a.value)
      .filter(d => d.value > 0 && d.field !== "top_fields");
  }

  // Full data factors
  const fullData = region.fullData
    ? Object.keys(region.fullData)
        .map(key => {
          const [layerIndex, fieldIndex] = key.split(",").map(Number);
          const fullLayer = fullDataLayers[layerIndex];
          const field = fullLayer.fieldColor.domain()[fieldIndex];
          const count =
            region.counts && region.counts[layerIndex]?.length
              ? region.counts[layerIndex][fieldIndex]
              : null;
          return { layer: fullLayer, field, value: region.fullData[key], count };
        })
        .sort((a, b) => b.value - a.value)
    : [];

  // Remove from fullData any factor already in fields
  const filteredFullData = (fields.length > 0 && layer)
    ? fullData.filter(d => !fields.find(f => f.field === d.field && layer.name === d.layer.name))
    : fullData;

  const GWAS = region.GWAS && Array.isArray(region.GWAS)
    ? region.GWAS.filter(d => (fields.length && layer) ? !fields.find(f => f.field === d.trait && layer.name === d.layer.name) : true)
    : [];
  
  const combinedFactors = filteredFullData.concat(GWAS.slice(0, 10));
  const otherFactors = combinedFactors
    .map(d => ({
      field: d.field || d.trait,
      value: d.value || d.score,
      count: d.count,
      layer: d.layer
    }))
    .sort((a, b) => b.value - a.value);

  // If no preferred or secondary factor, return null
  if (fields.length === 0 && otherFactors.length === 0) {
    return null;
  }

  // Styles
  const separatorStyle = {
    borderTop: '1px solid gray',
    padding: '0px',
    margin: '0 0',
    fontStyle: 'italic',
    fontSize: '11pt'
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column' }}>
      <span>{showPosition(region)}</span>
      {/* Render separator only if there is any factor */}
      {(fields.length > 0 || otherFactors.length > 0) && <span style={separatorStyle}></span>}
      {fields.map((f, i) => (
        <div
          key={i}
          style={{ display: 'flex', flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}
        >
          <span className="tooltip-factor-name" style={{ display: 'flex', alignItems: 'center', fontWeight: 'bold' }}>
            <span style={{ color: layer.fieldColor(f.field), marginRight: '4px' }}>⏺</span>
            {f.field}
          </span>
          <span className="tooltip-layer-name" style={{ flex: 1, textAlign: 'left', paddingLeft: '10px' }}>
            {layer?.name}
          </span>
          <span style={{ fontWeight: 'bold' }}>
            {typeof f.value === 'number' ? showFloat(f.value) : f.value}
            {typeof f.count === 'number' && ` (${showInt(f.count)})`}
          </span>
        </div>
      ))}
      {fields.length === 0 && (
        <div style={{ display: 'flex', flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
          <span>-</span>
          <span>-</span>
        </div>
      )}
      {otherFactors.length > 0 && (
        <>
          <span style={separatorStyle}>Secondary factors</span>
          {otherFactors.map((f, i) => (
            <div
              key={i}
              style={{ display: 'flex', flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}
            >
              <span className="tooltip-factor-name" style={{ display: 'flex', alignItems: 'center' }}>
                <span style={{ color: f.layer.fieldColor(f.field), marginRight: '4px' }}>⏺</span>
                {f.field}
              </span>
              <span className="tooltip-layer-name" style={{ flex: 1, textAlign: 'left', paddingLeft: '10px' }}>
                {f.layer.name}
              </span>
              <span>
                {typeof f.value === 'number' ? showFloat(f.value) : f.value}
                {typeof f.count === 'number' && ` (${showInt(f.count)})`}
              </span>
            </div>
          ))}
        </>
      )}
    </div>
  );
}

export { tooltipContent };