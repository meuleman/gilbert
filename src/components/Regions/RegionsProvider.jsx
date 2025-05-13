import { useState, useEffect, useCallback, useRef } from 'react';
import RegionsContext from './RegionsContext';
import { 
  fetchRegionSetNarration, 
  fetchRegionSetEnrichments,
  fetchBackfillFiltering
} from '../../lib/apiService';
import { fromPosition, fromIndex } from '../../lib/regions';
import { fetchCombinedPathsAndGWAS } from '../../lib/csn'
import { showKbOrder } from '../../lib/display'
import { makeField } from '../../layers'
// import { v4 as uuidv4 } from 'uuid';

import CSNExamples from '../ExampleRegions/Nice_CSN_Examples.json'
import dbp from '../ExampleRegions/Diastolic_blood_pressure_Variants_UKBB_94_Traits.json'
import ec from '../ExampleRegions/Eosinophil_count_Variants_UKBB_94_Traits.json'
import tc from '../ExampleRegions/Total_cholesterol_Variants_UKBB_94_Traits.json'
import knownLCRs from '../ExampleRegions/known_LCRs.json'
import OneMbRegions from '../ExampleRegions/1mb_regions.json'

function convertExamples(examples) {
  return examples.map(d => {
    return {
      ...fromPosition("chr" + d.chr.replace(/chr/g,''), d.start, d.stop),
      score: d.score
    }
  })
}

/*
RegionSet
{
  id: string,
  type: "example" | "file",
  name: string,                 // currently expected to be unique
  regions: Array<Region>,       // all regions in the set
  activeRegions: Array<Region>, // i.e. top 100
  paths: Array<Path>,           // i.e. path for each region
  createdAt: string,
  updatedAt: string,
  derived: string | null
}
*/

