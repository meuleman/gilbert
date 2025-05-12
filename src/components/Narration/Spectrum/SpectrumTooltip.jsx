import React, { useEffect, useRef } from 'react';
// overall geneset order
import genesetOrder from '../../../data/genesetOrder2023.json';

// tooltip for spectrum
const Tooltip = ({ geneset, x, y, visible, width }) => {
	// Always call hooks
	const tooltipRef = useRef();
	
	// style
	useEffect(() => {
		if (tooltipRef.current) {
			tooltipRef.current.style.left = 'auto';
			tooltipRef.current.style.right = 'auto';
			if ((geneset?.index / genesetOrder.length) < 0.5) {
				tooltipRef.current.style.left = `${x}px`;
			} else {
				tooltipRef.current.style.right = `${width - x}px`;
			}
			tooltipRef.current.style.bottom = `${y}px`;
			tooltipRef.current.style.display = visible ? 'block' : 'none';
			tooltipRef.current.style.minWidth = '150px';
			tooltipRef.current.style.maxWidth = `${width / 2}px`;
			tooltipRef.current.style.background = "#efefef";
			tooltipRef.current.style.border = 'solid 1px';
			tooltipRef.current.style.borderRadius = '5px';
			tooltipRef.current.style.padding = '5px';
			tooltipRef.current.style.fontSize = '12px';
			tooltipRef.current.style.color = 'black';
		}
	}, [x, y, visible, width, geneset]);
  
	// Now conditionally render the output.
	if (!visible || !geneset) return null;

	let genesetName = geneset.geneset.split("_").slice(1).join(" ").toLowerCase();
	genesetName = genesetName.charAt(0).toUpperCase() + genesetName.slice(1);
	let enrichment = Math.round(geneset.score * 10000) / 10000;
	const content = (
		<div>
			<div>{genesetName}</div>
			{enrichment > 0 && <div>-log10(p): {enrichment}</div>}
		</div>
	);

	return (
		<div
			ref={tooltipRef}
			style={{
				position: 'absolute',
				background: '#fff',
				border: '1px solid #ccc',
				padding: '5px',
				pointerEvents: 'none',
			}}
		>
			{content}
		</div>
	);
};

export default Tooltip;