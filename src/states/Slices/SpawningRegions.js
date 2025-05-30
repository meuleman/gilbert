import { fromIndex } from '../../lib/regions'

const SpawningRegions = (set, get) => {
  // Function to spawn a new region by clicking on a subpath
  const setFactorSelection = (f, activeSet = null, activeFilters = []) => {

    const { 
      selected, removeNarrationPreview, clearSelected, createKey,
      selectedNarration, preventDerivation, findSubpaths,
      replaceSnapshot, addCurrentStateToSnapshots, determineFactorExclusion,
      maxNumSnapshots, regionSnapshots, switchSnapshots
    } = get(); 

    const idToReplace = !!selected.derivedFrom ? createKey(selected) : null;
    const derivedFrom = !!selected.derivedFrom ? selected.derivedFrom : selected

    // create region
    let factor = f?.path;
    let region = {
      ...fromIndex(factor.chromosome, factor.i, factor.order),
      ...factor,
      derivedFrom,
    };

    // test for existing snapshot for the new region
    const existingSnapshot = regionSnapshots.find(s => s.id === createKey(region));
    if (
      !selectedNarration || 
      !factor?.path || 
      preventDerivation || 
      (
        // if there is no more space for tabs, we're not replacing a tab, and not 
        // switching to an already existing tab
        regionSnapshots.length === maxNumSnapshots && 
        !idToReplace && 
        !existingSnapshot
      )
    ) return;

    // clear narration preview
    removeNarrationPreview();

    // switch to existing snapshot if it exists
    if( !!existingSnapshot) {
      switchSnapshots(existingSnapshot.id)
      return;
    }

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
      set({ selected: region, selectedNarration: newNarration, preventDerivation: true });

      // add new region to snapshot (or replace existing snapshot)
      !!idToReplace ? replaceSnapshot(idToReplace) : addCurrentStateToSnapshots();

      // Determine which factors to exclude based on the updated narration,
      // and then search for new subpaths from the latest region.
      const factorExclusion = determineFactorExclusion(newNarration, activeSet, activeFilters);
      findSubpaths(newNarration.path.slice(-1)[0].region, factorExclusion);
    }
  };

  // Function to spawn a new region by clicking on a segment in 2D and 1D maps
  const spawnRegionSidetrack = (region) => {

    const { 
      selected, clearSelected, preventDerivation, replaceSnapshot, 
      createKey, addCurrentStateToSnapshots, maxNumSnapshots, regionSnapshots, 
      switchSnapshots
    } = get();
    const idToReplace = !!selected.derivedFrom ? createKey(selected) : null;
    const derivedFrom = !!selected.derivedFrom ? selected.derivedFrom : selected
    
    // test for existing snapshot for the new region
    const existingSnapshot = regionSnapshots.find(s => s.id === createKey(region));

    if(
      preventDerivation || 
      (
        // if there is no more space for tabs, we're not replacing a tab, and not 
        // switching to an already existing tab
        regionSnapshots.length === maxNumSnapshots && 
        !idToReplace && 
        !existingSnapshot
      )
    ) return;

    // switch to existing snapshot if it exists
    if(!!existingSnapshot) {
      switchSnapshots(existingSnapshot.id)
      return;
    }
    clearSelected()

    // set new region
    set({ selected: { ...region, derivedFrom }, preventDerivation: true});

    // add new region to snapshot (or replace existing snapshot)
    !!idToReplace ? replaceSnapshot(idToReplace) : addCurrentStateToSnapshots()
  }

  // Function to spawn a new region by backtracking to a lower order
  const spawnRegionBacktrack = (order, activeSet, activeFilters) => {

    // create new region from selectedNarration
    const { 
      selected, selectedNarration, clearSelected, preventDerivation, createKey,
      recalculatePreferred, addCurrentStateToSnapshots, determineFactorExclusion,
      replaceSnapshot, regionSnapshots, maxNumSnapshots, switchSnapshots
    } = get();
    const idToReplace = !!selected.derivedFrom ? createKey(selected) : null;
    const derivedFrom = !!selected.derivedFrom ? selected.derivedFrom : selected

    const path = selectedNarration.path.filter(d => d.order <= order);
    const newPath = recalculatePreferred(path);
    const newRegion = {...newPath.find(d => d.order === order)?.region, derivedFrom };

    // test for existing snapshot for the new region
    const existingSnapshot = regionSnapshots.find(s => s.id === createKey(newRegion));

    if(
      preventDerivation || 
      (
        // if there is no more space for tabs, we're not replacing a tab, and not 
        // switching to an already existing tab
        regionSnapshots.length === maxNumSnapshots && 
        !idToReplace && 
        !existingSnapshot
      )
    ) return;

    // switch to existing snapshot if it exists
    if(!!existingSnapshot) {
      switchSnapshots(existingSnapshot.id)
      return;
    }
    
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
    set({ selected: newRegion, selectedNarration: newNarration, preventDerivation: true });

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