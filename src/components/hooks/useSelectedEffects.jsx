import { useEffect, useMemo, useContext, useRef } from 'react';
import SelectedStatesStore from '../../states/SelectedStates';
import RegionsContext from '../../components/Regions/RegionsContext';
import { useZoom } from '../../contexts/ZoomContext';

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
    powerData,
  } = SelectedStatesStore();

  const {
    activeSet,
    activeGenesetEnrichment,
    activeFilters
  } = useContext(RegionsContext)

  const { setSelectedOrderRaw } = useZoom();

  useEffect(() => {
    if(selected) {
      addCurrentStateToSnapshots();
      setSelectedOrderRaw(selected ? selected.order + 0.5 : 4.5);
    }
  }, [ selected ]);

  const selectedRef = useRef(null);
  useEffect(() => {
    selectedRef.current = selected;
  }, [selected]);

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
    if(selected && !(selectedNarration)) {
      collectPathsForSelected(selected, genesetScoreMapping, determineFactorExclusion, activeSet, activeFilters)
    }
  }, [selected, subpaths, selectedNarration])

  // Generate query when narration changes
  useEffect(() => {
    // don't collect again if we are already have the summary
    if (selectedNarration && !regionSummary) {
      generateQuery(selectedRef.current, selectedNarration);
    }
  }, [selectedNarration, selectedNarration?.genesets, generateQuery, regionSummary]);

  // Generate summary when query changes
  useEffect(() => {
    if (query !== "" && !regionSummary) {
      generateSummary(selectedRef.current);
    }
  }, [query, generateSummary, regionSummary]);
}

export default useSelectedEffects;