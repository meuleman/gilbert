import React, { useRef, useContext, useState } from 'react';
import { useContainerSize } from '../../../lib/utils';

// selected and region set information
import RegionsContext from '../../Regions/RegionsContext';
import SelectedStatesStore from '../../../states/SelectedStates';

// spectrum tools
import Tooltip from './SpectrumTooltip';
import { 
  useSpectrumScales, 
  useTooltipHandling, 
  useEnrichmentData, 
  useCanvasInteraction, 
  useCanvasSize, 
  useCanvasDrawing,
  usePlotDimensions
} from './utils/spectrumHooks';

const Spectrum = ({
  windowSize = 30,
  width: propWidth,
  height: propHeight,
  xtickMargin = 20,
  plotYStart = 20,
  spectrumBarHeight = 10,
} = {}) => {

  const { activeGenesetEnrichment } = useContext(RegionsContext);
  const { selectedGenesetMembership } = SelectedStatesStore();

  // tooltip content and position
  const [tooltip, setTooltip] = useState({ content: null, x: 0, y: 0, visible: false });

  // refs for plot container and the canvas itself
  const containerRef = useRef(null);
  const canvasRef = useRef(null);
  
  // get container size
  const containerSize = useContainerSize(containerRef);

  // define dimensions
  const { width, height, plotXStart, plotXStop, plotYStop } = usePlotDimensions({
    propWidth,
    propHeight,
    containerSize,
    xtickMargin,
    spectrumBarHeight
  })

  // smooth enrichment data
  const { enrichments, smoothData } = useEnrichmentData({
    genesetInfo: {activeGenesetEnrichment, selectedGenesetMembership},
    windowSize
  });

  // construct scaling functions
  const { xScale, xScaleInvert, yScale } = useSpectrumScales({
    smoothData, 
    scales: {plotXStart, plotXStop, plotYStart, plotYStop}
  });

  // tooltip functions
  const { 
    isHoveringCurve, isHoveringSpectrumBar, 
    handleMouseLeave, determineGeneset
  } = useTooltipHandling({
    enrichments, 
    scales: {yScale, xScaleInvert},
    dimensions: {plotXStart, plotXStop, plotYStop, height},
    setTooltip
  });
  
  // add mouse move and leave functions to canvas
  useCanvasInteraction({
    canvasRef,
    smoothData,
    height,
    isHoveringSpectrumBar,
    isHoveringCurve,
    determineGeneset,
    handleMouseLeave,
    setTooltip
  });

  // scale canvas
  useCanvasSize({
    canvasRef, 
    width, 
    height
  });

  // create the spectrum
  useCanvasDrawing({
    canvasRef, 
    smoothData, 
    scales: {xScale, yScale},
    dimensions: {plotYStop, spectrumBarHeight, height}, 
    selectedGenesetMembership, 
  });

  return (
    <div className="absolute h-full w-full flex flex-col justify-center" ref={containerRef}>
      <div style={{ position: 'relative', width: width + 'px', height: height + 'px' }}>
        <canvas ref={canvasRef} width={width} height={height}/>
        <Tooltip geneset={tooltip.content} x={tooltip.x} y={tooltip.y} visible={tooltip.visible} width={width}/>
      </div>
    </div>
  );
};

export default React.memo(Spectrum);