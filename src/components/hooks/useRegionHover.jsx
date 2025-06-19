import { useEffect, useRef, useState, useContext } from 'react';
import { throttle } from 'lodash';
import { overlaps } from '../../lib/regions';
import { debouncer } from '../../lib/debounce'
import { getGenesInCell, getGenesOverCell } from '../../lib/Genes';
import RegionsContext from '../Regions/RegionsContext';
import HoverStatesStore from '../../states/HoverStates'

const hoverContentDebounce = debouncer()

export default function useRegionHover({
  // Configuration options
  throttleTime = 50,
  
  // Input states
  hover = null,
  
  // Optional callbacks
  onProcessRegion = () => {},
}) {

  const { 
    hover: globalHover, setHover: setGlobalHover, collectPathForHover,
    hoverNarration, setHoverNarration, generateQuery, setQuery, 
    generateSummary, setRegionSummary: setHoverSummary,
    setGenesInside, setGenesOutside, setShow1DTooltip, shiftPressed, setShiftPressed
  } = HoverStatesStore()

  const { filteredActiveRegions } = useContext(RegionsContext)

  const [shiftForRegion, setShiftForRegion] = useState(false);

  useEffect(() => {
    const handleKeyDown = (e) => e.key === 'Shift' && setShiftPressed(true);
    const handleKeyUp = (e) => e.key === 'Shift' && setShiftPressed(false);
    
    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, [setShiftPressed]);

  // Store refs to avoid unnecessary effect triggers
  const filteredActiveRegionsRef = useRef(filteredActiveRegions);
  const lastHoverRef = useRef(null);
  const throttledUpdateRef = useRef(null);
  
  // Update ref when filteredActiveRegions changes
  useEffect(() => {
    filteredActiveRegionsRef.current = filteredActiveRegions;
  }, [filteredActiveRegions]);
  
  // Set up the throttled hover processor
  useEffect(() => {
    throttledUpdateRef.current = throttle(() => {
      // Reset states
      setHoverNarration(null);
      setQuery(null);
      setHoverSummary("");
      
      const region = lastHoverRef.current;
      if (!region) {
        setGlobalHover(null);
        return;
      }
      
      let finalRegion = region;
      // Check for overlapping regions
      if (filteredActiveRegionsRef.current?.length) {
        let overlappingRegion = overlaps(region, filteredActiveRegionsRef.current)[0] || region;
        overlappingRegion.subregion ? (overlappingRegion = overlappingRegion.subregion) : null;
        finalRegion = overlappingRegion.order > region.order ? overlappingRegion : region;
      }
      
      // Update all the states
      setGlobalHover(finalRegion);
      setGenesInside(getGenesInCell(finalRegion, finalRegion.order));
      setGenesOutside(getGenesOverCell(finalRegion, finalRegion.order));
      
      // Notify callback
      onProcessRegion(finalRegion);
    }, throttleTime, { leading: true, trailing: true });
    
    return () => {
      throttledUpdateRef.current?.cancel();
    };
  }, [
    setGlobalHover, setHoverNarration, setQuery, setHoverSummary, 
    setGenesInside, setGenesOutside, onProcessRegion, throttleTime
  ]);
  
  // Handle hover updates with throttling
  useEffect(() => {
    if (hover === lastHoverRef.current) return;
    
    lastHoverRef.current = hover;
    if (!shiftPressed) setShiftForRegion(false);
    
    // Trigger throttled update
    throttledUpdateRef.current();
  }, [hover, shiftPressed, setShiftForRegion]);
  
  // Handle shift key state
  useEffect(() => {
    setShow1DTooltip(shiftPressed);
    if (shiftPressed) setShiftForRegion(true);
  }, [shiftPressed, setShow1DTooltip, setShiftForRegion]);

  useEffect(() => {
    hoverContentDebounce(
      async () => {
        // ensures that when shiftForRegion is set to false, no extra path is collected
        shiftForRegion ? collectPathForHover(globalHover) : null
      },
      () => {},
      1000
    )
  }, [shiftForRegion, globalHover, setShow1DTooltip])

  useEffect(() => {
    if(!hoverNarration) return;
    // console.log("HOVER NARRATION CHANGED", hoverNarration)
    const hoverQuery = generateQuery(hoverNarration);
    setQuery(hoverQuery);
    if(!hoverQuery) {
      setHoverSummary(null);
      return;
    };
    generateSummary()
  }, [hoverNarration])

  return;
}