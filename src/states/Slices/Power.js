const Power = (set, get) => {

  // Function to set power data for a specific region
	const setPowerData = (region, powerData) => {
    const { createKey, updateSnapshotAndState } = get();
    const regionKey = createKey(region);
    updateSnapshotAndState(regionKey, { powerData: powerData });
  }
	
  return {
		powerDataLoaded: false,
    setPowerDataLoaded: (loaded) => set({ powerDataLoaded: loaded }),
		powerData: null,
    setPowerData,
	}
}

export default Power;