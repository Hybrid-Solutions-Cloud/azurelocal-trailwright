import {describe,it,expect} from 'vitest'
import {readFileSync} from 'node:fs'
import {createHash} from 'node:crypto'
import {load} from 'js-yaml'
import {armFixture} from './testing/armFixture'
import {canonical,newRecord,parseProject,sanitize} from './project'
import {toolkitReview} from './toolkitMapping'
import {collections,settings} from './catalog'
import {TOOLKIT_LOCK,validateToolkit} from './toolkitContract'
import registryAssertions from './contracts/toolkit/registry-arm.assertions.json'
import {exportFiles,designMarkdown,schedules} from './exports'
function fixture(identity:'ad'|'local'='ad'){
 const p=armFixture(identity),site=newRecord('sites');site.values.name='Synthetic site';p.records.sites.push(site)
 Object.assign(p.config.toolkit,{enabled:true,site:site.id,siteCode:'syn',environmentName:'synthetic',environmentType:'lab',tagsJson:'{"Environment":"synthetic","Owner":"Test only"}',boundary:'Synthetic contract evidence only. No target exists or operation is authorized.'})
 p.records.nodes.forEach((n,i)=>{n.values.site=site.id;n.values.bmc=`203.0.113.${11+i}`})
 return p
}
describe('Pinned Toolkit hierarchy',()=>{
 it('verifies all immutable source bytes and registry mapping targets',()=>{
  for(const source of TOOLKIT_LOCK.files)expect(createHash('sha256').update(readFileSync(new URL(`./contracts/toolkit/${source.file}`,import.meta.url))).digest('hex')).toBe(source.sha256)
  const registry=load(readFileSync(new URL('./contracts/toolkit/master-registry.yaml',import.meta.url),'utf8')) as any
  const project=(s:any):any=>{const out:any={};for(const k of ['type','pattern','format','minimum','maximum','minLength','maxLength','minItems','maxItems','uniqueItems','multipleOf','additionalProperties'])if(k in s)out[k]=s[k];if(s.allowedValues)out.enum=s.allowedValues;if(s.enum)out.enum=s.enum;if(s.items)out.items=project(s.items);if(s.properties){out.properties=Object.fromEntries(Object.entries(s.properties).map(([k,v])=>[k,project(v)]));const required=Object.entries(s.properties).filter(([,v]:any)=>v.required===true).map(([k])=>k);if(required.length)out.required=required}if(Array.isArray(s.required))out.required=s.required;return out}
  expect(registryAssertions).toEqual({type:'object',additionalProperties:false,properties:Object.fromEntries(Object.entries(registry.compute.cluster_arm_deployment).filter(([,v]:any)=>v&&v.type).map(([k,v])=>[k,project(v)]))})
  const review=toolkitReview(fixture())
  for(const map of review.mappings.filter(m=>m.target.startsWith('compute.cluster_arm_deployment.')))expect(registry.compute.cluster_arm_deployment).toHaveProperty(map.target.split('.').at(-1)!)
 })
 it.each(['ad','local'] as const)('maps %s canonical hierarchy without legacy root aliases',identity=>{
  const p=fixture(identity),r=toolkitReview(p),c=r.candidateInfrastructure as any
  expect(r.schemaErrors).toEqual([]);expect(r.schemaValid).toBe(true)
  expect(r).toMatchObject({scenario:`s2d_${identity==='ad'?'ad':'localid'}`,executionReady:false,runtimeQualified:false,qualification:'design-only'})
  expect(c.compute.cluster_nodes).toHaveLength(2);expect(c.compute.cluster_nodes[0]).toMatchObject({node_hostname:'node1',node_management_ip:'192.0.2.11',node_idrac_ip:'203.0.113.11'})
  expect(c.networking.onprem.network_intents[0]).toMatchObject({name:'Converged',traffic_types:['Management','Compute','Storage'],adapter_names:['pNIC1','pNIC2'],enable_storage_auto_ip:false})
  expect(c.identity.accounts.account_local_admin_password).toBe('keyvault://synthetic-vault/local')
  for(const key of ['cluster_nodes','accounts','cluster_arm_deployment'])expect(c).not.toHaveProperty(key)
  if(identity==='local'){expect(c.identity).not.toHaveProperty('active_directory');expect(c.identity.local_identity.local_admin_username).toBe('hciAdmin')}
  else expect(c.identity.active_directory.domain_fqdn).toBe('synthetic.test')
  expect(r.findings.some(f=>f.message.includes('WhatIf'))).toBe(true)
 })
 it('retains exact source vault/name/version and explicit zero values',()=>{
  const p=fixture();p.records.armSecretBindings[0].values.secretVersion='aabbcc';p.config.arm.logsRetentionInDays=0
  const c=toolkitReview(p).candidateInfrastructure as any
  expect(c.identity.accounts.account_local_admin_password).toBe('keyvault://synthetic-vault/local/aabbcc')
  expect(c.compute.cluster_arm_deployment.arm_logs_retention_days).toBe(0)
  expect(c.compute.cluster_arm_deployment.arm_storage_network_list[0].storageAdapterIPInfo).toHaveLength(2)
  expect(toolkitReview(p).registryErrors.some(e=>e.includes('arm_logs_retention_days'))).toBe(true)
 })
 it('distinguishes schema acceptance from registry VLAN/date/custom-location conflicts',()=>{
  const r=toolkitReview(fixture());expect(r.schemaValid).toBe(true);expect(r.registryAssertionsValid).toBe(false)
  for(const field of ['vlanId','arm_sbe_manifest_creation_date','arm_custom_location'])expect(r.registryErrors.some(e=>e.includes(field))).toBe(true)
 })
 it('retains the historical native reader negative evidence for the pinned Toolkit source',()=>{
  const summary=JSON.parse(readFileSync(new URL('../docs/evidence/toolkit-20260911/summary.json',import.meta.url),'utf8'))
  expect(summary).toHaveLength(2)
  for(const entry of summary)expect(entry).toMatchObject({requestedAuthType:entry.identity==='ad'?'AD':'LocalIdentity',sourceCommit:TOOLKIT_LOCK.commit,exitCode:1,outputCreated:false,duplicateWhatIfRejected:true,readerQualified:false,runtimeQualified:false})
 })
 it('keeps source mode conflicts open instead of inventing advanced/InfraOnly equivalence',()=>{
  const r=toolkitReview(fixture()),c=r.candidateInfrastructure as any
  expect(c.compute.cluster_arm_deployment).not.toHaveProperty('arm_storage_configuration_mode')
  expect(r.findings.some(f=>f.field==='configurationMode'&&f.message.includes('express/advanced'))).toBe(true)
 })
 it('rejects root aliases, malformed arrays, illegal IPs and secret literals without mutation',()=>{
  const c=toolkitReview(fixture()).candidateInfrastructure as any
  for(const mutate of [(v:any)=>v.cluster_nodes=[],(v:any)=>v.compute.cluster_nodes=v.compute.cluster_nodes[0],(v:any)=>v.compute.cluster_nodes[0].node_idrac_ip='999.2.3.4',(v:any)=>v.identity.accounts.account_local_admin_password='literal-password']){const v=structuredClone(c);mutate(v);const before=canonical(v);expect(validateToolkit(v).length).toBeGreaterThan(0);expect(canonical(v)).toBe(before)}
 })
 it('routes BMC schema corrections to the actual node and retains source GB ambiguity',()=>{
  const p=fixture();p.records.nodes[0].values.bmc='bmc.synthetic.test';p.records.nodes[0].values.memoryGiB=512;p.records.nodes[0].values.cores=48;p.records.nodes[0].values.sockets=2
  const r=toolkitReview(p);expect(r.findings.some(f=>f.record===p.records.nodes[0].id&&f.field==='bmc')).toBe(true)
  expect((r.candidateInfrastructure as any).compute.cluster_nodes[0]).not.toHaveProperty('node_memory_gb')
 })
 it('does not relabel hybrid, omit SAN qualification or authorize existing cluster changes',()=>{
  const p=fixture();p.config.architecture.storage='hybrid';expect(toolkitReview(p).scenario).toBeNull()
  p.config.architecture.storage='san';expect(toolkitReview(p).findings.some(f=>f.message.includes('LUN/HBA'))).toBe(true)
  p.config.architecture.intent='reuse';expect(toolkitReview(p).findings.some(f=>f.category==='preservation'&&f.field==='intent')).toBe(true)
 })
 it('migrates schema 6 without enabling Toolkit or inventing metadata',()=>{
  const p=fixture(),old=structuredClone(p);old.schemaVersion=6;for(const g of settings){if((g.since??1)>6){delete old.config[g.key];continue}for(const f of g.fields)if((f.since??1)>6)delete old.config[g.key][f.key]}for(const g of collections)if((g.since??1)>6)delete old.records[g.key]
  const next=parseProject(canonical(old));expect(next.schemaVersion).toBe(10);expect(next.config.toolkit).toMatchObject({enabled:false,site:'',siteCode:'',environmentType:'unresolved'});expect(next.records.nodes).toEqual(p.records.nodes)
  old.config.toolkit=p.config.toolkit;expect(()=>parseProject(canonical(old))).toThrow('unknown field')
 })
 it('keeps drafts, findings, reports, schedules and sharing exports consistent',async()=>{
  const p=fixture(),files=await exportFiles(p,false,false),review=JSON.parse(String(files['plans/toolkit-mapping-review.json']))
  expect(load(String(files['toolkit/infrastructure.draft.yml']))).toEqual(review.candidateInfrastructure)
  expect(designMarkdown(p)).toContain('Toolkit hierarchy review');expect(schedules(p)['Toolkit mappings']).toHaveLength(review.mappings.length+1)
  const shared=await exportFiles(p,true,false);expect(shared).not.toHaveProperty('toolkit/infrastructure.draft.yml');expect(JSON.parse(String(shared['plans/toolkit-mapping-review.json'])).candidateInfrastructure).toBeNull()
  expect(toolkitReview(sanitize(p)).mappings).toEqual([])
 })
})
