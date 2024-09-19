// A component to display narration when clicking over hilbert cells

import { useState, useEffect } from 'react'

const Sentence = ({
  narration = null,
} = {}) => {
  const [query, setQuery] = useState("")
  useEffect(() => {
    let fields = narration.path.filter(d => {
      if(d.layer?.datasetName?.indexOf("occ") > -1) {
        return d.field?.value > 0.5
      } else {
        return d.field?.value > 1
      }
    }).sort((a,b) => b.field?.value - a.field?.value)
    let genes = narration.genes//.filter(d => d.in_gene)
    let query = fields.map(d => d.field?.field).join(" ") + " " + genes.map(d => d.name).join(" ")
    setQuery(query)
    
  }, [narration])

  return (
    <div className='google-search-link'>
      <a href={`https://www.google.com/search?q=${query}`} target="_blank" rel="noreferrer">Search relevant literature ↗</a>
      {/* <p>search debug: {query}</p> */}
    </div>
  )
}
export default Sentence