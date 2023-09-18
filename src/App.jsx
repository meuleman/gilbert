import './App.css'

import {useEffect, useState, useRef, useCallback} from 'react'

// base component
import HilbertGenome from './components/HilbertGenome'
// rendering components
import SVGHilbertPaths from './components/SVGHilbertPaths'
import SVGGenePaths from './components/SVGGenePaths'
import ZoomLegend from './components/ZoomLegend'
import LinearTracks from './components/LinearTracks'
import StatusBar from './components/StatusBar'
import SelectedModal from './components/SelectedModal'
import LensModal from './components/LensModal'
import LayerLegend from './components/LayerLegend'
import SVGSelected from './components/SVGSelected'
import SVGChromosomeNames from './components/SVGChromosomeNames'
// import SVGBBox from './components/SVGBBox'
// layer configurations
import Bands from './layers/bands'
import GCContent from './layers/gc_content'
import GeneCounts from './layers/gene_counts'
import Nucleotides from './layers/nucleotides'
import DHS_OE_Chi from './layers/dhs_oe_chi'
import DHS_Components_Sfc from './layers/dhs_components_sfc'
import DHS_Mean_Signal from './layers/dhs_meansignal'
import DHS_Density from './layers/dhs_density'
import Chromatin_OE_Chi from './layers/chromatin_oe_chi'
import Chromatin_States_Sfc from './layers/chromatin_states_sfc'
import TF_Motifs_OE_Chi from './layers/tf_motifs_oe_chi'
import TF_Motifs_Sfc from './layers/tf_motifs_sfc'
import DHS_mapped_TF_motifs_sfc from './layers/dhs_mapped_tf_motifs_sfc'
import UKBB from './layers/ukbb'
import UKBB_Counts from './layers/ukbb_counts'
import Repeats_Sfc from './layers/repeats_sfc'
import CpG_Island_Density from './layers/cpg_islands_density'
import ENCSR000EOT from './layers/encode_ENCSR000EOT_max'
import DHS_Coreg_2500 from './layers/dhs_coreg_2500'
import DHS_Coreg_Multiscale from './layers/dhs_coregMultiscale'
import DHS_Coreg_Best_Scale_max from './layers/dhs_coregBestScale_max'
// autocomplete
import Autocomplete from './components/Autocomplete/Autocomplete'
// region SimSearch
import SimSearchRegion from './components/SimSearch/SimSearchRegion'
import SimSearchByFactor from './components/SimSearch/SimSearchByFactor'
import DisplaySimSearchRegions from './components/SimSearch/DisplaySimSearchRegions'
import NarrateRegion from './components/Narration/NarrateRegion'

const layers = [
  Bands, 
  GeneCounts,
  GCContent,
  Nucleotides,
  DHS_OE_Chi,
  DHS_Components_Sfc,
  DHS_Mean_Signal,
  DHS_Density,
  DHS_Coreg_2500,
  DHS_Coreg_Multiscale,
  DHS_Coreg_Best_Scale_max,
  Chromatin_OE_Chi,
  Chromatin_States_Sfc,
  TF_Motifs_OE_Chi,
  TF_Motifs_Sfc,
  DHS_mapped_TF_motifs_sfc,
  Repeats_Sfc,
  UKBB,
  UKBB_Counts,
  CpG_Island_Density,
  ENCSR000EOT
]

// const initialLayerOrder = {
//   4: Bands,
//   5: DHS_Components_Sfc,
//   6: DHS_Components_Sfc,
//   7: Chromatin_States_Sfc,
//   8: Chromatin_States_Sfc,
//   9: TF_Motifs_OE_Chi,
//   10: TF_Motifs_OE_Chi,
//   11: GCContent,
//   12: GCContent,
//   13: GCContent,
//   14: Nucleotides,
// }


