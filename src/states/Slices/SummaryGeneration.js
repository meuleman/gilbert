import { showKbOrder, showKb } from '../../lib/display'
import { 
  baseAPIUrl, 
} from '../../lib/apiService';

const SummaryGeneration = (set, get) => {

  // generate query from narration for summary
  const generateQueryFromNarration = (narration) => {
    let order = Math.max(...narration.path.map(d => d.order))
    let scale = showKb(4 ** (14 - order)).join("") + " SCALE"
    
    let fields = narration.path.filter(d => {
      if(d.layer?.datasetName?.indexOf("occ") > -1) {
        return d.field?.value > 0.75
      } else if(d.layer?.datasetName?.indexOf("gwas") > -1 || d.layer?.datasetName?.indexOf("ukbb_94") > -1) {
        return true
      } else {
        // return d.field?.value > 2
        return d.field?.value > 0.25
      }
    })
    .sort((a,b) => b.field?.value - a.field?.value)
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
    let genesets = (filteredGenesets?.length > 0 ? filteredGenesets : narration.genesets?.slice(0, 3))
      ?.map(d => {
        const term = d.geneset.split('_').slice(1).join(' ')
        return `GO ${term.toUpperCase()}`
      })
    if(!fields.length && !genesets.length && !genes.length) return null;

    // Combine all parts with semicolons
    let query = [scale, ...fields, ...genes, ...(genesets || [])].join("; ")

    return query
  }

  

  // generates a summary for the selected region
  const generateSummaryFromQuery = (providedPrompt = null) => {
    let p = providedPrompt || get().prompt
    let query = get().query
    if(query !== "") {
      return fetch(`${get().url}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          query: query,
          narration: get().selectedNarration,
          prompt: p
        })
      })
      .then(res => {
        return res.json()
      })
      .then(data => {
        console.log("generate", data, query)
        return data;
      })
      .catch(err => {
        console.error(err)
        return null;
      })
    } 
    return null;
  }

  const feedback = (feedback) => {
    let url_feedback = get().url_feedback
    let request_id = get().request_id
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
  }

  const termsSection = `You are an expert genomics researcher, tasked with narrating genomic regions such that a single short sentence captures the most important information.
  You are given a query consisting of a term-wise description of a certain region of interest in the human genome.

  These terms may include things like chromatin state calls (CS), DNase I Hypersensitive Site annotations (DHS), transcription factor motif hits (MOTIF), interspersed repeats and low complexity DNA sequences (REPEAT), and Genome-Wide Association Study traits (GWAS).
  All such terms are observed at a certain genomic scale, ranging from a single basepair (1bp) to a million basepair (1Mbp).
  They are listed in the query in descending order of prominence, so make sure to take that into account in prioritizing the information to use in your narration.
  Furthermore, the genomic region of interest may directly overlap an observed term ('occurrence'), or may overlap a larger region with an abundance of that term ('domain') in which there is not necessarily a direct overlap with a single instance of the term. This is an important distinction.

  The size (SCALE) of the region the narration will be generated for is also provided, make sure to state the region's size in your summary.
  Additionally, you are provided information on any genes that directly overlap (GENE_OVL) or are adjacent to (GENE_ADJ) the region.
  To aid in functional narration, you are also provided with Gene Ontology genesets (GO) associated with the region, which may constitute important information in combination with all of the above.
  `

  const abstractsAccess = `You also have access to titles and abstracts of research articles that may be relevant to the query, so make sure to use these for additional context and writing style.
  `

  const tastSection = `Your task is to generate a helpful one-sentence summary of the query, providing a useful narrative of the genomic region.
  If any of the provided terms do not seem relevant according to literature or otherwise, feel free to skip them in the narrative.
  `

  const examplesSection = `Examples
  --------
  Query: "1bp SCALE; EWSR1/FLI1 MOTIF enrichment @ 16kbp; Stromal B DHS enrichment @ 1Mbp; Atrial fibrillation GWAS occurrence @ 1bp; Musculoskeletal DHS enrichment @ 64kbp; Cardiac DHS enrichment @ 256kbp; Quiescent/Low CS occurrence @ 256bp; NTMT2 GENE; GORAB GENE; N TERMINAL PROTEIN AMINO ACID MODIFICATION GO; EPIDERMIS MORPHOGENESIS GO; POSITIVE REGULATION OF SMOOTHENED SIGNALING PATHWAY GO.",
  Summary: "This single base pair is a likely causal atrial fibrillation GWAS variant, found inside a cardiac DHS as part of a much larger cardiac and musculoskeletal DHS domain"
  Query: "1bp SCALE; PLAG1 MOTIF enrichment @ 64kbp; Satellite REPEAT enrichment @ 1Mbp; HINFP1/3 MOTIF enrichment @ 256kbp; KLF/SP/2 MOTIF enrichment @ 16kbp; Ebox/CACGTG/1 MOTIF enrichment @ 4kbp; Mean corpuscular hemoglobin GWAS occurrence @ 1bp; NKD2 GENE; SLC12A7 GENE; AMMONIUM TRANSMEMBRANE TRANSPORT GO; MONOATOMIC ANION HOMEOSTASIS GO; POSITIVE REGULATION OF PROTEIN MATURATION GO",
  Summary: "This single base pair is a likely causal red blood cell GWAS variant, found inside a myeloid/erythroid DHS contained in an active enhancer element."
  Query: "1bp SCALE; Lymphoid DHS enrichment @ 16kbp; IRF/2 MOTIF enrichment @ 4kbp; NRF1 MOTIF enrichment @ 1Mbp; ZNF320 MOTIF enrichment @ 256kbp; SREBF1 MOTIF enrichment @ 64kbp; MECP2 motif occurrence @ 1bp; TFAP2/1 MOTIF occurrence @ 16bp; KLF/SP/2 MOTIF enrichment @ 1kbp; CCDC22 GENE; FOXP3 GENE; NEGATIVE REGULATION OF NF KAPPAB TRANSCRIPTION FACTOR ACTIVITY GO; NEGATIVE REGULATION OF DNA BINDING TRANSCRIPTION FACTOR ACTIVITY GO; REGULATION OF DNA BINDING TRANSCRIPTION FACTOR ACTIVITY GO",
  Summary: "This 1bp region is characterized by a weak enhancer element harboring an AP-2 transcription factor motif, residing in a larger domain of interferon-regulatory factor (IRF) protein binding sites and lymphoid DHSs. Co-located with the FOXP3 gene, an important immune system regulator."
  `

  const abstractsSection = `Abstracts
  --------
  {% for abstract in abstracts %}
  Title: {{ abstract.full_title }}
  Abstract: {{ abstract.abstract }}

  {% endfor %}
  `

  const taskSection = `Task
  --------

  Query: {{ query}}
  Summary:
  `

  const defaultPrompt = `${termsSection}
  ${abstractsAccess}
  ${tastSection}
  ${examplesSection}
  ${abstractsSection}
  ${taskSection}
  `.trim().split('\n').map(line => line.trimStart()).join('\n');

  const toggleIncludeAbstracts = (include) => {
    set({ abstractsIncluded: include })
    let newPrompt = include ? 
      `${termsSection}
      ${abstractsAccess}
      ${tastSection}
      ${examplesSection}
      ${abstractsSection}
      ${taskSection}`.trim().split('\n').map(line => line.trimStart()).join('\n')
    : 
    `${termsSection}
      ${tastSection}
      ${examplesSection}
      ${taskSection}`.trim().split('\n').map(line => line.trimStart()).join('\n')
    
    set({ prompt: newPrompt })
    get().generateSummaryFromQuery(newPrompt)
  }

  return {
    query: "",
    setQuery: (query) => set({ query }),
    showQuery: false,
    setShowQuery: (show) => set({ showQuery: show }),
    showPromptEditor: false,
    setShowPromptEditor: (show) => set({ showPromptEditor: show }),
    summaryLoading: false,
    setSummaryLoading: (loading) => set({ summaryLoading: loading }),
    request_id: null,
    setRequest_id: (id) => set({ request_id: id }),
    regionSummary: "",
    setRegionSummary: (regionSummary) => set({ regionSummary }),
    abstracts: [],
    setAbstracts: (abstracts) => set({ abstracts }),
    generateQueryFromNarration,
    // generateQuery,
    // generateSummary,
    generateSummaryFromQuery,
    feedback,
    defaultPrompt,
    prompt: defaultPrompt,
    setPrompt: (prompt) => set({ prompt }),
    toggleIncludeAbstracts,
    abstractsIncluded: true,
    setAbstractsIncluded: (included) => set({ abstractsIncluded: included }),
    url: `${baseAPIUrl}/api/pubmedSummary/pubmed_summary`,
    url_feedback: `${baseAPIUrl}/api/pubmedSummary/feedback`
  }
}

export default SummaryGeneration;