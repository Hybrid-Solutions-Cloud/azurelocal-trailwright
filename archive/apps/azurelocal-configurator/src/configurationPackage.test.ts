import {describe,it,expect} from 'vitest'
import {armFixture} from './testing/armFixture'
import {newProject,newRecord,canonical,type Project} from './project'
import {exportFiles} from './exports'
/** A design that requests every automation-input branch: Terraform/Ansible route plus Toolkit conversion. */
function automationInputFixture(identity:'ad'|'local'):Project{
 const p=armFixture(identity),controller=newRecord('managementHosts'),site=newRecord('sites')
 controller.values.name='Synthetic controller';controller.values.platform='external';p.records.managementHosts.push(controller)
 site.values.name='Synthetic site';p.records.sites.push(site)
 Object.assign(p.config.architecture,{route:'terraform-ansible'})
 Object.assign(p.config.bootstrap,{mode:'existing-automation',runnerOS:'external-linux',runnerHost:controller.id,credentialRef:'secret-ref://synthetic/controller'})
 Object.assign(p.config.toolkit,{enabled:true,site:site.id,siteCode:'syn',environmentName:'synthetic',environmentType:'lab',boundary:'Synthetic design data only.'})
 p.records.nodes.forEach((n,i)=>{n.values.site=site.id;n.values.bmc=`203.0.113.${11+i}`})
 p.records.nodes[0].values.name='node1'
 return p
}
const executable=/\.(ps1|psm1|psd1|sh|bash|py|tf|hcl|bicep|bat|cmd)$/i
const automationPath=(path:string)=>path.startsWith('adapters/')||path.startsWith('execution/')||/(^|\/)playbook\.ya?ml$/.test(path)||/(^|\/)roles\//.test(path)||/\.template\.json$/.test(path)
describe('configuration package boundary',()=>{
 const cases:[string,()=>Project][]=[['new project',newProject],['AD automation-input design',()=>automationInputFixture('ad')],['local identity automation-input design',()=>automationInputFixture('local')]]
 for(const [name,make]of cases)for(const shared of [false,true])it(`${name} (${shared?'sanitized':'private'}) contains data and reports but no automation code`,async()=>{
  const p=make(),before=canonical(p),files=await exportFiles(p,shared,false),paths=Object.keys(files)
  expect(paths.filter(path=>executable.test(path))).toEqual([])
  expect(paths.filter(automationPath)).toEqual([])
  expect(files['project.json']).toBeDefined();expect(files['reports/design.md']).toBeDefined()
  expect(canonical(p)).toBe(before)
 })
 it.each(['ad','local'] as const)('%s private automation-input design still carries every data file',async identity=>{
  const files=await exportFiles(automationInputFixture(identity),false,false)
  for(const path of ['inputs/terraform/terraform.tfvars.json','inputs/ansible/inventory.yml','inputs/ansible/group_vars/all.yml','inputs/arm/azuredeploy.parameters.json','toolkit/conversion/infrastructure.yml','toolkit/conversion/companion.json'])expect(files[path],path).toBeDefined()
 })
})
