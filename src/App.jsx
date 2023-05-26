import './App.css'

import HilbertGenome from './components/HilbertGenome'
import DebugRects from './components/DebugRects'
import HilbertPaths from './components/HilbertPaths'

function App() {

  return (
    <>
      <h1>Hilbert Genome</h1>

      <HilbertGenome 
        orderDomain={[4, 14]} 
        zoomExtent={[0.85, 4000]} 
        width={800} 
        height={800}
        debug={true}
        SVGRenderers={[
          DebugRects({ stroke: "black", fill:"none" }),
          HilbertPaths({ stroke: "gray", strokeWidthMultiplier: 0.1}),
        ]}
      />
    </>
  )
}

export default App
