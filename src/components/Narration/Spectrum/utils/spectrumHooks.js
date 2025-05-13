import { useMemo, useCallback, useEffect, useState, useLayoutEffect } from 'react';
import * as d3 from 'd3';
import scaleCanvas from '../../../../lib/canvas';
// overall labels for spectrum
import labels from '../../../../data/spectrumLabels.json';
// overall geneset order
import genesetOrder from '../../../../data/genesetOrder2023.json';
// drawing functions for spectrum
import { Curve, SpectrumBar, Membership, Labels } from './drawingFunctions';


// construct scaling functions
export const useSpectrumScales = ({smoothData, scales}) => {
	const {plotXStart, plotXStop, plotYStart, plotYStop} = scales

  // Using d3.scaleLinear for the x and y scales
  const xScale = useMemo(() => {
    return d3.scaleLinear()
      .domain([0, genesetOrder.length - 1])
      .range([plotXStart, plotXStop]);
  }, [plotXStart, plotXStop, genesetOrder]);

  const xScaleInvert = useCallback((x) => {
    return Math.floor(d3.scaleLinear()
      .domain([plotXStart, plotXStop])
      .range([0, genesetOrder.length - 1])(x));
  }, [plotXStart, plotXStop, genesetOrder]);

  const yScale = useMemo(() => {
    const maxSmooth = Math.max(...smoothData) || 1;
    // invert range: larger value -> lower y position
    return d3.scaleLinear()
      .domain([0, maxSmooth])
      .range([plotYStop, plotYStart]);
  }, [smoothData, plotYStart, plotYStop]);

	return {
		xScale,
		xScaleInvert,
		yScale,
	};
}


// tooltip functions
export const useTooltipHandling = ({enrichments, scales, dimensions, setTooltip}) => {

	const {yScale, xScaleInvert} = scales;
	const {plotXStart, plotXStop, plotYStop, height} = dimensions;

	// determines if the mouse is hovering over the curve or the spectrum bar
	const isHoveringCurve = useCallback((x, y, data) => {
		const index = xScaleInvert(x);
		if (index >= 0 && index < data.length) {
			const yValue = yScale(data[index]);
			return x >= plotXStart && x <= plotXStop && y >= yValue && y <= plotYStop;
		}
		return false;
	}, [plotXStart, plotXStop, yScale, plotYStop, xScaleInvert]);
  
	const isHoveringSpectrumBar = useCallback((x, y) => {
		return x >= plotXStart && x <= plotXStop && y >= plotYStop && y <= height;
	}, [plotXStart, plotXStop, plotYStop, height]);

	// Memoize mouse event handlers
	const handleMouseLeave = useCallback(() => {
		setTooltip({ content: null, x: 0, y: 0, visible: false });
	}, [setTooltip]);

	// determines the geneset to show in tooltip
	const determineGeneset = useCallback((x) => {
		const index = xScaleInvert(x);
		if (index >= 0 && index < genesetOrder.length) {
			const hoverWindowSize = 100;
			const startIndex = Math.max(0, index - hoverWindowSize / 2);
			const endIndex = Math.min(enrichments.length, index + hoverWindowSize / 2);
			const windowValues = enrichments.slice(startIndex, endIndex);
			let topIndexInWindow = { score: 0, index: index };
			if (Math.max(...windowValues) !== 0) {
				topIndexInWindow = windowValues
					.map((v, i) => ({ score: v, index: i + startIndex }))
					.sort((a, b) => b.score - a.score)[0];
			}
			topIndexInWindow.geneset = genesetOrder[topIndexInWindow.index];
			return topIndexInWindow;
		}
		return null;
	}, [enrichments, genesetOrder, xScaleInvert]);

  return { isHoveringCurve, isHoveringSpectrumBar, handleMouseLeave, determineGeneset };
};


// smooth enrichment data
export const useEnrichmentData = ({genesetInfo, windowSize}) => {

	const [enrichments, setEnrichments] = useState(new Array(genesetOrder.length).fill(0));
	const [smoothData, setSmoothData] = useState(new Array(genesetOrder.length).fill(0));
	
	const {activeGenesetEnrichment, selectedGenesetMembership} = genesetInfo;

	// processes the geneset enrichment data
  useEffect(() => {
    let newEnrichments = new Array(genesetOrder.length).fill(0);
    let enrichmentsMax = new Array(genesetOrder.length).fill(0);
    let enrichmentsSmooth = new Array(genesetOrder.length).fill(0);
    
    if(activeGenesetEnrichment?.length) {
      activeGenesetEnrichment.forEach((d) => {
        newEnrichments[genesetOrder.indexOf(d.geneset)] = -Math.log10(d.p);
      });
      setEnrichments(newEnrichments);

      newEnrichments.forEach((e, i) => {
        const startIndex = Math.max(0, i - windowSize / 2);
        const endIndex = Math.min(newEnrichments.length, i + windowSize / 2);
        const windowArr = newEnrichments.slice(startIndex, endIndex);
        enrichmentsMax[i] = Math.max(...windowArr);
      });

      enrichmentsMax.forEach((e, i) => {
        const startIndex = Math.max(0, i - windowSize / 2);
        const endIndex = Math.min(enrichmentsMax.length, i + windowSize / 2);
        const windowArr = enrichmentsMax.slice(startIndex, endIndex);
        enrichmentsSmooth[i] = windowArr.reduce((a, b) => a + b, 0) / windowArr.length;
      });
      setSmoothData(enrichmentsSmooth);
    } else {
      setEnrichments(newEnrichments);
      setSmoothData(enrichmentsSmooth);
    }
  }, [activeGenesetEnrichment, selectedGenesetMembership, windowSize, setEnrichments, setSmoothData]);

	return {enrichments, smoothData};
}


