import colors from '../../../../data/spectrumColors.json';
import * as d3 from 'd3';

// renders the Y axis with ticks
export const drawYAxis = (ctx, data, xScale, yScale, yAxisStart, yAxisStop, estTickCount = 6) => {
	const tickLength = 5; 
	ctx.strokeStyle = '#000';
	ctx.lineWidth = 1;
	ctx.beginPath();
	ctx.moveTo(xScale(0), yAxisStart);
	ctx.lineTo(xScale(0), yAxisStop);
	ctx.stroke();

	const maxValue = Math.max(...data);
	const minValue = Math.min(...data);
	const step = Math.ceil((maxValue - minValue) / estTickCount);
	const yTicks = Array.from({ length: estTickCount }, (v, i) => minValue + i * step).filter(d => d <= maxValue);
	
	yTicks.forEach((value) => {
		const yCoord = yScale(value);
		ctx.beginPath();
		ctx.moveTo(xScale(0) - tickLength, yCoord);
		ctx.lineTo(xScale(0), yCoord);
		ctx.stroke();

		ctx.fillStyle = '#000';
		ctx.textAlign = 'right';
		ctx.textBaseline = 'middle';
		ctx.fillText(Math.floor(value), xScale(0) - tickLength - 2, yCoord);
	});
};

// renders the spectrum curve with smoothed data
export const Curve = ({ data, ctx, xScale, yScale, height, color }) => {
	drawYAxis(ctx, data, xScale, yScale, yScale(Math.max(...data)), yScale(0), Math.min(6, Math.max(...data) + 1));
	data.forEach((d, i) => {
		if (d) {
			ctx.fillStyle = color;
			ctx.globalAlpha = 1;
			ctx.fillRect(xScale(i), yScale(d), xScale(i + 1) - xScale(i), height - yScale(d));
		}
	});
};

// colorbar x scale mapping
export const colorbarX = (i) => {
	const c = colors[i % colors.length];
	const r = Math.round(c[0] * 255);
	const g = Math.round(c[1] * 255);
	const b = Math.round(c[2] * 255);
	const rgbColor = `rgb(${r}, ${g}, ${b})`;
	const hsl = d3.hsl(rgbColor);
	hsl.l = 0.5;
	return hsl.toString();
}

// renders the spectrum
export const SpectrumBar = ({ data, ctx, xScale, y, height, colorMapper = colorbarX }) => {
	data.forEach((d, i) => {
		ctx.fillStyle = colorMapper(i);
		ctx.fillRect(xScale(i), y, xScale(i + 1) - xScale(i), height);
	});
};

// renders membership bars
export const Membership = ({ membership, genesetOrder, data, ctx, xScale, yScale, height, barWidth, color }) => {
	membership.forEach((d) => {
		if (d.geneset) {
			const i = genesetOrder.indexOf(d.geneset);
			if(i >= 0) {
				const value = data[i];
				ctx.fillStyle = color;
				ctx.globalAlpha = 1;
				ctx.fillRect(xScale(i), yScale(value), xScale(i + barWidth) - xScale(i), height - yScale(value));
			}
		}
	});
};

// overall labels for spectrum
export const Labels = ({ labels, ctx, xScale }) => {
	ctx.font = '7px Arial';
	ctx.fillStyle = '#000';
	ctx.textAlign = "left";
	ctx.textBaseline = "top";
	labels.forEach((d) => {
		ctx.fillText(d.label, xScale(d.i), 0);
	});
};