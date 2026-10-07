import {describe,it,expect} from 'vitest'
import {armFixture} from './testing/armFixture'
import {canonical,sanitize,newProject} from './project'
import {terraformReview} from './terraformContract'
import {terraformFiles} from './terraformExport'
import {mapArm} from './armMapping'
import {exportFiles,designMarkdown,implementationMarkdown,schedules} from './exports'
import {validateArmParameters,templates} from './armContract'
const fixture=(identity:'ad'|'local'='ad')=>{const p=armFixture(identity);p.config.architecture.route='terraform-ansible';return p}
describe('Terraform input values; no Terraform code is emitted',()=>{
 it.each(['ad','local'] as const)('%s exports the exact typed parameter map as tfvars data only',async identity=>{
  const p=fixture(identity),before=canonical(p),r=terraformReview(p),files=await terraformFiles(p),prefix='inputs/terraform/'
  expect(r.findings).toEqual([]);expect(r.candidateVariables).toMatchObject({identity,deployment_authorized:false,tenant_id:p.config.azure.tenant,environment:'public'})
  const vars=JSON.parse(files[prefix+'terraform.tfvars.json']),parameters=JSON.parse(vars.parameters_content)
  expect(parameters).toEqual(mapArm(p).parameters);expect(parameters).not.toHaveProperty('parameters');expect(validateArmParameters(templates[identity],{...mapArm(p).document,parameters})).toEqual([])
  expect(Object.keys(files).sort()).toEqual(['inputs/terraform/README.md','inputs/terraform/terraform.tfvars.json','plans/terraform-review.json','plans/terraform-source-lock.json'])
  expect(r).toMatchObject({qualification:'design-data',executionReady:false,runtimeQualified:false,deploymentQualification:'design-only'})
  expect(canonical(p)).toBe(before)
 })
 it('withholds input values for incomplete, unsupported, inactive and sanitized candidates without mutating intent',async()=>{
  for(const [group,key,value]of [['azure','tenant','display label'],['azure','cloud','AzureChinaCloud'],['architecture','storage','san'],['architecture','storage','hybrid'],['architecture','intent','reuse'],['architecture','release','future']]){const p=fixture();p.config[group][key]=value;const before=canonical(p);expect(terraformReview(p).draftCandidate).toBe(false);expect((await terraformFiles(p))['inputs/terraform/terraform.tfvars.json']).toBeUndefined();expect(canonical(p)).toBe(before)}
  for(const p of [newProject(),sanitize(fixture())])expect((await terraformFiles(p))['inputs/terraform/terraform.tfvars.json']).toBeUndefined()
  const p=fixture();p.config.azure.cloud='AzureUSGovernment';expect(terraformReview(p).candidateVariables?.environment).toBe('usgovernment')
 })
 it('reports the same boundary in JSON, Markdown and schedules',async()=>{
  const p=fixture(),r=terraformReview(p),files=await exportFiles(p,false,false);expect(JSON.parse(String(files['plans/terraform-review.json']))).toEqual(r)
  for(const text of [designMarkdown(p),implementationMarkdown(p),canonical(schedules(p)['Terraform review'])])expect(text).toContain(r.boundary)
  expect((await exportFiles(p,true,false))['inputs/terraform/terraform.tfvars.json']).toBeUndefined()
 })
})
