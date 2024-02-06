import './SettingsPanel.css'
import RegionFilesSelect from './Regions/RegionFilesSelect'

const SettingsPanel = ({
  regionset,
  onRegionSetChange=()=>{},
  showHilbert,
  onShowHilbertChange=()=>{},
  showGenes,
  onShowGenesChange=()=>{},
  showGaps,
  onShowGapsChange=()=>{},
  duration,
  onDurationChange=()=>{},
  pathCSN,
  onPathCSNChange=()=>{},
} = {}) => {
  return (
    <div className="settings-panel">
      <div className="settings-panel-left">
        <label>
          <RegionFilesSelect selected={regionset} onSelect={(a,b) => {console.log("a,b", a,b); onRegionSetChange(a,b)}} />
        </label>
        <label>
          <input type="checkbox" checked={showHilbert} onChange={onShowHilbertChange} />
          Show Hilbert Curve
        </label>
        <label>
          <input type="checkbox" checked={showGenes} onChange={onShowGenesChange} />
          Show Gene Overlays
        </label>
        <label>
          <input type="checkbox" checked={showGaps} onChange={onShowGapsChange} />
          Show gaps
        </label>
        <label>
          <input type="number" value={duration} onChange={onDurationChange}></input>
          Zoom duration
        </label>
        
        <label>
          <input type='checkbox' checked={pathCSN} onChange={onPathCSNChange} />
          Path-Based Cross Scale Narration
        </label>
      </div>
    </div>
  );
}

export default SettingsPanel;