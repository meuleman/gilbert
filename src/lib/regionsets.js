import { tsvParseRows } from 'd3-dsv';
import { hilbertPosToOrder } from './HilbertChromosome'

function parseBED(content) {
  // Process content into an array (depends on file format)
  console.log("content", content)
  const parsedData = tsvParseRows(content, (d) => ({
    chromosome: d[0],
    start: +d[1],
    end: +d[2],
    length: +d[2] - +d[1],
    name: d[3],
    score: +d[4]
  }));
  console.log("parsed data", parsedData)
  return parsedData;
}


function createBED(regions) {
  return regions.map(region => `${region.chromosome}\t${region.start}\t${region.end}\t${region.i}\t${region.score}`).join('\n');
}


const convertFilterRegions = (regions, queryRegionOrder) => {
  return regions.map(r => {
    return {
      start: hilbertPosToOrder(r.index, { from: queryRegionOrder, to: 14 }),
      end: hilbertPosToOrder(r.index+1, { from: queryRegionOrder, to: 14 }),
      chromosome: r.chromosome,
      i: r.index,
      score: r.score
    }
  })
}

const download = (regions) => {
  const content = createBED(regions)
  const blob = new Blob([content], { type: 'text/plain' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `gilbert_regions_${regions.length}.bed`;
  a.click();
}

export { parseBED, createBED, convertFilterRegions, download }