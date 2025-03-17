// A component to display narration when clicking over hilbert cells

import { useState, useEffect, useCallback } from 'react'
import { Tooltip } from 'react-tooltip'
import { showKbOrder, showPosition } from '../../lib/display'
import SelectedStatesStore from '../../states/SelectedStates'

import styles from './RegionAISummary.module.css'
import Checkbox from 'antd/es/checkbox/Checkbox'

const termsSection = `You are an expert genomics researcher, tasked with narrating genomic regions such that a single short sentence captures the most important information.
You are given a query consisting of a term-wise description of a certain region of interest in the human genome.

These terms may include things like chromatin state calls (CS), DNase I Hypersensitive Site annotations (DHS), transcription factor motif hits (MOTIF), interspersed repeats and low complexity DNA sequences (REPEAT), and Genome-Wide Association Study traits (GWAS).
All such terms are observed at a certain genomic scale, ranging from a single basepair (1bp) to a million basepair (1Mbp).
They are listed in the query in descending order of prominence, so make sure to take that into account in prioritizing the information to use in your narration.
Furthermore, the genomic region of interest may directly overlap an observed term ('occurrence'), or may overlap a larger region with an abundance of that term ('domain') in which there is not necessarily a direct overlap with a single instance of the term. This is an important distinction.

Additionally, you are provided information on any genes that directly overlap (GENE_OVL) or are adjacent to (GENE_ADJ) the region.
To aid in functional narration, you are also provided with Gene Ontology genesets (GO) associated with the region, which may constitute important information in combination with all of the above.
`

const articlesAccess = `
You also have access to titles and abstracts of research articles that may be relevant to the query, so make sure to use these for additional context and writing style.
`

const tastSection = `
Your task is to generate a helpful one-sentence summary of the query, providing a useful narrative of the genomic region.
If any of the provided terms do not seem relevant according to literature or otherwise, feel free to skip them in the narrative.	
`

const examplesSection = `
Examples
--------
Query: "EWSR1/FLI1 MOTIF enrichment @ 16kbp; Stromal B DHS enrichment @ 1Mbp; Atrial fibrillation GWAS occurrence @ 1bp; Musculoskeletal DHS enrichment @ 64kbp; Cardiac DHS enrichment @ 256kbp; Quiescent/Low CS occurrence @ 256bp; NTMT2 GENE; GORAB GENE; N TERMINAL PROTEIN AMINO ACID MODIFICATION GO; EPIDERMIS MORPHOGENESIS GO; POSITIVE REGULATION OF SMOOTHENED SIGNALING PATHWAY GO.",
Summary: "A likely causal atrial fibrillation GWAS variant, found inside a cardiac DHS as part of a much larger cardiac and musculoskeletal DHS domain"
Query: "PLAG1 MOTIF enrichment @ 64kbp; Satellite REPEAT enrichment @ 1Mbp; HINFP1/3 MOTIF enrichment @ 256kbp; KLF/SP/2 MOTIF enrichment @ 16kbp; Ebox/CACGTG/1 MOTIF enrichment @ 4kbp; Mean corpuscular hemoglobin GWAS occurrence @ 1bp; NKD2 GENE; SLC12A7 GENE; AMMONIUM TRANSMEMBRANE TRANSPORT GO; MONOATOMIC ANION HOMEOSTASIS GO; POSITIVE REGULATION OF PROTEIN MATURATION GO",
Summary: "A likely causal red blood cell GWAS variant, found inside a myeloid/erythroid DHS contained in an active enhancer element."
Query: "Lymphoid DHS enrichment @ 16kbp; IRF/2 MOTIF enrichment @ 4kbp; NRF1 MOTIF enrichment @ 1Mbp; ZNF320 MOTIF enrichment @ 256kbp; SREBF1 MOTIF enrichment @ 64kbp; MECP2 motif occurrence @ 1bp; TFAP2/1 MOTIF occurrence @ 16bp; KLF/SP/2 MOTIF enrichment @ 1kbp; CCDC22 GENE; FOXP3 GENE; NEGATIVE REGULATION OF NF KAPPAB TRANSCRIPTION FACTOR ACTIVITY GO; NEGATIVE REGULATION OF DNA BINDING TRANSCRIPTION FACTOR ACTIVITY GO; REGULATION OF DNA BINDING TRANSCRIPTION FACTOR ACTIVITY GO",
Summary: "Weak enhancer element harboring an AP-2 transcription factor motif, residing in a larger domain of interferon-regulatory factor (IRF) protein binding sites and lymphoid DHSs. Co-located with the FOXP3 gene, an important immune system regulator."
`

