// A component to display narration when clicking over hilbert cells

import { useState, useEffect } from 'react'

const Sentence = ({
  narration = null,
} = {}) => {
  const [query, setQuery] = useState("")
  useEffect(() => {
    let fields = narration.path.filter(d => {
      if(d.layer?.datasetName?.indexOf("occ") > -1) {
        return d.field?.value > 0.75
      } else if(d.layer?.datasetName?.indexOf("gwas") > -1 || d.layer?.datasetName?.indexOf("ukbb_94") > -1) {
        return true
      } else {
        return d.field?.value > 2
      }
    }).sort((a,b) => b.field?.value - a.field?.value)
    let genes = narration.genes//.filter(d => d.in_gene)
    
    // sort genesets by p value (from full region set enrichment results) and clean up terms
    let genesets = narration.genesets?.sort((a,b) => a.p - b.p).slice(0, 3).map(d => {
      return d.geneset.split('_').slice(1).join(' ')
    })

    // add genes and genesets to query
    let query = fields.map(d => d.field?.field).join(" ") + " " + genes.map(d => d.name).join(" ") + (genesets ? " " + genesets.join(" ") : "")
    //let query = [...new Set(fields.map(d => d.field?.field))].join(" ") + " " + genes.map(d => d.name).join(" ") // remove duplicates if needed
    setQuery(query)
    
  }, [narration, narration?.genesets])

  return (
    <div className='google-search-link'>
      <a href={`https://www.google.com/search?q=${query}`} target="_blank" rel="noreferrer">Search relevant literature ↗</a>
      { <p style={{ fontSize: '10px' }}>search debug: {query}</p> }
    </div>
  )
}
export default Sentence