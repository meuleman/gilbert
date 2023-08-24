// A component to display narration when clicking over hilbert cells

import factors from './NarrationFactors.json'
import './SelectedModalNarration.css'
import { useEffect } from 'react'


const SelectedModalNarration = ({
  selectedNarration = null,
} = {}) => {
  let narration = ""
  if(selectedNarration) {

    let narrationRanksSorted = [...selectedNarration]
    narrationRanksSorted.sort((a, b) =>  b - a)
    let narrationRanksSortedFiltered = narrationRanksSorted.filter((f) => {return f > 0})
    let factorsSorted = [...factors]
    factorsSorted.sort((a, b) => selectedNarration[b.ind] - selectedNarration[a.ind])
    let factorsSortedFiltered = factorsSorted.slice(0, narrationRanksSortedFiltered.length)

    if(factorsSortedFiltered) {
      let numFactorsToNarrate = factorsSortedFiltered.length

      narration = "This region is best characterized by "
      factorsSortedFiltered.forEach((f, i) => {
        let factor = f.fullName
        let metric = f.metric
        let phraseEnd = "."
        if(numFactorsToNarrate === 2) {
          if(i === 0) {
            phraseEnd = ' and '
          }
        } else if (numFactorsToNarrate > 2) {
          if(i + 2 < numFactorsToNarrate) {
            phraseEnd = ', '
          } else if(i + 2 === numFactorsToNarrate){
            phraseEnd = ', and '
          }
        }
        narration += factor + " " + metric + phraseEnd
        var narrationSentence = document.getElementById('selected-modal-narration-sentence')
        if(narrationSentence) {
          narrationSentence.textContent = narration
        }
      })
    }
  }


  return (
    <div id='selected-modal-narration-container' className='selected-modal-narration-container'>
      <div id='selected-modal-narration-header' className='selected-modal-narration-header'>Narration:</div>
      <div id='selected-modal-narration-sentence' className='selected-modal-narration-sentence'></div>
    </div>
  )
}
export default SelectedModalNarration