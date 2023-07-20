import './App.css'

import {useEffect, useState, useRef, useCallback} from 'react'

// base component
import HilbertGenome from './components/HilbertGenome'
// rendering components
import SVGHilbertPaths from './components/SVGHilbertPaths'
import SVGGenePaths from './components/SVGGenePaths'
import ZoomLegend from './components/ZoomLegend'
import StatusBar from './components/StatusBar'
import SelectedModal from './components/SelectedModal'
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
import Chromatin_OE_Chi from './layers/chromatin_oe_chi'
import Chromatin_States_Sfc from './layers/chromatin_states_sfc'
import TF_Motifs_OE_Chi from './layers/tf_motifs_oe_chi'
import TF_Motifs_Sfc from './layers/tf_motifs_sfc'
import DHS_mapped_TF_motifs_sfc from './layers/dhs_mapped_tf_motifs_sfc'
import UKBB from './layers/ukbb'
import UKBB_Counts from './layers/ukbb_counts'
// autocomplete
import Autocomplete from './components/Autocomplete/Autocomplete'
// region narration
import NarrateRegion from './components/Narration/NarrateRegion'
import DisplayNarratedRegions from './components/Narration/DisplayNarratedRegions'

const layers = [
  Bands, 
  GeneCounts,
  GCContent,
  Nucleotides,
  DHS_OE_Chi,
  DHS_Components_Sfc,
  Chromatin_OE_Chi,
  Chromatin_States_Sfc,
  TF_Motifs_OE_Chi,
  TF_Motifs_Sfc,
  DHS_mapped_TF_motifs_sfc,
  UKBB,
  UKBB_Counts
]

const layerOrder = {
  4: Bands,
  5: DHS_Components_Sfc,
  6: DHS_Components_Sfc,
  7: Chromatin_States_Sfc,
  8: Chromatin_States_Sfc,
  9: TF_Motifs_OE_Chi,
  10: TF_Motifs_OE_Chi,
  11: GCContent,
  12: GCContent,
  13: GCContent,
  14: Nucleotides,
}


function App() {
  const orderDomain = [4, 14]
  const zoomExtent = [0.85, 4000]

  const containerRef = useRef()

  // let's fill the container and update the width and height if window resizes
  const [width, height] = useWindowSize();
  function useWindowSize() {
    const [size, setSize] = useState([800, 800]);
    useEffect(() => {
      function updateSize() {
        if(!containerRef.current) return
        let { height } = containerRef.current.getBoundingClientRect()
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
    setSelected(null)
    setSelectedOrder(null)
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

  const [selected, setSelected] = useState(null)
  const [selectedOrder, setSelectedOrder] = useState(null)
  const [selectedNarration, setSelectedNarration] = useState(null)
  function handleClick(hit, order) {
    console.log("click", hit)
    if(hit === selected) {
      setSelected(null) 
      setSelectedOrder(null)
      setSelectedNarration(null)
    } else {
      setSelected(hit)
      setSelectedOrder(order)
      // Region Narration
      NarrateRegion(hit, order).then((result) => {
        setSelectedNarration(result)
      })
    }
  }

  function handleModalClose() {
    setSelected(null)
    setSelectedOrder(null)
    setSelectedNarration(null)
  }

  const [showHilbert, setShowHilbert] = useState(false)
  const handleChangeShowHilbert = (e) => {
    setShowHilbert(!showHilbert)
  }
  
  const [showGenes, setShowGenes] = useState(true)
  const handleChangeShowGenes = (e) => {
    setShowGenes(!showGenes)
  }

  const [region, setRegion] = useState(null)

  function handleChangeLocationViaAutocomplete(autocompleteRegion) {
    if (!autocompleteRegion) return
    console.log(`autocompleteRegion ${JSON.stringify(autocompleteRegion)}`);
    setRegion({
      chromosome: autocompleteRegion.chrom, 
      start: autocompleteRegion.start, 
      end: autocompleteRegion.stop 
    })
  }

  return (
    <>

      <div className="title">Hilbert Genome</div>

      <div className="zoomto">
        <Autocomplete onChangeLocation={handleChangeLocationViaAutocomplete} />
      </div>

      <div className="panels">
        <div ref={containerRef} className="hilbert-container">
          <HilbertGenome 
            orderDomain={orderDomain} 
            zoomExtent={zoomExtent} 
            width={width} 
            height={height}
            zoomToRegion={region}
            zoomDuration={1000}
            activeLayer={layer}
            layers={layers}
            SVGRenderers={[
              SVGChromosomeNames({ }),
              showHilbert && SVGHilbertPaths({ stroke: "black", strokeWidthMultiplier: 0.1, opacity: 0.5}),
              SVGSelected({ hit: hover, stroke: "black", strokeWidthMultiplier: 0.1, showGenes }),
              SVGSelected({ hit: selected, stroke: "orange", strokeWidthMultiplier: 0.4, showGenes: false }),
              ...DisplayNarratedRegions(selectedNarration, 0, selectedOrder, "green", 0.4, showGenes),
              showGenes && SVGGenePaths({ stroke: "black", strokeWidthMultiplier: 0.1, opacity: 0.25}),
            ]}
            onZoom={handleZoom}
            onHover={handleHover}
            onClick={handleClick}
            // onLayer={handleLayer}
            debug={false}
          />
        </div>
        <ZoomLegend 
          k={zoom.transform.k} 
          height={height} 
          orderDomain={orderDomain} 
          zoomExtent={zoomExtent} />
        <SelectedModal
          width={480}
          height={height} 
          selected={selected} // currently selected cell
          selectedOrder={selectedOrder} 
          selectedNarration={selectedNarration}
          narrationDetailLevel={0}
          setRegion={setRegion}
          layer={layer} 
          zoom={zoom} 
          layers={layers}
          onClose={handleModalClose} />
      </div>
      <div>
        <StatusBar 
          width={width + 500} 
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
        </div>
        <pre>
          {JSON.stringify({ order: zoom.order, transform: zoom.transform }, null, 2)}
        </pre>
      </div>
    </>
  )
}

export default App
