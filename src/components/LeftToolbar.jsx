import React, { useContext } from 'react';
import { Tooltip } from 'react-tooltip';
import RegionsContext from './Regions/RegionsContext'
import './LeftToolbar.css'; // Assuming you have a CSS file for styling
import Loading from './Loading';
import DetailsIcon from "@/assets/details.svg?react";
import FiltersIcon from "@/assets/filters.svg?react";

const LeftToolbar = ({
  content = {},
  showLayerLegend,
  onLayerLegend = () => {},
  showSpectrum,
  onSpectrum = () => {},
  loadingSpectrum = false,
  showSummary,
  onSummary = () => {},
  showManageRegionSets,
  onManageRegionSets = () => {},
  showActiveRegionSet,
  onActiveRegionSet = () => {},
  showSankey,
  onSankey = () => {},
} = {}) => {
  const { activeSet, activeGenesetEnrichment, activePaths, topNarrations } = useContext(RegionsContext)

  return (
    <div className="h-full w-auto max-w-[26.9375rem] max-h-full flex flex-row overflow-hidden border-r-1 border-r-separator">
      <div className="flex-1 flex min-h-0">
        <div className="grow-0 shrink-0 w-[2.4375rem] flex justify-center p-1.5">
          <div className="w-full h-full bg-separator rounded">
            <button 
              className={`w-full aspect-square rounded flex items-center justify-center ${showActiveRegionSet && 'bg-primary'}`}
              disabled={!activeSet}
              onClick={() => {
                if(!showActiveRegionSet) {
                  onSummary(false)
                }
                onActiveRegionSet(!showActiveRegionSet)
              }}
            >
              <DetailsIcon className={showActiveRegionSet && "[&_path]:fill-primary-foreground"} />
            </button>
            <button 
              className={`w-full aspect-square rounded flex items-center justify-center ${showSummary && 'bg-primary'}`}
              disabled={!topNarrations?.length}
              onClick={() => {
                if(!showSummary) {
                  onActiveRegionSet(false)
                }
                topNarrations?.length && onSummary(!showSummary)
              }}
            >
              <FiltersIcon className={showSummary && "[&_path]:fill-primary-foreground"} />
            </button>
          </div>
        </div>
        <div className="grow flex overflow-auto">
          {showActiveRegionSet && content.activeRegionSetModal}
          {showSummary && content.regionSetSummary}
        </div>
      </div>
    </div>
  )

  return (
    <div className="left-toolbar">
      <div className="top-group">
        <button className={`toolbar-button ${showManageRegionSets ? 'active' : ''}`} data-tooltip-id="region-sets"
          onClick={() => {
            if(!showManageRegionSets) {
              onActiveRegionSet(false)
              onSummary(false)
            }
            onManageRegionSets(!showManageRegionSets)
          }}
        >📚</button>
        <Tooltip id="region-sets">Manage Region Sets</Tooltip>
        <button className={`toolbar-button ${showActiveRegionSet ? 'active' : ''}`} data-tooltip-id="active-region-set"
          disabled={!activeSet}
          onClick={() => {
            if(!showActiveRegionSet) {
              onManageRegionSets(false)
              onSummary(false)
            }
            onActiveRegionSet(!showActiveRegionSet)
          }}
          style={{
            'filter': !activeSet ? 'grayscale(100%)' : 'none',
          }}
        >📘</button>
        <Tooltip id="active-region-set">Active Region Set</Tooltip>

        <button className={`toolbar-button ${showSummary ? 'active' : ''}`} data-tooltip-id="show-summary"
          onClick={() => {
            topNarrations?.length && onSummary(!showSummary)
            if(!showSummary) {
              onSankey(false)
              onManageRegionSets(false)
              onActiveRegionSet(false)
            }
          }}
          disabled={!topNarrations?.length}
          style={{
            'filter': !topNarrations?.length ? 'grayscale(100%)' : 'none',
            'transform': 'rotate(90deg) scaleX(-1)'
          }}
        >📊</button>
        <Tooltip id="show-summary">{showSummary ? "Hide Region Set Summary" : "Show Region Set Summary"}</Tooltip>

        <button className={`toolbar-button ${showSankey ? 'active' : ''}`} data-tooltip-id="show-sankey"
          onClick={() => {
            activePaths?.length && onSankey(!showSankey)
            if(!showSankey) onSummary(false)
          }}
          disabled={!activePaths?.length}
          style={{
            'filter': showSankey || !activePaths?.length ? 'grayscale(100%)' : 'none',
          }}
        >🌊</button>
        <Tooltip id="show-sankey">{showSankey ? "Hide Sankey" : "Show Sankey"}</Tooltip>

      </div>

      <div className="bottom-group">
        <button className={`toolbar-button ${showSpectrum ? 'active' : ''}`} data-tooltip-id="show-spectrum"
          // onClick={() => activeGenesetEnrichment?.length && onSpectrum(!showSpectrum)}
          onClick={() => onSpectrum(!showSpectrum)}
          // disabled={!activeGenesetEnrichment?.length}
          style={{'filter': showSpectrum ? 'grayscale(100%)' : 'none'}}
        >
            {loadingSpectrum ? 
            <Loading text=""/>
            : '🌈'}
        </button>
        
        <Tooltip id="show-spectrum">
          {loadingSpectrum ? "Loading Geneset Enrichments..."
            : showSpectrum ? "Hide Geneset Enrichment Spectrum" 
            : activeGenesetEnrichment?.length ? "Show Geneset Enrichment Spectrum"
            : "No Geneset Enrichments Found"
          }
          
          {/* {showSpectrum ? "Hide Geneset Enrichment Spectrum" : activeGenesetEnrichment?.length ? "Show Geneset Enrichment Spectrum": "No Geneset Enrichments Found"} */}
        </Tooltip>
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
