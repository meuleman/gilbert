const SnapshotManagement = (set, get) => {

  // Function to create a unique key for a region
  const createKey = (region) => {
    if(!region) return "";
    return `${region.chromosome},${region.i},${region.order}`;
  };

  // Function to update the snapshot and state
  const updateSnapshotAndState = (regionKey, update, force = false) => {
    const { createKey, updateSnapshot } = get();
    updateSnapshot(regionKey, update)
    if(force || regionKey === createKey(get().selected)) set(update);
  }

  // Function to update a specific snapshot by ID
  const updateSnapshot = (id, updateData = {}) => {
    const { regionSnapshots } = get();
    const existingIndex = regionSnapshots.findIndex(s => s.id === id);
    
    if (existingIndex >= 0) {
      // Create a copy of the snapshots array
      const newSnapshots = [...regionSnapshots];
      
      // Update only the specified fields, preserving other fields
      newSnapshots[existingIndex] = {
      ...newSnapshots[existingIndex], // Keep existing properties
      ...updateData // Overwrite with new properties
      };
      
      set({ regionSnapshots: newSnapshots });
      // console.log(`Snapshot ${id} updated with:`, updateData);
      return null;
    }
    return null;
  };

  // Function to create snapshot from current state
  const createSnapshot = () => {
    const {
      selected,
      selectedNarration,
      fullNarration,
      subpaths,
      narrationCollection,
      subpathCollection,
      narrationPreview,
      slicedNarrationPreview,
      currentPreferred,
      query,
      request_id,
      regionSummary,
      abstracts,
      powerData,
      createKey,
    } = get();

    const snapshotKey = createKey(selected);

    // add information to snapshot
    const snapshot = {
      id: snapshotKey,
      selected,
      selectedNarration,
      fullNarration,
      subpaths,
      narrationCollection,
      subpathCollection,
      narrationPreview,
      slicedNarrationPreview,
      currentPreferred,
      query,
      request_id,
      regionSummary,
      abstracts,
      powerData
    };

    return snapshot
  }

  // Function to replace a snapshot by ID
  const replaceSnapshot = (idToReplace) => {
    const {
      regionSnapshots,
      createSnapshot,
    } = get();

    // create snapshot
    const snapshot = createSnapshot()

    const existingIndex = regionSnapshots.findIndex(s => s.id === idToReplace);
    
    if (existingIndex >= 0) {
      // create a copy of the snapshots array
      const newSnapshots = [...regionSnapshots];
      
      // replace the snapshot at the specified index
      newSnapshots[existingIndex] = snapshot;
      
      set({ regionSnapshots: newSnapshots });
      return;
    }
    return;
  }

  // Function to add the current state to snapshot
  const addCurrentStateToSnapshots = () => {
    const {
      regionSnapshots,
      selected,
      createKey
    } = get();
    
    const snapshotKey = createKey(selected);

    // create snapshot
    const snapshot = createSnapshot()

    const existingIndex = regionSnapshots.findIndex(s => s.id === snapshotKey);

    if (existingIndex >= 0) {
      // Update existing snapshot
      const newSnapshots = [...regionSnapshots];
      newSnapshots[existingIndex] = snapshot;
      set({ regionSnapshots: newSnapshots });
      console.log("Snapshot updated:", snapshot, newSnapshots.length, newSnapshots);
    } else {
      // add snapshot to regionSnapshots
      set({ regionSnapshots: [...regionSnapshots, snapshot] });
      console.log("Snapshot added:", snapshot, [...regionSnapshots, snapshot].length, [...regionSnapshots, snapshot]);
    }
  }

  // Function to remove a snapshot
  const popRegionFromSnapshots = (snapshotKey) => {
    const { selected, regionSnapshots, createKey } = get();
    // remove snapshot from regionSnapshots
    const existingIndex = regionSnapshots.findIndex(s => s.id === snapshotKey);

    if (existingIndex >= 0) {
      const selectedKey = createKey(selected);
      if(snapshotKey === selectedKey) {
        // switch to a different snapshot
        const indexToSwitchTo = existingIndex === 0 ? 1 : existingIndex - 1;
        const snapshotToSwitchTo = regionSnapshots[indexToSwitchTo];
        switchSnapshots(snapshotToSwitchTo.id);
      }
      const newSnapshots = [...regionSnapshots];
      newSnapshots.splice(existingIndex, 1);
      set({ regionSnapshots: newSnapshots });
      console.log("Snapshot removed:", snapshotKey, newSnapshots.length, newSnapshots);
    }
  }

  // Function to switch to a different snapshot
  const switchSnapshots = (snapshotKey) => {
    const { regionSnapshots } = get();
    const existingIndex = regionSnapshots.findIndex(s => s.id === snapshotKey);
    console.log("Switching to snapshot:", snapshotKey, existingIndex);
    if (existingIndex >= 0) {
      const snapshot = regionSnapshots[existingIndex];
      set({
        selected: snapshot.selected,
        selectedNarration: snapshot.selectedNarration,
        fullNarration: snapshot.fullNarration,
        region: snapshot.region,
        subpaths: snapshot.subpaths,
        narrationCollection: snapshot.narrationCollection,
        subpathCollection: snapshot.subpathCollection,
        narrationPreview: snapshot.narrationPreview,
        slicedNarrationPreview: snapshot.slicedNarrationPreview,
        currentPreferred: snapshot.currentPreferred,
        query: snapshot.query,
        request_id: snapshot.request_id,
        regionSummary: snapshot.regionSummary,
        abstracts: snapshot.abstracts,
        powerData: snapshot.powerData,
        currentSnapshot: snapshot
      });

    }
  }

  return {
    // spawning new regions
    regionSnapshots: [],
    setRegionSnapshots: (snapshots) => set({ regionSnapshots: snapshots }),
    addCurrentStateToSnapshots,
    popRegionFromSnapshots,
    clearSnapshots: () => set({ regionSnapshots: [] }),
    switchSnapshots,
    updateSnapshot,
    createKey,
    updateSnapshotAndState,
    preventDerivation: false,
    setPreventDerivation: (prevent) => set({ preventDerivation: prevent }),
    replaceSnapshot,
    createSnapshot,
  }
}

export default SnapshotManagement;