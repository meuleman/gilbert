import './App.css'

import {useEffect, useState, useRef} from 'react'

// base component
import HilbertGenome from './components/HilbertGenome'
// rendering components
import SVGHilbertPaths from './components/SVGHilbertPaths'
import ZoomLegend from './components/ZoomLegend'
// import SVGBBox from './components/SVGBBox'
// layer configurations
import Bands from './layers/bands'

const layerConfig = {
  baseURL: "https://storage.googleapis.com/fun-data/hilbert/chromosomes",
  "Bands": Bands,
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
        let { width, height } = containerRef.current.getBoundingClientRect()
        // setSize([window.innerWidth, window.innerHeight]);
        setSize([width, height]);
      }
      window.addEventListener('resize', updateSize);
      updateSize();
      return () => window.removeEventListener('resize', updateSize);
    }, []);
    return size;
  }

  // 
  const [zoom, setZoom] = useState({order: 4, points: [], bbox: {}, transform: {}})
  function handleZoom(zoom) {
    setZoom(zoom)
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
            activeLayer="Bands"
            LayerConfig={layerConfig}
            SVGRenderers={[
              // SVGBBox({ stroke: "red", fill:"none" }),
              SVGHilbertPaths({ stroke: "black", strokeWidthMultiplier: 0.1}),
            ]}
            onZoom={handleZoom}
            debug={false}
          />
        </div>
        <ZoomLegend 
          k={zoom.transform.k} 
          height={height} 
          orderDomain={orderDomain} 
          zoomExtent={zoomExtent} />
      </div>
      <div>
        
        <pre>
          {JSON.stringify({ order: zoom.order, points: zoom.points?.length }, null, 2)}
        </pre>
      </div>
    </>
  )
}

export default App