const abstractsSection = `
Abstracts
--------
{% for abstract in abstracts %}
Title: {{ abstract.full_title }}
Abstract: {{ abstract.abstract }}

{% endfor %}
`

const taskSection = `
Task
--------

Query: {{ query}}
Summary:
`


const defaultPrompt = `${termsSection}
${articlesAccess}
${tastSection}
${examplesSection}
${abstractsSection}
${taskSection}
`

// generate query from narration for summary
export const generateQuery = (narration) => {
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
    } else if (d.layer?.datasetName?.toLowerCase().includes("ukbb")) {
      prefix = "GWAS"
    }
    let enrocc = ""
    if(d.layer?.datasetName?.toLowerCase().includes("enr")) {
      enrocc = "domain"
    } else if(d.layer?.datasetName?.toLowerCase().includes("occ")) {
      enrocc = "occurrence"
    }
    
    // Format with resolution if available
    const resolution = `@ ${showKbOrder(d.order)}`.replace(",", "")
    return `${d.field?.field} ${prefix} ${enrocc} ${resolution}`
  })

  let genes = narration.genes ? narration.genes.map(d => d.in_gene ? `GENE_OVL ${d.name}` : `GENE_ADJ ${d.name}`) : []
  
  // Sort genesets by p-value (region set p-values) and take top 3
  let filteredGenesets = narration.genesets?.filter(d => d.p).sort((a,b) => a.p - b.p)?.slice(0, 3)
  // If no genesets with p-values, take first 3 genesets
  let genesets = (filteredGenesets.length > 0 ? filteredGenesets : narration.genesets?.slice(0, 3))
    ?.map(d => {
      const term = d.geneset.split('_').slice(1).join(' ')
      return `GO ${term.toUpperCase()}`
    })

  // Combine all parts with semicolons
  let query = [...fields, ...genes, ...(genesets || [])].join("; ")

  return query
}


