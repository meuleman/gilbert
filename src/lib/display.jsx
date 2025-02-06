import { format } from 'd3-format';

function showKb10(diff) {
  const log10Diff = Math.log10(diff);
  const scaleAsStr = 
              // (log10Diff < 2) ? `${Math.ceil(diff/10)*10}nt` :
              (log10Diff < 3) ? `${Math.ceil(diff/100)*100}nt` :
              (log10Diff < 4) ? `${Math.floor(diff/1000)}kb` :
              (log10Diff < 5) ? `${Math.floor(diff/1000)}kb` :
              (log10Diff < 6) ? `${Math.floor(diff/1000)}kb` :
              (log10Diff < 7) ? `${Math.floor(diff/1000000)}Mb` :
              (log10Diff < 8) ? `${Math.floor(diff/1000000)}Mb` :
              (log10Diff < 9) ? `${Math.floor(diff/1000000)}Mb` :
                                 `${Math.floor(diff/1000000000)}Gb`;
  return scaleAsStr
}

function showKb(diff) {
  const log2Diff = Math.log2(diff);
  const scaleAsStr = 
              (log2Diff < 10) ? [Math.ceil(diff), "bp"] :
              (log2Diff < 20) ? [Math.floor(diff/2**10), "kbp"] :
              (log2Diff < 30) ? [Math.floor(diff/2**20), "Mbp"] :
                                [Math.floor(diff/2**30), "Gbp"];
  return scaleAsStr
}

function showKbHTML(diff) {
  const [value, unit] = showKb(diff)
  return <><span>{value}</span><span>{unit}</span></>
}

function showKbSVG(diff) {
  const [value, unit] = showKb(diff)
  return <>
    <tspan x="0" dy="-0.6em" textAnchor="middle">{value}</tspan>
    <tspan x="0" dy="1.2em" textAnchor="middle">{unit}</tspan>
  </>
}

const showKbOrder = (order) => {
  let diff = Math.pow(4, 14 - Math.floor(order))
  return showKb(diff)
}

const showFloat = format(".2f")

const showInt = format(",")



function showPosition(d, full=true) {
  return (
    <span className="position">
      <span className="chromosome">{d.chromosome}</span>
      <span className="colon">:</span>
      <span className="start">{d.start}</span>
      {full && <>
        <span className="divider"> - </span>
        <span className="end">{d.end}</span>
        <span className="kb">({showKb(d.end - d.start)})</span>
      </>}
    </span>
  )
}

export {
  showKb,
  showKbHTML,
  showKbSVG,
  showKbOrder,
  showPosition,
  showFloat,
  showInt
}