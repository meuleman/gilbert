import { useEffect, useState, useRef, useMemo, useCallback } from 'react';
import { Link } from 'react-router-dom';
import GilbertLogo from '../assets/gilbert-logo.svg?react';
import axios from "axios";

import { extent, group } from 'd3-array';

import './YC240322.css';

import Scatter from '../components/Scatter';
import HilbertGenome from '../components/HilbertGenome'
import ZoomLegend from '../components/ZoomLegend';
import SVGChromosomeNames from '../components/SVGChromosomeNames'
// import SVGSelected from '../components/SVGSelected'
// import DisplayExampleRegions from '../components/ExampleRegions/DisplayExampleRegions'
// import RegionMask from '../components/RegionMask'
import useCanvasFilteredRegions from '../components/Canvas/FilteredRegions';
import useCanvasAnnotationRegions from '../components/Canvas/Annotation';



import { useZoom } from '../contexts/zoomContext';

import { hilbertPosToOrder } from '../lib/HilbertChromosome';
import { showPosition } from '../lib/display';
import { urlify, fromPosition } from '../lib/regions';

import dhs from '../layers/dhs_components_sfc_max';
import chromatin_states from '../layers/chromatin_states_sfc_max';
import tf from '../layers/tf_motifs_sfc_max';
const layers = {
  "DHS": dhs,
  "chromatin_states": chromatin_states,
  "TF": tf,
}
import {fullList as layersAll} from '../layers'
import lenses from '../components/Lenses/lenses.json'

// ---------------- DUCK DB INITIALIZATION ----------------
// TODO: make this import only happen on the umap page. not too slow to load tho
import * as duckdb from '@duckdb/duckdb-wasm';
import duckdb_wasm from '@duckdb/duckdb-wasm/dist/duckdb-mvp.wasm?url';
import mvp_worker from '@duckdb/duckdb-wasm/dist/duckdb-browser-mvp.worker.js?url';
import duckdb_wasm_next from '@duckdb/duckdb-wasm/dist/duckdb-eh.wasm?url';
import eh_worker from '@duckdb/duckdb-wasm/dist/duckdb-browser-eh.worker.js?url';

const MANUAL_BUNDLES = {
    mvp: {
        mainModule: duckdb_wasm,
        mainWorker: mvp_worker,
    },
    eh: {
        mainModule: duckdb_wasm_next,
        // mainWorker: new URL('@duckdb/duckdb-wasm/dist/duckdb-browser-eh.worker.js', import.meta.url).toString(),
        mainWorker: eh_worker
    },
};
// Select a bundle based on browser checks
const bundle = await duckdb.selectBundle(MANUAL_BUNDLES);
// Instantiate the asynchronus version of DuckDB-wasm
const worker = new Worker(bundle.mainWorker);
const logger = new duckdb.ConsoleLogger();
const db = new duckdb.AsyncDuckDB(logger, worker);
await db.instantiate(bundle.mainModule, bundle.pthreadWorker);
// ---------------- END DUCK DB INITIALIZATION ----------------


