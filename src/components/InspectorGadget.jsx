import { useState, useCallback, useEffect, useContext, useMemo } from 'react'
import FiltersContext from './ComboLock/FiltersContext'
import { Link } from 'react-router-dom'
import { urlify } from '../lib/regions'
import { showKbOrder, showPosition } from '../lib/display'
import GoogleSearchLink from './Narration/GoogleSearchLink'
import ZoomLine from './Narration/ZoomLine'
import ScoreBars from './Narration/ScoreBars'
import SubPaths from './Narration/SubPaths'
import Power from './Narration/Power'
import Loading from './Loading'
import { scaleLinear } from 'd3-scale'
import { retrieveFullDataForCSN, variantChooser } from '../lib/csn'
import { fetchGWASforPositions } from '../lib/gwas'
import { fetchGenesetEnrichment } from '../lib/genesetEnrichment'
import { makeField } from '../layers'
import RegionsContext from './Regions/RegionsContext';
import { csnLayerList } from '../layers'
import styles from './InspectorGadget.module.css'

const InspectorGadget = ({
  selected = null,
  subpaths=null,
  narration = null,
  zoomOrder,
  maxPathScore,
  layers = [],
  loadingCSN = false,
  mapWidth,
  mapHeight,
  modalPosition,
  // tipOrientation="left",
  onCSNIndex=()=>{},
  onClose=()=>{},
  onZoom=()=>{},
  setNarration=()=>{},
  setSubpaths=()=>{},
  findSubpaths=()=>{},
  determineFactorExclusion=()=>{},
  children=null
} = {}) => {

  const tipOrientation = "right"
  const powerWidth = 300
  const powerHeight = 300 //Math.round(powerWidth / mapWidth * mapHeight);
  const zoomHeight = 400

  const { filters, handleFilter } = useContext(FiltersContext);
  const { activeGenesetEnrichment, setSelectedGenesetMembership } = useContext(RegionsContext);

  // create a mapping between geneset and score for easy lookup
  const genesetScoreMapping = useMemo(() => {
    let mapping = {}
    activeGenesetEnrichment && activeGenesetEnrichment.forEach(g => {
      mapping[g.geneset] = g.p
    })
    return mapping
  }, [activeGenesetEnrichment])

  const [minimized, setMinimized] = useState(false)
  const onMinimize = useCallback(() => {
    setMinimized(!minimized)
  }, [minimized, setMinimized])

  const [zOrder, setZoomOrder] = useState(zoomOrder)
  // useEffect(() => {
  //   console.log("zoom order changed", zoomOrder)
  //   if(zoomOrder < 4) zoomOrder = 4
  //   setZoomOrder(zoomOrder)
  // }, [zoomOrder])
  useEffect(() => {
    // console.log("zoom order changed", zoomOrder)
    if(!narration) return
    let zr = narration.region.order + 0.5
    if(zr < 4) zr = 4
    setZoomOrder(zr)
  }, [narration])

  const handleZoom = useCallback((or) => {
    if(or < 4) or = 4
    setZoomOrder(or)
  }, [setZoomOrder])
  
  const [opacity, setOpacity] = useState(1)
  useEffect(() => {
    if(Math.floor(zOrder) == Math.floor(zoomOrder)) {
      setOpacity(0.25)
    } else {
      setOpacity(1)
    }
  }, [zOrder, zoomOrder])

  
  const [zoomedPathRegion, setZoomedPathRegion] = useState(null)
  useEffect(() => {
    if (narration && narration.path && narration.path.length) {
      let z = Math.floor(zOrder)
      if(z > 14) z = 14
      let zr = narration.path.find(d => d.order == z)
      if(z == 14 && narration.variants && narration.variants.length) {
        let v = variantChooser(narration.variants)
        zr = {field: v.topField, layer: v.layer, order: 14, region: v}
      }
      setZoomedPathRegion(zr)
    }
  }, [narration, zOrder])

  // const modalTop = useMemo(() => {
  //   let top = modalPosition?.y - powerHeight/2 - 62
  //   if(top < 0) top = 0
  //   return top
  // }, [modalPosition, powerHeight])
  // const modalLeft = useMemo(() => {
  //   let left = modalPosition?.x - powerWidth/2 - 12
  //   if(left < 0) left = 0
  //   return left
  // }, [modalPosition, powerWidth])

  const [fullNarration, setFullNarration] = useState(null)
  const [loadingFullNarration, setLoadingFullNarration] = useState(false)
  useEffect(()=> {
    // defaults to the un-annotated Narration passed in
    setFullNarration(narration)
    setLoadingFullNarration(true)
  }, [narration])

  // // updates preferential factors in path with full data
  // const resetNarration = useCallback((fullData) => {
  //   console.log("FULL DATA", fullData)
  //   if (fullData?.path) {
  //     // pull out full data
  //     let full = fullData.path.flatMap(d => 
  //       Object.keys(d.fullData).map(k => {
  //         let [layerIndex, index] = k.split(",")
  //         let layer = csnLayerList[+layerIndex]
  //         let field = layer.fieldColor.domain()[+index]
  //         let color = layer.fieldColor(field)
  //         let value = d.fullData[k]
  //         let count = (d.counts && (d.counts[layerIndex]?.length)) ? d.counts[layerIndex][index] : null
  //         return { order: d.order, factor: k, value, layer: layer, field: {field, count, color, index: parseInt(index), value} }
  //       })
  //     ).sort((a,b) => b.value - a.value)

  //     // update path preferential factors with full data
  //     while (full.length > 0) {
  //       let factor = full[0]
  //       let p = fullData.path.find(d => d.order === factor.order)
  //       // update segment preferential factor
  //       p.field = factor.field
  //       p.region.field = factor.field
  //       p.layer = factor.layer
  //       // filter out used factors and orders
  //       full = full.filter(f => f.factor !== factor.factor && f.order !== factor.order)
  //     }
  //   }
  // }, [])

  const handlePowerData = useCallback((data) => {
    // when the power data is done loading (when Narration changes)
    // then we load full
    // console.log("IG: power data", data)
    // console.log("IG: narration", narration)
    setSelectedGenesetMembership([])

    let promises = [
      retrieveFullDataForCSN(narration),
      fetchGenesetEnrichment(narration.genes.map(g => g.name), true)
    ]
    if(narration.region.order === 14) {
      promises.push(
        fetchGWASforPositions([{chromosome: narration.region.chromosome, index: narration.region.i}])
      )
    }
    Promise.all(promises).then((responses) => {
      let fullDataResponse = responses[0]
      let genesetResponse = responses[1]
      let gwasResponse = narration.region.order === 14 ? responses[2] : null
      // refactor GWAS response
      // console.log("IG: gwas response", gwasResponse)
      // console.log("IG: full data response", fullDataResponse)
      // console.log("IG: geneset response", genesetResponse)
      // parse GWAS response
      const csnGWAS = gwasResponse ? gwasResponse[0]['trait_names'].map((trait, i) => {
        return {trait: trait, score: gwasResponse[0]['scores'][i], layer: gwasResponse[0]['layer']}
      }).sort((a,b) => b.score - a.score) : null
      // add GWAS associations to the full data response
      let csnOrder14Segment = fullDataResponse?.path.find(d => d.order === 14)
      csnOrder14Segment ? csnOrder14Segment["GWAS"] = csnGWAS : null
      // add geneset memberships to the full data response
      const csnGenesets = genesetResponse.map((g) => {
        return {geneset: g.geneset, p: g.geneset in genesetScoreMapping ? genesetScoreMapping[g.geneset] : 1}
      })
      fullDataResponse['genesets'] = csnGenesets
      setSelectedGenesetMembership(csnGenesets)

      // // only reset narration if not showing all orders 4-14 (assumes we never remove/slice lower orders)
      // if (!fullDataResponse?.path.find(d => d.order === 14)) {
      //   resetNarration(fullDataResponse)
      // }  // don't need this anymore?
      console.log("IG: full narration", fullDataResponse)
      setFullNarration(fullDataResponse)
      setLoadingFullNarration(false)
    })
  }, [narration])


  // subpaths
  const [numSubpaths, setNumSubpaths] = useState(null)
  const [numSubpathFactors, setNumSubpathFactors] = useState(null)
  const [topFactors, setTopFactors] = useState(null)
  // collect subregion information
  useEffect(() => {
    if(subpaths && subpaths.paths && subpaths.topFactors) {
      setNumSubpaths(subpaths.paths.length)
      setNumSubpathFactors(subpaths.topFactors.length)
      setTopFactors(subpaths.topFactors)
    } else {
      setNumSubpaths(null)
      setNumSubpathFactors(null)
      setTopFactors(null)
    }
  }, [subpaths])

  // set factor selection
  const [subpathCollection, setSubpathCollection] = useState([])
  const [currentFactorSubpath, setCurrentFactorSubpath] = useState(null)
  const [factorSubpathCollection, setFactorSubpathCollection] = useState([])
  const setFactorSelection = useCallback((factor) => {
    // top subpath for factor
    let subpath = factor.subpath.subpath.map(d => d.chosenFactor)
    // update narration with subpath
    if(subpath?.length && narration) {
      let newNarration = {...narration}
      let currentPathOrders = newNarration.path.map(d => d.order)
      // ensure that if any overlap (there shouldn't be), original path is not overwritten
      subpath.forEach(s => {
        if(!currentPathOrders.includes(s.order)) {
          newNarration.path.push(s)
        }
      })
      setCurrentFactorSubpath(factor)
      setFactorSubpathCollection([...factorSubpathCollection, factor])
      setSubpathCollection([...subpathCollection, subpaths])
      setNarration(newNarration)
      
      // subpath query
      let factorExclusion = determineFactorExclusion(newNarration)
      findSubpaths(newNarration.path.slice(-1)[0].region, factorExclusion)
    }
  }, [narration, subpaths])

  // handle factor button click
  const handleFactorClick = useCallback((i) => {
    setFactorSelection(factor)
  }, [topFactors, narration])


  // checks if two objects are equal
  function deepEqual(obj1, obj2) {
    if (obj1 === obj2) return true
  
    if (typeof obj1 !== 'object' || obj1 === null || typeof obj2 !== 'object' || obj2 === null) return false
  
    let keys1 = Object.keys(obj1)
    let keys2 = Object.keys(obj2)
  
    if (keys1.length !== keys2.length) return false
  
    for (let key of keys1) {
      if (!keys2.includes(key) || !deepEqual(obj1[key], obj2[key])) return false
    }
    return true;
  }

  // revert subpath selection
  const subpathGoBack = useCallback(() => {
    let subpath = currentFactorSubpath.subpath.subpath.map(d => d.chosenFactor)
    if(subpath?.length && narration) {
      let currentNarration = {...narration}
      // remove subpath segments from current narration
      currentNarration.path = currentNarration.path.filter(d => !subpath.some(s => deepEqual(d, s)))
      
      setNarration(currentNarration)
      setCurrentFactorSubpath(factorSubpathCollection.length > 1 ? factorSubpathCollection.slice(-2, -1)[0] : null)
      setFactorSubpathCollection(factorSubpathCollection.slice(0, -1))
      setSubpaths(subpathCollection.length ? subpathCollection.slice(-1)[0] : null)
      setSubpathCollection(subpathCollection.slice(0, -1))
    }
  }, [narration])
  
  return (
    <>
    {selected && (
    <div className={styles.powerOverlay} style={{
      position: "absolute", 
      top:5,
      right: 10,
      height: `${mapHeight - 20}px`,
      }}>
      <div className={styles.header}>
        <div className={styles.powerModalSelected}>
          { narration?.region && showPosition(narration.region) }
        </div>
        <div className={styles.headerButtons}>
          <div className={styles.close} onClick={onClose}>x</div>
        </div>
      </div>
      <div className={`${styles.content} ${minimized ? styles.minimized : ""}`}>
        {loadingCSN ? <div style={{height: `${powerHeight}px`}}><Loading text={"Loading CSN..."}></Loading></div> : 
         selected && narration ? <div className={styles.csn}>

          <div className={styles.tempContainer}>
          <div className={styles.powerContainer}>
            <Power 
              csn={loadingFullNarration ? narration : fullNarration} 
              width={powerWidth} 
              height={powerHeight} 
              userOrder={zOrder}
              onOrder={handleZoom}
              onData={handlePowerData}
              />
            <div className={styles.zoomScores}>
              <ZoomLine 
                csn={loadingFullNarration ? narration : fullNarration} 
                order={zOrder} 
                maxPathScore={maxPathScore}
                highlight={true}
                selected={true}
                text={true}
                width={34} 
                offsetX={30}
                height={zoomHeight} 
                tipOrientation={tipOrientation}
                onHover={handleZoom}
                showScore={false}
                onClick={(c) => { console.log("narration", c)}}
                /> 
              <ScoreBars
                csn={loadingFullNarration ? narration : fullNarration} 
                order={zOrder} 
                highlight={true}
                selected={true}
                text={true}
                width={30}
                height={zoomHeight} 
                tipOrientation={tipOrientation}
                onHover={handleZoom}
                showScore={false}
                onClick={(c) => { console.log("narration", c)}}
                />
              <SubPaths 
                csn={loadingFullNarration ? narration : fullNarration} 
                factors={topFactors}
                subpathCollection={subpathCollection}
                order={zOrder} 
                maxPathScore={maxPathScore}
                highlight={true}
                selected={true}
                text={true}
                width={34} 
                height={zoomHeight} 
                offsetX={0}
                tipOrientation={tipOrientation}
                onHover={handleZoom}
                showScore={false}
                onFactor={(f) => { setFactorSelection(f) }}
                onSubpathBack={subpathGoBack}
                /> 
              </div>
          </div>

              <div className={styles.subpathContainer}>
                {numSubpaths > 0 && numSubpathFactors > 0 && <div>{numSubpaths} subpaths considering {numSubpathFactors} factors:</div>}
                {subpathCollection.length > 0 && <button className={styles.scrollButton} onClick={() => subpathGoBack()} style={{ borderColor: "black" }}>🔙</button>}
                <div className={styles.scrollContainer}>
                  {topFactors && topFactors.map((f, i) => (
                    <button key={i} className={styles.scrollButton} onClick={() => setFactorSelection(f)} style={{ borderColor: f.color }}>
                      <span className={styles.subregionFactorColor} style={{ backgroundColor: f.color }}></span>
                      {f.factorName} ({showKbOrder(f.topSegment.order)}, {f.topSegment.score.toFixed(2)})
                    </button>
                  ))}
                </div>
              </div>
          </div>
          
          <div className={styles.summaryContainer}>
            <GoogleSearchLink height={mapHeight - 500} narration={narration} />
          </div>
        </div> : null }
        <div className={styles.powerModalChildren}>
          {children}
        </div>
      </div>
    </div>
  )}
</>
  )
}
export default InspectorGadget