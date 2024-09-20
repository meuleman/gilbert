import React, { useContext } from 'react';
import { Tooltip } from 'react-tooltip';
import RegionsContext from './Regions/RegionsContext'
import './LeftToolbar.css'; // Assuming you have a CSS file for styling

const LeftToolbar = ({
  showLayerLegend,
  onLayerLegend = () => {},
  showSpectrum,
  onSpectrum = () => {},
  showTopFactors,
  onTopFactors = () => {},
  showManageRegionSets,
  onManageRegionSets = () => {},
  showActiveRegionSet,
  onActiveRegionSet = () => {},
} = {}) => {
  const { activeSet, activeGenesetEnrichment, activePaths } = useContext(RegionsContext)

  return (
    <div className="left-toolbar">
      <div className="top-group">
        <button className={`toolbar-button ${showManageRegionSets ? 'active' : ''}`} data-tooltip-id="region-sets"
          onClick={() => {
            if(!showManageRegionSets) onActiveRegionSet(false)
            onManageRegionSets(!showManageRegionSets)
          }}
        >📚</button>
        <Tooltip id="region-sets">Manage Region Sets</Tooltip>
        <button className={`toolbar-button ${showActiveRegionSet ? 'active' : ''}`} data-tooltip-id="active-region-set"
          disabled={!activeSet}
          onClick={() => {
            if(!showActiveRegionSet) onManageRegionSets(false)
            onActiveRegionSet(!showActiveRegionSet)
          }}
        >📘</button>
        <Tooltip id="active-region-set">Active Region Set</Tooltip>

        <button className={`toolbar-button ${showTopFactors ? 'active' : ''}`} data-tooltip-id="show-topfactors"
          onClick={() => activePaths?.length && onTopFactors(!showTopFactors)}
          disabled={!activePaths?.length}
          style={{
            'filter': showTopFactors ? 'grayscale(100%)' : 'none',
            'transform': 'rotate(90deg) scaleX(-1)'
          }}
        >📊</button>
        <Tooltip id="show-topfactors">{showTopFactors ? "Hide Top Factors" : "Show Top Factors"}</Tooltip>

      </div>

      <div className="bottom-group">
        <button className={`toolbar-button ${showSpectrum ? 'active' : ''}`} data-tooltip-id="show-spectrum"
          onClick={() => activeGenesetEnrichment?.length && onSpectrum(!showSpectrum)}
          disabled={!activeGenesetEnrichment?.length}
          style={{'filter': showSpectrum ? 'grayscale(100%)' : 'none'}}
        >🌈</button>
        <Tooltip id="show-spectrum">{showSpectrum ? "Hide Geneset Enrichment Spectrum" : activeGenesetEnrichment?.length ? "Show Geneset Enrichment Spectrum": "No Geneset Enrichments Found"}</Tooltip>
        <button className={`toolbar-button ${showLayerLegend ? 'active' : ''}`} data-tooltip-id="show-layer-legend"
          onClick={() => onLayerLegend(!showLayerLegend)}
          style={{'filter': showLayerLegend ? 'grayscale(100%)' : 'none'}}
        >💠</button>
        <Tooltip id="show-layer-legend">{showLayerLegend ? "Hide Layer Legend" : "Show Layer Legend"}</Tooltip>
      </div>
    </div>
  );
};

export default LeftToolbar;
