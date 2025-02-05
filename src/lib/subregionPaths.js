import { max } from 'd3-array';
import { HilbertChromosome, hilbertPosToOrder } from '../lib/HilbertChromosome';
import { fetchPartialPathsForRegions } from '../lib/csn';
import { rehydrate, csnLayerList } from '../layers';

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

            // assign region to each factor
            s.forEach(d => {
                d.region = {...region}
                d.region.field = d.field
            })

            let chosenFactor
            // if data for segment...
            if(s.length > 0) {
                // initialize chosen with max scoring factor
                let chosenFactorIndex = 0;
                let chosenFactorValue = s[0].field.value;

                for (let j = 1; j < s.length; j++) {
                    if (s[j].field.value > chosenFactorValue) {
                        chosenFactorIndex = j;
                        chosenFactorValue = s[j].field.value;
                    }
                }
                
                chosenFactor = s[chosenFactorIndex]
            } else {
                chosenFactor = {region, order: sOrder}
            }
            return {chosenFactor, allFactors: s}
        })
        
        return {subpath: subpathFactors, i: subpathEndpoint, order: subpathEndOrder}
    })    
}


// assign a subpath to each top factor
const assignSubpath = function(paths, topFactors, regionOrder) {
    topFactors.map(f => {
        let i = f.topSegment.i
        let order = f.topSegment.order
        // find the subpath that contains the max scoring segment
        let subpath = paths.find(p => {
            if(p.order >= order) {
                return hilbertPosToOrder(p.i, {from: p.order, to: order}) === i
            }
            return false
        })
        // limit subpath to the order of the max scoring segment
        let subpathThroughOrder = subpath.subpath.filter(s => s.chosenFactor.order <= order)
        // ensure the selected factor will be shown in path
        let factorSegment = subpathThroughOrder.find(s => s.chosenFactor.order === order)
        if(factorSegment.chosenFactor.field.index !== f.factor || factorSegment.chosenFactor.layer.datasetName !== f.layer.datasetName) {
            factorSegment.chosenFactor = factorSegment.allFactors.find(s => (s.field.index === f.factor) && (s.layer.datasetName === f.layer.datasetName))
        }

        f.subpath = {subpath: subpathThroughOrder, order, i}
    })
}


// find the top factors by selecting one factor per order
const getTopFactors = function(factorData, maxPerOrder = 3) {
    let allSegments = factorData.flatMap((d, i) => d.segments.map(s => ({...s, dataset: i}))).sort((a, b) => b.score - a.score)
    let topFactorSegments = []
    let processedDatasets = new Set()
    let orderCounts = {}
    for (let i = 4; i <= 14; i++) orderCounts[i] = 0

    // reserve order 14 for variants
    let variantDatasets = factorData.map((d, i) => d.dataset === "ukbb_94_traits" ? i : -1).filter(i => i > -1)
    if(variantDatasets.length > 0) {
        allSegments = allSegments.filter(s => !((s.order === 14) && (!variantDatasets.includes(s.dataset))))
    }

    // find the top segments for each order
    for (let i = 0; i < allSegments.length; i++) {
        let topSegment = allSegments[i]
        if (!processedDatasets.has(topSegment.dataset) && orderCounts[topSegment.order] < maxPerOrder) {
            topFactorSegments.push(topSegment)
            processedDatasets.add(topSegment.dataset)
            orderCounts[topSegment.order] += 1
        }
    }

    // assign the top segment to the factor data
    factorData = factorData.map((d, i) => {
        let factorTopSegment = topFactorSegments.filter(s => s.dataset === i)
        if(factorTopSegment.length === 1) {
            let segment = factorTopSegment[0]
            delete segment.dataset
            d.topSegment = segment
        }
        return d
    })

    return factorData.filter(d => d.topSegment).sort((a, b) => b.topSegment.score - a.topSegment.score)
}


