// A component to display narration when clicking over hilbert cells

import factors from './NarrationFactors.json'
import './SelectedModalNarration.css'
import { useEffect } from 'react'


const SelectedModalNarration = ({
  selectedNarration = null,
} = {}) => {
  if(selectedNarration) {

    let narrationRanksSorted = [...selectedNarration]
    narrationRanksSorted.sort((a, b) =>  b - a)
    let factorsSorted = [...factors]
    factorsSorted.sort((a, b) => selectedNarration[b.ind] - selectedNarration[a.ind])
    
    
    // console.log(selectedNarration, narrationRanksSorted, factors, factorsSorted)
  }


  return (
    <div id='selected-modal-narration-container' className='selected-modal-narration-container'>
    </div>
  )
}
export default SelectedModalNarration