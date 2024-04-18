import { showFloat, showPosition } from "../../lib/display";

export default function Badge(region, layer) {
  // let field = layer.fieldChoice(region)
  let data = region.data
 
  return (
    <div style={{display: 'flex', flexDirection: 'column'}}>
      <span style={{color: data.protein_function ? "black" : "gray"}}>Protein Function: <span style={{color: layer.fieldColor("Protein Function")}}>{data.protein_function ? "⏺" : ""}</span> {showFloat(data.protein_function)}</span>
      <span style={{color: data.clinvar_sig? "black" : "gray"}}>ClinVar Sig: <span style={{color: layer.fieldColor("ClinVar Sig")}}>{data.clinvar_sig ? "⏺" : ""}</span> {showFloat(data.clinvar_sig)}</span>
      <span style={{color: data.apc_conservation_v2? "black" : "gray"}}>Conservation: <span style={{color: layer.fieldColor("Conservation")}}>{data.apc_conservation_v2 ? "⏺" : ""}</span> {showFloat(data.apc_conservation_v2)}</span>
      <span style={{color: data.max_value? "black" : "gray"}}>GWAS: <span style={{color: layer.fieldColor("GWAS")}}>{data.max_value ? "⏺" : ""}</span> {showFloat(data.max_value)}</span>
      <span>{data.nucleotide}</span>
      {showPosition(region)}
    </div>
  )
}

