import ad from './contracts/arm/ad.template.json'
import local from './contracts/arm/local.template.json'
import lock from './contracts/arm/source-lock.json'
import {validateArmShapes} from './armShapes'
import {validateArmApi} from './armApi'
export {lock as ARM_LOCK}
export type Json=string|number|boolean|null|Json[]|{[key:string]:Json}
export type ArmParameter={value:Json}|{reference:{keyVault:{id:string};secretName:string;secretVersion?:string}}
export interface ParameterDefinition {type:string;defaultValue?:Json;defaultvalue?:Json;allowedValues?:Json[];minLength?:number;maxLength?:number;minValue?:number;maxValue?:number}
export interface ArmTemplate {parameters:Record<string,ParameterDefinition>;resources:Record<string,unknown>;[key:string]:unknown}
export const templates:Record<'ad'|'local',ArmTemplate>={ad,local}
export const ARM_PARAMETER_SCHEMA='https://schema.management.azure.com/schemas/2019-04-01/deploymentParameters.json#'
export const parameterFile=(parameters:Record<string,ArmParameter>)=>({$schema:ARM_PARAMETER_SCHEMA,contentVersion:'1.0.0.0',parameters})
const record=(v:unknown):v is Record<string,unknown>=>!!v&&typeof v==='object'&&!Array.isArray(v)
const same=(a:unknown,b:unknown)=>JSON.stringify(a)===JSON.stringify(b)
/** Checks the pinned template's actual parameter declarations, including exact names and secure references. */
export function validateArmParameters(template:ArmTemplate,input:unknown):string[]{
 const errors:string[]=[]
 if(!record(input)||input.$schema!==ARM_PARAMETER_SCHEMA||input.contentVersion!=='1.0.0.0'||!record(input.parameters))return ['Invalid ARM deployment parameter document.']
 if(Object.keys(input).some(key=>!['$schema','contentVersion','parameters'].includes(key)))errors.push('Unknown parameter-document root field.')
 for(const key of Object.keys(input.parameters))if(!template.parameters[key])errors.push(`Unknown template parameter ${key}.`)
 for(const [name,definition]of Object.entries(template.parameters)){
  const raw=input.parameters[name],type=definition.type.toLowerCase()
  // Require explicit inputs rather than silently consuming source sample/default addresses.
  if(!record(raw)){errors.push(`Missing explicit parameter ${name}.`);continue}
  if(type==='securestring'||type==='secureobject'){
   if(Object.keys(raw).length!==1||!record(raw.reference)){errors.push(`${name}: only a runtime Key Vault reference is accepted.`);continue}
   const r=raw.reference
   if(!record(r.keyVault)||Object.keys(r.keyVault).length!==1||typeof r.keyVault.id!=='string'||!/^\/subscriptions\/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\/resourceGroups\/[^/]+\/providers\/Microsoft\.KeyVault\/vaults\/[a-z0-9-]+$/i.test(r.keyVault.id)||typeof r.secretName!=='string'||!/^[a-z0-9-]{1,127}$/i.test(r.secretName)||Object.keys(r).some(k=>!['keyVault','secretName','secretVersion'].includes(k))||(r.secretVersion!==undefined&&(typeof r.secretVersion!=='string'||!/^[a-f0-9]{32}$/i.test(r.secretVersion))))errors.push(`${name}: malformed Key Vault reference.`)
   continue
  }
  if(Object.keys(raw).length!==1||!('value'in raw)){errors.push(`${name}: expected exactly one value.`);continue}
  const value=raw.value
  if(type==='string'&&typeof value!=='string'||type==='int'&&(typeof value!=='number'||!Number.isSafeInteger(value))||type==='bool'&&typeof value!=='boolean'||type==='array'&&!Array.isArray(value)||type==='object'&&!record(value)){errors.push(`${name}: expected ${type}.`);continue}
  if(definition.allowedValues&&!definition.allowedValues.some(v=>same(v,value)))errors.push(`${name}: value is outside the template enum.`)
  if(typeof value==='string'&&((definition.minLength!==undefined&&value.length<definition.minLength)||(definition.maxLength!==undefined&&value.length>definition.maxLength)))errors.push(`${name}: text length is outside the template bounds.`)
  if(typeof value==='number'&&((definition.minValue!==undefined&&value<definition.minValue)||(definition.maxValue!==undefined&&value>definition.maxValue)))errors.push(`${name}: number is outside the template bounds.`)
 }
 return [...errors,...validateArmShapes(input.parameters),...validateArmApi(input.parameters)]
}