// rehydrate a partial csn path
function rehydratePartialCSN(r, layers) {
    const hydrated = r?.path_factors.map((d, i) => {
        let segmentOrder = 4 + i
        const l = rehydrate(d, layers)
        const hilbert = new HilbertChromosome(segmentOrder)
        const pos = hilbertPosToOrder(r.i, {from: r.order, to: segmentOrder})
        const region = hilbert.fromRange(r.chromosome, pos, pos+1)[0]
        let field = null
        if(l) {
            field = {
                field: l.fieldName,
                index: l.fieldIndex,
                color: l.layer.fieldColor(l.fieldName),
                value: r.factor_scores[i]
            }
            region.field = field
        }
        return {
            field,
            layer: l?.layer,
            order: segmentOrder,
            region
        }
    })
    return {
        ...r,
        path: hydrated,
    }
}

// fetches partial paths for factor segments up to the factor segment order
// ensures that the top factor is in the correct location in the path
const getPathsForRegions = function(topFactors, region) {
    let rehydratedTopFactors = fetchPartialPathsForRegions(topFactors.map(d => d.topSegment))
        .then((response) => {
            // let rehydratedTopFactors = response.regions.map((r, i) => ({...(topFactors[i]), path: rehydratePartialCSN(r, csnLayerList)}))
            let rehydrated = response.regions.map(r => rehydratePartialCSN(r, csnLayerList))
            // force top factor to show up in prescribed location in path
            let rehydratedTopFactors = topFactors.map((d, i) => {
                let path = rehydrated[i]
                
                let field = {color: d.color, field: d.factorName, value: d.topSegment.score, index: d.factor}
                let layer = d.layer
                let order = d.topSegment.order
                const hilbert = new HilbertChromosome(order)
                const pos = d.topSegment.i
                let region = hilbert.fromRange(d.topSegment.chromosome, pos, pos+1)[0]
                region.field = field

                let factorSegment = path.path.filter(p => p.order === d.topSegment.order)
                if(factorSegment.length === 1) {
                    factorSegment = {field, layer, order, region}
                } else {
                    path.path.push({field, layer, order, region})
                }

                return {...d, path}
            })
            return rehydratedTopFactors
        })
        .catch((error) => {
            console.log("error in fetching partial csn paths", error)
            return null
        })
    return rehydratedTopFactors
}


// creates subregion paths for a region given overlapping factor segments
const createSubregionPaths = async function(factorData, region, numFactors = 10) {
    if(factorData.length === 0) {
        return {paths: [], topFactors: []}
    }

    // get top factors
    let topFactors = getTopFactors(factorData)

    // attach partial paths for top factor regions
    topFactors = await getPathsForRegions(topFactors, region)


    // // get the top factors
    // const topFactors = factorData.map(d => {
    //     return {...d, topSegment: d.segments.sort((a, b) => b.score - a.score)[0]}
    // }).sort((a, b) => b.topSegment.score - a.topSegment.score).slice(0, numFactors)

    // // flatten the segments
    // const segments = topFactors.reduce((acc, d) => {
    //     return acc.concat(d.segments.map(e => {
    //         const [path, relativePath] = getRelativePath(e, region)
    //         const field = {field: d.factorName, color: d.color, value: e.score, index: d.factor}
    //         return {...e, factor: d.factor, dataset: d.dataset, relativePath, path, field, layer: d.layer}
    //     }))
    // }, [])

    // // create a tree
    // const tree = new Tree()
    // // fill tree
    // segments.forEach(s => {
    //     tree.insertSegment(s.relativePath, s)
    // })

    // // collect paths
    // let paths = parseTree(tree.root)
    
    // // find the top factor for each subpath segment
    // paths = topFactorPerSubpathPosition(paths, region.chromosome)

    // // assign a subpath to each top factor
    // assignSubpath(paths, topFactors, region.order)

    return {paths: null, topFactors}
}


export {
    createSubregionPaths
}