const RegionAISummary = ({} = {}) => {
  const url = "https://explore.altius.org:5001/api/pubmedSummary/pubmed_summary"
  const url_feedback = "https://explore.altius.org:5001/api/pubmedSummary/feedback"

  const { 
    selectedNarration: narration, query, setQuery, showQuery, setShowQuery,
    showPromptEditor, setShowPromptEditor, summaryLoading: loading, setSummaryLoading: setLoading,
    request_id, setRequest_id, generated, setGenerated, articles, setArticles, prompt, setPrompt, 
    articlesIncluded, setArticlesIncluded
  } = SelectedStatesStore()

  useEffect(() => {
    setPrompt(defaultPrompt)
  }, [])

  const toggleIncludeArticles = (include) => {
    setArticlesIncluded(include)
    let newPrompt = include ? 
      `${termsSection}
      ${articlesAccess}
      ${tastSection}
      ${examplesSection}
      ${abstractsSection}
      ${taskSection}`
    : 
    `${termsSection}
      ${tastSection}
      ${examplesSection}
      ${taskSection}`
    
    setPrompt(newPrompt)
    generate(newPrompt)
  }


  const generate = useCallback((providedPrompt = null) => {
    setGenerated("")
    setArticles([])
    let p = providedPrompt || prompt
    if(query !== "") {
      // console.log("THIS IS THE PROMPT WE ARE USING:", p)
      setLoading(true)
      fetch(`${url}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          query: query,
          narration: narration,
          prompt: p
        })
      }).then(res => res.json())
        .then(data => {
          console.log("generate", data)
          setGenerated(data.summary.replace(/^"(.*)"$/, '$1'))
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
    // fetch(`${url_feedback}?request_id=${request_id}&feedback=${feedback}`)
    fetch(`${url_feedback}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        request_id: request_id,
        feedback: feedback,
      })
    })
      .then(res => res.json())
      .then(data => {
        console.log("feedback", data)
      })
      .catch(err => {
        console.error(err)
      })
  }, [request_id])

  const [showArticles, setShowArticles] = useState(false)
  const handleShowArticles = () => {
    setShowArticles(!showArticles)
  }

  useEffect(() => {
    let query = generateQuery(narration)
    setQuery(query)
    
  }, [narration, narration?.genesets])

  return (
    <div className="bg-white rounded-md">
      {/* <h3 className="text-sm text-gray-500">
        AI Summary:
      </h3> */}
      <div className="text-lg">
        {showPosition(narration.region)}
      </div>
      <p className="mb-5 text-md text-black font-medium">
        {loading ? "loading..." : generated}
      </p>

      <div className="flex flex-wrap gap-2 mb-4 items-center">
        <button 
          className="px-3 py-1 text-sm border rounded hover:bg-blue-100"
          onClick={() => setShowPromptEditor(!showPromptEditor)}>
          {showPromptEditor ? 'Hide Prompt Editor' : 'Show Prompt Editor'}
        </button>
        <Checkbox onClick={() => toggleIncludeArticles(!articlesIncluded)} checked={articlesIncluded}>
          {articlesIncluded ? 'Articles Included' : 'Articles Not Included'}
        </Checkbox>
      </div>
  
      <button 
        className="px-3 py-1 text-sm border rounded hover:bg-blue-100 mb-4"
        onClick={() => setShowQuery(!showQuery)} 
        disabled={loading}>
        {showQuery ? "Hide Query" : "Show Query"}
      </button>

      {showPromptEditor && (
        <div className="border border-gray-200 rounded-md p-2 mb-4">
          <textarea
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            rows={10}
            className="w-full p-2 border border-gray-200 rounded"
          />
          <button 
            className="px-3 py-1 text-sm border rounded hover:bg-blue-100 mt-2"
            onClick={() => generate()} 
            disabled={loading}>
            Regenerate with New Prompt
          </button>
        </div>
      )}
      
      {showQuery && (
        <div className="pb-5">
          Query: {query}
        </div>
      )}

      <Tooltip id="search-debug">
        <p className="text-xs">search debug: {query}</p>
      </Tooltip>
  
      
      
      {/* Results Section */}
      {generated && (
        <div className="mt-2">
          <div className="flex items-center gap-2 mb-4">
            Summary feedback:
            <button className="p-1 hover:bg-gray-100 rounded" onClick={() => feedback("👍")}>👍</button>
            <button className="p-1 hover:bg-gray-100 rounded" onClick={() => feedback("👎")}>👎</button>
          </div>
          
          <button 
            className="px-3 py-1 text-sm border rounded bg-white hover:bg-blue-100"
            onClick={handleShowArticles}>
            {showArticles ? "Hide Supporting Articles" : "Show Supporting Articles"}
          </button>
          
          {showArticles && (
            <div className="mt-4">
              <h3 className="text-lg font-medium mb-2">
                {articles.length} open access PubMed articles found:
              </h3>
              <div className="text-sm">
                {articles.map((a, i) => (
                  <span className="block mb-2" key={a.pmc}> 
                    {i+1}) <a 
                      className="text-blue-600 hover:underline" 
                      href={`https://pmc.ncbi.nlm.nih.gov/articles/${a.pmc}/`} 
                      target="_blank" 
                      rel="noreferrer"
                    >
                      {a.full_title}
                    </a>
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
export default RegionAISummary
