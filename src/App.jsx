import './App.css'

import {useEffect, useState, useRef} from 'react'

// base component
import HilbertGenome from './components/HilbertGenome'
// rendering components
import SVGHilbertPaths from './components/SVGHilbertPaths'
import ZoomLegend from './components/ZoomLegend'
import StatusBar from './components/StatusBar'
import SelectedModal from './components/SelectedModal'
import SVGSelected from './components/SVGSelected'
import SVGChromosomeNames from './components/SVGChromosomeNames'
// import SVGBBox from './components/SVGBBox'
// layer configurations
import Bands from './layers/bands'
import GCContent from './layers/gc_content'

const layerConfig = {
  baseURL: "https://storage.googleapis.com/fun-data/hilbert/chromosomes",
  layers: [
    Bands, 
    GCContent
  ]
}



function App() {
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
        let w = window.innerWidth - 30 - 24
        // console.log("sup", window.innerWidth, w, width)
        setSize([w, height]);
      }
      window.addEventListener('resize', updateSize);
      updateSize();
      return () => window.removeEventListener('resize', updateSize);
    }, []);
    return size;
  }

  // If the layer changes due to zooming, we want to let our other components know
  const [layer, setLayer] = useState(Bands)
  function handleLayer(l) {
    setLayer(l)
  }

  // We want to keep track of the zoom state
  const [zoom, setZoom] = useState({order: 4, points: [], bbox: {}, transform: {}})
  function handleZoom(zoom) {
    setZoom(zoom)
  } 
  
  // the hover can be null or the data in a hilbert cell
  const [hover, setHover] = useState(null)
  function handleHover(hit) {
    // console.log("hover", hit)
    setHover(hit)
  }

  const [selected, setSelected] = useState(null)
  const [selectedOrder, setSelectedOrder] = useState(null)
  function handleClick(hit, order) {
    console.log("click", hit)
    if(hit === selected) {
      setSelected(null) 
      setSelectedOrder(null)
    } else {
      setSelected(hit)
      setSelectedOrder(order)
    }
  }

  function handleModalClose() {
    setSelected(null)
    setSelectedOrder(null)
  }

  const orderDomain = [4, 14]
  const zoomExtent = [0.85, 4000]

  return (
    <>

      <h1>Hilbert Genome</h1>

      <div className="panels">
        <div ref={containerRef} className="hilbert-container">
          <HilbertGenome 
            orderDomain={orderDomain} 
            zoomExtent={zoomExtent} 
            width={width} 
            height={height}
            activeLayer={layer}
            LayerConfig={layerConfig}
            SVGRenderers={[
              SVGChromosomeNames({ }),
              SVGHilbertPaths({ stroke: "black", strokeWidthMultiplier: 0.1}),
              SVGSelected({ hit: hover, order: zoom.order, stroke: "black", strokeWidthMultiplier: 0.1 }),
              SVGSelected({ hit: selected, order: selectedOrder, stroke: "orange" })
            ]}
            onZoom={handleZoom}
            onHover={handleHover}
            onClick={handleClick}
            onLayer={handleLayer}
            debug={false}
          />
        </div>
        <ZoomLegend 
          k={zoom.transform.k} 
          height={height} 
          orderDomain={orderDomain} 
          zoomExtent={zoomExtent} />
        <SelectedModal
          height={height} 
          selected={selected} // currently selected cell
          selectedOrder={selectedOrder} 
          layer={layer} 
          zoom={zoom} 
          LayerConfig={layerConfig}
          onClose={handleModalClose} />
      </div>
      <div>
        <StatusBar 
          width={width} 
          hover={hover} // the information about the cell the mouse is over
          layer={layer} 
          zoom={zoom} 
          onLayer={handleLayer}
          LayerConfig={layerConfig} />
        <pre>
          {JSON.stringify({ order: zoom.order, transform: zoom.transform }, null, 2)}
        </pre>
      </div>
    </>
  )
}

export default App
