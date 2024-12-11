import { useState, useCallback, useEffect, useContext, useMemo } from 'react'
import FiltersContext from './ComboLock/FiltersContext'
import { Link } from 'react-router-dom'
import { urlify } from '../lib/regions'
import { showKbOrder, showPosition } from '../lib/display'
import GoogleSearchLink from './Narration/GoogleSearchLink'
import ZoomLine from './Narration/ZoomLine'
import ScoreBars from './Narration/ScoreBars'
import Power from './Narration/Power'
import Loading from './Loading'
import { scaleLinear } from 'd3-scale'
import { retrieveFullDataForCSN, variantChooser } from '../lib/csn'
import { fetchGWASforPositions } from '../lib/gwas'
import { fetchGenesetEnrichment } from '../lib/genesetEnrichment'
import { makeField } from '../layers'
import RegionsContext from './Regions/RegionsContext';
import { csnLayerList } from '../layers'

import './InspectorGadget.css'

const InspectorGadget = ({
  selected = null,
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
  children=null
} = {}) => {

  const tipOrientation = "left"
  const powerWidth = 300
  const powerHeight = 300 //Math.round(powerWidth / mapWidth * mapHeight);

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
      let zr = narration.path.find(n => n.order == z)
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

  // updates preferential factors in path with full data
  const resetNarration = useCallback((fullData) => {
    if (fullData?.path) {
      // pull out full data
      let full = fullData.path.flatMap(d => 
        Object.keys(d.fullData).map(k => {
          let [layerIndex, index] = k.split(",")
          let layer = csnLayerList[+layerIndex]
          let field = layer.fieldColor.domain()[+index]
          let color = layer.fieldColor(field)
          let value = d.fullData[k]
          let count = (d.counts && (d.counts[layerIndex]?.length)) ? d.counts[layerIndex][index] : null
          return { order: d.order, factor: k, value, layer: layer, field: {field, count, color, index: parseInt(index), value} }
        })
      ).sort((a,b) => b.value - a.value)

      // update path preferential factors with full data
      while (full.length > 0) {
        let factor = full[0]
        let p = fullData.path.find(d => d.order === factor.order)
        // update segment preferential factor
        p.field = factor.field
        p.region.field = factor.field
        p.layer = factor.layer
        // filter out used factors and orders
        full = full.filter(f => f.factor !== factor.factor && f.order !== factor.order)
      }
    }
  }, [])

  const handlePowerData = useCallback((data) => {
    // when the power data is done loading (when Narration changes)
    // then we load full
    // console.log("IG: power data", data)
    // console.log("IG: narration", narration)
    setSelectedGenesetMembership([])

    Promise.all([
      retrieveFullDataForCSN(narration),
      fetchGWASforPositions([{chromosome: narration.chromosome, index: narration.i}]),
      fetchGenesetEnrichment(narration.genes.map(g => g.name), true)
    ]).then(([fullDataResponse, gwasRepsonse, genesetResponse]) => {
      // refactor GWAS response
      // console.log("IG: gwas response", gwasRepsonse)
      // console.log("IG: full data response", fullDataResponse)
      // console.log("IG: geneset response", genesetResponse)
      // parse GWAS response
      const csnGWAS = gwasRepsonse[0]['trait_names'].map((trait, i) => {
        return {trait: trait, score: gwasRepsonse[0]['scores'][i], layer: gwasRepsonse[0]['layer']}
      }).sort((a,b) => b.score - a.score)
      // add GWAS associations to the full data response
      let csnOrder14Segment = fullDataResponse?.path.find(d => d.order === 14)
      csnOrder14Segment ? csnOrder14Segment["GWAS"] = csnGWAS : null
      // add geneset memberships to the full data response
      const csnGenesets = genesetResponse.map((g) => {
        return {geneset: g.geneset, p: g.geneset in genesetScoreMapping ? genesetScoreMapping[g.geneset] : 1}
      })
      fullDataResponse['genesets'] = csnGenesets
      setSelectedGenesetMembership(csnGenesets)

      // only reset narration if not showing all orders 4-14 (assumes we never remove/slice lower orders)
      if (!fullDataResponse?.path.find(d => d.order === 14)) {
        resetNarration(fullDataResponse)
      }
      console.log("IG: full narration", fullDataResponse)
      setFullNarration(fullDataResponse)
      setLoadingFullNarration(false)
    })
  }, [narration])


  
  return (
    <>
    {selected && (
    <div className="power-overlay" style={{
      position: "absolute", 
      // top: modalTop, 
      // left: modalLeft,
      top:5,
      right: 10,
      height: `${mapHeight - 20}px`,
      // backgroundColor: `rgba(255, 255, 255, ${opacity})`
      }}>
      <div className="header">
        <div className="power-modal-selected">
        {/* {showPosition(selected)} */}
          { narration && showPosition(narration.region) }
          { /* <button onClick={() => setZoomOrder(selected.order + 0.5)}>reset zoom</button> */ }
        </div>
        <div className="header-buttons">
          <div className="close" onClick={onClose}>x</div>
        </div>
      </div>
      <div className={`content ${minimized ? "minimized" : ""}`}>
        {loadingCSN ? <div style={{height: `${powerHeight}px`}}><Loading text={"Loading CSN..."}></Loading></div> : 
         selected && narration ? <div className="csn">
          <div className="power-container">
            <Power 
              csn={loadingFullNarration ? narration : fullNarration} 
              width={powerWidth} 
              height={powerHeight} 
              userOrder={zOrder}
              onOrder={handleZoom}
              onData={handlePowerData}
              />
            <div className="zoom-scores">
              <ZoomLine 
                csn={loadingFullNarration ? narration : fullNarration} 
                order={zOrder} 
                maxPathScore={maxPathScore}
                highlight={true}
                selected={true}
                text={true}
                width={34} 
                offsetX={-300}
                height={powerHeight} 
                tipOrientation={tipOrientation}
                onHover={handleZoom}
                onClick={(c) => { console.log("narration", c)}}
                // onFactor={(p) => {
                //   let field = makeField(p.layer, p.field.index, p.order)
                //   handleFilter(field, p.order)
                // }}
                /> 
              <ScoreBars
                csn={loadingFullNarration ? narration : fullNarration} 
                order={zOrder} 
                highlight={true}
                selected={true}
                text={true}
                width={-300} 
                height={powerHeight} 
                tipOrientation={tipOrientation}
                onHover={handleZoom}
                onClick={(c) => { console.log("narration", c)}}
                />
              </div>
              
          </div>
          { /*
          <div className="zoom-text">
            {zoomedPathRegion?.field ? `${zoomedPathRegion.field?.field} ${zoomedPathRegion.layer?.name} (${showKbOrder(zOrder)})` : ""}
          </div>
          */ }
          {/* { loadingFullNarration ? <Loading text={"📊 Preparing literature search..."} /> : <GoogleSearchLink narration={fullNarration} /> } */}
          <GoogleSearchLink height= {mapHeight - 500} narration={narration} />
        </div> : null }
        <div className="power-modal-children">
          {children}
        </div>
      </div>
    </div>
  )}
</>
  )
}
export default InspectorGadget