import { fromIndex } from '../../lib/regions'

const SpawningRegions = (set, get) => {
// updates the narration with a factor's subpath selection.
const setFactorSelection = (f, activeSet = null, activeFilters = []) => {

    const { 
      selected, removeNarrationPreview, clearSelected, createKey,
      selectedNarration, preventDerivation, findSubpaths,
      replaceSnapshot, addCurrentStateToSnapshots, determineFactorExclusion
    } = get(); 
    if (!selectedNarration || !f?.path?.path || preventDerivation) return;

    const idToReplace = !!selected.derivedFrom ? createKey(selected) : null;
    const derivedFrom = !!selected.derivedFrom ? selected.derivedFrom : selected

    set({ preventDerivation: true });

    // create region
    let factor = f.path;
    let region = {
      ...fromIndex(factor.chromosome, factor.i, factor.order),
      ...factor,
      derivedFrom,
    };

    let newPath = factor.path;

    const newNarration = {
      // Basic narration properties
      ...region,
      path: newPath,
      region,
      genes: selectedNarration.genes,
      genesets: selectedNarration.genesets
    };

    // clear previous selected information set 
    clearSelected()
    removeNarrationPreview();

    // Add full data to the new path
    if (newNarration?.path?.length && newPath?.length) {

      // add previously collected fullData and counts to segments of the new path
      newNarration.path.forEach(d => {
        let correspondingSegment = newPath.find(e => e.order === d.order);
        if (!!correspondingSegment) {
          d.fullData ? correspondingSegment["fullData"] = d.fullData : null;
          d.counts ? correspondingSegment["counts"] = d.counts : null;
        }
      });
      newNarration.path = newPath;
      // Save current region and narration to collection.

      set({ selected: region, selectedNarration: newNarration });
      // add new region to snapshot (or replace existing snapshot)
      !!idToReplace ? replaceSnapshot(idToReplace) : addCurrentStateToSnapshots();

      // Determine which factors to exclude based on the updated narration,
      // and then search for new subpaths from the latest region.
      const factorExclusion = determineFactorExclusion(newNarration, activeSet, activeFilters);
      findSubpaths(newNarration.path.slice(-1)[0].region, factorExclusion);
    }
  };

  const spawnRegionSidetrack = (region) => {

    const { 
        selected, clearSelected, preventDerivation, replaceSnapshot, 
        createKey, addCurrentStateToSnapshots
    } = get();
    const idToReplace = !!selected.derivedFrom ? createKey(selected) : null;
    const derivedFrom = !!selected.derivedFrom ? selected.derivedFrom : selected

    if(preventDerivation) return;
    set({ preventDerivation: true });

    clearSelected()

    // set new region
    set({ selected: { ...region, derivedFrom }});

    // add new region to snapshot (or replace existing snapshot)
    !!idToReplace ? replaceSnapshot(idToReplace) : addCurrentStateToSnapshots()
  }

  const spawnRegionBacktrack = (order, activeSet, activeFilters) => {

    // create new region from selectedNarration
    const { 
        selected, selectedNarration, clearSelected, preventDerivation, createKey,
        recalculatePreferred, addCurrentStateToSnapshots, determineFactorExclusion,
        replaceSnapshot
    } = get();
    const idToReplace = !!selected.derivedFrom ? createKey(selected) : null;
    const derivedFrom = !!selected.derivedFrom ? selected.derivedFrom : selected

    if(preventDerivation) return;
    set({ preventDerivation: true });

    const path = selectedNarration.path.filter(d => d.order <= order);
    const newPath = recalculatePreferred(path);
    let newRegion = {...newPath.find(d => d.order === order)?.region, derivedFrom };

    const newNarration = {
      // Basic narration properties
      ...newRegion,
      path: newPath,
      region: newRegion,
      genes: selectedNarration.genes,
      genesets: selectedNarration.genesets
    };

    clearSelected()

    // set new region
    set({ selected: newRegion, selectedNarration: newNarration });

    // add new region to snapshot (or replace existing snapshot)
    !!idToReplace ? replaceSnapshot(idToReplace) : addCurrentStateToSnapshots()
  
    // subpath query for backtracked region
    let factorExclusion = determineFactorExclusion(newNarration, activeSet, activeFilters)
    // find and set subpaths for new backtracked region
    get().findSubpaths(newRegion, factorExclusion)
  }

  return {
    setFactorSelection,
    spawnRegionBacktrack,
    spawnRegionSidetrack,
  }
}

export default SpawningRegions;