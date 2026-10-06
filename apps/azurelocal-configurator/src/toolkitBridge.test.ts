import {describe,it,expect} from 'vitest'
import {mkdirSync,writeFileSync,readFileSync,existsSync} from 'node:fs'
import {toolkitBridgeInputs,toolkitBridgeReview,bridgeMapping,bridgeParameterSchema,bridgeCompanionSchema} from './toolkitBridge'
import {armFixture} from './testing/armFixture'
import {canonical,newRecord,sanitize,sha256} from './project'
import {toolkitConversionFiles} from './toolkitBridgeExport'
import {templates,validateArmParameters} from './armContract'
import {toolkitTags} from './toolkitTags'
import {mapArm} from './armMapping'
import {armInputFiles} from './armInputExport'
function fixture(identity:'ad'|'local'='ad'){
 const p=armFixture(identity),site=newRecord('sites');site.values.name='Synthetic bridge site';p.records.sites.push(site)
 Object.assign(p.config.toolkit,{enabled:true,site:site.id,siteCode:'syn',environmentName:'synthetic',environmentType:'lab',boundary:'Synthetic local conversion only; no targets or deployment authorized.'})
 p.records.nodes.forEach((n,i)=>{n.values.site=site.id;n.values.bmc=`203.0.113.${11+i}`})
 return p
}
describe('Toolkit conversion data and direct ARM parameters',()=>{
 it('rejects duplicate, escaped and case-colliding tag keys without misreading quoted values',()=>{
  for(const input of ['{"Tag":"a","Tag":"b"}','{"Tag":"a","tag":"b"}','{"\\u0054ag":"a","Tag":"b"}'])expect(()=>toolkitTags(input)).toThrow('Duplicate')
  expect(toolkitTags('{"Tag":"a \\\"quoted\\\": value"}')).toEqual({Tag:'a "quoted": value'})
  const p=fixture();p.config.toolkit.tagsJson='{"Tag":"a","tag":"b"}';expect(toolkitBridgeReview(p).conversionCandidate).toBe(false)
 })
 it.each(['ad','local'] as const)('%s keeps the fixed mapping and schema contract unchanged',async identity=>{
  const p=fixture(identity),inputs=await toolkitBridgeInputs(p)
  expect(inputs.review.reasons).toEqual([]);expect(inputs.files).not.toBeNull()
  const input=JSON.parse(inputs.files!['companion.json']);expect(input.deploymentAuthorized).toBe(false)
  expect(Object.keys(input.supplements)).not.toContain('localAdminPassword')
  const contracts=new URL('./contracts/toolkit/bridge/',import.meta.url);mkdirSync(contracts,{recursive:true})
  // Explicit regeneration is used only when changing the reviewed fixed mapping/schema contract.
  const expected={[`${identity}.mapping.json`]:canonical({version:'0.1.0',identity,pointers:bridgeMapping(identity)}),[`${identity}.parameters.schema.json`]:canonical(bridgeParameterSchema(identity)),[`${identity}.companion.schema.json`]:canonical(bridgeCompanionSchema(identity))}
  for(const [name,content]of Object.entries(expected)){const path=new URL(name,contracts);if(process.env.UPDATE_TOOLKIT_BRIDGE==='1')writeFileSync(path,content);expect(existsSync(path)).toBe(true);expect(readFileSync(path,'utf8')).toBe(content)}
 })
 it.each(['ad','local'] as const)('%s exports conversion data and a finished ARM parameter file without scripts or templates',async identity=>{
  const p=fixture(identity),before=canonical(p),files=await toolkitConversionFiles(p)
  const parameters=JSON.parse(armInputFiles(p)['inputs/arm/azuredeploy.parameters.json'])
  expect(parameters).toEqual(JSON.parse(canonical(mapArm(p).document)));expect(validateArmParameters(templates[identity],parameters)).toEqual([])
  const companion=JSON.parse(files['toolkit/conversion/companion.json']);expect(await sha256(files['toolkit/conversion/infrastructure.yml'])).toBe(companion.infrastructureSha256)
  expect(Object.keys(files).filter(path=>/\.(ps1|psm1|psd1|py|tf|hcl|sh)$/i.test(path)||/\.template\.json$/.test(path)||/LICENSE/.test(path))).toEqual([])
  expect(toolkitBridgeReview(p)).toMatchObject({qualification:'design-data',deploymentReady:false,runtimeQualified:false})
  expect(canonical(p)).toBe(before)
 })
 it('does not emit conversion inputs for incomplete, sanitized or unqualified branches',async()=>{
  const p=fixture();p.config.toolkit.siteCode='';expect((await toolkitBridgeInputs(p)).files).toBeNull();expect((await toolkitConversionFiles(p))['toolkit/conversion/companion.json']).toBeUndefined()
  expect((await toolkitBridgeInputs(sanitize(fixture()))).files).toBeNull()
  for(const storage of ['san','hybrid']){const next=fixture();next.config.architecture.storage=storage;expect(toolkitBridgeReview(next).conversionCandidate).toBe(false)}
  const preserved=fixture();preserved.config.architecture.intent='reuse';expect(toolkitBridgeReview(preserved).conversionCandidate).toBe(false)
 })
 it('retains exact registry-conflicting values through explicit compatibility rather than coercion',async()=>{
  const p=fixture();p.config.arm.logsRetentionInDays=0;const inputs=await toolkitBridgeInputs(p)
  expect(inputs.review.conversionCandidate).toBe(true)
  const c=JSON.parse(inputs.files!['companion.json'])
  expect(c.supplements.configurationMode).toBe('InfraOnly');expect(c.supplements.createNewKeyVault).toBe(false)
  expect(c.secrets.localAdminPassword.reference.secretName).toBe('local')
 })
})
