import { HilbertChromosome } from '../lib/HilbertChromosome';
import { fetchPartialPathsForRegions } from './apiService';
import { rehydratePartialCSN } from '../lib/csn';
import { csnLayerList } from '../layers';


// find the top factors by selecting one factor per order
const getTopFactors = function(factorData, maxPerOrder = 5) {
    let allSegments = factorData.flatMap((d, i) => d.segments.map(s => ({...s, factor: i}))).sort((a, b) => b.score - a.score)
    let topFactorSegments = []
    let processedFactors = new Set()
    let orderCounts = {}
    for (let i = 4; i <= 14; i++) orderCounts[i] = 0

    // reserve order 14 for variants
    let variantFactors = factorData.map((d, i) => d.dataset === "ukbb_94_traits" ? i : -1).filter(i => i > -1)
    if(variantFactors.length > 0) {
        allSegments = allSegments.filter(s => !((s.order === 14) && (!variantFactors.includes(s.factor))))
    }

    // find the top segments for each order
    for (let i = 0; i < allSegments.length; i++) {
        let topSegment = allSegments[i]
        if (!processedFactors.has(topSegment.factor) && orderCounts[topSegment.order] < maxPerOrder) {
            topFactorSegments.push(topSegment)
            processedFactors.add(topSegment.factor)
            orderCounts[topSegment.order] += 1
        }
    }

    // assign the top segment to the factor data
    factorData = factorData.map((d, i) => {
        let factorTopSegment = topFactorSegments.filter(s => s.factor === i)
        if(factorTopSegment.length === 1) {
            let segment = factorTopSegment[0]
            delete segment.factor
            d.topSegment = segment
        }
        return d
    })

    return factorData.filter(d => d.topSegment).sort((a, b) => b.topSegment.score - a.topSegment.score)
}

// fetches partial paths for factor segments up to the factor segment order
// ensures that the top factor is in the correct location in the path
const getPathsForRegions = function(topFactors, region) {
    let rehydratedTopFactors = fetchPartialPathsForRegions(topFactors.map(d => d.topSegment), true)
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

                let factorSegment = path.path.find(p => p.order === d.topSegment.order)
                if(factorSegment) {
                    // Update the existing segment
                    factorSegment.field = field
                    factorSegment.layer = layer
                    factorSegment.order = order
                    factorSegment.region = region
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