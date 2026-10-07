import Ajv from 'ajv'
import addFormats from 'ajv-formats'
import schema from './contracts/toolkit/infrastructure.schema.json'
import lock from './contracts/toolkit/source-lock.json'
import registryArm from './contracts/toolkit/registry-arm.assertions.json'
import {assertNoSecrets,MAX_FILE_BYTES} from './project'
export {lock as TOOLKIT_LOCK}
export const TOOLKIT_SOURCE_FINDINGS=[
 'The unmodified pinned reader exits before reading input: SupportsShouldProcess and an explicit WhatIf switch declare the same parameter twice.',
 'The reader expects root accounts, cluster_nodes and cluster_arm_deployment and flat networking.network_intents. Schema v4 requires identity.accounts, compute.cluster_nodes, compute.cluster_arm_deployment and networking.onprem.network_intents. Root legacy aliases are forbidden by the schema.',
 'The reader emits the AD parameter shape for LocalIdentity, forces a new deployment vault and cloud witness, and constructs credential references using fixed secret names rather than preserving the selected source vault/version.',
 'Single-item PowerShell output can lose array shape; explicit zero retention values can become defaults; per-node storage addresses and several SBE/custom-location inputs are discarded.',
 'The registry and hand-maintained schema disagree on account/ARM aliases, configurationMode and networking enums. Their open extension properties are not proof that a consumer reads those fields.',
 'The schema limits nodes to 16 and has no declared hybrid scenario. SAN-only 17–64 nodes and hybrid require a separately qualified consumer.',
 'The registry description of validate_only as non-deploying is unsafe for the pinned Microsoft templates: Validate creates or updates prerequisite Azure resources.',
] as const
// The source has invalid scalar examples annotations. Remove only annotations from a clone;
// all assertions, unknown keywords, properties and additionalProperties rules remain intact.
function assertions(value:unknown):unknown{
 if(Array.isArray(value))return value.map(assertions)
 if(value&&typeof value==='object')return Object.fromEntries(Object.entries(value).filter(([key])=>!['examples','description','title','$comment','default'].includes(key)).map(([key,v])=>[key,['properties','patternProperties','definitions','$defs'].includes(key)&&v&&typeof v==='object'?Object.fromEntries(Object.entries(v).map(([name,child])=>[name,assertions(child)])):assertions(v)]))
 return value
}
const ajv=new Ajv({allErrors:true,strict:false,coerceTypes:false,useDefaults:false,removeAdditional:false})
addFormats(ajv)
ajv.addFormat('azure_resource_id',/^\/subscriptions\/[a-f0-9-]{36}\/resourceGroups\/[^/]+\/providers\/[^/]+(?:\/[^/]+\/[^/]+)+$/i)
const validate=ajv.compile(assertions(schema) as object)
const validateRegistryArm=ajv.compile(registryArm)
export function toolkitRegistryErrors(arm:unknown):string[]{return validateRegistryArm(arm)?[]:(validateRegistryArm.errors??[]).map(e=>`compute.cluster_arm_deployment${e.instancePath} ${e.message}`)}
const object=(v:unknown):v is Record<string,unknown>=>!!v&&typeof v==='object'&&!Array.isArray(v)
/** Source-schema validation is separate from application parsing and native reader qualification. */
export function validateToolkit(input:unknown):string[]{
 const errors:string[]=[]
 let encoded:string;try{encoded=JSON.stringify(input)}catch{return ['Toolkit input is not a serializable JSON value.']}
 if(!encoded||new TextEncoder().encode(encoded).length>MAX_FILE_BYTES)return ['Toolkit input exceeds the bounded JSON contract.']
 function inspect(value:unknown,path:string,depth:number){
  if(depth>32){errors.push(`${path}: nesting exceeds 32 levels.`);return}
  if(typeof value==='string'){try{assertNoSecrets(value,path)}catch{errors.push(`${path}: secret literal or credential-bearing URL is forbidden.`)}}
  else if(Array.isArray(value)){if(value.length>2000){errors.push(`${path}: too many records.`);return}value.forEach((v,i)=>inspect(v,`${path}/${i}`,depth+1))}
  else if(object(value))for(const [key,v]of Object.entries(value)){
   if(['__proto__','prototype','constructor'].includes(key))errors.push(`${path}: forbidden object key.`)
   if(/password|secret_ref|client_secret/i.test(key)&&typeof v==='string'&&v&&!/^keyvault:\/\/[a-z0-9-]+\/[a-zA-Z0-9-]+(?:\/[a-zA-Z0-9-]+)?$/.test(v))errors.push(`${path}/${key}: an explicit Key Vault reference is required.`)
   inspect(v,`${path}/${key}`,depth+1)
  }
 }
 inspect(input,'',0)
 if(errors.length)return errors
 if(!validate(input))errors.push(...(validate.errors??[]).map(e=>`${e.instancePath||'/'} ${e.message}${e.keyword==='additionalProperties'?`: ${e.params.additionalProperty}`:''}`))
 return errors
}
