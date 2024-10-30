// A component to display narration when clicking over hilbert cells

import { useState, useEffect, useCallback } from 'react'
import { Tooltip } from 'react-tooltip'

import styles from './GoogleSearchLink.module.css'

const Sentence = ({
  narration = null,
} = {}) => {
  const [query, setQuery] = useState("")

  const [loading, setLoading] = useState(false)
  const [generated, setGenerated] = useState("")
  const [articles, setArticles] = useState([])
  const url = "https://enjalot--pubmed-query-transformermodel-rag-generate.modal.run"

  const generate = useCallback(() => {
    setLoading(true)
    fetch(`${url}?query=${encodeURIComponent(query)}`)
      .then(res => res.json())
      .then(data => {
        console.log("generate", data)
        setGenerated(data.summary)
        setArticles(data.results)
        setLoading(false)
      })
      .catch(err => {
        console.error(err)
        setLoading(false)
      })
  }, [query])

  useEffect(() => {
    let fields = narration.path.filter(d => {
      if(d.layer?.datasetName?.indexOf("occ") > -1) {
        return d.field?.value > 0.75
      } else if(d.layer?.datasetName?.indexOf("gwas") > -1 || d.layer?.datasetName?.indexOf("ukbb_94") > -1) {
        return true
      } else {
        // return d.field?.value > 2
        return d.field?.value > 0.25
      }
    }).sort((a,b) => b.field?.value - a.field?.value)
    let genes = narration.genes//.filter(d => d.in_gene)
    
    // sort genesets by p value (from full region set enrichment results) and clean up terms
    let genesets = narration.genesets?.filter(d => d.p < 1).sort((a,b) => a.p - b.p).slice(0, 3).map(d => {
      return d.geneset.split('_').slice(1).join(' ')
    })

    // add genes and genesets to query
    let query = fields.map(d => d.field?.field).join(" ") + " " + genes.map(d => d.name).join(" ") + (genesets ? " " + genesets.join(" ") : "")
    //let query = [...new Set(fields.map(d => d.field?.field))].join(" ") + " " + genes.map(d => d.name).join(" ") // remove duplicates if needed
    setQuery(query)
    
  }, [narration, narration?.genesets])

  return (
    <div className={styles.googleSearchLink}>
      <a href={`https://www.google.com/search?q=${query}`} target="_blank" rel="noreferrer" data-tooltip-id="search-debug">Search relevant literature ↗</a>
      <Tooltip id="search-debug">
        <p style={{ fontSize: '10px' }}>search debug: {query}</p>
      </Tooltip>

      <p>{loading ? "loading..." : generated}</p>
      {generated ? <p> {articles.length} open access PubMed articles found: <br></br>
        {articles.map((a,i) => {
          return (<span key={a.pmc}> {i+1}) <a href={`https://pmc.ncbi.nlm.nih.gov/articles/${a.pmc}/`} target="_blank" rel="noreferrer">{a.full_title}</a><br></br></span>)
        })}
      </p> : null }
      <button onClick={generate}>Generate summary</button>
    </div>
  )
}
export default Sentence