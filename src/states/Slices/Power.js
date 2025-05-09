const Power = (set, get) => {

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