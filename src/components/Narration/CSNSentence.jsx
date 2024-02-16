// A component to display narration when clicking over hilbert cells

import factors from './NarrationFactors.json'
//import './SelectedModalNarration.css'
import { useEffect } from 'react'


const SelectedModalNarration = ({
  crossScaleNarration = null,
  order = null
} = {}) => {
  let narration = ""
  useEffect(() => {
    if(crossScaleNarration.filter(d => d != null).length > 0) {
      narration = "This region"
      let orderFeature = crossScaleNarration.filter(n => n?.order === order)
      let orderUpFeatures = crossScaleNarration.filter(n => n?.order > order)
      let orderDownFeatures = crossScaleNarration.filter(n => n?.order < order)

      if(orderFeature.length == 1) {
        narration += ` is best characterized by ${orderFeature[0].field.field} ${orderFeature[0].layer.name}`
      }

      if(orderDownFeatures.length > 0) {
        let topFeature = orderDownFeatures.sort((a, b) => b.field.value - a.field.value)[0]
        if(orderFeature.length == 1) {
          if(orderUpFeatures.length > 0) narration += ","
          else narration += " and"
        }
        narration += ` exists in the context of ${topFeature.field.field} ${topFeature.layer.name}`
      }

      if(orderUpFeatures.length > 0) {
        let topFeature = orderUpFeatures.sort((a, b) => b.field.value - a.field.value)[0]
        if((orderDownFeatures.length > 0) && (orderFeature.length == 1)) narration += ","
        if((orderDownFeatures.length > 0) || (orderFeature.length == 1)) narration += " and"
        narration += ` contains ${topFeature.field.field} ${topFeature.layer.name}`
      }
      narration += "."
    }
    var narrationSentence = document.getElementById('narration-sentence')
    if(narrationSentence) narrationSentence.textContent = narration
  }, [crossScaleNarration, order])


  return (
    <div id='narration-sentence'></div>
  )
}
export default SelectedModalNarration