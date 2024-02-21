import { fromCoordinates } from '../../lib/regions'
import { showPosition } from '../../lib/display'

import simSearchFactors from './SimSearchFactors.json'

import './ResultList.css'

const ResultList = ({
  simSearch,
  zoomRegion,
  searchByFactorInds,
  selectedOrder,
  handleFactorClick,
  onHover=()=>{},
  onSelect=()=>{},
  onZoom=()=>{}
} = {}) => {

  if(!simSearch || !simSearch.simSearch) return (<div></div>)

  let factors = simSearch.factors
  let layer, layerFactors;
  if(simSearch.layer) {  // only in search by factor
    layer = simSearch.layer
    if(layer === "DHS Components") layerFactors = simSearchFactors['DHS'].map(d => d.fullName)
    else if(layer === 'Chromatin States') layerFactors = simSearchFactors['Chromatin States'].map(d => d.fullName)
  }
  const regions = simSearch.simSearch.map(d => {
    let data = {}
    d.percentiles.forEach((r,i) => {
      data[factors[i].fullName] = r
    })
    return {
      ...fromCoordinates(d.coordinates), 
      ...d,
      data
    }
  })
  let searched, similar
  if (simSearch.method == "Region") {
    searched = regions[0]
    similar = regions.slice(1)
  } else {
    similar = regions
  }

  if(searchByFactorInds) {
    regions.forEach(region => {
      region.inSearchData = []
      region.notInSearchData = []
      const ranks = region.percentiles
      const ranksWithFactorIndsSorted = ranks
        .map((r, i) => ({rank: r, factor: factors[i]}))  // factorInd may not be i (ie Chromatin States)
        .sort((a, b) => b.rank - a.rank)
      
      let inSearchFactorCount = 0
      let notInSearchFactorCount = 0

      ranksWithFactorIndsSorted.map((r) => {
        let nonZeroRank = r.rank > 0
        if((nonZeroRank) && searchByFactorInds.includes(r.factor.ind)) {
          region.inSearchData.push({factor: r.factor, factorCount: inSearchFactorCount})
          inSearchFactorCount += 1
        } else if(nonZeroRank) {
          if((layerFactors && layerFactors.includes(factors[r.factor.ind]?.fullName)) || !layerFactors) {
            region.notInSearchData.push({factor: r.factor, factorCount: notInSearchFactorCount})
            notInSearchFactorCount += 1
          }
        }
      })
      
    })
  }
  console.log("REGIONS", regions)

  return (
    <div className='sim-search-result-list'>
      <div className="result-table">
        <div className="result-header">
          <div className="result-row">
            <div className="result-region">{searched && "Searched Region:"}</div>
            <div className="result-in-search">In Search</div>
            <div className="result-not-in-search">Not In Search</div>
          </div>
        </div>
        <div className="result-body">
          {searched &&
            <div className="result-row">
                <div className="result-region">
                  <span className={`zoomer ${zoomRegion && zoomRegion.chromosome == searched.chromosome && zoomRegion.start == searched.start ? 'zoomed' : ''}`} onClick={() => onZoom(region)} title="Zoom to region">🔍</span> 
                  <span className="label"> {showPosition(searched, false)}</span>
                </div>
            </div> }
          <div className="result-row">
            <div>Similar Regions:</div>
          </div>
          {similar.map((d,i) => {
            return <div key={i} className="result-row" 
              onMouseEnter={() => onHover(d)} 
              onMouseLeave={() => onHover(null)}
              >
              <div className="result-region">
                <span className={`zoomer ${zoomRegion && zoomRegion.chromosome == d.chromosome && zoomRegion.start == d.start ? 'zoomed' : ''}`} onClick={() => onZoom(d)} title="Zoom to region">🔍</span> 
                <span className="label"> {i+1 < 10 ? "0" : ""}{i+1}: {showPosition(d, false)}</span>
              </div>
              <div className="result-in-search">
                {d.inSearchData.map((d, j) => {
                  return <div className="result-factor" 
                      key={j} 
                      title={d.factor.fullName} 
                      style={{backgroundColor:d.factor.color}}
                      onClick={() => handleFactorClick(d.factor)}
                    ></div>
                })}
              </div>
              <div className="result-not-in-search">
                {d.notInSearchData.map((d, j) => {
                  return <div className="result-factor" 
                      key={j} 
                      title={d.factor.fullName} 
                      style={{backgroundColor:d.factor.color}}
                      onClick={() => handleFactorClick(d.factor)}
                    ></div>
                })}
              </div>
            </div>
          })}
        </div>
      </div>
    </div>
  )
}

export default ResultList