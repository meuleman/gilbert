import { useState, useEffect, useCallback, useRef } from 'react';
import RegionsContext from './RegionsContext';
import { fromPosition, fromIndex } from '../../lib/regions';
import { fetchBackfillFiltering } from '../../lib/dataFiltering';
import { rehydratePartialCSN, fetchPartialPathsForRegions } from '../../lib/csn'
import { showKbOrder } from '../../lib/display'
import { makeField, csnLayerList } from '../../layers'
import { fetchRegionSetEnrichments } from '../../lib/regionSetEnrichments';
import { baseAPIUrl } from '../../lib/apiService';
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
          console.log("FILTERED ACTIVE REGIONS", rs)
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

  function getDehydrated(regions, paths) {
    return paths.flatMap((r,ri) => r.dehydrated_paths.map((dp,i) => {
      return {
        ...r,
        // i: r.top_positions[0], // hydrating assumes order 14 position
        factors: r.top_factor_scores[0],
        // score: r.top_path_scores[0],  // no longer using path scores
        genes: r.genes[0]?.genes,
        // scoreType: "full",
        path: dp,
        region: regions[ri] // the activeSet region
      }
    }))
  }

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
        console.log("REGION SET ENRICHMENTS", response)
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
      // if subregion exists, use for narration
      let narrationRegions = filteredActiveRegions.map(d => d.subregion ? {...d, ...d.subregion} : d)
      fetchPartialPathsForRegions(narrationRegions, false).then((response) => {
        // set geneset enrichment for region set
        setActiveGenesetEnrichment(response.genesets)
        // rehydrate paths
        let rehydrated = response.regions.map(d => rehydratePartialCSN(d, csnLayerList))
        setTopNarrations(rehydrated)
        setTopNarrationsLoading(false)
      })
      .catch((e) => {
        console.log("error fetching partial paths", e)
        setTopNarrationsLoading(false)
      })
    } else {
      setTopNarrations([])
      setTopNarrationsLoading(false)
    }
  }, [filteredActiveRegions])

  const [regionSetNarration, setRegionSetNarration] = useState("")
  const [regionSetNarrationLoading, setRegionSetNarrationLoading] = useState(false)
  const [regionSetArticles, setRegionSetArticles] = useState([])
  const generateRegionSetNarration = useCallback((query) => {
    const url = `${baseAPIUrl}/api/pubmedSummary/pubmed_region_set_summary`
    fetch(`${url}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        query: query,
      })
    }).then(res => res.json())
    .then((data) => {
      setRegionSetNarration(data.summary)
      setRegionSetArticles(data.results)
      setRegionSetNarrationLoading(false)
      console.log("REGION SET NARRATION:", data.summary)
    }) 
  }, [])

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
    console.log("FACTORS", factors)
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

  const [regionSetQuery, setRegionSetQuery] = useState("")
  useEffect(() => {
    // only generate query if topNarrations and activeGenesetEnrichment are available
    if (topNarrations.length && activeGenesetEnrichment !== null) {
      let query = generateRegionSetQuery(topNarrations)
      console.log(query)
      setRegionSetQuery(query)
    } else {
      setRegionSetQuery("")
    }
  }, [topNarrations, activeGenesetEnrichment])

  useEffect(() => {
    if(regionSetQuery !== "") {
      setRegionSetNarrationLoading(true)
      generateRegionSetNarration(regionSetQuery)
    } else {
      setRegionSetNarration("")
      setRegionSetArticles([])
      setRegionSetNarrationLoading(false)
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
      regionSetNarration,
      setRegionSetNarration,
      regionSetNarrationLoading,
      regionSetArticles,
      setRegionSetArticles,
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