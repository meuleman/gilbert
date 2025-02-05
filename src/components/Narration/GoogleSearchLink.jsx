// A component to display narration when clicking over hilbert cells

import { useState, useEffect, useCallback } from 'react'
import { Tooltip } from 'react-tooltip'
import { showKbOrder } from '../../lib/display'

import styles from './GoogleSearchLink.module.css'

const Sentence = ({
  narration = null,
  height = 320,
} = {}) => {
  const [query, setQuery] = useState("")

  const [loading, setLoading] = useState(false)
  const [request_id, setRequest_id] = useState(null)
  const [generated, setGenerated] = useState("")
  const [articles, setArticles] = useState([])
  // const url = "https://enjalot--pubmed-query-transformermodel-rag-generate.modal.run"
  const url = "https://explore.altius.org:5001/api/pubmedSummary/pubmed_summary"
  const url_feedback = "https://enjalot--pubmed-query-transformermodel-feedback.modal.run"
  // const url = "https://enjalot--pubmed-query-transformermodel-rag-generate-dev.modal.run"
  // const url_feedback = "https://enjalot--pubmed-query-transformermodel-feedback-dev.modal.run"



  const generate = useCallback(() => {
    setLoading(true)
    setGenerated("")
    setArticles([])
    fetch(`${url}?query=${encodeURIComponent(query)}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        query: query,
        narration: narration
      })
    }).then(res => res.json())
      .then(data => {
        console.log("generate", data)
        setGenerated(data.summary)
        setArticles(data.results)
        setRequest_id(data.request_id)
        setLoading(false)
      })
      .catch(err => {
        console.error(err)
        setLoading(false)
      })
  }, [query, narration])

  const feedback = useCallback((feedback) => {
    fetch(`${url_feedback}?request_id=${request_id}&feedback=${feedback}`)
      .then(res => res.json())
      .then(data => {
        console.log("feedback", data)
      })
      .catch(err => {
        console.error(err)
      })
  }, [request_id])


  useEffect(() => {
    // console.log("NARRATION", narration)
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
    .map(d => {
      // Determine the data type based on layer name
      let prefix = ""
      if (d.layer?.datasetName?.toLowerCase().includes("tf_")) {
        prefix = "MOTIF"
      } else if (d.layer?.datasetName?.toLowerCase().includes("dhs_")) {
        prefix = "DHS"
      } else if (d.layer?.datasetName?.toLowerCase().includes("cs_")) {
        prefix = "CS"
      } else if (d.layer?.datasetName?.toLowerCase().includes("repeat")) {
        prefix = "REPEAT"
      } else if (d.layer?.datasetName?.toLowerCase().includes("gwas")) {
        prefix = "GWAS"
      }
      let enrocc = ""
      if(d.layer?.datasetName?.toLowerCase().includes("enr")) {
        enrocc = "enrichment"
      } else if(d.layer?.datasetName?.toLowerCase().includes("occ")) {
        enrocc = "occurrence"
      }
      
      // Format with resolution if available
      const resolution = `@ ${showKbOrder(d.order)}`
      return `${d.field?.field} ${prefix} ${enrocc} ${resolution}`
    })
  
    let genes = narration.genes.map(d => `GENE ${d.name}`)
    
    let genesets = narration.genesets
      ?.filter(d => d.p < 1)
      .sort((a,b) => a.p - b.p)
      .slice(0, 3)
      .map(d => {
        const term = d.geneset.split('_').slice(1).join(' ')
        return `GO ${term.toUpperCase()}`
      })
  
    // Combine all parts with semicolons
    let query = [...fields, ...genes, ...(genesets || [])].join("; ")
    setQuery(query)
    
  }, [narration, narration?.genesets])

  return (
    <div className={styles.googleSearchLink}>
      <a href={`https://www.google.com/search?q=${query}`} target="_blank" rel="noreferrer" data-tooltip-id="search-debug">Search relevant literature ↗</a>
      <Tooltip id="search-debug">
        <p style={{ fontSize: '10px' }}>search debug: {query}</p>
      </Tooltip>

      <p>{loading ? "loading..." : generated}</p>
      {generated ? <div className={styles.feedbackButtons}>
        Summary:
        <button onClick={() => feedback("👍")}>👍</button>
        <button onClick={() => feedback("👎")}>👎</button>
      </div>: null}
      {generated ? <p> {articles.length} open access PubMed articles found: <br></br>
        {articles.map((a,i) => {
          return (<span key={a.pmc}> {i+1}) <a href={`https://pmc.ncbi.nlm.nih.gov/articles/${a.pmc}/`} target="_blank" rel="noreferrer">{a.full_title}</a><br></br></span>)
        })}
      </p> : null }
      {/* {generated ? <div className={styles.feedbackButtons}>
        Articles:
        <button onClick={() => feedback("👍")}>👍</button>
        <button onClick={() => feedback("👎")}>👎</button>
      </div>: null} */}

      <button onClick={generate} disabled={loading}>Generate summary</button>
    </div>
  )
}
export default Sentence