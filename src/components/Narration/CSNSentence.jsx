// A component to display narration when clicking over hilbert cells

import { useState, useEffect } from 'react'
// import factors from './NarrationFactors.json'
//import './SelectedModalNarration.css'

const SelectedModalNarration = ({
  crossScaleNarration = null,
  order = null
} = {}) => {
  const [narration, setNarration] = useState("")
  useEffect(() => {
    if(crossScaleNarration.filter(d => !!d).length > 0) {
      let sentence = "This region"
      let orderFeature = crossScaleNarration.filter(n => n?.order === order)
      let orderUpFeatures = crossScaleNarration.filter(n => n?.order > order)
      let orderDownFeatures = crossScaleNarration.filter(n => n?.order < order)

      if(orderFeature.length == 1) {
        sentence += ` is best characterized by ${orderFeature[0].field.field} ${orderFeature[0].layer.name}`
      }

      if(orderDownFeatures.length > 0) {
        let topFeature = orderDownFeatures.sort((a, b) => b.field.value - a.field.value)[0]
        if(orderFeature.length == 1) {
          if(orderUpFeatures.length > 0) sentence += ","
          else sentence += " and"
        }
        sentence += ` exists in the context of ${topFeature.field.field} ${topFeature.layer.name}`
      }

      if(orderUpFeatures.length > 0) {
        let topFeature = orderUpFeatures.sort((a, b) => b.field.value - a.field.value)[0]
        if((orderDownFeatures.length > 0) && (orderFeature.length == 1)) sentence += ","
        if((orderDownFeatures.length > 0) || (orderFeature.length == 1)) sentence += " and"
        sentence += ` contains ${topFeature.field.field} ${topFeature.layer.name}`
      }
      sentence += "."
      setNarration(sentence)
    } else {
      setNarration("")
    }
  }, [crossScaleNarration, order])

  return (
    <div className='narration-sentence'>{narration}</div>
  )
}
export default SelectedModalNarration