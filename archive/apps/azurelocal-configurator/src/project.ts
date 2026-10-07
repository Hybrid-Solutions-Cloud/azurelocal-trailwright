import {sha256Hex} from '@configurators/output'
import {strictJson} from './strictJson'
import { collections, defaultValues, settings, type Field, type Values } from './catalog'
export const SCHEMA = 10
export const MAX_FILE_BYTES = 4 * 1024 * 1024
export const MAX_RECORDS = 2000
export const APP_VERSION = '0.4.0'
export interface InventoryRecord { id: string; values: Values }
export interface Provenance { id: string; source: string; schema: string; version: string; sha256: string; generatedAt: string; importedAt: string; group: string; recordIds: string[]; original: string }
export interface EvidenceEntry { id: string; target: string; kind: 'operator-observation' | 'external-receipt'; source: string; observedAt: string; projectRevision: number; expected: string; observed: string; sha256: string; verification: 'unverified' }
export interface Project { kind: 'azurelocal-configurator-project'; schemaVersion: number; appVersion: string; id: string; revision: number; createdAt: string; updatedAt: string; sharing: boolean; config: Record<string, Values>; records: Record<string, InventoryRecord[]>; provenance: Provenance[]; evidence: EvidenceEntry[] }
export const uid = () => crypto.randomUUID()
export function newProject(now = new Date().toISOString()): Project {
 const config = Object.fromEntries(settings.map(g => [g.key, defaultValues(g.fields)]))
 config.architecture.release = '2604.0.0'; config.capacity.vcpuRatio = 1
 return { kind:'azurelocal-configurator-project', schemaVersion:SCHEMA, appVersion:APP_VERSION, id:uid(), revision:1, createdAt:now, updatedAt:now, sharing:false, config, records:Object.fromEntries(collections.map(g=>[g.key,[]])), provenance:[], evidence:[] }
}
export function newRecord(group: string): InventoryRecord {
 const definition = collections.find(g=>g.key===group)
 if (!definition) throw new Error('Unknown inventory collection')
 return { id:uid(), values:defaultValues(definition.fields) }
}
export function revise(p: Project, now = new Date().toISOString()): Project { return {...p, appVersion:APP_VERSION, revision:p.revision+1, updatedAt:now} }
export const canonical = (value: unknown): string => JSON.stringify(sort(value),null,2)+'\n'
function sort(v: unknown): unknown { return Array.isArray(v) ? v.map(sort) : v && typeof v==='object' ? Object.fromEntries(Object.entries(v).sort(([a],[b])=>a.localeCompare(b,'en')).map(([k,x])=>[k,sort(x)])) : v }
export function assertNoSecrets(value: string, path = 'Input') {
 if (/-----BEGIN [A-Z ]*PRIVATE KEY-----|\bBearer\s+[A-Za-z0-9._~+\/-]{8,}|\b(?:gh[pousr]_|github_pat_|glpat-)[\w-]{10,}|\beyJ[\w-]{8,}\.[\w-]+\.[\w-]+|(?:password|client_secret|accountkey|sharedaccesssignature)\s*[=:]\s*[^\s,;]{3,}/i.test(value)) throw new Error(`${path}: secret literals are not allowed; use a secret reference.`)
 if (/[a-z][a-z0-9+.-]*:\/\/[^\s/]+:[^\s/@]+@|[?&](?:sig|token|access_token|client_secret|password|code)=[^\s&]+/i.test(value)) throw new Error(`${path}: credentials or signed tokens in URLs are not allowed.`)
}
function obj(v: unknown, path: string): Record<string,unknown> { if (!v || typeof v!=='object' || Array.isArray(v)) throw new Error(`${path}: expected an object`); return v as Record<string,unknown> }
function keys(v: Record<string,unknown>, expected: string[], path: string) { for(const k of Object.keys(v)) if(!expected.includes(k)) throw new Error(`${path}: unknown field ${k}`); for(const k of expected) if(!(k in v)) throw new Error(`${path}: missing field ${k}`) }
function str(v: unknown,path:string,max=4000): string { if(typeof v!=='string'||v.length>max||/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/.test(v)) throw new Error(`${path}: expected text (maximum ${max} characters)`); assertNoSecrets(v,path); return v }
function integer(v:unknown,path:string,min=0,max=1e9):number { if(typeof v!=='number'||!Number.isSafeInteger(v)||v<min||v>max) throw new Error(`${path}: integer ${min}–${max} required`); return v }
function id(v:unknown,path:string):string { const s=str(v,path,100); if(!/^[a-zA-Z0-9][a-zA-Z0-9_-]*$/.test(s)) throw new Error(`${path}: invalid stable ID`);return s }
function date(v:unknown,path:string):string { const s=str(v,path,30); if(!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{3})?Z$/.test(s)||!Number.isFinite(Date.parse(s)))throw new Error(`${path}: UTC timestamp required`);return s }
function list(v:unknown,path:string,max=MAX_RECORDS):unknown[]{if(!Array.isArray(v)||v.length>max)throw new Error(`${path}: array with at most ${max} entries required`);return v}
function values(v:unknown,allFields:Field[],path:string,version:number):Values {
 const fields=allFields.filter(f=>(f.since??1)<=version)
 const o=obj(v,path); keys(o,fields.map(f=>f.key),path)
 return {...defaultValues(allFields),...Object.fromEntries(fields.map(f=>{
  const x=o[f.key], p=`${path}.${f.key}`
  if(f.type==='number'){if(typeof x!=='number'||!Number.isFinite(x)||x<(f.min??0)||x>(f.max??1e9)||(f.integer&&!Number.isInteger(x)))throw new Error(`${p}: number outside allowed range`);return [f.key,x]}
  if(f.type==='boolean'){if(typeof x!=='boolean')throw new Error(`${p}: boolean required`);return [f.key,x]}
  const s=str(x,p,f.type==='notes'?12000:2000)
  if(f.options&&!f.options.includes(s))throw new Error(`${p}: unknown choice`)
  if((f.optionSince?.[s]??1)>version)throw new Error(`${p}: choice requires a newer schema`)
  if(f.type==='secret'&&s&&!/^(?:secret-ref|keyvault):\/\/[a-zA-Z0-9][a-zA-Z0-9._/-]*$/.test(s))throw new Error(`${p}: use secret-ref://store/name or keyvault://vault/secret`)
  if(f.type==='secret'&&s.split('/').includes('..'))throw new Error(`${p}: invalid reference path`)
  return [f.key,s]
 }))}
}
/** Version 1 is the initial collection contract. Version 2 adds the separate unverified evidence ledger. */
export function parseProject(text: string): Project {
 if(new TextEncoder().encode(text).length>MAX_FILE_BYTES)throw new Error('Project exceeds the 4 MiB import limit')
 let raw: unknown; try{raw=strictJson(text)}catch(e){throw new Error(`Project is not valid JSON: ${(e as Error).message}`)}
 const p=obj(raw,'project')
 if(p.kind!=='azurelocal-configurator-project')throw new Error('This is not an Azure Local Configurator project. Use Import sizing plan for Surveyor files.')
 if(![1,2,3,4,5,6,7,8,9,SCHEMA].includes(Number(p.schemaVersion))||typeof p.schemaVersion!=='number')throw new Error(`Unsupported project schema; this app accepts versions 1 through ${SCHEMA}`)
 const expected=['kind','schemaVersion','appVersion','id','revision','createdAt','updatedAt','sharing','config','records','provenance']
 keys(p,p.schemaVersion===1?expected:[...expected,'evidence'],'project')
 if(typeof p.sharing!=='boolean')throw new Error('project.sharing: boolean required')
 const cfg=obj(p.config,'config');keys(cfg,settings.filter(g=>(g.since??1)<=Number(p.schemaVersion)).map(g=>g.key),'config')
 const rec=obj(p.records,'records');keys(rec,collections.filter(g=>(g.since??1)<=Number(p.schemaVersion)).map(g=>g.key),'records')
 const ids=new Set<string>()
 const unique=(v:unknown,path:string)=>{const value=id(v,path);if(ids.has(value))throw new Error(`${path}: duplicate stable ID`);ids.add(value);return value}
 const project:Project={kind:'azurelocal-configurator-project',schemaVersion:SCHEMA,appVersion:str(p.appVersion,'appVersion',50),id:unique(p.id,'id'),revision:integer(p.revision,'revision',1),createdAt:date(p.createdAt,'createdAt'),updatedAt:date(p.updatedAt,'updatedAt'),sharing:p.sharing,config:Object.fromEntries(settings.map(g=>[g.key,(g.since??1)>Number(p.schemaVersion)?defaultValues(g.fields):values(cfg[g.key],g.fields,`config.${g.key}`,Number(p.schemaVersion))])),records:Object.fromEntries(collections.map(g=>[g.key,((g.since??1)>Number(p.schemaVersion)?[]:list(rec[g.key],g.key)).map((v,i)=>{const x=obj(v,g.key);keys(x,['id','values'],g.key);return {id:unique(x.id,`${g.key}[${i}].id`),values:values(x.values,g.fields,`${g.key}[${i}]`,Number(p.schemaVersion))}})])),provenance:[],evidence:[]}
 if(ids.size>MAX_RECORDS+1)throw new Error(`Project exceeds ${MAX_RECORDS} inventory records`)
 if(Date.parse(project.updatedAt)<Date.parse(project.createdAt))throw new Error('Updated timestamp precedes creation')
 project.provenance=list(p.provenance,'provenance',100).map(v=>{const x=obj(v,'provenance');keys(x,['id','source','schema','version','sha256','generatedAt','importedAt','group','recordIds','original'],'provenance');const hash=str(x.sha256,'sha256',64);if(!/^[a-f0-9]{64}$/.test(hash))throw new Error('Invalid source SHA-256');return {id:unique(x.id,'provenance.id'),source:str(x.source,'source'),schema:str(x.schema,'schema',50),version:str(x.version,'version',50),sha256:hash,generatedAt:date(x.generatedAt,'generatedAt'),importedAt:date(x.importedAt,'importedAt'),group:str(x.group,'group',100),recordIds:list(x.recordIds,'recordIds').map(v=>id(v,'source record ID')),original:str(x.original,'original',200000)}})
 project.evidence=p.schemaVersion===1?[]:list(p.evidence,'evidence',500).map(v=>{const x=obj(v,'evidence');keys(x,['id','target','kind','source','observedAt','projectRevision','expected','observed','sha256','verification'],'evidence');if(!['operator-observation','external-receipt'].includes(String(x.kind))||x.verification!=='unverified')throw new Error('Evidence cannot claim authenticated runtime verification');const hash=str(x.sha256,'evidence.sha256',64);if(hash&&!/^[a-f0-9]{64}$/.test(hash))throw new Error('Invalid evidence hash');return {id:unique(x.id,'evidence.id'),target:str(x.target,'target',100),kind:x.kind as EvidenceEntry['kind'],source:str(x.source,'source'),observedAt:date(x.observedAt,'observedAt'),projectRevision:integer(x.projectRevision,'projectRevision',1),expected:str(x.expected,'expected'),observed:str(x.observed,'observed'),sha256:hash,verification:'unverified'}})
 return project
}
export function sanitize(project:Project):Project {
 const p=structuredClone(project);p.sharing=true
 const mapping=new Map<string,string>([[p.id,'shared-project']]);let count=0
 for(const group of collections)for(const row of p.records[group.key])mapping.set(row.id,`record-${++count}`)
 const clean=(v:Values,fields:Field[],name:string)=>Object.fromEntries(fields.map(f=>[f.key,f.type==='reference' ? mapping.get(String(v[f.key]))??'' : f.key==='name' ? name : f.public||f.type==='number'||f.type==='boolean' ? v[f.key] : '']))
 p.id='shared-project'
 for(const g of settings)p.config[g.key]=clean(p.config[g.key],g.fields,g.key==='project'?'Shared design':g.title)
 // Release numbers are public compatibility inputs; do not redact them into accidental support claims.
 for(const key of ['release','osBuild','solutionVersion','sbeVersion'])p.config.architecture[key]=project.config.architecture[key]
 for(const g of collections)for(const row of p.records[g.key]){row.id=mapping.get(row.id)!;row.values=clean(row.values,g.fields,`${g.title} ${row.id}`)}
 p.provenance=[];p.evidence=[]
 return parseProject(canonical(p))
}
export function sha256(data:string|Uint8Array):Promise<string>{return sha256Hex(data)}
export interface Difference { path:string; current:unknown; incoming:unknown }
export function differences(current:Project,incoming:Project):Difference[]{const result:Difference[]=[];const walk=(a:unknown,b:unknown,path:string)=>{if(canonical(a)===canonical(b))return;if(a&&b&&typeof a==='object'&&typeof b==='object'&&!Array.isArray(a)&&!Array.isArray(b)){for(const k of new Set([...Object.keys(a),...Object.keys(b)]))walk((a as Record<string,unknown>)[k],(b as Record<string,unknown>)[k],path?`${path}.${k}`:k)}else result.push({path,current:a,incoming:b})};walk(current,incoming,'');return result}
