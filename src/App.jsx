import './App.css'

import {useEffect, useState} from 'react'

// base component
import HilbertGenome from './components/HilbertGenome'
// rendering components
import DebugRects from './components/DebugRects'
import HilbertPaths from './components/HilbertPaths'
// layer configurations
import Bands from './layers/bands'

function App() {

  // TODO: make sure bbox filtering works with window resizing
  const [width, height] = useWindowSize();
  function useWindowSize() {
  //   const [size, setSize] = useState([800, 800]);
  //   useEffect(() => {
  //     function updateSize() {
  //       setSize([window.innerWidth, window.innerHeight]);
  //     }
  //     window.addEventListener('resize', updateSize);
  //     updateSize();
  //     return () => window.removeEventListener('resize', updateSize);
  //   }, []);
  //   return size;
    return [800, 800]
  }

  console.log("BANDS", Bands)
  const layerConfig = {
    baseURL: "https://storage.googleapis.com/fun-data/hilbert/chromosomes",
    "Bands": Bands,
  }

  return (
    <>
      <h1>Hilbert Genome</h1>

      <HilbertGenome 
        orderDomain={[4, 14]} 
        zoomExtent={[0.85, 4000]} 
        width={width} 
        height={height}
        activeLayer="Bands"
        LayerConfig={layerConfig}
        SVGRenderers={[
          DebugRects({ stroke: "gray", fill:"none" }),
          HilbertPaths({ stroke: "black", strokeWidthMultiplier: 0.1}),
        ]}
        debug={true}
      />
    </>
  )
}

export default App
