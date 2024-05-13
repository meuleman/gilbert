import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { useParams, useLocation, useNavigate, Link } from 'react-router-dom';
import { range, max, groups } from 'd3-array';
import { format } from 'd3-format';
import chroma from 'chroma-js';

import Select from 'react-select';

import { showFloat, showInt, showPosition, showKb } from '../lib/display';
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

const FilterOrder = ({order, orderSums, showNone, showUniquePaths, onSelect}) => {
  const [selectedField, setSelectedField] = useState(null)
  const [allFields, setAllFields] = useState([])

  const formatLabel = useCallback((option) => {
    return (
      <div>
        <span>{option.field}</span>
        <span> ({showInt(showUniquePaths ? option.unique_count : option.count)} {showUniquePaths ? "unique" : ""} paths {option.percent?.toFixed(2)}%</span>
        <span> {option.layer.name}</span>
      </div>
    );
  }, [showUniquePaths]);

  useEffect(() => {
    let newFields = csnLayers.filter(d => d.orders[0] <= order && d.orders[1] >= order).flatMap(layer => {
      let oc = orderSums.find(o => o.order == order)
      let counts = null
      let unique_counts = null;
      if(oc) {
        counts = oc.counts[layer.datasetName]
        unique_counts = oc.unique_counts[layer.datasetName]
      }
      // const counts = oc ? (showUniquePaths ? oc.unique_counts : oc.counts) : null
      // oc ? oc = counts[layer.datasetName] : oc = null
      let fields = layer.fieldColor.domain().map((f, i) => {
        return { 
          order,
          layer,
          // label: f + " (" + showInt(c) + " paths) " + layer.name, 
          label: f + " " + layer.name,
          field: f, 
          index: i, 
          color: layer.fieldColor(f), 
          count: counts ? counts[i] : "?",
          unique_count: unique_counts ? unique_counts[i] : "?",
          percent: counts ? counts[i] / 738213034 * 100: "?",
          isDisabled: counts ? counts[i] == 0 || counts[i] == "?" : true
        }
      }).sort((a,b) => {
        return b.count - a.count
      })
      if(!showNone){
        fields = fields.filter(f => f.count > 0 && f.count != "?")
      }
      return fields
    })
    const grouped = groups(newFields, f => f.layer.name)
      .map(d => ({ label: d[0], options: d[1] }))
      .filter(d => d.options.length)
    setAllFields(grouped)
  }, [order, orderSums, showNone])

  // useEffect(() => {
  //   if(selectedField){
  //     console.log("SELECTED", selectedField)
  //     const selfield = allFields.flatMap(d => d.options).find(f => f.order == selectedField.order && f.field == selectedField.field && f.layer.name == selectedField.layer.name)
  //     console.log("selfield", selfield)
  //     if(selfield && (selfield !== selectedField)){
  //       setSelectedField(selfield)
  //     }
  //   }
  // }, [allFields, selectedField])

  useEffect(() => {
    if(selectedField){
      onSelect(selectedField)
    }
  }, [selectedField])

  return (
    <div className="filter-order">
      <span className="order-label">Order {order}</span> 
      <div className="filter-group">
        <Select
          options={allFields}
          styles={colourStyles}
          value={selectedField}
          onChange={(selectedOption) => setSelectedField(selectedOption)}
          formatOptionLabel={formatLabel}
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
  const [orderSelects, setOrderSelects] = useState({})

  useEffect(() => { 
    // const counts = showUniquePaths ? counts_native : counts_order13
    const orderSums = Object.keys(counts_order13).map(o => {
      let chrms = Object.keys(counts_order13[o])//.map(chrm => counts[o][chrm])
      // combine each of the objects in each key in the chrms array
      let total = 0
      let layer_total = {}
      let ret = {}
      let uret = {}
      let maxf = { value: 0 }
      chrms.forEach(c => {
        const chrm = counts_order13[o][c]
        const layers = Object.keys(chrm)
        layers.forEach(l => {
          if(!ret[l]) {
            ret[l] = {}
            layer_total[l] = 0
            Object.keys(chrm[l]).forEach(k => {
              ret[l][k] = 0
            })
          }
          Object.keys(chrm[l]).forEach(k => {
            ret[l][k] += chrm[l][k]
            total += chrm[l][k]
            layer_total[l] += chrm[l][k]
            if(chrm[l][k] > maxf.value){
              maxf.value = chrm[l][k]
              maxf.layer = l
              maxf.field = k
            }
          })
        })
        // get the unique counts
        const uchrm = counts_native[o][c]
        layers.forEach(l => {
          if(!uret[l]) {
            uret[l] = {}
            Object.keys(uchrm[l]).forEach(k => {
              uret[l][k] = 0
            })
          }
          Object.keys(uchrm[l]).forEach(k => {
            uret[l][k] += uchrm[l][k]
          })
        })
      })
      return { order: o, counts: ret, total, layer_total, unique_counts: uret, maxField: maxf }
    })
    console.log("orderSums", orderSums)
    setOrderSums(orderSums)
  }, [])


  const handleOrderSelect = useCallback((field) => {
    setOrderSelects({...orderSelects, [field.order]: field})
  }, [orderSelects])

  useEffect(() => {
    console.log("orderSelects", orderSelects)
    // loop through the selected and grab the relevant index files
    Promise.all(Object.keys(orderSelects).map(o => {
      const base = `https://d2ppfzsmmsvu7l.cloudfront.net/20240509/csn_index_files`
      const chrm = 1
      const url = `${base}/${o}.chr${chrm}.${orderSelects[o].layer.datasetName}.${orderSelects[o].index}.indices.txt`
      return fetch(url).then(r => r.text().then(txt => txt.split("\n").map(d => +d)))
    }))
    .then(indexFiles => {
      console.log("indexFiles", indexFiles)
    })
  }, [orderSelects])

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
              <FilterOrder key={order} 
                order={order} 
                orderSums={orderSums} 
                showNone={showNone} 
                showUniquePaths={showUniquePaths}
                onSelect={handleOrderSelect} 
              />
            ))}
          </div>
        </div>
        <div className="section">
          <h3>
            Summary
          </h3>
          <div className="section-content">
            <table className="order-sums-table">
              <thead>
                <tr>
                  <th>Order</th>
                  <th>Total</th>
                  {Object.keys(orderSums[0]?.layer_total || {}).map(l => <th key={l}>{l}</th>)}
                </tr>
              </thead>

              <tbody>
                {orderSums.map(o => {
                  return (
                      <tr key={o.order}>
                        <td>{o.order}</td>
                        <td>{showInt(o.total)}</td>
                        {Object.keys(o.layer_total).map(l => {
                          return (
                            <td key={l}>{showInt(o.layer_total[l])}</td>
                          )
                        })}
                      </tr>
                    )
                  })}
              </tbody>
            </table>
          </div>
        </div>


      </div>
    </div>
  );
};

export default Filter;