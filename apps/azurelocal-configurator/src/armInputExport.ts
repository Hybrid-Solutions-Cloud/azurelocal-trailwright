import {mapArm} from './armMapping'
import {toolkitBridgeReview} from './toolkitBridge'
import {canonical,type Project} from './project'
export const ARM_PARAMETERS_PATH='inputs/arm/azuredeploy.parameters.json'
/** Whether the finished ARM parameter file is valid data for this design, and why not when it is withheld. */
export function armInputReview(p:Project){
 const mapping=mapArm(p),toolkit=toolkitBridgeReview(p).conversionCandidate,reasons:string[]=[]
 if(!mapping.requested&&!toolkit)reasons.push('Select the ARM or Terraform/Ansible route, or Toolkit conversion, to export an ARM parameter file.')
 if(p.sharing)reasons.push('Sharing exports omit operational parameter files.')
 if(p.config.architecture.storage!=='s2d'||p.config.architecture.topology!=='standard'||p.config.architecture.intent!=='new')reasons.push('The pinned ARM templates cover new standard S2D clusters; other branches keep their design without a parameter file.')
 reasons.push(...mapping.findings.filter(f=>f.severity==='error').map(f=>f.message))
 return {available:reasons.length===0,path:ARM_PARAMETERS_PATH,reasons:[...new Set(reasons)]}
}
/** The finished parameter file as data only; no template or deployment command is emitted. */
export function armInputFiles(p:Project):Record<string,string>{return armInputReview(p).available?{[ARM_PARAMETERS_PATH]:canonical(mapArm(p).document)}:{}}
