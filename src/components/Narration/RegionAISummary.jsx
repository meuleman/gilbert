// A component to display narration when clicking over hilbert cells

import { useState, useEffect, useCallback } from 'react'
import { Tooltip } from 'react-tooltip'
import { showKbOrder } from '../../lib/display'

import styles from './RegionAISummary.module.css'

const defaultPrompt = `You are a genomics researcher who is an expert in the field of genomics, tasked with narrating genomic regions such that a short sentence captures most of the standout information.							
You are given a query consisting of an term-wise description of a certain region in the human genome, that may include things like transcription factor motif hits (MOTIF), chromatin state calls (CS), DNaseI Hypersensitive Site component annotations (DHS), interspersed repeats and low complexity DNA sequences (REPEAT), and associated GWAS traits (GWAS).							
All item types are observed at a certain genomic scale, ranging from single basepair (1bp) to Mega basepair (1Mbp), and are listed in the query in descending order of prominance, so make sure take that into account.							
Furthermore, items may refer to single instances ("occurrence"), or a local increase in the number of occurrences ("enrichment"). This is important information to use.
Additionally, you are provided information on any overlapping or nearby genes (GENE), and associated Gene Ontology genesets (GO), which may constitute important information.							
You also have access to titles and abstracts of research articles that may be relevant to the query, so make sure to use these for additional context and writing style.							
Your task is to generate a helpful one-sentence summary of the query, essentially providing a useful narrative of the genomic region.							
If any of the provided terms do not seem relevant according to literature or otherwise, feel free to skip them in the narrative.							

Examples
--------
Query: "EWSR1/FLI1 MOTIF enrichment @ 16kbp; Stromal B DHS enrichment @ 1Mbp; Atrial fibrillation GWAS occurrence @ 1bp; Musculoskeletal DHS enrichment @ 64kbp; Cardiac DHS enrichment @ 256kbp; Quiescent/Low CS occurrence @ 256bp; NTMT2 GENE; GORAB GENE; N TERMINAL PROTEIN AMINO ACID MODIFICATION GO; EPIDERMIS MORPHOGENESIS GO; POSITIVE REGULATION OF SMOOTHENED SIGNALING PATHWAY GO.",
Summary: "A likely causal atrial fibrillation GWAS variant, found inside a cardiac DHS as part of a much larger cardiac and musculoskeletal DHS domain"
Query: "PLAG1 MOTIF enrichment @ 64kbp; Satellite REPEAT enrichment @ 1Mbp; HINFP1/3 MOTIF enrichment @ 256kbp; KLF/SP/2 MOTIF enrichment @ 16kbp; Ebox/CACGTG/1 MOTIF enrichment @ 4kbp; Mean corpuscular hemoglobin GWAS occurrence @ 1bp; NKD2 GENE; SLC12A7 GENE; AMMONIUM TRANSMEMBRANE TRANSPORT GO; MONOATOMIC ANION HOMEOSTASIS GO; POSITIVE REGULATION OF PROTEIN MATURATION GO",
Summary: "A likely causal red blood cell GWAS variant, found inside a myeloid/erythroid DHS contained in an active enhancer element."
Query: "Lymphoid DHS enrichment @ 16kbp; IRF/2 MOTIF enrichment @ 4kbp; NRF1 MOTIF enrichment @ 1Mbp; ZNF320 MOTIF enrichment @ 256kbp; SREBF1 MOTIF enrichment @ 64kbp; MECP2 motif occurrence @ 1bp; TFAP2/1 MOTIF occurrence @ 16bp; KLF/SP/2 MOTIF enrichment @ 1kbp; CCDC22 GENE; FOXP3 GENE; NEGATIVE REGULATION OF NF KAPPAB TRANSCRIPTION FACTOR ACTIVITY GO; NEGATIVE REGULATION OF DNA BINDING TRANSCRIPTION FACTOR ACTIVITY GO; REGULATION OF DNA BINDING TRANSCRIPTION FACTOR ACTIVITY GO",
Summary: "Weak enhancer element harboring an AP-2 transcription factor motif, residing in a larger domain of interferon-regulatory factor (IRF) protein binding sites and lymphoid DHSs. Co-located with the FOXP3 gene, an important immune system regulator."

Abstracts
--------
{% for abstract in abstracts %}
Title: {{ abstract.full_title }}
Abstract: {{ abstract.abstract }}

{% endfor %}
Task
--------

Query: {{ query}}
Summary:
`

const RegionAISummary = ({
  narration = null,
  height = 320,
} = {}) => {
  const [query, setQuery] = useState("")
  const [showPromptEditor, setShowPromptEditor] = useState(false)

  const [loading, setLoading] = useState(false)
  const [request_id, setRequest_id] = useState(null)
  const [generated, setGenerated] = useState("")
  const [articles, setArticles] = useState([])
  // const url = "https://enjalot--pubmed-query-transformermodel-rag-generate.modal.run"
  const url = "https://explore.altius.org:5001/api/pubmedSummary/pubmed_summary"
  const url_feedback = "https://enjalot--pubmed-query-transformermodel-feedback.modal.run"
  // const url = "https://enjalot--pubmed-query-transformermodel-rag-generate-dev.modal.run"
  // const url_feedback = "https://enjalot--pubmed-query-transformermodel-feedback-dev.modal.run"


  const [prompt, setPrompt] = useState(defaultPrompt)


  const generate = useCallback(() => {
    setGenerated("")
    setArticles([])
    if(query !== "") {
      setLoading(true)
      fetch(`${url}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          query: query,
          narration: narration,
          prompt: prompt
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
      }
  }, [query, narration, prompt])

  // generate summary on new query
  useEffect(() => {
    if(query !== "") {
      generate()
    }
  }, [query])

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
    <div className={styles.regionAISummary}>
      <div className={styles.controls}>
        
        <button onClick={() => setShowPromptEditor(!showPromptEditor)}>
          {showPromptEditor ? 'Hide Prompt Editor' : 'Show Prompt Editor'}
        </button>
      </div>

      {showPromptEditor && (
        <div className={styles.promptEditor}>
          <textarea
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            rows={10}
            style={{ width: '100%' }}
          />
          <button onClick={generate} disabled={loading}>
            Regenerate with New Prompt
          </button>
        </div>
      )}

      <Tooltip id="search-debug">
        <p style={{ fontSize: '10px' }}>search debug: {query}</p>
      </Tooltip>

      <p>{loading ? "loading..." : generated}</p>
      {generated ? <div className={styles.feedbackButtons}>
        Summary feedback:
        <button onClick={() => feedback("👍")}>👍</button>
        <button onClick={() => feedback("👎")}>👎</button>
      </div>: null}
      {generated ? <div><h3>{articles.length} open access PubMed articles found: </h3>
      <p>
        {articles.map((a,i) => {
          return (<span key={a.pmc}> {i+1}) <a href={`https://pmc.ncbi.nlm.nih.gov/articles/${a.pmc}/`} target="_blank" rel="noreferrer">{a.full_title}</a><br></br></span>)
        })}
      </p> </div> : null }
      {/* {generated ? <div className={styles.feedbackButtons}>
        Articles:
        <button onClick={() => feedback("👍")}>👍</button>
        <button onClick={() => feedback("👎")}>👎</button>
      </div>: null} */}

      {/* <button onClick={generate} disabled={loading}>Generate summary</button> */}
      <hr></hr>
      <a href={`https://www.google.com/search?q=${query}`} target="_blank" rel="noreferrer" data-tooltip-id="search-debug">
          Search Google for relevant literature ↗
      </a>
    </div>
  )
}
export default RegionAISummary
