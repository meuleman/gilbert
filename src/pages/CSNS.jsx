import { useState, useEffect } from 'react';
import React from 'react';
import { fetchCombinedPathsAndGWAS } from '../lib/csn';

import LogoNav from '../components/LogoNav';
import SankeyModal from '../components/Narration/SankeyModal';
import RegionsContext from '../components/Regions/RegionsContext';
import RegionsProvider from '../components/Regions/RegionsProvider';

import './CSNS.css';


const RegionCSNContent = () => {

  // Get access to the RegionsContext to use the example sets
  const { 
    sets, 
    activeSet, 
    setActiveSet, 
    activeRegions
  } = React.useContext(RegionsContext);

  // Set the 2nd example set as default (index 1)
  useEffect(() => {
    if (sets.length > 0 && !activeSet) {
      // Sets the 2nd example set (index 1) as default
      setActiveSet(sets[1]);
    }
  }, [sets, activeSet, setActiveSet]);

  useEffect(() => { 
    document.title = `Gilbert | Region CSN: ${activeSet?.name || 'No Set Selected'}` 
  }, [activeSet]);

  // CSN related state
  const [loadingSelectedCSN, setLoadingSelectedCSN] = useState(false);
  const [hoveredCsn, setHoveredCsn] = useState({});
  const [shrinkNone, setShrinkNone] = useState(true);
  const [activePaths, setActivePaths] = useState(null);
  const [activeState, setActiveState] = useState(null);

  // Create component dimensions
  const [stripsWidth, setStripsWidth] = useState(0);
  useEffect(() => {
    const handleResize = () => {
      const element = document.querySelector('.region-csn');
      if(element) {
        const { width } = element.getBoundingClientRect();
        setStripsWidth(width);
      }
    };
    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);
  
  // Load CSN data based on active regions
  useEffect(() => {
    if(activeRegions?.length) {
      console.log("Loading CSN for active regions", activeRegions);
      setLoadingSelectedCSN(true);
      fetchCombinedPathsAndGWAS(activeRegions, false).then((response) => {
        if (!response) { 
          setActivePaths(null);
          setLoadingSelectedCSN(false);
        } else {
          setActivePaths(response.rehydrated);
          setActiveState(null);
          setLoadingSelectedCSN(false);
        }
      })
      .catch((e) => {
        console.log("error fetching top paths for regions", e);
        setActivePaths(null);
        setLoadingSelectedCSN(false);
      })
    }
  }, [activeRegions])

  // Render a dropdown to select example sets
  const renderSetSelector = () => {
    return (
      <div className="set-selector">
        <label>Select Region Set: </label>
        <select 
          value={activeSet?.id || ''} 
          onChange={(e) => {
            const selectedSetId = e.target.value;
            const selectedSet = sets.find(set => set.id === selectedSetId);
            setActiveSet(selectedSet);
          }}
        >
          <option value="">Select a region set</option>
          {sets.map((set) => (
            <option key={set.id} value={set.id}>{set.name}</option>
          ))}
        </select>
      </div>
    );
  };

  return (
    <div className="region-csn">
      <div className="header">
        <div className="header--brand">
          <LogoNav />
        </div>
        <div className="header--navigation">
        </div>
      </div>
      
      <div className="content">
        <div className="section">
          <h3>
            {renderSetSelector()}
          </h3>
          <div className="section-content">
            {activeSet ? (
              <div>
                Selected set: {activeSet.name} ({activeRegions?.length || 0} regions)
              </div>
            ) : (
              <div>No region set selected</div>
            )}
          </div>
        </div>

        <div className="section">
          <div className="section-content">
            <SankeyModal
              show={true}
              width={400}
              height={600}
              numPaths={activePaths?.length || 20}
              selectedRegion={activeRegions?.[0]}
              hoveredRegion={hoveredCsn}
              factorCsns={activePaths || []}
              fullCsns={activePaths || []}
              loading={loadingSelectedCSN ? "Loading CSN data..." : ""}
              shrinkNone={shrinkNone}
            />
          </div>
        </div>
      </div>
    </div>
  );
};

// Wrapper component that provides the ZoomContext
const RegionCSN = () => {
  return (
    <RegionsProvider>
      <RegionCSNContent />
    </RegionsProvider>
  );
};

export default RegionCSN;