// add mouse move and leave functions to canvas
export const useCanvasInteraction = ({
  canvasRef,
  smoothData,
  height,
  isHoveringSpectrumBar,
  isHoveringCurve,
  determineGeneset,
  handleMouseLeave,
  setTooltip
}) => {
  useEffect(() => {
    const canvas = canvasRef?.current;
    if (!canvas) return;

    // handles showing data in tooltip
    const handleMouseMove = (e) => {
      const rect = canvas.getBoundingClientRect();
      const mouseX = e.clientX - rect.left;
      const mouseY = e.clientY - rect.top;

      if (isHoveringSpectrumBar(mouseX, mouseY)) {
        const geneset = determineGeneset(mouseX) || {};
        geneset.score = 0;
        setTooltip({ content: geneset, x: mouseX, y: height - mouseY, visible: true });
      } else if (isHoveringCurve(mouseX, mouseY, smoothData)) {
        const geneset = determineGeneset(mouseX);
        if (geneset && geneset.score !== 0) {
          setTooltip({ content: geneset, x: mouseX, y: height - mouseY, visible: true });
        } else {
          handleMouseLeave();
        }
      } else {
        handleMouseLeave();
      }
    };

    canvas.addEventListener('mousemove', handleMouseMove);
    canvas.addEventListener('mouseleave', handleMouseLeave);
    
    return () => {
      canvas.removeEventListener('mousemove', handleMouseMove);
      canvas.removeEventListener('mouseleave', handleMouseLeave);
    };
  }, [canvasRef, smoothData, height, isHoveringSpectrumBar, isHoveringCurve, determineGeneset, handleMouseLeave, setTooltip]);
};


// scale canvas
export const useCanvasSize = ({canvasRef, width, height}) => {
	useEffect(() => {
		scaleCanvas(canvasRef.current, canvasRef.current.getContext("2d"), width, height);
	}, [canvasRef, width, height]);
}


// create the spectrum
export const useCanvasDrawing = ({canvasRef, smoothData, scales, selectedGenesetMembership, dimensions}) => {

	const {xScale, yScale} = scales;
	const {plotYStop, spectrumBarHeight, height} = dimensions;

	useEffect(() => {
		const canvas = canvasRef.current;
		const ctx = canvas.getContext('2d');
		ctx.clearRect(0, 0, canvas.width, canvas.height);

		SpectrumBar({ data: smoothData, ctx, xScale, y: plotYStop, height: spectrumBarHeight });
		Curve({ data: smoothData, ctx, xScale, yScale, height: plotYStop, color: selectedGenesetMembership?.length ? "#555" : "#000" });
		Membership({ membership: selectedGenesetMembership, genesetOrder, data: smoothData, ctx, xScale, yScale, height: plotYStop, barWidth: 10, color: "#F00" });
		Labels({ labels, ctx, xScale });
	}, [canvasRef, smoothData, xScale, yScale, plotYStop, spectrumBarHeight, labels, selectedGenesetMembership, height, genesetOrder]);
}


// get container size
export const useContainerSize = (containerRef) => {
	const [containerSize, setContainerSize] = useState({ width: 0, height: 0 });
  useLayoutEffect(() => {

		if (!containerRef?.current) return;

    const resizeObserver = new ResizeObserver(entries => {
      for (const entry of entries) {
        setContainerSize({
          width: entry.contentRect.width,
          height: entry.contentRect.height
        });
      }
    });
    
    resizeObserver.observe(containerRef.current);
    // Initial measurement
    setContainerSize({
      width: containerRef?.current.clientWidth,
      height: containerRef?.current.clientHeight
    });
    return () => resizeObserver.disconnect();
  }, [containerRef]);

	return containerSize;
}


// define dimensions
export const usePlotDimensions = ({
  propWidth,
  propHeight,
  containerSize,
  xtickMargin,
  spectrumBarHeight
}) => {
  const width = propWidth || containerSize.width;
	const height = propHeight || containerSize.height;
  
  return {
    width,
    height,
    plotXStart: xtickMargin,
    plotXStop: width,
    plotYStop: height - spectrumBarHeight
  };
};