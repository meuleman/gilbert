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
        paths.push(path)
    }
    
    return paths
}


// creates subregion paths for a region given overlapping factor segments
const createSubregionPaths = function(factorData, region, numFactors = 10) {
    // get the top factors
    const topFactors = factorData.map(d => {
        return {...d, maxScoringSegment: d.segments.sort((a, b) => b.score - a.score)[0]}
    }).sort((a, b) => b.maxScoringSegment.score - a.maxScoringSegment.score).slice(0, numFactors)
    // flatten the segments
    const segments = topFactors.reduce((acc, d) => {
        return acc.concat(d.segments.map(e => {
            const [path, relativePath] = getRelativePath(e, region)
            return {...e, factor: d.factor, dataset: d.dataset, factorName: d.factorName, relativePath, path}
        }))
    }, [])
    
    // create a tree
    const tree = new Tree()
    // fill tree
    segments.forEach(s => {
        tree.insertSegment(s.relativePath, s)
    })

    // collect paths
    const paths = parseTree(tree.root)
    console.log("PATHS", paths, topFactors)

    // return paths
}


export {
    createSubregionPaths
}