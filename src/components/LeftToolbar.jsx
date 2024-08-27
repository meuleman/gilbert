import React, { useContext } from 'react';
import { Tooltip } from 'react-tooltip';
import RegionsContext from './Regions/RegionsContext'
import './LeftToolbar.css'; // Assuming you have a CSS file for styling

const LeftToolbar = ({
  showLayerLegend,
  onLayerLegend = () => {},
  showManageRegionSets,
  onManageRegionSets = () => {},
  showActiveRegionSet,
  onActiveRegionSet = () => {},
} = {}) => {
  const { sets, activeSet, saveSet, deleteSet, setActiveSet } = useContext(RegionsContext)

  return (
    <div className="left-toolbar">
      <div className="top-group">
        <button className="toolbar-button" data-tooltip-id="region-sets"
          onClick={() => {
            if(!showManageRegionSets) onActiveRegionSet(false)
            onManageRegionSets(!showManageRegionSets)
          }}
        >📚</button>
        <Tooltip id="region-sets">Manage Region Sets</Tooltip>
        <button className="toolbar-button" data-tooltip-id="active-region-set"
          disabled={!activeSet}
          onClick={() => {
            if(!showActiveRegionSet) onManageRegionSets(false)
            onActiveRegionSet(!showActiveRegionSet)
          }}
        >📘</button>
        <Tooltip id="active-region-set">Active Region Set</Tooltip>
      </div>
      <div className="bottom-group">
        <button className="toolbar-button" data-tooltip-id="show-layer-legend"
          onClick={() => onLayerLegend(!showLayerLegend)}
          style={{'filter': showLayerLegend ? 'grayscale(100%)' : 'none'}}
        >💠</button>
        <Tooltip id="show-layer-legend">{showLayerLegend ? "Hide Layer Legend" : "Show Layer Legend"}</Tooltip>
      </div>
    </div>
  );
};

export default LeftToolbar;