function App() {
  const orderDomain = [4, 14]
  const zoomExtent = [0.85, 4000]

  const containerRef = useRef()

  const [layerOrder, setLayerOrder] = useState(null)

  // let's fill the container and update the width and height if window resizes
  const [width, height] = useWindowSize();
  function useWindowSize() {
    const [size, setSize] = useState([800, 800]);
    useEffect(() => {
      function updateSize() {
        if(!containerRef.current) return
        //let { height } = containerRef.current.getBoundingClientRect()
        let height = window.innerHeight - 270;
        // account for the zoom legend (30) and padding (48)
        let w = window.innerWidth - 30 - 24 - 500
        // console.log("sup", window.innerWidth, w, width)
        setSize([w, height]);
      }
      window.addEventListener('resize', updateSize);
      updateSize();
      return () => window.removeEventListener('resize', updateSize);
    }, []);
    return size;
  }

  const [layerLock, setLayerLock] = useState(false)
  const handleChangeLayerLock = (e) => {
    setLayerLock(!layerLock)
  }

  const [layer, setLayer] = useState(Bands)
  function handleLayer(l) {
    setLayer(l)
    setLayerLock(true)
    setSelected(selected)
    setSelectedOrder(selectedOrder)
    setSimSearch(simSearch)
    setSearchByFactorInds([])
  }


  // TODO: handleData, and pass data to the subcomponents
  // TODO: they can do their own data lookup based on layer and the hilbert point

  // We want to keep track of the zoom state
  const [zoom, setZoom] = useState({order: 4, points: [], bbox: {}, transform: {}})
  const handleZoom = useCallback((newZoom) => {
    if(zoom.order !== newZoom.order && !layerLock) {
      setLayer(layerOrder[newZoom.order])
    }  
    setZoom(newZoom)
  }, [zoom, layerLock])
  // function handleZoom(zoom) {
  //   setZoom(zoom)
  //   setLayer(layerOrder[zoom.order])
  // } 
  
  // the hover can be null or the data in a hilbert cell
  const [hover, setHover] = useState(null)
  function handleHover(hit) {
    // console.log("hover", hit)
    setHover(hit)
  }

  // selected powers the sidebar modal and the 1D track
  const [selected, setSelected] = useState(null)
  const [selectedOrder, setSelectedOrder] = useState(null)
  const [simSearch, setSimSearch] = useState(null)
  const [simSearchMethod, setSimSearchMethod] = useState(null)
  const [simSearchDetailLevel, setSimSearchDetailLevel] = useState(null)
  const [selectedNarration, setSelectedNarration] = useState(null)
  function handleClick(hit, order) {
    setSearchByFactorInds([])
    // console.log("click", hit)
    if(hit === selected) {
      setSelected(null) 
      setSelectedOrder(null)
      setSimSearch(null)
    } else if(hit) {
      setSelected(hit)
      setSelectedOrder(order)
      // Region SimSearch
      SimSearchRegion(hit, order, layer, setSimSearchMethod).then((result) => {
        setSimSearch(result)
        setSimSearchDetailLevel(result.initialDetailLevel)
      })
      NarrateRegion(hit, order).then((result) => {
        setSelectedNarration(result.narrationRanks)
      })
    }
  }

  const [searchByFactorIndices, setSearchByFactorInds] = useState([])
  function handleLegendFactorClick(newSearchByFactorIndices) {
    setSearchByFactorInds(newSearchByFactorIndices)
    SimSearchByFactor(newSearchByFactorIndices, zoom.order).then((result) => {
      setSelected(null)
      setSelectedOrder(zoom.order)
      setSimSearch(result)
      setSimSearchDetailLevel(result.initialDetailLevel)
    })
  }

  // keybinding that closes the modal on escape
  useEffect(() => {
    function handleKeyDown(e) {
      if(e.key === "Escape") {
        handleModalClose()
      }
    }
    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    }
  }, [])

  function handleModalClose() {
    setRegion(null)
    setSelected(null)
    setSelectedOrder(null)
    setSimSearch(null)
    setSimSearchMethod(null)
    setSearchByFactorInds([])
  }

  const [showHilbert, setShowHilbert] = useState(false)
  const handleChangeShowHilbert = (e) => {
    setShowHilbert(!showHilbert)
  }
  
  const [showGenes, setShowGenes] = useState(true)
  const handleChangeShowGenes = (e) => {
    setShowGenes(!showGenes)
  }

  // changing the region changes the zoom and will also highlight on the map
  const [region, setRegion] = useState(null)

  function handleChangeLocationViaAutocomplete(autocompleteRegion) {
    if (!autocompleteRegion) return
    console.log(`autocompleteRegion ${JSON.stringify(autocompleteRegion)}`);
    setRegion({
      chromosome: autocompleteRegion.chrom, 
      start: autocompleteRegion.start, 
      end: autocompleteRegion.stop 
      // order: ...
    })
  }

  // number state for orderOffset
  const [orderOffset, setOrderOffset] = useState(0)

  const [data, setData] = useState(null)
  function onData(payload) {
    // console.log("got some data", payload)
    setData(payload)
  }

  return (
    <>
      <div className="title">gilbert</div>

      <div className="zoomto">
        <Autocomplete onChangeLocation={handleChangeLocationViaAutocomplete} />
      </div>

      <div className="panels">
        <div ref={containerRef} className="hilbert-container">
          <HilbertGenome 
            orderMin={orderDomain[0]}
            orderMax={orderDomain[1]}
            zoomMin={zoomExtent[0]}
            zoomMax={zoomExtent[1]}
            width={width} 
            height={height}
            zoomToRegion={region}
            zoomDuration={1000}
            activeLayer={layer}
            orderOffset={orderOffset}
            pinOrder={region?.order}
            layers={layers}
            SVGRenderers={[
              SVGChromosomeNames({ }),
              showHilbert && SVGHilbertPaths({ stroke: "black", strokeWidthMultiplier: 0.1, opacity: 0.5}),
              SVGSelected({ hit: hover, stroke: "black", highlightPath: true, strokeWidthMultiplier: 0.1, showGenes }),
              SVGSelected({ hit: selected, stroke: "orange", strokeWidthMultiplier: 0.4, showGenes: false }),
              // TODO: highlight search region (from autocomplete)
              // SVGSelected({ hit: region, stroke: "gray", strokeWidthMultiplier: 0.4, showGenes: false }),
              ...DisplaySimSearchRegions({ 
                simSearch: simSearch, 
                detailLevel: simSearchDetailLevel, 
                selectedRegion: region,
                order: selectedOrder, 
                color: "green", 
                width: 0.4, 
                showGenes: false 
              }),
              showGenes && SVGGenePaths({ stroke: "black", strokeWidthMultiplier: 0.1, opacity: 0.25}),
            ]}
            onZoom={handleZoom}
            onHover={handleHover}
            onClick={handleClick}
            onData={onData}
            // onLayer={handleLayer}
            debug={false}
          />
        </div>
        <LensModal
          layers={layers}
          currentLayer={layer}
          setLayerOrder={setLayerOrder}
          setLayer={setLayer}
          setLayerLock={setLayerLock}
          layerLock={layerLock}
          order={zoom.order}
        />
        <LayerLegend 
          data={data}
          hover={hover}
          handleLegendFactorClick={handleLegendFactorClick}
          searchByFactorIndices={searchByFactorIndices}
        />
        <ZoomLegend 
          k={zoom.transform.k} 
          height={height} 
          effectiveOrder={zoom.order}
          orderDomain={orderDomain} 
          zoomExtent={zoomExtent} />
        <SelectedModal
          width={480}
          height={height} 
          selected={selected} // currently selected cell
          selectedOrder={selectedOrder} 
          simSearch={simSearch}
          selectedNarration={selectedNarration}
          simSearchDetailLevel={simSearchDetailLevel}
          setSimSearchDetailLevel={setSimSearchDetailLevel}
          searchByFactorIndices={searchByFactorIndices}
          simSearchMethod={simSearchMethod}
          setRegion={setRegion}
          setHover={handleHover}
          hover={hover}
          layer={layer} 
          order={zoom.order}
          zoom={zoom} 
          layers={layers}
          onClose={handleModalClose} />
      </div>
      <div>
        <LinearTracks 
          state={data} 
          width={width} 
          hovered={hover} 
          selected={selected} 
          setHovered={handleHover} />
        <StatusBar 
          width={width + 500 + 12 + 30} 
          hover={hover} // the information about the cell the mouse is over
          layer={layer} 
          zoom={zoom} 
          onLayer={handleLayer}
          layers={layers} />
        <div className="vis-controls">
          <label>
            <input type="checkbox" checked={showHilbert} onChange={handleChangeShowHilbert} />
            Show Hilbert Curve
          </label>
          <label>
            <input type="checkbox" checked={showGenes} onChange={handleChangeShowGenes} />
            Show Gene Overlays
          </label>
          <label>
            <input type="checkbox" checked={layerLock} onChange={handleChangeLayerLock} />
            Layer lock
          </label>
          {/* this is an input that adds or subtracts to the calculated order */}
          <label>
            Order Offset ({orderOffset}, effective order {zoom.order})
            <input type="range" min={-2} max={2} value={orderOffset} onChange={(e) => setOrderOffset(+e.target.value)} />
          </label>
        </div>
      </div>
    </>
  )
}

export default App
