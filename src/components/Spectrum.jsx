import * as d3 from 'd3'
import './Spectrum.css'
import GenesetEnrichmentOrder from './SimSearch/GenesetEnrichmentOrder.json'

const SelectedModal = ({
  width = 400,
  height = 700,
  plotXStart = 30,
  plotXStop = width - 20,
  plotYStart = 20,
  plotYStop = height - 20,
  windowSize = 100,
  genesetEnrichment
} = {}) => {
  let enrichments = new Array(GenesetEnrichmentOrder.length).fill(0)
  let enrichmentsMax = new Array(GenesetEnrichmentOrder.length).fill(0)
  let enrichmentsSmooth = new Array(GenesetEnrichmentOrder.length).fill(0)
  let orderedOriginalIndices = GenesetEnrichmentOrder.map(g => g.originalIndex)

  const removeSvg = () => {
    let svgElement = d3.selectAll('svg#spectrum-svg')
    let svgTooltip = d3.selectAll("div#tooltip")

    // if an element has been created
    if(svgElement._groups[0].length) svgElement.remove()
    if(svgTooltip._groups[0].length) svgTooltip.remove()
  }

  if(genesetEnrichment) {
    // fill the enrichment array with -log10(p-values)
    genesetEnrichment.map(g => {
      let orderedIndex = orderedOriginalIndices.indexOf(g.geneset_index)
      let value = -Math.log10(g.geneset_pval)  // -log10(pvalue)
      if(!isFinite(value)) {
        console.log('infinite value encountered with', g)
        value = -Math.log10(Math.min(...genesetEnrichment.filter(g => g.geneset_pval > 0).map(g => g.geneset_pval)))
      }
      // fill the enrichment array for geneset
      enrichments[orderedIndex] = value
    })

    
    enrichments.forEach((e, i) => {
      let startIndex = Math.max(0, i - windowSize / 2)
      let endIndex = Math.min(enrichments.length, i + windowSize / 2)
      let enrichmentsInWindow = enrichments.slice(startIndex, endIndex)
      enrichmentsMax[i] = Math.max(...enrichmentsInWindow)
    })

    enrichmentsMax.forEach((e, i) => {
      let startIndex = Math.max(0, i - windowSize / 2)
      let endIndex = Math.min(enrichments.length, i + windowSize / 2)
      let enrichmentsMaxInWindow = enrichmentsMax.slice(startIndex, endIndex)
      enrichmentsSmooth[i] = enrichmentsMaxInWindow.reduce((a, b) => a + b) / enrichmentsMaxInWindow.length
    })
    
  }

  let simSearchListContainer = d3.select("#spectrum-container")
  if(genesetEnrichment && simSearchListContainer && enrichmentsSmooth) {
    removeSvg()
    if(Math.max(...enrichmentsSmooth) > 0) {
      let spectrumsvg = simSearchListContainer
        .append("svg")
          .attr('id', 'spectrum-svg')
          .attr('className', 'spectrum-svg')
          .attr("width", width)
          .attr("height", height)
          .style("position", "absolute")

      // y scale
      const y = d3.scaleLinear()
        .domain([0, Math.max(...enrichmentsSmooth)])
        .range([plotYStop, plotYStart])
      spectrumsvg.append('g')
        .style('font', '8px sans-serif')
        .attr("transform", "translate(" + plotXStart + ", 0)")
        .call(d3.axisLeft(y)) // .tickValues([Math.min(...enrichments), Math.max(...enrichments)]).tickFormat(d3.format(".0"))
      
      const x = d3.scaleLinear()
        .domain([0, GenesetEnrichmentOrder.length - 1])
        .range([plotXStart, plotXStop])
      spectrumsvg.append('g')
        .style('font', '8px sans-serif')
        .attr("transform", "translate(0, " + plotYStop + ")")
        .call(d3.axisBottom(x).tickValues([]))

      // console.log(enrichments.filter(a => a > 0))
      spectrumsvg.append("path")
        .datum(enrichmentsSmooth)
        .attr("fill", "none")
        .attr("stroke", "black")
        .attr("stroke-width", 1)
        .attr("d", d3.line()
          .x(function(d, i) { return x(i) })
          .y(function(d) { return y(d) })
          )
    }
  }
  

  return (
    <>
    <div className='spectrum-container' id='spectrum-container'>

    </div>
    </>
  )
}
export default SelectedModal