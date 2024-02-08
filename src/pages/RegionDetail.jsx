import { useState, useEffect, useCallback, useMemo } from 'react';
import { useParams, useLocation, useNavigate, Link } from 'react-router-dom';
import GilbertLogo from '../assets/gilbert-logo.svg?react';

import { showKb, showPosition } from '../lib/display';
import { urlify, jsonify, parsePosition, fromPosition } from '../lib/regions';
import { getGenesInCell, getGenesOverCell } from '../lib/Genes'
import { HilbertChromosome, hilbertPosToOrder } from "../lib/HilbertChromosome" 
import Data from '../lib/data';

import layers from '../layers'
import DHS_Components_Sfc_max from '../layers/dhs_components_sfc_max'
import Chromatin_States_Sfc_max from '../layers/chromatin_states_sfc_max';

import SimSearchRegion from '../components/SimSearch/SimSearchRegion'
import SelectedModalSimSearch from '../components/SimSearch/SelectedModalSimSearch'

import './RegionDetail.css';

const RegionDetail = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const queryParams = useMemo(() => new URLSearchParams(location.search), [location]);
  const region = useMemo(() => {return jsonify(queryParams.get('region'))}, [queryParams]);
  const fetchData = useMemo(() => Data({debug: false}).fetchData, []);

  const [inside, setInside] = useState([]);
  const [outside, setOutside] = useState([]);
  const [ranges, setRanges] = useState([]);
    
  // sim search related state
  const [simSearchDHS, setSimSearchDHS] = useState(null)
  const [simSearchChromatin, setSimSearchChromatin] = useState(null)
  const [factorsDHS, setFactorsDHS] = useState([])
  const [factorsChromatin, setFactorsChromatin] = useState([])
  const [similarDHSRegions, setSimilarDHSRegions] = useState([])
  const [similarChromatinRegions, setSimilarChromatinRegions] = useState([])
  const [similarBy, setSimilarBy] = useState('dhs')
  const [layersData, setLayersData] = useState([])

  useEffect(() => {
    if(region) {
      console.log("region", region)
      setInside(getGenesInCell(region, region.order))
      setOutside(getGenesOverCell(region, region.order))
      // grab the ranges before and after this region
      const hilbert = new HilbertChromosome(region.order)
      const rs = hilbert.fromRange(region.chromosome, region.i - 1, region.i + 1)
      console.log("ranges", rs)
      setRanges(rs)

      // fetch data for each layer
      const matchingLayers = layers.filter(d => d.orders[0] <= region.order && d.orders[1] >= region.order)
      const layersDataResult = Promise.all(matchingLayers.map((layer) => {
        // console.log("layer", layer)
        return fetchData(layer, region.order, rs)
      }))
      layersDataResult.then((response) => {
        console.log("LAYERS RESPONSE", response)
        setLayersData(response.map((d, i) => {
          return {
            layer: matchingLayers[i],
            data: d
          }
        }))
      })

      // Sim search on DHS
      SimSearchRegion(region, region.order, DHS_Components_Sfc_max, setFactorsDHS,[]).then((result) => {
        setSimSearchDHS(result)
        let similarRegions = result?.simSearch
        if(similarRegions && similarRegions.length)  {
          const similarRanges = similarRegions.map((d) => {
            const { chromosome, start, end } = parsePosition(d.coordinates)
            let range = fromPosition(chromosome, start, end)
            return range
          })
          console.log("similar dhs ranges", similarRanges)
        }
      })
      // Sim search on Chromatin States
      SimSearchRegion(region, region.order, Chromatin_States_Sfc_max, setFactorsChromatin, []).then((result) => {
        setSimSearchChromatin(result)
        let similarRegions = result?.simSearch
        if(similarRegions && similarRegions.length)  {
          const similarRanges = similarRegions.map((d) => {
            const { chromosome, start, end } = parsePosition(d.coordinates)
            let range = fromPosition(chromosome, start, end)
            return range
          })
          console.log("similar chromatin ranges", similarRanges)
        }
      })
    }
  }, [region])


  return (
    <div className="region-detail">
      <div className="header">
        <div className="header--brand">
          <GilbertLogo height="50" width="auto" />
        </div>
        <div className="header--navigation">
          <Link to={`/?region=${urlify(region)}`}>Back to map</Link>
        </div>
      </div>
      <div className="content">
        <div>Region
        </div>
        <div>
          {showPosition(region)}
          <br/>
          Order: {region.order}
          {/* {JSON.stringify(region)} */}
        </div>

        <div className="genes">
          <div>
            Genes inside region: {inside.length}
            {inside.length ? inside.map((d,i) => (
              <div key={d.hgnc} className="gene">
                <span className="hgnc">{d.hgnc}</span> &nbsp;
                {showPosition(d)}
              </div>)) 
            : null }
          </div>
          <div>
            Genes overlapping region: {outside.length}
          </div>
        </div>

        <h3>Similar regions</h3>
        <div className="radio-buttons">
          Show similar regions based on:
          <input type="radio" id="dhs" name="regionType" value="dhs" checked={similarBy === 'dhs'} onChange={() => setSimilarBy('dhs')}/>
          <label htmlFor="dhs">DHS</label>
          <input type="radio" id="chromatin" name="regionType" value="chromatin" checked={similarBy === 'chromatin'} onChange={() => setSimilarBy('chromatin')}/>
          <label htmlFor="chromatin">Chromatin</label>
        </div>
        { similarBy == "dhs" ? <div className="similar-dhs-regions">
            {simSearchDHS ? <SelectedModalSimSearch
              simSearch={simSearchDHS}
              searchByFactorInds={factorsDHS}
              handleFactorClick={(factor) => {console.log("dhs factor click", factor)}}
              onZoom={(region) => { console.log("dhs on zoom", region)}}
              selectedOrder={region?.order}
              setRegion={(region) => {console.log("dhs set region", region)}}
              setHover={(region) => {console.log("dhs set hover", region)}}
            /> : <div>No similar regions found</div>}
        </div>
        :
        <div className="similar-chromatin-regions">
            {simSearchChromatin ? <SelectedModalSimSearch
              simSearch={simSearchChromatin}
              searchByFactorInds={factorsChromatin}
              handleFactorClick={(factor) => {console.log("Chromatin factor click", factor)}}
              onZoom={(region) => { console.log("Chromatin on zoom", region)}}
              selectedOrder={region?.order}
              setRegion={(region) => {console.log("Chromatin set region", region)}}
              setHover={(region) => {console.log("Chromatin set hover", region)}}
            /> : <div>No similar regions found</div>}
        </div>
        }

      </div>
    </div>
  );
};

export default RegionDetail;
