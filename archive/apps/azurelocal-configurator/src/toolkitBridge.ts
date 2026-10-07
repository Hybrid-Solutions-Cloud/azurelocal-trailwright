import {dump} from 'js-yaml'
import type {Project} from './project'
import {canonical,sha256} from './project'
import {mapArm} from './armMapping'
import {toolkitReview,TOOLKIT_ARM_FIELDS} from './toolkitMapping'
import {ARM_LOCK,templates,type Json,type ArmParameter,ARM_PARAMETER_SCHEMA} from './armContract'
import {ARM_API_MAPPING_SCHEMA} from './armApi'
import {ARM_SHAPE_SCHEMAS} from './armShapes'
import {TOOLKIT_LOCK} from './toolkitContract'
export const TOOLKIT_BRIDGE_VERSION='0.1.0'
/** Fixed mapping contract, not instructions accepted from an imported project. */
export const TOOLKIT_BRIDGE_MAPPING={
 ...Object.fromEntries(Object.entries(TOOLKIT_ARM_FIELDS).map(([field,parameter])=>[parameter,`/compute/cluster_arm_deployment/${field}`])),
 clusterName:'/compute/clusters/azure_local/azl_name',tenantId:'/azure_platform/azure_tenants/aztenant_azurelocal_id',location:'/azure_platform/azure_tenants/aztenant_region',localAdminUserName:'/identity/accounts/account_local_admin_username',
}
const adMapping={AzureStackLCMAdminUsername:'/identity/accounts/account_lcm_username',domainFqdn:'/identity/active_directory/domain_fqdn',adouPath:'/identity/active_directory/adou_path'}
export function bridgeMapping(identity:'ad'|'local'){return {...TOOLKIT_BRIDGE_MAPPING,...(identity==='ad'?adMapping:{})}}
export function bridgeParameterSchema(identity:'ad'|'local'){
 const properties:Record<string,unknown>={}
 const literal=(s:string)=>s.replace(/[a-z]/gi,c=>`[${c.toLowerCase()}${c.toUpperCase()}]`).replace(/\./g,'\\.')
 const vaultIdPattern=`^/${literal('subscriptions')}/[a-fA-F0-9]{8}(?:-[a-fA-F0-9]{4}){3}-[a-fA-F0-9]{12}/${literal('resourceGroups')}/[^/]+/${literal('providers/Microsoft.KeyVault/vaults')}/[a-zA-Z0-9-]+$`
 for(const [name,d]of Object.entries(templates[identity].parameters)){
  const type=({int:'integer',bool:'boolean',securestring:'string'} as Record<string,string>)[d.type.toLowerCase()]??d.type.toLowerCase()
  if(d.type.toLowerCase()==='securestring'){properties[name]={type:'object',required:['reference'],additionalProperties:false,properties:{reference:{type:'object',additionalProperties:false,required:['keyVault','secretName'],properties:{keyVault:{type:'object',required:['id'],additionalProperties:false,properties:{id:{type:'string',pattern:vaultIdPattern}}},secretName:{type:'string',pattern:'^[a-zA-Z0-9-]{1,127}$'},secretVersion:{type:'string',pattern:'^[a-fA-F0-9]{32}$'}}}}};continue}
  const source:Record<string,unknown>={type}
  for(const [from,to]of [['minLength','minLength'],['maxLength','maxLength'],['minValue','minimum'],['maxValue','maximum'],['allowedValues','enum']] as const)if(d[from]!==undefined)source[to]=d[from]
  const api=(ARM_API_MAPPING_SCHEMA.properties as Record<string,unknown>)[name]
  properties[name]={type:'object',required:['value'],additionalProperties:false,properties:{value:{allOf:[source,...(api?[api]:[]),...(ARM_SHAPE_SCHEMAS[name]?[ARM_SHAPE_SCHEMAS[name]]:[])]}}}
 }
 return {$schema:'http://json-schema.org/draft-07/schema#',type:'object',additionalProperties:false,required:['$schema','contentVersion','parameters'],properties:{$schema:{const:ARM_PARAMETER_SCHEMA},contentVersion:{const:'1.0.0.0'},parameters:{type:'object',additionalProperties:false,required:Object.keys(properties),properties}}}
}
export function bridgeCompanionSchema(identity:'ad'|'local'){
 const parameters=bridgeParameterSchema(identity).properties.parameters.properties as Record<string,any>,pointers=bridgeMapping(identity)
 const supplementalNames=Object.keys(parameters).filter(name=>!(name in pointers)&&!['deploymentMode','physicalNodesSettings'].includes(name)&&templates[identity].parameters[name].type.toLowerCase()!=='securestring')
 const secretNames=Object.keys(parameters).filter(name=>templates[identity].parameters[name].type.toLowerCase()==='securestring')
 const properties={kind:{const:'azurelocal-toolkit-arm-companion'},version:{const:TOOLKIT_BRIDGE_VERSION},identity:{const:identity},release:{const:'2604.0.0'},toolkitCommit:{const:TOOLKIT_LOCK.commit},templateSha256:{const:ARM_LOCK.templates.find(t=>t.id===identity)!.sha256},infrastructureSha256:{type:'string',pattern:'^[a-f0-9]{64}$'},projectId:{type:'string',pattern:'^[a-zA-Z0-9][a-zA-Z0-9_-]{0,99}$'},projectRevision:{type:'integer',minimum:1},scope:{type:'object',additionalProperties:false,required:['subscription','resourceGroup'],properties:{subscription:{type:'string',pattern:'^[a-fA-F0-9]{8}(-[a-fA-F0-9]{4}){3}-[a-fA-F0-9]{12}$'},resourceGroup:{type:'string',minLength:1,maxLength:90,pattern:'^[^/]+$'}}},supplements:{type:'object',additionalProperties:false,required:supplementalNames,properties:Object.fromEntries(supplementalNames.map(name=>[name,parameters[name].properties.value]))},secrets:{type:'object',additionalProperties:false,required:secretNames,properties:Object.fromEntries(secretNames.map(name=>[name,parameters[name]]))},deploymentAuthorized:{const:false},runtimeQualified:{const:false}}
 return {$schema:'http://json-schema.org/draft-07/schema#',type:'object',additionalProperties:false,required:Object.keys(properties),properties}
}
export function toolkitBridgeReview(p:Project){
 const toolkit=toolkitReview(p),arm=mapArm(p),mapping=bridgeMapping(arm.identity),reasons:string[]=[]
 if(!toolkit.requested)reasons.push('Toolkit conversion was not selected.')
 if(p.sharing)reasons.push('Sharing exports omit operational conversion inputs.')
 if(!toolkit.schemaValid)reasons.push('Canonical Toolkit schema assertions must pass.')
 if(p.config.architecture.storage!=='s2d'||p.config.architecture.topology!=='standard'||p.config.architecture.intent!=='new')reasons.push('This conversion contract currently covers new standard S2D clusters; other branches remain separate qualification work.')
 reasons.push(...toolkit.findings.filter(f=>['input','reference','preservation'].includes(f.category)).map(f=>f.message),...arm.findings.filter(f=>f.severity==='error').map(f=>f.message))
 const parameters=Object.keys(templates[arm.identity].parameters).map(parameter=>({parameter,source:parameter==='deploymentMode'?'Toolkit azl_deployment_mode':parameter==='physicalNodesSettings'?'Toolkit compute.cluster_nodes':parameter.endsWith('Password')?'Toolkit identity.accounts + explicit source vault resource ID':parameter in mapping?mapping[parameter as keyof typeof mapping]:'Versioned companion supplement; no upstream alias is invented'}))
 return {kind:'azurelocal-toolkit-conversion-review',version:TOOLKIT_BRIDGE_VERSION,requested:toolkit.requested,identity:arm.identity,conversionCandidate:toolkit.requested&&reasons.length===0,qualification:toolkit.requested&&reasons.length===0?'design-data':'design-only',deploymentReady:false,runtimeQualified:false,reasons:[...new Set(reasons)],parameters,boundary:'Emits the Toolkit hierarchy, its companion and a finished ARM parameter file as data. No converter script, template or deployment code is included.',sourceCommit:TOOLKIT_LOCK.commit,template:arm.consumer}
}
export function toolkitConversionRows(p:Project):unknown[][]{const r=toolkitBridgeReview(p);return [['Toolkit conversion data',`${r.version}; ${r.qualification}`],['Conversion data',r.conversionCandidate?'Complete':'Blocked or not requested'],['Scope',r.boundary],...r.reasons.map(reason=>['Conversion correction',reason])]}
export async function toolkitBridgeInputs(p:Project){
 const review=toolkitBridgeReview(p)
 if(!review.conversionCandidate)return {review,files:null}
 const toolkit=toolkitReview(p),arm=mapArm(p),mapping=bridgeMapping(arm.identity),yaml=dump(toolkit.candidateInfrastructure,{noRefs:true,sortKeys:true,lineWidth:120}),supplements:Record<string,Json>={},secrets:Record<string,ArmParameter>={}
 for(const [name,parameter]of Object.entries(arm.parameters)){
  if('reference'in parameter){secrets[name]=parameter;continue}
  if(name in mapping||['deploymentMode','physicalNodesSettings'].includes(name))continue
  supplements[name]=parameter.value
 }
 const companion={kind:'azurelocal-toolkit-arm-companion',version:TOOLKIT_BRIDGE_VERSION,identity:arm.identity,release:String(p.config.architecture.release),toolkitCommit:TOOLKIT_LOCK.commit,templateSha256:arm.consumer.sha256,infrastructureSha256:await sha256(yaml),projectId:p.id,projectRevision:p.revision,scope:{subscription:String(p.config.azure.subscription),resourceGroup:String(p.config.azure.resourceGroup)},supplements,secrets,deploymentAuthorized:false,runtimeQualified:false}
 return {review,files:{'infrastructure.yml':yaml,'companion.json':canonical(companion),'mapping.json':canonical({version:TOOLKIT_BRIDGE_VERSION,identity:arm.identity,pointers:mapping}),'parameters.schema.json':canonical(bridgeParameterSchema(arm.identity))}}
}
