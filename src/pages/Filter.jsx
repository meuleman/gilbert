import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { useParams, useLocation, useNavigate, Link } from 'react-router-dom';
import { range, max, groups } from 'd3-array';
import chroma from 'chroma-js';

import Select from 'react-select';

import { showFloat, showPosition, showKb } from '../lib/display';
import { urlify, jsonify, parsePosition, fromPosition, sameHilbertRegion } from '../lib/regions';
import { HilbertChromosome, hilbertPosToOrder } from "../lib/HilbertChromosome" 
import { calculateCrossScaleNarration, walkTree, findUniquePaths } from '../lib/csn';
import Data from '../lib/data';

import counts_native from "../data/counts.native_order_resolution.json"
import counts_order13 from "../data/counts.order_13_resolution.json"

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



const dot = (color = 'transparent') => ({
  alignItems: 'center',
  display: 'flex',

  ':before': {
    backgroundColor: color,
    borderRadius: 2,
    content: '" "',
    display: 'block',
    marginRight: 8,
    height: 10,
    width: 10,
  },
});

const colourStyles = {
  control: (styles) => ({ ...styles, backgroundColor: 'white' }),
  option: (styles, { data, isDisabled, isFocused, isSelected }) => {
    const color = chroma(data.color);
    return {
      ...styles,
      backgroundColor: isDisabled
        ? undefined
        : isSelected
        ? data.color
        : isFocused
        ? color.alpha(0.1).css()
        : undefined,
      color: isDisabled
        ? '#ccc'
        : isSelected
        ? chroma.contrast(color, 'white') > 2
          ? 'white'
          : 'black'
        : data.color,
      cursor: isDisabled ? 'not-allowed' : 'default',

      ':active': {
        ...styles[':active'],
        backgroundColor: !isDisabled
          ? isSelected
            ? data.color
            : color.alpha(0.3).css()
          : undefined,
      },
    };
  },
  input: (styles) => ({ ...styles, ...dot() }),
  placeholder: (styles) => ({ ...styles, ...dot('#ccc') }),
  singleValue: (styles, { data }) => ({ ...styles, ...dot(data.color) }),
};

const FilterOrder = ({order, orderSums, showNone, onFieldChange}) => {
  const [selectedField, setSelectedField] = useState(null)
  const [allFields, setAllFields] = useState([])
  useEffect(() => {
    let newFields = csnLayers.filter(d => d.orders[0] <= order && d.orders[1] >= order).flatMap(layer => {
      let oc = orderSums.find(o => o.order == order)
      oc ? oc = oc.counts[layer.datasetName] : oc = null
      let fields = layer.fieldColor.domain().map((f, i) => {
        let c = oc ? oc[i] : "?"
        return { 
          order,
          layer,
          label: f + " (" + c + " paths) " + layer.name, 
          field: f, 
          index: i, 
          color: layer.fieldColor(f), 
          count: c,
          isDisabled: c == 0 || c == "?"
        }
      }).sort((a,b) => {
        return b.count - a.count
      })
      return fields
    })
    const grouped = groups(newFields, f => f.layer.name)
      .map(d => ({ label: d[0], options: d[1] }))
      .filter(d => d.options.length)
    setAllFields(grouped)
  }, [order, orderSums])

  useEffect(() => {
    if(selectedField){
      // console.log("SELECTED", selectedField)
      const selfield = allFields.flatMap(d => d.options).find(f => f.order == selectedField.order && f.field == selectedField.field && f.layer.name == selectedField.layer.name)
      // console.log("selfield", selfield)
      if(selfield && (selfield !== selectedField)){
        setSelectedField(selfield)
      }
    }
  }, [allFields, selectedField])

  return (
    <div className="filter-order">
      <span className="order-label">Order {order}</span> 
      <div className="filter-group">
        <Select
          options={allFields}
          styles={colourStyles}
          value={selectedField}
          onChange={(selectedOption) => setSelectedField(selectedOption)}
          formatGroupLabel={data => (
            <div style={{ fontWeight: 'bold' }}>
              {data.label}
            </div>
          )}
        />
      </div>
          {selectedField ? 
          <div>
            {/* <span className="selected-field">
              Selected: {selectedField.label}
            </span> */}
            <button onClick={() => setSelectedField(null)}>
              Deselect
            </button>
          </div>
        : null}
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

  const [showNone, setShowNone] = useState(false)
  const [showUniquePaths, setShowUniquePaths] = useState(true)

  const [orderSums, setOrderSums] = useState([])
  useEffect(() => { 
    const counts = showUniquePaths ? counts_native : counts_order13
    const orderSums = Object.keys(counts).map(o => {
      let chrms = Object.keys(counts[o]).map(chrm => counts[o][chrm])
      // combine each of the objects in each key in the chrms array
      let ret = {}
      chrms.forEach(chrm => {
        const layers = Object.keys(chrm)
        layers.forEach(l => {
          if(ret[l]) {
            Object.keys(chrm[l]).forEach(k => {
              ret[l][k] += chrm[l][k]
            })
          } else {
            ret[l] = { ...chrm[l] }
          }
        })
      })
      return { order: o, counts: ret }
    })
    setOrderSums(orderSums)
  }, [showUniquePaths])

  console.log("orderSums", orderSums)


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
            <div className="filter-group">
              <button onClick={() => setShowUniquePaths(!showUniquePaths)}>
                {showUniquePaths ? "Show All Paths" : "Show Unique Paths"}
              </button>
              <button onClick={() => setShowNone(!showNone)}>
                {showNone ? "Hide Hidden Fields" : "Show Hidden Fields"}
              </button>
            </div>
            {orders.map(order => (
              <FilterOrder key={order} order={order} orderSums={orderSums} showNone={showNone} />
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