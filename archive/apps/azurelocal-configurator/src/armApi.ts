import Ajv from 'ajv'
import addFormats from 'ajv-formats'
import deployment from './contracts/arm/deploymentSettings.api.json'
import common from './contracts/arm/hciCommon.api.json'
type Schema=Record<string,any>
const documents:Record<string,{definitions:Record<string,Schema>}>={deployment,common}
/** Resolve only referenced input definitions. No remote schema fetch or source mutation. */
export function apiDefinition(schema:Schema,document='deployment',ancestors:string[]=[]):Schema{
 if(schema.$ref){const ref=String(schema.$ref),match=ref.match(/^(\.\/hciCommon\.json)?#\/definitions\/([^/]+)$/);if(!match)throw new Error(`Unqualified API schema reference ${ref}`)
  const target=match[1]?'common':document,key=`${target}:${match[2]}`;if(ancestors.includes(key))throw new Error(`Cyclic API input schema ${key}`)
  const definition=documents[target]?.definitions[match[2]];if(!definition)throw new Error(`Missing API input schema ${key}`);return apiDefinition(definition,target,[...ancestors,key])
 }
 const result:Schema={}
 // Swagger annotations do not impose JSON validation rules. Preserve every applicable assertion.
 for(const key of ['type','enum','pattern','format','minimum','maximum','minLength','maxLength','minItems','maxItems','uniqueItems','required','multipleOf'])if(key in schema)result[key]=schema[key]
 if(schema['x-nullable']===true)result.nullable=true
 if(schema.properties){result.properties=Object.fromEntries(Object.entries(schema.properties as Record<string,Schema>).filter(([,v])=>!v.readOnly).map(([k,v])=>[k,apiDefinition(v,document,ancestors)]));result.additionalProperties=false}
 if(schema.items)result.items=apiDefinition(schema.items,document,ancestors)
 if(schema.allOf)result.allOf=schema.allOf.map((s:Schema)=>apiDefinition(s,document,ancestors))
 if(schema.additionalProperties!==undefined)result.additionalProperties=typeof schema.additionalProperties==='object'?apiDefinition(schema.additionalProperties,document,ancestors):schema.additionalProperties
 return result
}
const property=(definition:string,key:string)=>apiDefinition((deployment.definitions as Record<string,Schema>)[definition].properties[key])
const references:Record<string,[string,string]>={
 arcNodeResourceIds:['DeploymentSettingsProperties','arcNodeResourceIds'],deploymentMode:['DeploymentSettingsProperties','deploymentMode'],
 physicalNodesSettings:['DeploymentData','physicalNodes'],identityProvider:['DeploymentData','identityProvider'],namingPrefix:['DeploymentData','namingPrefix'],domainFqdn:['DeploymentData','domainFqdn'],adouPath:['DeploymentData','adouPath'],
 intentList:['HostNetwork','intents'],storageNetworkList:['HostNetwork','storageNetworks'],enableStorageAutoIp:['HostNetwork','enableStorageAutoIp'],storageConnectivitySwitchless:['HostNetwork','storageConnectivitySwitchless'],
 dnsZones:['InfrastructureNetwork','dnsZones'],dnsServers:['InfrastructureNetwork','dnsServers'],dnsServerConfig:['InfrastructureNetwork','dnsServerConfig'],subnetMask:['InfrastructureNetwork','subnetMask'],defaultGateway:['InfrastructureNetwork','gateway'],useDhcp:['InfrastructureNetwork','useDhcp'],
 configurationMode:['Storage','configurationMode'],partnerProperties:['SbePartnerInfo','partnerProperties'],
}
for(const name of Object.keys(deployment.definitions.DeploymentSecuritySettings.properties))references[name]=['DeploymentSecuritySettings',name]
for(const name of Object.keys(deployment.definitions.Observability.properties))references[name]=['Observability',name]
export const ARM_API_MAPPING_SCHEMA={type:'object',properties:Object.fromEntries(Object.entries(references).map(([parameter,[definition,key]])=>[parameter,property(definition,key)])),additionalProperties:false}
const ajv=addFormats(new Ajv({strict:true,allErrors:true,coerceTypes:false,useDefaults:false,removeAdditional:false}))
const validate=ajv.compile(ARM_API_MAPPING_SCHEMA)
export const ARM_DEPLOYMENT_BODY_SCHEMA=apiDefinition(deployment.definitions.DeploymentSettingsProperties)
const validateBody=ajv.compile(ARM_DEPLOYMENT_BODY_SCHEMA)
export function validateArmDeploymentBody(body:unknown){if(validateBody(body))return [];return (validateBody.errors??[]).map(e=>({path:e.instancePath,message:`Microsoft deploymentSettings API ${e.instancePath||'/'}: ${e.message}${e.keyword==='additionalProperties'?` (${e.params.additionalProperty})`:''}.`}))}
/** Validates mapped values against immutable Microsoft definitions, not a deployment operation. */
export function validateArmApi(parameters:Record<string,unknown>):string[]{
 const values:Record<string,unknown>={}
 for(const name of Object.keys(references)){const input=parameters[name];if(input&&typeof input==='object'&&'value'in input)values[name]=input.value}
 if(validate(values))return []
 return (validate.errors??[]).map(e=>`Microsoft API ${e.instancePath||'/'}: ${e.message}${e.keyword==='additionalProperties'?` (${e.params.additionalProperty})`:''}.`)
}
