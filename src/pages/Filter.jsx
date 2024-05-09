import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { useParams, useLocation, useNavigate, Link } from 'react-router-dom';
import { range, max } from 'd3-array';

import { showFloat, showPosition, showKb } from '../lib/display';
import { urlify, jsonify, parsePosition, fromPosition, sameHilbertRegion } from '../lib/regions';
import { HilbertChromosome, hilbertPosToOrder } from "../lib/HilbertChromosome" 
import { calculateCrossScaleNarration, walkTree, findUniquePaths } from '../lib/csn';
import Data from '../lib/data';

import layers from '../layers'

import LogoNav from '../components/LogoNav';
import CSNSentence from '../components/Narration/Sentence'
import RegionStrip from '../components/RegionStrip';
import Sankey from '../components/Narration/Sankey';
import CSNLine from '../components/Narration/Line';
import Summary from '../components/Narration/Summary';
import Power from '../components/Narration/Power';


const csnLayers = [
  // layers.find(d => d.name == "DHS Components (ENR)"),
  // layers.find(d => d.name == "Chromatin States (ENR)"),
  // layers.find(d => d.name == "TF Motifs (ENR)"),
  // layers.find(d => d.name == "Repeats (ENR)"),
  layers.find(d => d.name == "DHS Components (ENR, Full)"),
  layers.find(d => d.name == "Chromatin States (ENR, Full)"),
  layers.find(d => d.name == "TF Motifs (ENR, Top 10)"),
  // layers.find(d => d.name == "TF Motifs (ENR, Full)"),
  layers.find(d => d.name == "Repeats (ENR, Full)"),
  layers.find(d => d.name == "DHS Components (OCC)"),
  layers.find(d => d.name == "Chromatin States (OCC)"),
  layers.find(d => d.name == "TF Motifs (OCC)"),
  layers.find(d => d.name == "Repeats (OCC)"),
]
const variantLayers = [
  layers.find(d => d.datasetName == "variants_favor_categorical"),
  layers.find(d => d.datasetName == "variants_favor_apc"),
  layers.find(d => d.datasetName == "variants_gwas"),
  // layers.find(d => d.datasetName == "grc"),
]

const orders = range(4, 15)

import './Filter.css';

const FilterOrder = ({order}) => {
  return (
    <div className="filter-order">
      <h4>Order {order}</h4>
      <div className="order-summary">
        {Math.pow(4, order)} total regions
      </div>
      <div className="filter-group">
        {csnLayers.filter(d => d.orders[0] <= order && d.orders[1] >= order).map(layer => {
          let fields = layer.fieldColor.domain()
          return (<div key={layer.name} className="layer">
            <span className="layer-name">{layer.name}</span><br/>
            <span className="layer-fields">{fields.map(f => {
              return (<span className="field" key={f} style={{ 
                border: `1px solid ${layer.fieldColor(f)}`, 
                borderBottom: `2px solid ${layer.fieldColor(f)}`,
                borderRadius: "4px",
                padding: "2px 2px",
              }}>
                <input type="checkbox" ></input>
                {f}
              </span>)
            })}</span>
          </div>)
        })}
      </div>
    </div>
  )
}

const Filter = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const queryParams = useMemo(() => new URLSearchParams(location.search), [location]);
  const region = useMemo(() => {return jsonify(queryParams.get('region'))}, [queryParams]);
  useEffect(() => { document.title = `Gilbert | Filter` }, []);
  const fetchData = useMemo(() => Data({debug: false}).fetchData, []);

  return (
    <div className="filter-page">
      <div className="header">
        <div className="header--brand">
          <LogoNav />
        </div>
      </div>
      <div className="content">

        <div className="section">
          <h3>
            Filter
          </h3>
          <div className="section-content">
            {orders.map(order => (
              <FilterOrder key={order} order={order} />
            ))}
          </div>
        </div>
        <div className="section">
          <h3>
            Results 
          </h3>
          <div className="section-content">
          </div>
        </div>


      </div>
    </div>
  );
};

export default Filter;