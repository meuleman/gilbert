import { json } from "d3-fetch"
import { groups } from "d3-array"
import { createSegments, joinSegments } from "./segments.js"

// TODO: alternatively, make these functions part of a class which has configuration options

export default function Data({
  baseURL = "https://storage.googleapis.com/fun-data/hilbert/chromosomes",
  debug = false
} = {}) {

  function fetchMeta(dataset, order, chromosome, cachebust=0) {
    let url = `${baseURL}/${dataset}/${order}/${chromosome}.json?cachebust=${cachebust}`
    return json(url)
  }

  async function fetchData(dataset, order, aggregate, points, cachebust = 0) {
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
      let meta = await fetchMeta(dataset, order, chromosome, cachebust);
      if(debug) {
        console.log("meta", meta)
      }
      let fields = meta[aggregate].fields
      
      let fetches = joinedSegments.map(async d => {
        return fetchOrder(dataset, order, chromosome, aggregate, meta, d.start, d.stop, cachebust)
      })
  
      let stride = meta[aggregate].shape[1] || 1
  
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
      
    }))
    let ret = data.flatMap(d => d.data)
    ret.order = order
    ret.metas = data.map(d => d.meta)
    return ret
  }
  

  function fetchOrder(dataset, order, chromosome, aggregate, meta, from, to, cachebust = 0) {
    let url = `${baseURL}/${dataset}/${order}/${chromosome}.${aggregate}?cachebust=${cachebust}`

    let dtype = meta[aggregate].dtype
    let arrayType = numpyDtypeToTypedArray(dtype);
    
    let stride = meta[aggregate].shape[1] || 1
    let bpv = meta[aggregate].bytes_per_value

    if(debug) {
      console.log("fetch", dataset, order, chromosome, aggregate, meta, from, to)
      console.log("byte range", from*bpv*stride, to*bpv*stride - 1)
    }
    
    // and then used to calculate bytes
    // and dtype should be used to choose the type of array
    return fetchBytes(url, from*bpv*stride, to*bpv*stride - 1).then(buffer => {
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


function fetchBytes(url, from, to) {
  // the way this works, "to" is inclusive
  return fetch(url, {
    headers: {
      'range': `bytes=${from}-${to}`
    }
  }).then(response => response.arrayBuffer())
}