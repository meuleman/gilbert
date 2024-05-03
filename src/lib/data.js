import { json } from "d3-fetch"
import { groups } from "d3-array"
import { createSegments, joinSegments } from "./segments.js"

// TODO: alternatively, make these functions part of a class which has configuration options

export default function Data({
  baseURL = "https://storage.googleapis.com/fun-data/hilbert/chromosomes",
  debug = false
} = {}) {
  async function fetchData(layer, order, points, cachebust = 0) {
    if(!points) return []
    let chromosomes = groups(points, d => d.chromosome)
    let data = await Promise.all(chromosomes.map(async c => {
      let chromosome = c[0]
      let cpoints = c[1]
      let segments = createSegments(cpoints)
      let joinedSegments = joinSegments(segments)
      if(debug) {
        console.log("cpoints", cpoints)
        console.log("segments", segments)
        console.log("joinedSegments", joinedSegments)
      }
  
      // this seems inefficient but will be cached
      let meta
      try {
         meta = await fetchMeta(layer, order, chromosome, cachebust);
      } catch(e) {
        return;
      }
      if(debug) {
        console.log("meta", meta)
      }
      let fields = meta.fields
      
      let fetches = joinedSegments.map(async d => {
        return fetchOrder(layer, order, chromosome, meta, d.start, d.stop, cachebust)
      })
  
      let stride = meta.shape.length === 3 ? meta.shape[1] * meta.shape[2] : meta.shape[1] || 1
  
      
      try { // TODO is this try in the right place?
        let data = (await Promise.all(fetches)).flatMap((data,si) => {
          let jseg = joinedSegments[si]
          if(debug) {
            console.log("jseg", jseg, si)
            console.log("fetched data", data)
            console.log("stride", stride)
          }
          return jseg.segments.map(p => {
            let idx = (p.i - jseg.start) * stride
            let ret = {
              ...p,
              bytes: data.slice(idx, idx + stride),
              data: {}
            }
            if(fields) {
              fields.forEach((f,i) => ret.data[f] = data[idx + i])
            }
            return ret
          })
        })
        return { data, meta };
      } catch(e) {
        console.log("E", e)
      }
      
    }))

    data = data.filter(d => !!d)
    let ret = data.flatMap(d => d.data)
    ret.order = order
    ret.metas = data.map(d => d.meta)
    return ret
  }

  function maybeAuth(layer) {
    if(layer.username) {
      const headers = new Headers({
        "Authorization": "Basic " + btoa(layer.username + ":" + layer.password)
      });
      return { headers }
    }
    return {}
  }
  
  function fetchMeta(layer, order, chromosome, cachebust=0) {
    const burl = layer.baseURL || baseURL
    const dataset = layer.datasetName
    let url = `${burl}/${dataset}/${order}/${chromosome}.json?cachebust=${cachebust}`
    let options = maybeAuth(layer)
    return json(url, options)
  }

  function fetchOrder(layer, order, chromosome, meta, from, to, cachebust = 0) {
    const burl = layer.baseURL || baseURL
    const dataset = layer.datasetName
    let url = `${burl}/${dataset}/${order}/${chromosome}.bytes?cachebust=${cachebust}`

    let dtype = meta.dtype
    let arrayType = numpyDtypeToTypedArray(dtype);
    
    let stride = meta.shape.length === 3 ? meta.shape[1] * meta.shape[2] : meta.shape[1] || 1
    let bpv = meta.bytes_per_value

    if(debug) {
      console.log("fetch", dataset, order, chromosome, meta, from, to)
      console.log("byte range", from*bpv*stride, to*bpv*stride - 1)
    }
    
    let options = maybeAuth(layer)
    // and then used to calculate bytes
    // and dtype should be used to choose the type of array
    return fetchBytes(url, from*bpv*stride, to*bpv*stride - 1, options).then(buffer => {
      // console.log("buffer", buffer.byteLength)
      return new arrayType(buffer)
    })
  }

  return {
    fetchMeta,
    fetchData,
    fetchOrder
  }
}

function numpyDtypeToTypedArray(dtype) {
  switch (dtype) {
    case 'int8':
      return Int8Array;
    case 'int16':
      return Int16Array;
    case 'int32':
      return Int32Array;
    case 'uint8':
      return Uint8Array;
    case 'uint16':
      return Uint16Array;
    case 'uint32':
      return Uint32Array;
    case 'float32':
      return Float32Array;
    case 'float64':
      return Float64Array;
    default:
      throw new Error(`Unsupported dtype: ${dtype}`);
  }
}


function fetchBytes(url, from, to, options = {}) {
  // the way this works, "to" is inclusive
  let headers = options.headers || {}
  headers["range"] = `bytes=${from}-${to}`
  return fetch(url, { headers }).then(response => response.arrayBuffer())
}