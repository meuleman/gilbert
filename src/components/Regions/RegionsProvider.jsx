import { useState, useEffect, useCallback } from 'react';
import RegionsContext from './RegionsContext';
import { fromPosition } from '../../lib/regions';

import Domain20kbRegions from '../ExampleRegions/domains.samples_3517.20kb.strict_max_mi.non_overlapping.gte_HBG2.qualifyingDHS_maxMI_sorted.CT20231212.json'
import Domain1kbRegions from '../ExampleRegions/domains.samples_3517.1kb.strict_max_mi.non_overlapping.gte_92.2per.maxMI_meanMI_sorted.CT20231212.json'
import HBG2DHSMaskedRegions from '../ExampleRegions/top_100_HBG2_DHS_masked_regions_across_biosamples_CT20240126.json'

function convertExamples(examples) {
  return examples.map(d => {
    return {
      ...fromPosition("chr" + d.chr.replace(/chr/g,''), d.start, d.stop),
      score: d.score
    }
  })
}

const RegionsProvider = ({ children }) => {
  const [sets, setSets] = useState([])
  const [activeSet, setActiveSet] = useState(null)

  useEffect(() => {
    const exampleDate = "2024-01-01"
    const exampleSets = [
      {"name": "Domain 20kb", "regions": convertExamples(Domain20kbRegions), createdAt: new Date(exampleDate).toISOString(), example: true},
      {"name": "Domain 1kb", "regions": convertExamples(Domain1kbRegions), createdAt: new Date(exampleDate).toISOString(), example: true},
      {"name": "HBG2 DHS Distance Masked", "regions": convertExamples(HBG2DHSMaskedRegions), createdAt: new Date(exampleDate).toISOString(), example:true}
    ]
    setSets(exampleSets)
  }, []);

  const saveSet = useCallback((name, data) => {
    setSets(oldSets => {
      const existingSetIndex = oldSets.findIndex(set => set.name === name);
      let newSets = [...oldSets]
      if (existingSetIndex < 0) {
        // Add new set with metadata
        const newSet = {
          name,
          regions: data,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };
        newSets = [...oldSets, newSet]
        if(name == "Query Set") {
          setActiveSet(newSet)
        }
      } else {
        const updateSet = {
          ...oldSets[existingSetIndex],
        }
        updateSet.regions = data
        updateSet.updatedAt = new Date().toISOString()
        if(name == "Query Set") {
          setActiveSet(updateSet)
        }
        newSets[existingSetIndex] = updateSet
      }
      return newSets
    });
  }, []);

  const deleteSet = useCallback((name) => {
    setSets(prevSets => prevSets.filter(set => set.name !== name));
    if (activeSet && activeSet.name === name) {
      setActiveSet(null);
    }
  }, [activeSet]);
 
  return (
    <RegionsContext.Provider value={{ 
      sets, 
      activeSet, 
      saveSet, 
      deleteSet,
      setActiveSet 
    }}>
      {children}
    </RegionsContext.Provider>
  );
};

export default RegionsProvider;