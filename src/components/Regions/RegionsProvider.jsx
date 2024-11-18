import { useState, useEffect, useCallback, useContext, useRef, useMemo } from 'react';
import RegionsContext from './RegionsContext';
import FiltersContext from '../ComboLock/FiltersContext';
import { fromPosition, toPosition } from '../../lib/regions';
import { fetchFilterSegments, fetchFilteringWithoutOrder } from '../../lib/dataFiltering';
import { fetchTopPathsForRegions, rehydrateCSN } from '../../lib/csn'
import { fetchGenesetEnrichment } from '../../lib/genesetEnrichment';
import { csnLayers, variantLayers, makeField } from '../../layers'
import { fetchRegionSetEnrichments } from '../../lib/regionSetEnrichments';

// import { v4 as uuidv4 } from 'uuid';

import Domain20kbRegions from '../ExampleRegions/domains.samples_3517.20kb.strict_max_mi.non_overlapping.gte_HBG2.qualifyingDHS_maxMI_sorted.CT20231212.json'
import Domain1kbRegions from '../ExampleRegions/domains.samples_3517.1kb.strict_max_mi.non_overlapping.gte_92.2per.maxMI_meanMI_sorted.CT20231212.json'
import HBG2DHSMaskedRegions from '../ExampleRegions/top_100_HBG2_DHS_masked_regions_across_biosamples_CT20240126.json'
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
  const [effectiveRegions, setEffectiveRegions] = useState(null) // results of filtering the active regions
  const [activePaths, setActivePaths] = useState(null) // for the paths associated with active regions
  const { filters, setFilters, clearFilters, hasFilters } = useContext(FiltersContext);


  const defaultTopRegions = 100
  const [numTopRegions, setNumTopRegions] = useState(defaultTopRegions)
  useEffect(() => {
    setNumTopRegions(Math.min(activeRegions?.length || 0, defaultTopRegions) || 0)
  }, [activeRegions])

  useEffect(() => {
    const exampleDate = "2024-01-01"
    const exampleSets = [
      {"id": "example-1", type: "example", "name": "Domain 20kb", "regions": convertExamples(Domain20kbRegions), createdAt: new Date(exampleDate).toISOString(), example: true},
      {"id": "example-2", type: "example", "name": "Domain 1kb", "regions": convertExamples(Domain1kbRegions), createdAt: new Date(exampleDate).toISOString(), example: true},
      {"id": "example-3", type: "example", "name": "HBG2 DHS Distance Masked", "regions": convertExamples(HBG2DHSMaskedRegions), createdAt: new Date(exampleDate).toISOString(), example:true},
      {"id": "example-4", type: "example", "name": "1MB Top paths", "regions": convertExamples(OneMbRegions), createdAt: new Date(exampleDate).toISOString(), example:true}
    ]
    setSets(exampleSets)
  }, []);

  const saveSet = useCallback((name, regions, options = {
    type = "file",
    activate = false, 
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
    setActivePaths(null)
    setActiveGenesetEnrichment(null)
  }
  const clearActive = () => {
    setActiveSet(null)
    setActiveState(null)
    setActiveRegions(null)
    setActivePaths(null)
    setActiveGenesetEnrichment(null)
  }
  const deleteSet = useCallback((name) => {
    setSets(prevSets => prevSets.filter(set => set.name !== name));
    // if (activeSetRef.current && activeSetRef.current.name === name) {
    //   clearActive()
    // }
  }, []);


  // Filtering to effective regions
  useEffect(() => {
    if(activeFilters.length && activeRegions?.length) {
      const filters = activeFilters.map(f => ({factor: f.index, dataset: f.layer.datasetName}))
      fetchFilteringWithoutOrder(filters, activeRegions)
      .then((response) => {
        console.log("EFFECTIVE REGIONS", response)
        setEffectiveRegions(response?.regions)
      })
    } else if(activeRegions?.length) {
      // set effective regions to active regions if no filters
      setEffectiveRegions(activeRegions)
    } else {
      setEffectiveRegions(null)
    }
  }, [activeFilters, activeRegions])

  const effectiveMap = useMemo(() => {
    if (!activeRegions || !effectiveRegions) return null;

    const map = new Map();
    // const orders = new Set()

    // Create map entries for all active regions
    activeRegions.forEach(region => {
      const key = `${region.order}:${region.chromosome}:${region.i}`;
      map.set(key, []);
      // orders.add(region.order)
    });

    // For each effective region, find matching active regions at different orders
    effectiveRegions.forEach(effectiveRegion => {
      // Convert effective region i to corresponding i values at lower orders
      for (let order = effectiveRegion.order; order >= 4; order--) {
        const scaleFactor = Math.pow(4, effectiveRegion.order - order);
        const i = Math.floor(effectiveRegion.i / scaleFactor);
        
        const key = `${order}:${effectiveRegion.chromosome}:${i}`;
        if (map.has(key)) {
          map.get(key).push(effectiveRegion);
          break; // Stop once we find a match
        }
      }
    });
    console.log("EFFECTIVE MAP", map)

    return map;
    
  }, [activeRegions, effectiveRegions])

  const filteredBaseRegions = useMemo(() => {
    if(!effectiveMap) return null
    return activeRegions.filter(r => effectiveMap.get(`${r.order}:${r.chromosome}:${r.i}`)?.length > 0)
  }, [effectiveMap, activeRegions])

  // fetch filtered regions given filters and potentially "background" regions
  // this function assumes there are filters active
  // THIS IS THE OLD FILTERING METHOD
  /*
  const filterRequestRef = useRef(0)
  const requestFilteredRegions = useCallback((filters, regions, callback = () => {}) => {
    filterRequestRef.current += 1
    const currentRequest = filterRequestRef.current
    // Fetch the filter segments from the API
    setActiveState("fetching regions")
    // take the unique segments from the active set
    fetchFilterSegments(filters, regions)
      .then((response) => {
      if(!response) {
        setActiveState("Error fetching regions!")
        setActiveRegions(null)
        callback(null)
        return
      }
      if(currentRequest == filterRequestRef.current) {
        // convert filtered segments to standard regions
        setActiveRegions(response.filtered_segments) // convertFilterRegions
        // setActiveRegionsCount(response.segment_count)
        setActiveState("")
        callback(response.filtered_segments)
      }
    }).catch((e) => {
      setActiveState("Error fetching regions!")
      setActiveRegions(null)
      callback(null)
    })
    
  }, [])

  // when the filters change, we manage the query set logic
  useEffect(() => {
    if(activeSetRef.current && activeSetRef.current.type !== "filter") {
      if(hasFilters()) {
        console.log("ARF: we have activeset and filters, filtering and making derived")
        // filter the active set down based on filters and its regions
        let regions = activeSetRef.current.regions
        let name = activeSetRef.current.name
        if(activeSetRef.current.type === "derived") {
          console.log("DERIVED", activeSetRef.current.derived)
          let set = setsRef.current.find(s => s.name === activeSetRef.current.derived)
          console.log("SET", set, sets)
          regions = set?.regions
          name = set?.name
        }
        requestFilteredRegions(filters, regions, (newRegions) => {
          if(newRegions) {
            saveSet("Filtered: " + name, newRegions, {
              type: "derived", 
              activate: true, 
              derived: name
            })
            setActiveRegions(newRegions)
          }
        })
      } else if(activeSetRef.current && activeSetRef.current.type === "derived") {
        console.log("ARF: no more filters, set to the derived one", activeSetRef.current)
        // no filters so we just activate the original regions in the set
        let set = setsRef.current.find(s => s.name === activeSetRef.current.derived)
        console.log("SET", set)
        setActiveSet(set)
        setsRef.current.filter(s => s.type === "derived").forEach(s => deleteSet(s.name))
      } else {
        // console.log("ARF:whats this logic", activeSetRef.current)
      }
    } else {
      console.log("ARF: no existing activeSet or its a filter type")
      // no existing activeSet
      if(hasFilters()) {
        console.log("ARF: filter set, with filters", filters)
        requestFilteredRegions(filters, null, (regions) => {
          if(regions) {
            saveSet("Filter Set", regions, {type: "filter", activate: true})
            setActiveRegions(regions)
          }
        })
      } else {
        console.log("ARF: deleting filter set")
        deleteSet("Filter Set")
        clearActive()
      }
    }
  }, [hasFilters, filters, saveSet, deleteSet, requestFilteredRegions])
  */


  // ACTIVE PATH logic
  const [genesInPaths, setGenesInPaths] = useState([])
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

  useEffect(() => {
    // if(activeSet && activeSet.name !== "Query Set" && activeSet.regions?.length) {
    if(activeSet && activeRegions?.length) {
      // TODO: eventually we will slice the activeRegions by an interval
      // currently we always get the top 100 (defaultTopRegions) and allow numTopRegions to be betwen 0 and 100
      const regions = activeRegions.slice(0, defaultTopRegions).map(toPosition)
      if(regions.toString() == pathsRequestRef.current) {
        console.log("cancelling redundant request")
        return
      } else {
        pathsRequestRef.current = regions.toString()
      }
      // console.log("FETCHING TOP PATHS FOR QUERY SET", regions)
      setActiveState("fetching top paths")
      fetchTopPathsForRegions(regions, 1)
        .then((response) => {
          if(!response) { setActivePaths(null)
          } else { 
            // convert the response into "dehydrated" csn paths with the region added
            let tpr = getDehydrated(activeRegions, response.regions)
            let hydrated = tpr.map(d => rehydrateCSN(d, [...csnLayers, ...variantLayers]))
            // combine the regions with the paths so we can sort them by the path score
            let combined = activeRegions.map((r,i) => {
              // return { i, r, p: hydrated[i], score: r.score ? r.score : hydrated[i]?.score }
              return { 
                i, 
                r, 
                p: hydrated[i], 
                rscore: r.score, 
                pscore: hydrated[i]?.score 
              }
            }).sort((a,b) => (a.rscore && b.rscore && a.rscore.toFixed(3) != b.rscore.toFixed(3)) ? b.rscore - a.rscore : b.pscore - a.pscore)

            let reorderedRegions = combined.map(d => d.r)
            let reorderedPaths = combined.map(d => d.p).filter(d => !!d)
            setActivePaths(reorderedPaths) 
            setActiveRegions(reorderedRegions)

            setActiveState(null)
            // for geneset enrichment calculation
            let gip = response.regions.flatMap(d => d.genes[0]?.genes).map(d => d.name)
            setGenesInPaths(gip)
          }
        }).catch((e) => {
          console.log("error fetching top paths for regions", e)
          setActivePaths(null)
        })
    } else {
      pathsRequestRef.current = ""
    }
  }, [activeRegions, activeSet])


  const [activeGenesetEnrichment, setActiveGenesetEnrichment] = useState(null)

  // calculate geneset enrichment for genes in paths
  useEffect(() => {
    if(genesInPaths.length) {
      fetchGenesetEnrichment(genesInPaths, false)
      .then((response) => {
        setActiveGenesetEnrichment(response)
      }).catch((e) => {
        console.log("error calculating geneset enrichments", e)
      })
    } else {
      setActiveGenesetEnrichment([])
    }
  }, [genesInPaths])

  const [selectedGenesetMembership, setSelectedGenesetMembership] = useState([])

  // region set enrichment
  const [regionSetEnrichments, setRegionSetEnrichments] = useState([])
  useEffect(() => {
    if(effectiveRegions) {
      fetchRegionSetEnrichments({
        regions: effectiveRegions.slice(0, 100), 
        factorExclusion: activeFilters.map(d => `${d.layer.datasetName}.${d.index}`)
      })
      .then((response) => {
        console.log("REGION SET ENRICHMENTS", response)
        setRegionSetEnrichments(response.map(d => makeField(d.dataset, d.factor)))
      })
    }
  }, [effectiveRegions])


  return (
    <RegionsContext.Provider value={{ 
      sets, 
      activeSet, 
      activeState,
      activeRegions,
      activePaths,
      activeFilters,
      effectiveRegions,
      filteredBaseRegions,
      effectiveMap,
      regionSetEnrichments,
      activeGenesetEnrichment,
      selectedGenesetMembership,
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