const RegionsProvider = ({ children }) => {
  const [sets, setSets] = useState([])
  const [activeSet, setActiveSetter] = useState(null)

  const setsRef = useRef(sets)
  useEffect(() => {
    setsRef.current = sets
  }, [sets])
  const activeSetRef = useRef(null)
  useEffect(() => {
    activeSetRef.current = activeSet
  }, [activeSet])

  // Filters on the active set
  const [activeFilters, setActiveFilters] = useState([])

  const [activeState, setActiveState] = useState(null) // for loading and state updates
  const [activeRegions, setActiveRegions] = useState(null) // for the active regions in the active set
  const [filteredActiveRegions, setFilteredActiveRegions] = useState(null) // for the active regions in the active set that pass the filters
  const [filteredRegionsLoading, setFilteredRegionsLoading] = useState(false)
  // const [activePaths, setActivePaths] = useState(null) // for the paths associated with active regions
  // const { filters, setFilters, clearFilters, hasFilters } = useContext(FiltersContext);

  const activeFiltersRef = useRef(activeFilters)
  useEffect(() => {
    activeFiltersRef.current = activeFilters
  }, [activeFilters])


  const defaultTopRegions = 100
  const [numTopRegions, setNumTopRegions] = useState(defaultTopRegions)
  useEffect(() => {
    setNumTopRegions(Math.min(activeRegions?.length || 0, defaultTopRegions) || 0)
  }, [activeRegions])

  useEffect(() => {
    const exampleDate = "2024-01-01"
    const exampleSets = [
      {"id": "example-1", type: "example", "name": "CSN Examples", "regions": convertExamples(CSNExamples), createdAt: new Date(exampleDate).toISOString(), example:true},
      {"id": "example-2", type: "example", "name": "Diastolic Blood Pressure Variants", "regions": convertExamples(dbp), createdAt: new Date(exampleDate).toISOString(), example:true},
      {"id": "example-3", type: "example", "name": "Eosinophil Count Variants", "regions": convertExamples(ec), createdAt: new Date(exampleDate).toISOString(), example:true},
      {"id": "example-4", type: "example", "name": "Total Cholesterol Variants", "regions": convertExamples(tc), createdAt: new Date(exampleDate).toISOString(), example:true},
      {"id": "example-5", type: "example", "name": "Known Locus Control Regions (LCRs)", "regions": convertExamples(knownLCRs), createdAt: new Date(exampleDate).toISOString(), example:true},
      {"id": "example-6", type: "example", "name": "1MB Top paths", "regions": convertExamples(OneMbRegions), createdAt: new Date(exampleDate).toISOString(), example:true}
    ]
    setSets(exampleSets)
  }, []);

  const saveSet = useCallback((name, regions, options = {
    type = "file",
    activate = false, 
    factor = null,
    derived = null
  } = {}) => {
    setSets(oldSets => {
      const existingSetIndex = oldSets.findIndex(set => set.name === name);
      let newSets = [...oldSets]
      if (existingSetIndex < 0) {
        // Add new set with metadata
        const newSet = {
          // id: uuidv4(),
          type: options.type,
          name,
          regions,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          factor: options.factor,
          derived: options.derived
        };
        newSets = [...oldSets, newSet]
        if(options.activate) {
          setActiveSet(newSet)
        }
      } else {
        const updateSet = {
          ...oldSets[existingSetIndex],
        }
        updateSet.regions = regions
        updateSet.updatedAt = new Date().toISOString()
        updateSet.derived = options.derived
        updateSet.factor = options.factor
        if(options.activate) {
          setActiveSet(updateSet)
        }
        newSets[existingSetIndex] = updateSet
      }
      return newSets
    });
  }, []);

  const setActiveSet = (set) => {
    setActiveSetter(set)
    setActiveState(null)
    setActiveRegions(set?.regions)
    // setActivePaths(null)
    setActiveGenesetEnrichment(null)
    setFilteredActiveRegions(null)
    setRegionSetEnrichments(null)
  }
  const clearActive = () => {
    setActiveSet(null)
    setActiveState(null)
    setActiveRegions(null)
    // setActivePaths(null)
    setActiveGenesetEnrichment(null)
    setFilteredActiveRegions(null)
    setRegionSetEnrichments(null)
  }
  const deleteSet = useCallback((name) => {
    setSets(prevSets => prevSets.filter(set => set.name !== name));
    // if (activeSetRef.current && activeSetRef.current.name === name) {
    //   clearActive()
    // }
  }, []);

  const resetFilteredActiveRegions = useCallback(() => {
    setTopNarrations([])
    if(activeRegions?.length) {
      setFilteredActiveRegions(activeRegions.slice(0,100))
      setFilteredRegionsLoading(false)
      setActiveGenesetEnrichment(null)
    } else {
      setFilteredActiveRegions(null)
      setFilteredRegionsLoading(false)
      setActiveGenesetEnrichment(null)
    }
  }, [activeRegions, setFilteredActiveRegions, setFilteredRegionsLoading])

  // Filtering regions
  useEffect(() => {
    if(activeFilters.length && activeRegions?.length) {
      setTopNarrations([])
      setFilteredRegionsLoading(true)
      setActiveGenesetEnrichment(null)
      const filters = activeFilters.map(f => ({
        factor: f.index, 
        // TODO: more permanent solution for handling TF dataset name differences 
        dataset: f.layer.datasetName.replace("_top10", "")
      }))
      fetchBackfillFiltering(activeRegions, filters)
      .then((response) => {
        if (response) {
          let rs = response?.regions.map(r => ({
            ...fromIndex(r.chromosome, r.i, r.order), 
            ...r, 
            subregion: {
              ...fromIndex(r.subregion.chromosome, r.subregion.i, r.subregion.order), 
              score: r.score
            }
          }))
          // console.log("FILTERED ACTIVE REGIONS", rs)
          setFilteredActiveRegions(rs)
        }
        setFilteredRegionsLoading(false)
      })
    } else {
      resetFilteredActiveRegions()
    }
  }, [activeFilters])

  useEffect(() => {
    // clear active filters any time active regions change
    setActiveFilters([])
    resetFilteredActiveRegions()
  }, [activeRegions])


  // ACTIVE PATH logic
  const pathsRequestRef = useRef("")

  // region set factor enrichments
  const [regionSetEnrichments, setRegionSetEnrichments] = useState([])
  const [regionSetEnrichmentsLoading, setRegionSetEnrichmentsLoading] = useState(false)
  useEffect(() => {
    if(filteredActiveRegions) {
      // let factor = activeSetRef.current?.factor
      // let filters = activeFiltersRef.current
      setRegionSetEnrichmentsLoading(true)
      // use subregion if available, else region
      let regionsToUse = filteredActiveRegions.map(d => d.subregion ? d.subregion : d)
      fetchRegionSetEnrichments({
        regions: regionsToUse,
        N: null,
        factorExclusion: [
          // ...(factor ? [{dataset: factor?.layer?.datasetName, factor: factor?.index}] : []), 
          // ...filters.map(d => ({dataset: d.layer.datasetName, factor: d.index}))
        ]
      })
      .then((response) => {
        // console.log("REGION SET ENRICHMENTS", response)
        // attach enrichment and count
        setRegionSetEnrichments(response.map(d => {
          let field = makeField(d.dataset, d.factor)
          field.score = d.enrichment
          field.count = d.count
          field.percent = (d.count / regionsToUse.length) * 100
          return field
        }))
        setRegionSetEnrichmentsLoading(false)
      })
    }
  }, [filteredActiveRegions])
  
  
  // collecting paths, genes, and genesets for top regions
  const [topNarrations, setTopNarrations] = useState([])
  const [topNarrationsLoading, setTopNarrationsLoading] = useState(false)
  const [activeGenesetEnrichment, setActiveGenesetEnrichment] = useState(null)
  useEffect(() => {
    if(filteredActiveRegions?.length) {
      setTopNarrationsLoading(true)
      setRegionSetNarration("")
      setRegionSetQuery("")
      // if subregion exists, use for narration
      let narrationRegions = filteredActiveRegions.map(d => d.subregion ? {...d, ...d.subregion} : d)
      fetchCombinedPathsAndGWAS(narrationRegions).then((response) => {
        // set geneset enrichment for region set
        setActiveGenesetEnrichment(response.paths.genesets)
        setTopNarrations(response.rehydrated)
        setTopNarrationsLoading(false)
      })
      .catch((e) => {
        console.log("error fetching partial paths", e)
        setTopNarrationsLoading(false)
      })
    } else {
      setTopNarrations([])
      setTopNarrationsLoading(false)
      setRegionSetQuery("")
      setRegionSetNarration(null)
      setRegionSetNarrationLoading(false)
    }
  }, [filteredActiveRegions])

  let initialPrompt = `
  You are an expert genomics researcher, tasked with narrating a set of genomic regions such that a single short sentence captures the most important information about them.
  You are given a query consisting of a term-wise description of a set of regions across the human genome.

  These terms may include things like chromatin state calls (CS), DNase I Hypersensitive Site annotations (DHS), transcription factor motif hits (MOTIF), interspersed repeats and low complexity DNA sequences (REPEAT), and Genome-Wide Association Study traits (GWAS).
  All such terms are observed at a certain genomic scale, ranging from a single basepair (1bp) to a million basepair (1Mbp).
  They are listed in the query in descending order of prominence, with the percent of regions in the set containing each term also listed, so make sure to take that into account in prioritizing the information to use in your narration.
  Furthermore, the genomic regions of interest may directly overlap an observed term ('occurrence'), or may overlap a larger region with an abundance of that term ('domain') in which there is not necessarily a direct overlap with a single instance of the term. This is an important distinction.

  Additionally, you are provided information on any genes that directly overlap (GENE_OVL) or are adjacent to (GENE_ADJ) the regions in the set.
  To aid in the functional narration, you are also provided with Gene Ontology genesets (GO) associated with the regions, including corresponding p-values that quantify the strength of the association, which may constitute important information in combination with all of the above.

  You also have access to titles and abstracts of research articles that may be relevant to the query, so make sure to use these for additional context and writing style.							

  Your task is to generate a helpful one-sentence summary of the query, providing a useful narrative of the genomic regions.
  If any of the provided terms do not seem relevant according to literature or otherwise, feel free to skip them in the narrative.

  Examples
  --------
  Query: "Eosinophil count GWAS  @ 1bp 74%; Lymphoid DHS domain @ 64kbp 30%; Myeloid / erythroid DHS domain @ 64kbp 24%; KLF/SP/2 MOTIF domain @ 16kbp 23%; MECP2 MOTIF domain @ 256kbp 20%; ZNF384/2 MOTIF domain @ 1Mbp 18%; Weak transcription CS domain @ 4kbp 15%; Weak Repressed PolyComb CS domain @ 1kbp 13%; Quiescent/Low CS domain @ 4kbp 13%; Placental / trophoblast DHS domain @ 1Mbp 12%; GO CELL ACTIVATION; GO MONONUCLEAR CELL DIFFERENTIATION; GO LEUKOCYTE DIFFERENTIATION; GENE_OVL IL18R1; GENE_ADJ IL18RAP; GENE_ADJ IL5; GENE_ADJ IL13; GENE_OVL CDK6; GENE_ADJ TSC1; GENE_OVL CEBPE; GENE_OVL BCL2; GENE_ADJ CSF2; GENE_ADJ CCR7; GENE_ADJ SMARCE1; GENE_ADJ TSLP; GENE_OVL SMAD3; GENE_OVL TNFRSF1B; GENE_OVL GATA3; GENE_OVL ICOSLG; GENE_OVL IL17RA; GENE_OVL IRF4; GENE_ADJ BATF; GENE_ADJ LRRC32; GENE_ADJ PLCG2; GENE_OVL PTPRC; GENE_ADJ GATA2; GENE_OVL BCL3; GENE_ADJ IL33; GENE_ADJ FOXP1; GENE_OVL JAK1; GENE_OVL HMGB1; GENE_ADJ GPR183; GENE_ADJ ID2; GENE_OVL PRG3; GENE_OVL JAK2; GENE_ADJ ITGB8; GENE_OVL CLC; GENE_OVL IKZF1",
  Summary: "This set contains regions with single nucleotide polymorphisms significantly associated with eosinophil count identified through GWAS, DHS domains indicative of regulatory elements involved in lymphoid and myeloid cell activation and differentiation, enrichment for multiple transcription factor motifs, and is linked with pathways related to immune response through overlapping genes such as IL5, IL13, and CEBPE."
  Query: "Cardiac DHS domain @ 16kbp 100%; HD/18 MOTIF domain @ 1Mbp 28%; EWSR1/FLI1 MOTIF domain @ 64kbp 18%; KLF/SP/2 MOTIF domain @ 64kbp 11%; Placental / trophoblast DHS domain @ 1Mbp 8%; Stromal B DHS domain @ 1Mbp 8%; ZFN121 MOTIF domain @ 256kbp 7%; HD/2 MOTIF domain @ 1Mbp 5%; Vascular / endothelial DHS domain @ 1Mbp 5%; Digestive DHS domain @ 1Mbp 5%; GO STRIATED MUSCLE TISSUE DEVELOPMENT; GO HEART DEVELOPMENT; GO CARDIAC CHAMBER DEVELOPMENT; GENE_OVL SLC8A1; GENE_ADJ PDLIM3; GENE_OVL SORBS2; GENE_OVL PLN; GENE_OVL BMP5; GENE_OVL AKAP6; GENE_OVL RBM24; GENE_OVL TBX20; GENE_OVL POPDC2; GENE_OVL GATA6; GENE_OVL LDB3; GENE_ADJ BMPR1A; GENE_ADJ GATA5; GENE_OVL ACTN2; GENE_OVL GATA4; GENE_OVL ZFPM2; GENE_ADJ GJA5; GENE_OVL TNNT2; GENE_OVL HAND2; GENE_OVL CACNA1C; GENE_OVL MIB1; GENE_OVL HEY2; GENE_OVL MYH6; GENE_OVL MYH7; GENE_OVL NDST1; GENE_OVL NKX2-5; GENE_ADJ TBX5; GENE_ADJ TBX3; GENE_OVL MYOCD; GENE_ADJ MTPN; GENE_OVL PROX1; GENE_ADJ SMYD2; GENE_ADJ FZD1; GENE_ADJ TMEM65; GENE_ADJ ANKRD1; GENE_OVL NEBL",
  Summary: "The genomic regions predominantly feature cardiac DHS domains at 16kbp, enrichments for various transcription factor motifs, and significant overlaps with crucial cardiac genes like NKX2-5 and MYH6, reflecting their role in striated muscle tissue and cardiac chamber development."
  Query: "Active Enhancer 1 CS domain @ 256bp 100%; Active Enhancer 1 CS occurrence @ 64bp 98%; CTCF MOTIF occurrence @ 16bp 89%; KLF/SP/2 MOTIF domain @ 16kbp 18%; Primitive / embryonic DHS occurrence @ 64bp 17%; ZNF384/2 MOTIF domain @ 1Mbp 14%; MECP2 MOTIF domain @ 256kbp 13%; ZFN121 MOTIF domain @ 1Mbp 9%; ZNF768 MOTIF domain @ 1Mbp 9%; Placental / trophoblast DHS domain @ 64kbp 9%; GO POSITIVE REGULATION OF NUCLEAR TRANSCRIBED MRNA CATABOLIC PROCESS DEADENYLATION DEPENDENT DECAY; GO REGULATION OF NUCLEAR TRANSCRIBED MRNA CATABOLIC PROCESS DEADENYLATION DEPENDENT DECAY; GO ARTERY DEVELOPMENT; GENE_ADJ TNRC6C; GENE_ADJ TOB1; GENE_ADJ ZFP36L2; GENE_ADJ NAGLU; GENE_OVL SMAD7; GENE_OVL ZMIZ1; GENE_ADJ ZFP36L1; GENE_ADJ PLXND1; GENE_OVL SMAD6; GENE_ADJ HES1; GENE_OVL SUFU",
  Summary: "These regions comprise highly active enhancer chromatin state domains and significant CTCF motif occurrences, with adjacent genes involved in mRNA regulation and developmental processes, suggesting a complex interplay of transcriptional control and enhancer dynamics."

  Abstracts
  --------

  {% for abstract in abstracts %}
  Title: {{ abstract.full_title }}
  Abstract: {{ abstract.abstract }}

  {% endfor %}
  Task
  --------

  Query: {{ query}}
  Summary:`.trim().split('\n').map(line => line.trimStart()).join('\n');

  const [prompt, setPrompt] = useState(initialPrompt)
  const [regionSetNarration, setRegionSetNarration] = useState("")
  const [regionSetNarrationLoading, setRegionSetNarrationLoading] = useState(false)
  const [regionSetAbstracts, setRegionSetAbstracts] = useState([])
  const [regionSetQuery, setRegionSetQuery] = useState("")
  const generateRegionSetNarration = useCallback((providedPrompt = null) => {
    setRegionSetNarration("")
    const p = providedPrompt || prompt
    fetchRegionSetNarration(regionSetQuery, p).then((data) => {
      setRegionSetNarration(data.summary)
      setRegionSetAbstracts(data.results)
      setRegionSetNarrationLoading(false)
      // console.log("REGION SET NARRATION:", data.summary)
    }) 
  }, [prompt, regionSetQuery])

  // generates query for region set summary
  const generateRegionSetQuery = useCallback((narrations) => {
    // parse factors of top regions
    let factors = {}
    narrations.forEach(narration => {
      narration.path.filter(d => {
        if(d.layer?.datasetName?.indexOf("occ") > -1) {
          return d.field?.value > 0.2
        } else if(d.layer?.datasetName?.indexOf("gwas") > -1 || d.layer?.datasetName?.indexOf("ukbb_94") > -1) {
          return true
        } else {
          return d.field?.value > 1
        }
      }).forEach(d => {
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
        
        let term = `${d.field?.field} ${prefix} ${enrocc}`
        if(!factors[term]) factors[term] = { scales: {}, count: 0 }
        // count the occurrences of each scale
        factors[term].scales[d.order] = (factors[term].scales[d.order] || 0) + 1
        factors[term].count += 1
      })
    })
    // console.log("FACTORS", factors)
    let topFactors = Object.keys(factors)
      .map(d => ({term: d, ...factors[d]})).sort((a, b) => b.count - a.count).slice(0, 10)
      .map(d => {
        // use the most common scale
        let scale = Object.keys(d.scales).sort((a, b) => d.scales[b] - d.scales[a])[0]
        return { term: d.term, frequency: (100 * d.count / narrations.length).toFixed(0), scale: showKbOrder(scale).join("") }
      })
    
    // initialize query
    let query = topFactors.map(d => `${d.term} @ ${d.scale} ${d.frequency}%`).join("; ")
    
    // parse enriched genesets and genes and add to query
    if(activeGenesetEnrichment?.length) {
      let genesetsToInclude = activeGenesetEnrichment?.sort((a, b) => a.p - b.p).slice(0, 3)
      query += "; " + genesetsToInclude.map(d => `GO ${d.geneset.split("_").slice(1).join(" ")} ${d.p.toExponential(2)}`).join("; ")
      // collect genes
      let genesetGenes = genesetsToInclude.flatMap(d => d.genes)
      let regionGenes = narrations.flatMap(d => d.genes.map(g => ({name: g.name, inGene: g.in_gene})))
      let genes = regionGenes.filter(gene => genesetGenes.includes(gene.name))
      let uniqueGenes = {}
      genes.forEach(d => uniqueGenes[d.name] = uniqueGenes[d.name] || d.inGene)
      query += "; " + Object.keys(uniqueGenes).map(d => `GENE_${uniqueGenes[d] ? "OVL" : "ADJ"} ${d}`).join("; ")
    }
    return query
  }, [activeGenesetEnrichment])

  useEffect(() => {
    setRegionSetNarrationLoading(true)
    // only generate query if topNarrations and activeGenesetEnrichment are available
    if (topNarrations.length && activeGenesetEnrichment !== null) {
      let query = generateRegionSetQuery(topNarrations)
      setRegionSetQuery(query)
    }
  }, [topNarrations, activeGenesetEnrichment])

  useEffect(() => {
    if(regionSetQuery !== "") {
      setRegionSetNarrationLoading(true)
      generateRegionSetNarration()
    }
  }, [regionSetQuery])

  return (
    <RegionsContext.Provider value={{ 
      sets, 
      activeSet, 
      activeState,
      activeRegions,
      // activePaths,
      activeFilters,
      filteredRegionsLoading,
      filteredActiveRegions,
      topNarrationsLoading, 
      setTopNarrationsLoading,
      regionSetEnrichments,
      regionSetEnrichmentsLoading,
      activeGenesetEnrichment,
      prompt, 
      setPrompt,
      generateRegionSetNarration,
      regionSetNarration,
      setRegionSetNarration,
      regionSetNarrationLoading,
      regionSetAbstracts,
      setRegionSetAbstracts,
      topNarrations,
      numTopRegions,
      setNumTopRegions,
      saveSet, 
      deleteSet,
      setActiveSet,
      clearActive,
      setActiveFilters,
    }}>
      {children}
    </RegionsContext.Provider>
  );
};

export default RegionsProvider;