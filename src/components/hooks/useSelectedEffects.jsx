import { useEffect, useMemo, useContext } from 'react';
import SelectedStatesStore from '../../states/SelectedStates';
import RegionsContext from '../../components/Regions/RegionsContext';

/**
 * Custom hook to handle narration-to-summary pipeline
 * Automatically handles query generation and summary updates
 */
function useSelectedEffects() {
  const { 
    selected,
    selectedNarration,
    query,
    setQuery,
    setRegionSummary,
    generateQuery,
    generateSummary,
    collectPathsForSelected,
    determineFactorExclusion,
    addCurrentStateToSnapshots,
    regionSummary,
    subpaths, 
  } = SelectedStatesStore();

  const {
    activeSet,
    activeGenesetEnrichment,
    activeFilters
  } = useContext(RegionsContext)

  // Create a mapping from geneset to its score for quick lookup
  const genesetScoreMapping = useMemo(() => {
    return activeGenesetEnrichment
      ? activeGenesetEnrichment.reduce((acc, g) => {
          acc[g.geneset] = g.p;
          return acc;
        }, {})
      : {};
  }, [activeGenesetEnrichment]);

  useEffect(() => {
    if(!(selectedNarration)) {
      collectPathsForSelected(selected, genesetScoreMapping, determineFactorExclusion, activeSet, activeFilters)
    }
  }, [selected, subpaths, selectedNarration])

  // Generate query when narration changes
  useEffect(() => {
    // don't collect again if we are already have the summary
    if (selectedNarration && !regionSummary) {
      const generatedQuery = generateQuery(selectedNarration);
      if (!!generatedQuery) {
        setQuery(generatedQuery);
      } else {
        setRegionSummary(null);
      }
    }
  }, [selectedNarration, selectedNarration?.genesets, generateQuery, setQuery, setRegionSummary, regionSummary]);

  // Generate summary when query changes
  useEffect(() => {
    if (query !== "" && !regionSummary) {
      generateSummary();
    }
  }, [query, generateSummary, regionSummary]);

  useEffect(() => {
    if(selectedNarration) {
      addCurrentStateToSnapshots();
    }
  }, [ selectedNarration, subpaths, regionSummary ]);
}

export default useSelectedEffects;