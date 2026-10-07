import schema270 from './contracts/surveyor/2.7.0.schema.json'
import schema280 from './contracts/surveyor/2.8.0.schema.json'
import {assertNoSecrets,MAX_FILE_BYTES} from './project'
import type {SurveyorPlan270,SurveyorPlan280} from './contracts/surveyor/types'
export type SurveyorPlan=SurveyorPlan270|SurveyorPlan280
interface Schema {const?:unknown;type?:string;anyOf?:Schema[];properties?:Record<string,Schema>;required?:string[];items?:Schema;maxItems?:number;maxLength?:number}
export function validateContract(value:unknown,schema:Schema,path='plan',depth=0):void {
 if(depth>30)throw new Error(`${path}: nested data exceeds the contract depth`)
 if(Object.hasOwn(schema,'const')){if(value!==schema.const)throw new Error(`${path}: expected ${JSON.stringify(schema.const)}`);return}
 if(schema.anyOf){if(schema.anyOf.some(branch=>{try{validateContract(value,branch,path,depth+1);return true}catch{return false}}))return;throw new Error(`${path}: value is not one of the permitted choices`)}
 if(schema.type==='string'){if(typeof value!=='string'||value.length>(schema.maxLength??12000)||/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/.test(value))throw new Error(`${path}: bounded text required`);assertNoSecrets(value,path);return}
 if(schema.type==='number'){if(typeof value!=='number'||!Number.isFinite(value)||Math.abs(value)>1e15)throw new Error(`${path}: finite bounded number required`);if((path.startsWith('plan.inputs.')||path.startsWith('project.inputs.'))&&value<0)throw new Error(`${path}: negative input not allowed`);return}
 if(schema.type==='null'){if(value!==null)throw new Error(`${path}: null required`);return}
 if(schema.type==='array'){if(!Array.isArray(value)||value.length>(schema.maxItems??2000))throw new Error(`${path}: bounded array required`);value.forEach((v,i)=>validateContract(v,schema.items!,`${path}[${i}]`,depth+1));return}
 if(schema.type==='object'){if(!value||typeof value!=='object'||Array.isArray(value))throw new Error(`${path}: object required`);const o=value as Record<string,unknown>;for(const k of Object.keys(o))if(!Object.hasOwn(schema.properties!,k))throw new Error(`${path}: unknown field ${k}`);for(const k of schema.required??[])if(!Object.hasOwn(o,k))throw new Error(`${path}: missing field ${k}`);for(const [k,v]of Object.entries(o))validateContract(v,schema.properties![k],`${path}.${k}`,depth+1);return}
 throw new Error(`${path}: unresolved source schema`)
}
export function parseSurveyor(raw:string):SurveyorPlan {
 if(new TextEncoder().encode(raw).length>MAX_FILE_BYTES)throw new Error('Sizing plan exceeds the 4 MiB limit')
 let root:unknown;try{root=JSON.parse(raw)}catch{throw new Error('Sizing plan is not valid JSON')}
 if(!root||typeof root!=='object'||Array.isArray(root))throw new Error('Expected a SurveyorPlan object')
 const version=(root as Record<string,unknown>).surveyorVersion
 const schema=version==='2.7.0'?schema270:version==='2.8.0'?schema280:null
 if(!schema)throw new Error('Supported sizing contracts: SurveyorPlan 1.0 from Surveyor 2.7.0 or 2.8.0. Other versions need a reviewed importer.')
 validateContract(root,schema)
 const p=root as SurveyorPlan
 const normalized=new Date(p.generatedAt)
 if(!Number.isFinite(normalized.getTime())||!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{3})?Z$/.test(p.generatedAt)||normalized.toISOString().replace('.000Z','Z')!==p.generatedAt.replace('.000Z','Z'))throw new Error('Sizing generation timestamp must be a real UTC timestamp')
 const unique=(rows:{id:string}[],path:string)=>{const ids=new Set<string>();for(const r of rows){if(!r.id.trim()||r.id.length>500||ids.has(r.id))throw new Error(`${path}: duplicate or invalid source ID`);ids.add(r.id)}}
 unique(p.inputs.volumes,'volumes');unique(p.inputs.avd.pools,'AVD pools');unique(p.inputs.aks.clusters,'AKS clusters');unique(p.inputs.virtualMachines.groups,'VM groups');unique(p.inputs.customWorkloads,'custom workloads');unique(p.inputs.servicePresets,'service presets')
 if(!Number.isInteger(p.inputs.hardware.nodeCount)||p.inputs.hardware.nodeCount<1||p.inputs.hardware.nodeCount>64)throw new Error('Hardware node count must be 1–64')
 for(const value of [p.inputs.hardware.capacityDrivesPerNode,p.inputs.hardware.cacheDrivesPerNode])if(!Number.isInteger(value)||value>1000)throw new Error('Drive counts must be integers no greater than 1000')
 if(p.inputs.virtualMachines.vCpuOvercommitRatio<1||p.inputs.advanced.vCpuOversubscriptionRatio<1)throw new Error('CPU overcommit ratios must be at least one')
 for(const [enabled,result,label]of [[p.inputs.avdEnabled,p.outputs.avd,'AVD'],[p.inputs.aks.enabled,p.outputs.aks,'AKS'],[p.inputs.sofsEnabled,p.outputs.sofs,'SOFS'],[p.inputs.mabsEnabled,p.outputs.mabs,'MABS']] as const)if(enabled&&!result)throw new Error(`${label} is enabled but its frozen output is missing`)
 if(p.outputs.avd){unique(p.outputs.avd.pools,'AVD output pools');if(p.outputs.avd.pools.length!==p.inputs.avd.pools.length||p.outputs.avd.pools.some(out=>!p.inputs.avd.pools.some(input=>input.id===out.id)))throw new Error('AVD output pool IDs do not match the inputs')}
 if(p.surveyorVersion==='2.8.0'&&p.inputs.inventory){unique(p.inputs.inventory,'inventory');for(const vm of p.inputs.inventory){if(vm.consumedGiB>vm.provisionedGiB)throw new Error('Inventory consumed capacity exceeds provisioned capacity');for(const key of ['cpuP95Pct','memoryP95Pct'] as const)if((vm.measurement?.[key]??0)>100)throw new Error('Inventory percent measurements must be at most 100')}}
 return p
}