const YC240322 = () => {
  const [conn, setConn] = useState(null);
  const [loading, setLoading] = useState(false)
  const [umap, setUmap] = useState(null)
  const [annotations, setAnnotations] = useState(null)
  const [points, setPoints] = useState(null)

  const [order, setOrder] = useState("all") // 4 to 12 or all
  // const orders = ["all", "4", "5", "6", "7", "8", "9", "10", "11", "12"]
  const orders = ["all"]
  const [umapOrder, setUmapOrder] = useState(4) // 4 to 12
  const [layerColumn, setLayerColumn] = useState("all") // "DHS", "TF", "chromatin_states", "all"
  const layerColumns = ["all", "DHS", "TF", "chromatin_states"]

  const [selected, setSelected] = useState([])
  const [hovered, setHovered] = useState(null)

  const { order: zoomOrder, transform, orderOffset, setOrderOffset, zoomMin, zoomMax, orderMin, orderMax } = useZoom()
  const zoomExtent = useMemo(() => [zoomMin, zoomMax], [zoomMin, zoomMax])
  const orderDomain= useMemo(() => [orderMin, orderMax], [orderMin, orderMax])

  // const duration = useMemo(() => 1000, [])

  const loadingRef = useRef(loading)
  const containerRef = useRef(null)

  const [mapWidth, height] = useWindowSize();
  function useWindowSize() {
    const [size, setSize] = useState([800, 800]);
    useEffect(() => {
      function updateSize() {
        if(!containerRef.current) return
        const { height, width } = containerRef.current.getBoundingClientRect()
        console.log(containerRef.current.getBoundingClientRect())
        console.log("width x height", width, height)
        // 150 is width for zoom legend
        let mw = Math.floor(width - 150)/2
        console.log("map width", mw)
        setSize([mw, height]);
      }
      window.addEventListener('resize', updateSize);
      updateSize();
      return () => window.removeEventListener('resize', updateSize);
    }, []);
    return size;
  }

  useEffect(() => { document.title = `Gilbert | UMAP`}, [])

  // fetch umap parquet
  useEffect(() => {
    if(!loadingRef.current) { // just to make sure we don't kick off original query twice
      loadingRef.current = true;
      db.connect().then((c) => setConn(c)) // Connect to db
    }
  }, []); 

  // query the umap coords
  useEffect(() => {
    if(conn) {
      console.log("query umap")
      setLoading(true)
      // conn.query("SELECT * FROM 'https://storage.googleapis.com/fun-data/hilbert/YC240322/YC240322_umap_coords.parquet'").then((res) => {
      conn.query("SELECT * FROM 'https://resources.altius.org/~ychoi/20241101_gilbert_umap/Order-5/YC20241104-umap.parquet'").then((res) => {
        console.log("got rows")
        let rows = res.toArray().map(Object.fromEntries)
          .map(d => {
            return {
              chromosome: d["Chromosome"],
              start: Number(d["Start"]),
              end: Number(d["End"]),
              x: Number(d["UMAP-1"]),
              y: Number(d["UMAP-2"]),
              AbsIndex: Number(d["AbsIndex"]),
            }
          })
        console.log("normalize rows")
        const x_ext = extent(rows, d => d.x)
        const y_ext = extent(rows, d => d.y)
        rows.forEach((d) => {
          d.x = (d.x - x_ext[0]) / (x_ext[1] - x_ext[0]) * 2 - 1
          d.y = (d.y - y_ext[0]) / (y_ext[1] - y_ext[0]) * 2 - 1
        })
        rows.columns = res.schema.fields.map((d) => d.name);
        console.log("umap", rows)
        // post-process the rows into schema
        setUmap(rows)
      }).catch((err) => {
        console.error("err", err)
      })
    }

  }, [conn])

  useEffect(() => {
    if(conn) {
      console.log("querying annotations", order)
      setLoading(true)
      // conn.query(`SELECT * FROM 'https://storage.googleapis.com/fun-data/hilbert/YC240322/YC240322_annot-${order}.parquet'`).then((res) => {
      // conn.query(`SELECT * FROM 'https://resources.altius.org/~ychoi/20241016_gilbert_umap/YC20241017-annot-${order}.parquet'`).then((res) => {
      conn.query(`SELECT * FROM 'https://resources.altius.org/~ychoi/20241101_gilbert_umap/Order-5/YC20241104-annot-${order}-factor.parquet'`).then((res) => {
        console.log("got rows", order)
        let rows = res.toArray().map(Object.fromEntries)
        .map(d => {
          const keys = Object.keys(d)
          return {
            all: d[keys[0]],
            TF: d[keys[1]],
            DHS: d[keys[2]],
            chromatin_states: d[keys[3]],
          }
        })
        console.log("annotations", rows)
        setAnnotations(rows)
      })
    }
  }, [conn, order])

  useEffect(() => {
    if(umap && annotations) {
      console.log("setting points")
      let domain;
      if(layerColumn == "all") {
        domain = ["NA"].concat(dhs.fieldColor.domain().concat(tf.fieldColor.domain()).concat(chromatin_states.fieldColor.domain()))
      } else {
        const layer = layers[layerColumn]
        domain = ["NA"].concat(layer.fieldColor.domain())
      }
      console.log("DOMAIN", domain)
      // console.log("layer", layer, layer.fieldColor.domain(), layer.fieldColor.range())
      let pts = umap.map((d,i) => {
        let ant = annotations[i][layerColumn]
        return [d.x, d.y, domain.indexOf(ant)]
      })
      console.log("points", pts)
      setLoading(false)
      setPoints(pts)
    }
  }, [umap, annotations, layerColumn])

  const [pointColor, setPointColor] = useState(null)
  const [pointSize, setPointSize] = useState(2)
  const [pointOpacity, setPointOpacity] = useState(0.5)
  useEffect(() => {
    if(layerColumn == "all") {
      setPointColor(["#222"].concat(dhs.fieldColor.range().concat(tf.fieldColor.range()).concat(chromatin_states.fieldColor.range())))
    } else {
      setPointColor(["#222"].concat(layers[layerColumn].fieldColor.range()))
    }
  }, [layerColumn])

  const [layer, setLayer] = useState(dhs)
  const [layerOrder, setLayerOrder] = useState(null)
  // const [zoom, setZoom] = useState({order: 4, points: [], bbox: {}, transform: {}})

  useEffect(() => {
    const lo = {...lenses["Integrative"]}
    if(layerColumn == "all"){
      Object.keys(lo).forEach(o => {
        lo[o] = layersAll.find((d) => d.name == lo[o])
      })
      setLayerOrder(lo)
      if(zoomOrder) {
        let l = lo[zoomOrder]
        setLayer(l)
      }
    } else {
      Object.keys(lo).forEach(o => {
        lo[o] = layers[layerColumn]
      })
      setLayerOrder(lo)
      setLayer(layers[layerColumn])
    }
  }, [layerColumn, zoomOrder])

  // const handleZoom = useCallback((newZoom) => {
  //   console.log("handleZoom", newZoom)
  //   setZoom(newZoom)
  // }, [setZoom])
  
  useEffect(() => {
    console.log("layer change", layer)
  }, [layer])
  // useEffect(() => {
  //   console.log("zoom", zoom)
  // }, [zoom])


  useEffect(() => {
    console.log("pointColor", pointColor)
  }, [pointColor])

  const [selectedRegionSample, setSelectedRegionSample] = useState([])
  useEffect(() => {
    console.log("selected", selected)
    setSelectedRegionSample(selected.slice(0, 1000).map((d) => fromPosition(umap[d].chromosome, umap[d].start, umap[d].end)))
  }, [selected, umap])

  const [sharedFactor, setSharedFactor] = useState(null)
  const [sharedFactorLoading, setSharedFactorLoading] = useState(null)
  useEffect(() => {
    if(selectedRegionSample.length > 0){
      let url = "https://explore.altius.org:5001/get_shared_factor"
      const postBody = {
        chr_strs: selectedRegionSample.map(d => d.chromosome + ":" + d.start + "-" + d.end),
      };
      console.log(postBody)
      setSharedFactorLoading(true)
      const getSharedFactor = axios({
        method: 'POST',
        url: url,
        data: postBody
      }).then((response) => {
          const sharedFactorData = response.data
          setSharedFactor(sharedFactorData)
          const sharedFactorPercentage = sharedFactorData.SharedFactorPercentage
          const meanSharedFactorPercentage = sharedFactorData.MeanSharedFactorPercentage
          console.log("Shared factors for Selected Region Sample", sharedFactor, sharedFactorPercentage, meanSharedFactorPercentage)
          setSharedFactor(sharedFactor)
          setSharedFactorLoading(false)
      })
      .catch((err) => {
        console.error(`error:     ${JSON.stringify(err)}`);
        console.error(`post body: ${JSON.stringify(postBody)}`);
      });
    }
  }, [selectedRegionSample])

  
  const [GroupNarration, setGroupNarration] = useState(null)
  const [GroupNarrationLoading, setGroupNarrationLoading] = useState(null)
  useEffect(() => {
    if(selectedRegionSample.length > 0){
      let url = "https://explore.altius.org:5001/narrate_regions"
      const postBody = {
        chr_strs: selectedRegionSample.map(d => d.chromosome + ":" + d.start + "-" + d.end),
      };
      console.log(postBody)
      setGroupNarrationLoading(true)
      const getGroupNarration = axios({
        method: 'POST',
        url: url,
        data: postBody
      }).then((response) => {
          const GroupNarrationData = response.data
          const GroupNarration = GroupNarrationData.ComponentNarration
          const GroupNarrationSupport = GroupNarrationData.Support
          console.log("Grouped Narration", GroupNarration, GroupNarrationSupport)
          setGroupNarration(GroupNarration)
          setGroupNarrationLoading(false)
      })
      .catch((err) => {
        console.error(`error:     ${JSON.stringify(err)}`);
        console.error(`post body: ${JSON.stringify(postBody)}`);
      });
    }
  }, [selectedRegionSample])


  const [UpdatedUMAP, setUpdatedUMAP] = useState(null)
  const [UpdatedUMAPLoading, setUpdatedUMAPLoading] = useState(null)
  useEffect(() => {
    if(selectedRegionSample.length > 0){
      let url = "https://explore.altius.org:5001/get_filtered_umap"
      const postBody = {
        chr_strs: selectedRegionSample.map(d => d.chromosome + ":" + d.start + "-" + d.end),
        current_order: umapOrder,
        target_order: umapOrder + 1,
      };
      console.log(postBody)
      setUpdatedUMAPLoading(true)
      const getUpdatedUMAP = axios({
        method: 'POST',
        url: url,
        data: postBody
      }).then((response) => {
          setUpdatedUMAPLoading(response.umap)
          console.log("Grouped Narration", UpdatedUMAP, UpdatedUMAPSupport)
          setUpdatedUMAP(UpdatedUMAP)
          setUpdatedUMAPLoading(false)
      })
      .catch((err) => {
        console.error(`error:     ${JSON.stringify(err)}`);
        console.error(`post body: ${JSON.stringify(postBody)}`);
      });
    }
  }, [selectedRegionSample])




  const [hover, setHover] = useState(null)
  useEffect(() => {
    // console.log("hovered", hovered)
    if(hovered && umap[hovered]){
      const h = fromPosition(umap[hovered].chromosome, umap[hovered].start, umap[hovered].end, zoomOrder)
      // console.log("set hover", h)
      setHover(h)
    }
  }, [hovered, zoomOrder, umap, setHover])

  const [selectedRegionSampleByCurrentOrder, setSelectedRegionSampleByCurrentOrder] = useState(new Map())
  // group the top regions found through filtering by the current order
  useEffect(() => {
    let regions = selectedRegionSample
    if(regions?.length) {
      const groupedAllRegions = group(
        regions, 
        d => d.chromosome + ":" + (d.order > zoomOrder ? hilbertPosToOrder(d.i, {from: d.order, to: zoomOrder}) : d.i))
      setSelectedRegionSampleByCurrentOrder(groupedAllRegions)

    } else {
      // console.log("no regions!!")
      setSelectedRegionSampleByCurrentOrder(new Map())
    }
  }, [zoomOrder, selectedRegionSample])



  const drawSelectedRegionSample = useCanvasFilteredRegions(selectedRegionSampleByCurrentOrder, { color: "orange", opacity: 1, strokeScale: 1, mask: true })
  const drawAnnotationRegionHover = useCanvasAnnotationRegions(hover, "hover", { 
    // if there is an activeSet and no paths in the hover, lets make it lightgray to indicate you can't click on it
    stroke: "black",//activeSet && !activeInHovered?.length ? "lightgray" : "black", 
    radiusMultiplier: 1, 
    strokeWidthMultiplier: 0.3, 
    showGenes: false, 
    highlightPath: true 
  })

  const canvasRenderers = useMemo(() => [
    drawSelectedRegionSample,
    drawAnnotationRegionHover,
  ], [
    drawSelectedRegionSample,
    drawAnnotationRegionHover,
  ]);

  return (
    <div className="umap-grid">
      <div className="header">
        <div className="header--brand">
          <GilbertLogo height="50" width="auto" />
        </div>
        <div className="header--navigation">
            {/* <Link to="/">Back to map</Link> */}
        </div>
      </div>
      <div className="asdf"></div>
      <div className="content" ref={containerRef}>
        <div className="umap-container" style={{width: mapWidth+"px"}}>
          {loading ? <span className="loading">Loading</span> : ""}
          {points && <Scatter
            width={mapWidth}
            height={height}
            points={points}
            pointColor={pointColor}
            pointSize={pointSize}
            opacity={pointOpacity}
            onSelect={setSelected}
            onHover={setHovered}
          />}
        </div>
        <div className="hilbert-container">
          <HilbertGenome 
            orderMin={orderDomain[0]}
            orderMax={orderDomain[1]}
            zoomMin={zoomExtent[0]}
            zoomMax={zoomExtent[1]}
            width={mapWidth} 
            height={height}
            activeLayer={layer}
            CanvasRenderers={canvasRenderers}
            SVGRenderers={[
              SVGChromosomeNames({ }),
              // SVGSelected({ hit: hover, dataOrder: zoomOrder, stroke: "black", highlightPath: true, type: "hover", strokeWidthMultiplier: 0.1, showGenes: false }),
              // RegionMask({ regions: selectedRegionSample, overrideOrder: zoomOrder}),
              // ...DisplayExampleRegions({
              //   exampleRegions: selectedRegionSample,
              //   order: zoomOrder,
              //   width: 0.1,
              //   radiusMultiplier: 0.5,
              //   color: "black",
              //   numRegions: 100,
              // }),
            ]}
            // onZoom={handleZoom}
            // onHover={handleHover}
            // onClick={handleClick}
            // onData={onData}
            // onZooming={(d) => setIsZooming(d.zooming)}
            // debug={showDebug}
          />
        </div>
        <div className="zoom-legend-container">
        <ZoomLegend 
            k={transform.k} 
            height={height} 
            effectiveOrder={zoomOrder}
            zoomExtent={zoomExtent} 
            orderDomain={orderDomain} 
            layerOrder={layerOrder}
            layer={layer}
            // layerLock={layerLock}
            // lensHovering={lensHovering}
            // selected={selected}
            // hovered={hover}
            // crossScaleNarration={csn}
            // onZoom={(region) => { 
            //   setRegion(null); 
            //   const hit = fromPosition(region.chromosome, region.start, region.end)
            //   setRegion(hit)
            //   // setSelected(hit)
            // }}
          />
        </div>
      </div>
      <div className="footer">
        <label>
          Order:
          <select value={order} onChange={(e) => setOrder(e.target.value)}>
            {orders.map((d) => <option key={d} value={d}>{d}</option>)}
          </select>
        </label>
        <label>
          Layer:
          <select value={layerColumn} onChange={(e) => setLayerColumn(e.target.value)}>
            {layerColumns.map((d) => <option key={d} value={d}>{d}</option>)}
          </select>
          <br></br>
        </label>
        {hovered && <span className="hovered">
          {showPosition(umap[hovered])} 
          <span className="annotations">
            <span className="annotation" style={{fontWeight: layerColumn == "DHS" ? "bold" : "normal"}}>DHS: {annotations[hovered]["DHS"]}</span> 
            <span className="annotation" style={{fontWeight: layerColumn == "TF" ? "bold" : "normal"}}>TF: {annotations[hovered]["TF"]}</span> 
            <span className="annotation" style={{fontWeight: layerColumn == "chromatin_states" ? "bold" : "normal"}}>CS: {annotations[hovered]["chromatin_states"]}</span> 
            <span className="annotation" style={{fontWeight: layerColumn == "all" ? "bold" : "normal"}}>all: {annotations[hovered]["all"]}</span> 
          </span>
        </span>}
        <br></br>
        <span className="selected">
          {selected.length} selected
        </span>
        {selected.length && <div className="selected-popup">
          <div className="selected-header">
            <button onClick={() => setSelected([])}>Clear</button>
            <span className="selected-count">Showing {selected.slice(0, 1000).length} of {selected.length}</span>
          </div>

          {/* <div>{GroupNarrationLoading ? " Loading..." : GroupNarration}</div> */}

          console.log("UMAP", umap)

          {GroupNarration && GroupNarration.map((narration, index) => (
            <span key={index}>{narration}{index < GroupNarration.length - 1 ? ', ' : ''}</span>
          ))}

          {selected.slice(0, 1000).map((d) => {
            let region = fromPosition(umap[d].chromosome, umap[d].start, umap[d].end)
            return <div className="selected-region" key={d}>
              {showPosition(region)} 
              <span className="links">
                <Link to={`/?region=${urlify(region)}`} target="_blank"> 🗺️ </Link>
                <Link to={`/region?region=${urlify(region)}`} target="_blank"> 📄 </Link>
              </span>
              <span className="annotations">
                <span className="annotation" style={{fontWeight: layerColumn == "DHS" ? "bold" : "normal"}}>DHS: {annotations[d]["DHS"]}</span> 
                <span className="annotation" style={{fontWeight: layerColumn == "TF" ? "bold" : "normal"}}>TF: {annotations[d]["TF"]}</span> 
                <span className="annotation" style={{fontWeight: layerColumn == "chromatin_states" ? "bold" : "normal"}}>CS: {annotations[d]["chromatin_states"]}</span> 
                <span className="annotation" style={{fontWeight: layerColumn == "all" ? "bold" : "normal"}}>all: {annotations[d]["all"]}</span> 
              </span>
          </div>})}
        </div>}
      </div>
    </div>
  );
};

export default YC240322;
