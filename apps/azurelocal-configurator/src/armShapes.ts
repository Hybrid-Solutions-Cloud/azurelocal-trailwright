/** Strict application mapping subset reviewed against the official API reference.
 * This stricter owned subset complements armApi.ts, which reads pinned Microsoft definitions.
 */
export const ARM_SHAPE_SOURCE='https://learn.microsoft.com/en-us/azure/templates/microsoft.azurestackhci/2025-09-15-preview/clusters/deploymentsettings'
type Shape='string'|'boolean'|{array:Shape}|{object:Record<string,Shape>;optional?:string[]}|{enum:string[]}
const strings:Shape={array:'string'}
const adapter:Shape={object:{jumboPacket:'string',networkDirect:'string',networkDirectTechnology:{enum:['iWARP','RoCEv2','RoCE']}}}
const qos:Shape={object:{bandwidthPercentage_SMB:'string',priorityValue8021Action_Cluster:'string',priorityValue8021Action_SMB:'string'}}
const vswitch:Shape={object:{enableIov:'string',loadBalancingAlgorithm:'string'}}
const shapes:Record<string,Shape>={
 arcNodeResourceIds:strings,dnsServers:strings,
 physicalNodesSettings:{array:{object:{name:'string',ipv4Address:'string'}}},
 dnsZones:{array:{object:{dnsZoneName:'string',dnsForwarder:strings}}},
 intentList:{array:{object:{name:'string',trafficType:{array:{enum:['Management','Compute','Storage']}},adapter:strings,overrideAdapterProperty:'boolean',overrideQosPolicy:'boolean',overrideVirtualSwitchConfiguration:'boolean',adapterPropertyOverrides:adapter,qosPolicyOverrides:qos,virtualSwitchConfigurationOverrides:vswitch},optional:['adapterPropertyOverrides','qosPolicyOverrides','virtualSwitchConfigurationOverrides']}},
 storageNetworkList:{array:{object:{name:'string',networkAdapterName:'string',vlanId:'string',storageAdapterIPInfo:{array:{object:{physicalNode:'string',ipv4Address:'string',subnetMask:'string'}}}},optional:['storageAdapterIPInfo']}},
 partnerProperties:{array:{object:{name:'string',value:'string'}}},
 partnerCredentiallist:{array:{object:{name:'string',value:'string'}}},
}
function shapeSchema(shape:Shape):Record<string,unknown>{
 if(typeof shape==='string')return {type:shape}
 if('enum'in shape)return {type:'string',enum:shape.enum}
 if('array'in shape)return {type:'array',items:shapeSchema(shape.array)}
 return {type:'object',additionalProperties:false,required:Object.keys(shape.object).filter(key=>!shape.optional?.includes(key)),properties:Object.fromEntries(Object.entries(shape.object).map(([key,value])=>[key,shapeSchema(value)]))}
}
export const ARM_SHAPE_SCHEMAS=Object.fromEntries(Object.entries(shapes).map(([name,shape])=>[name,{...shapeSchema(shape),...(name==='partnerCredentiallist'?{maxItems:0}:{})}]))
export function validateArmShapes(parameters:Record<string,unknown>):string[]{
 const errors:string[]=[]
 const visit=(shape:Shape,value:unknown,path:string)=>{
  if(typeof shape==='string'){if(typeof value!==shape)errors.push(`${path}: expected ${shape}.`);return}
  if('enum'in shape){if(typeof value!=='string'||!shape.enum.includes(value))errors.push(`${path}: unsupported enum value.`);return}
  if('array'in shape){if(!Array.isArray(value)){errors.push(`${path}: expected array.`);return}value.forEach((v,i)=>visit(shape.array,v,`${path}[${i}]`));return}
  if(!value||typeof value!=='object'||Array.isArray(value)){errors.push(`${path}: expected object.`);return}
  const row=value as Record<string,unknown>
  for(const key of Object.keys(row))if(!(key in shape.object))errors.push(`${path}.${key}: unknown mapping field.`)
  for(const [key,field]of Object.entries(shape.object)){if(!(key in row)&&shape.optional?.includes(key))continue;visit(field,row[key],`${path}.${key}`)}
 }
 for(const [key,shape]of Object.entries(shapes)){const parameter=parameters[key];if(parameter&&typeof parameter==='object'&&'value'in parameter)visit(shape,parameter.value,key)}
 // The app does not have a qualified secret-reference expansion for this non-secure source array.
 const credentials=parameters.partnerCredentiallist
 if(credentials&&typeof credentials==='object'&&'value'in credentials&&Array.isArray(credentials.value)&&credentials.value.length)errors.push('partnerCredentiallist: non-secure credentials are not accepted by this mapping.')
 return errors
}
