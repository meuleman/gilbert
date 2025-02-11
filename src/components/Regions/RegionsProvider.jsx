import { useState, useEffect, useCallback, useContext, useRef, useMemo } from 'react';
import RegionsContext from './RegionsContext';
import FiltersContext from '../ComboLock/FiltersContext';
import { fromPosition, toPosition, fromIndex } from '../../lib/regions';
import { fetchFilterSegments, fetchBackfillFiltering } from '../../lib/dataFiltering';
import { fetchTopPathsForRegions, rehydrateCSN, rehydratePartialCSN } from '../../lib/csn'
import { fetchGenesetEnrichment } from '../../lib/genesetEnrichment';
import { csnLayers, variantLayers, makeField, csnLayerList } from '../../layers'
import { fetchRegionSetEnrichments } from '../../lib/regionSetEnrichments';
import { fetchGenes } from '../../lib/genesForRegions';
import { fetchPartialPathsForRegions } from '../../lib/csn';
import { generateQuery } from '../Narration/RegionAISummary';

// import { v4 as uuidv4 } from 'uuid';

import CSNExamples from '../ExampleRegions/Nice_CSN_Examples.json'
import dbp from '../ExampleRegions/Diastolic_blood_pressure_Variants_UKBB_94_Traits.json'
import ec from '../ExampleRegions/Eosinophil_count_Variants_UKBB_94_Traits.json'
import tc from '../ExampleRegions/Total_cholesterol_Variants_UKBB_94_Traits.json'
import knownLCRs from '../ExampleRegions/known_LCRs.json'
import OneMbRegions from '../ExampleRegions/1mb_regions.json'
import { range } from 'd3-array';

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
    if(activeRegions?.length) {
      setFilteredActiveRegions(activeRegions.slice(0,100))
      setFilteredRegionsLoading(false)
    } else {
      setFilteredActiveRegions(null)
      setFilteredRegionsLoading(false)
    }
  }, [activeRegions, setFilteredActiveRegions, setFilteredRegionsLoading])

  // Filtering regions
  useEffect(() => {
    if(activeFilters.length && activeRegions?.length) {
      setFilteredRegionsLoading(true)
      const filters = activeFilters.map(f => ({factor: f.index, dataset: f.layer.datasetName}))
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
  const [genesInRegions, setGenesInRegions] = useState([])
  const pathsRequestRef = useRef("")


  function getDehydrated(regions, paths) {
    return paths.flatMap((r,ri) => r.dehydrated_paths.map((dp,i) => {
      return {
        ...r,
        i: r.top_positions[0], // hydrating assumes order 14 position
        factors: r.top_factor_scores[0],
        score: r.top_path_scores[0],
        genes: r.genes[0]?.genes,
        scoreType: "full",
        path: dp,
        region: regions[ri] // the activeSet region
      }
    }))
  }

  // collect genes for top active regions
  useEffect(() => {
    if (filteredActiveRegions?.length) {
      fetchGenes(filteredActiveRegions)
      .then((response) => {
        setGenesInRegions(response.flatMap(d => d).map(d => d.name))
      }).catch((e) => {
        console.log("error fetching genes", e)
      })
    }
  }, [filteredActiveRegions])

  const [activeGenesetEnrichment, setActiveGenesetEnrichment] = useState(null)

  // calculate geneset enrichment for genes in paths
  useEffect(() => {
    if(genesInRegions.length) {
      fetchGenesetEnrichment(genesInRegions, false)
      .then((response) => {
        setActiveGenesetEnrichment(response)
      }).catch((e) => {
        console.log("error calculating geneset enrichments", e)
      })
    } else {
      setActiveGenesetEnrichment([])
    }
  }, [genesInRegions])

  const [selectedGenesetMembership, setSelectedGenesetMembership] = useState([])

  // region set enrichment
  const [regionSetEnrichments, setRegionSetEnrichments] = useState([])
  const [regionSetEnrichmentsLoading, setRegionSetEnrichmentsLoading] = useState(false)
  useEffect(() => {
    if(filteredActiveRegions) {
      let factor = activeSetRef.current?.factor
      let filters = activeFiltersRef.current
      setRegionSetEnrichmentsLoading(true)
      // use subregion if available, else region
      let regionsToUse = filteredActiveRegions.map(d => d.subregion ? d.subregion : d)
      fetchRegionSetEnrichments({
        regions: regionsToUse,
        factorExclusion: [
          ...(factor ? [{dataset: factor?.layer?.datasetName, factor: factor?.index}] : []), 
          ...filters.map(d => ({dataset: d.layer.datasetName, factor: d.index}))
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
  
  
  // collecting full data for top regions
  const [topNarrations, setTopNarrations] = useState([])
  useEffect(() => {
    if(filteredActiveRegions?.length) {
      // if subregion exists, use for narration
      let narrationRegions = filteredActiveRegions.map(d => d.subregion ? {...d, ...d.subregion} : d)
      fetchPartialPathsForRegions(narrationRegions)
      .then((response) => {
        let rehydrated = response.regions.map(d => rehydratePartialCSN(d, csnLayerList))
        setTopNarrations(rehydrated)
      })
      .catch((e) => {
        console.log("error fetching partial paths", e)
      })
    } else {
      setTopNarrations([])
    }
  }, [filteredActiveRegions])
  // console.log("TOP NARRATIONS", topNarrations)

  const [regionSetNarration, setRegionSetNarration] = useState("")
  const [regionSetNarrationLoading, setRegionSetNarrationLoading] = useState(false)
  const [regionSetArticles, setRegionSetArticles] = useState([])
  const generateRegionSetNarration = useCallback((query) => {
    const url = "https://explore.altius.org:5001/api/pubmedSummary/pubmed_region_set_summary"
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
      setRegionSetArticles(data.articles)
      setRegionSetNarrationLoading(false)
      console.log("REGION SET NARRATION:", data.summary)
    }) 
  }, [])

  const [regionSetQuery, setRegionSetQuery] = useState("")
  useEffect(() => {
    if (topNarrations.length) {
      let topNarrationQuery = topNarrations.map(d => generateQuery(d)).slice(0, 5).join(" | ")
      setRegionSetQuery(topNarrationQuery)
    } else {
      setRegionSetQuery("")
    }

  }, [topNarrations])

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
      regionSetEnrichments,
      regionSetEnrichmentsLoading,
      activeGenesetEnrichment,
      selectedGenesetMembership,
      topNarrations,
      numTopRegions,
      setNumTopRegions,
      saveSet, 
      deleteSet,
      setActiveSet,
      clearActive,
      setActiveFilters,
      setSelectedGenesetMembership
    }}>
      {children}
    </RegionsContext.Provider>
  );
};

export default RegionsProvider;