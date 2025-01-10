import { max } from 'd3-array';
import { HilbertChromosome, hilbertPosToOrder } from '../lib/HilbertChromosome';

// TreeNode class to create path segments
class TreeNode {
    constructor() {
        this.children = {};
        this.data = [];
    }
}


// Tree class to store and organize path segments
class Tree {
    constructor() {
        this.root = new TreeNode();
    }

    insertSegment(path, s) {
        let node = this.root;
        for (const segment of path) {
            if (!node.children[segment]) {
                node.children[segment] = new TreeNode();
            }
            node = node.children[segment];
        }
        node.data.push(s);
    }
}

// finds relative path from a region to an overlapping segment
const getRelativePath = function(pathSegment, region) {
    let relativePathOrders = Array.from({ length: pathSegment.order - region.order}, (_, i) => i + region.order + 1)
    let path = relativePathOrders.map(o => parseInt(pathSegment.i / (4 ** (pathSegment.order - o))))
    let relativePath = path.map(p => p % 4)
    return [path, relativePath]
}


// parses tree to collect all paths
const parseTree = function(node, path = [], paths = []) {
    // add data to path
    path.push(node.data)

    // go to child nodes
    for (const child in node.children) {
        parseTree(node.children[child], [...path], paths)
    }

    // if end of path, add to overall list
    if (Object.keys(node.children).length === 0) {
        paths.push(path.slice(1))  // remove the first segment, as this is the same as the selected region
    }
    
    return paths
}

// collects the top factor for each subpath position
const topFactorPerSubpathPosition = function(paths, regionChromosome) {
    return paths.map((p) => {

        // get the last segment of the subpath
        let subpathEndpoint = p.slice(-1)[0][0].i
        let subpathEndOrder = p.slice(-1)[0][0].order
        let subpathLength = p.length
        
        // for each segment in the subpath...
        let subpathFactors = p.map((s, o) => {
            // segment order
            let sOrder = subpathEndOrder - subpathLength + o + 1
            // get hilbert segment
            let i = hilbertPosToOrder(subpathEndpoint, {from: subpathEndOrder, to: sOrder})
            const hilbert = new HilbertChromosome(sOrder)
            let region = hilbert.fromRange(regionChromosome, i, i)[0]

            let maxFactor
            // if data for segment...
            if(s.length > 0) {
                // find the max scoring factor
                let maxFactorIndex = 0;
                let maxFactorValue = s[0].field.value;

                for (let j = 1; j < s.length; j++) {
                    if (s[j].field.value > maxFactorValue) {
                        maxFactorIndex = j;
                        maxFactorValue = s[j].field.value;
                    }
                }
                
                maxFactor = s[maxFactorIndex]
                maxFactor.region = region
                maxFactor.region.field = maxFactor.field
            } else {
                maxFactor = {region, order: sOrder}
            }
            return {maxFactor, allFactors: s}
        })
        
        return {subpath: subpathFactors, i: subpathEndpoint, order: subpathEndOrder}
    })    
}


// assign a subpath to each top factor
const assignSubpath = function(paths, topFactors, regionOrder) {
    topFactors.map(f => {
        let i = f.maxScoringSegment.i
        let order = f.maxScoringSegment.order
        // find the subpath that contains the max scoring segment
        let subpath = paths.find(p => {
            if(p.order >= order) {
                return hilbertPosToOrder(p.i, {from: p.order, to: order}) === i
            }
            return false
        })
        // limit subpath to the order of the max scoring segment
        f.subpath = {subpath: subpath.subpath.filter(s => s.maxFactor.order <= order), order, i}
    })
}


// creates subregion paths for a region given overlapping factor segments
const createSubregionPaths = function(factorData, region, numFactors = 10) {
    if(factorData.length === 0) {
        return {paths: [], topFactors: []}
    }

    // get the top factors
    const topFactors = factorData.map(d => {
        return {...d, maxScoringSegment: d.segments.sort((a, b) => b.score - a.score)[0]}
    }).sort((a, b) => b.maxScoringSegment.score - a.maxScoringSegment.score).slice(0, numFactors)

    // flatten the segments
    const segments = topFactors.reduce((acc, d) => {
        return acc.concat(d.segments.map(e => {
            const [path, relativePath] = getRelativePath(e, region)
            const field = {field: d.factorName, color: d.color, value: e.score, index: d.factor}
            return {...e, factor: d.factor, dataset: d.dataset, relativePath, path, field, layer: d.layer}
        }))
    }, [])

    // create a tree
    const tree = new Tree()
    // fill tree
    segments.forEach(s => {
        tree.insertSegment(s.relativePath, s)
    })

    // collect paths
    let paths = parseTree(tree.root)
    
    // find the top factor for each subpath segment
    paths = topFactorPerSubpathPosition(paths, region.chromosome)

    // assign a subpath to each top factor
    assignSubpath(paths, topFactors, region.order)

    return {paths, topFactors}
}


export {
    createSubregionPaths
}