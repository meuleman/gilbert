
// https://observablehq.com/@enjalot/genetic-datasets
import gencodeRaw from "../data/gencode.json"

// by default we filter to protein_coding genes
export const gencode = gencodeRaw.filter(d => d.type == "protein_coding")


// given a set of points, get all the genes that are within view and that are larger than a single hilbert cell
// getGenesInView

// get all the genes that overlap with this cell and are larger than a single hilbert cell
// getGenesOverCell

// get all the genes that are within this cell
// getGenesInCell
