import { tsvParseRows } from 'd3-dsv';
import { hilbertPosToOrder } from './HilbertChromosome'
import { fromPosition } from './regions'

function parseBED(content) {
  // Process content into an array (depends on file format)
  console.log("content", content)
  const parsedData = tsvParseRows(content, (d) => {
    let region = fromPosition(d[0], +d[1], +d[2])
    return {
      ...region,
      name: d[3],
      score: +d[4]
    }
  });
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
      score: r.score,
      order: queryRegionOrder,
    }
  })
}

const download = (regions, name) => {
  const content = createBED(regions)
  const blob = new Blob([content], { type: 'text/plain' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  if(!name) {
    name = `gilbert_regions_${regions.length}`
  }
  a.href = url;
  a.download = `${name}.bed`;
  a.click();
}

export { parseBED, createBED, convertFilterRegions, download }