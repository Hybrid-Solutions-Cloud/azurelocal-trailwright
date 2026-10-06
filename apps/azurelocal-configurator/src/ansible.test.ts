import {describe,it,expect} from 'vitest'
import {load,DEFAULT_SCHEMA,Type} from 'js-yaml'
import {armFixture} from './testing/armFixture'
import {newRecord,sanitize,canonical} from './project'
import {ansibleFiles} from './ansibleExport'
import {ansibleReview} from './ansibleContract'
import {exportFiles,designMarkdown,implementationMarkdown,schedules} from './exports'
const yamlSchema=DEFAULT_SCHEMA.extend([new Type('!unsafe',{kind:'scalar',construct:value=>value})])
function fixture(identity:'ad'|'local'='ad'){
 const p=armFixture(identity),controller=newRecord('managementHosts');controller.values.name='Literal {{ 7 * 7 }} controller';controller.values.platform='external';p.records.managementHosts.push(controller)
 Object.assign(p.config.architecture,{route:'terraform-ansible'});Object.assign(p.config.bootstrap,{mode:'existing-automation',runnerOS:'external-linux',runnerHost:controller.id,credentialRef:'secret-ref://synthetic/controller'})
 p.records.nodes[0].values.name='node1' // Physical names still obey the selected ARM template.
 return p
}
describe('Ansible inventory data; no playbooks, roles or modules are emitted',()=>{
 it.each(['ad','local'] as const)('%s exports inventory and group variables with literal strings and separate node intent',async identity=>{
  const p=fixture(identity),before=canonical(p),files=await ansibleFiles(p),prefix='inputs/ansible/'
  expect(ansibleReview(p)).toMatchObject({draftCandidate:true,runtimeQualified:false,executionReady:false,qualification:'design-data'})
  const inventory:any=load(files[prefix+'inventory.yml'],{schema:yamlSchema}),variables:any=load(files[prefix+'group_vars/all.yml'],{schema:yamlSchema})
  expect(inventory.all.children.azurelocal_control.hosts.azurelocal_controller.azl_controller_name).toBe('Literal {{ 7 * 7 }} controller')
  expect(files[prefix+'inventory.yml']).toContain('!unsafe');expect(variables).toMatchObject({azl_identity:identity,azl_execution_authorized:false,azl_runtime_qualified:false,azl_runtime_credential_reference:'secret-ref://synthetic/controller'})
  for(const node of Object.values(inventory.all.children.azurelocal_design_nodes.hosts) as any[]){expect(node.azl_design_only).toBe(true);expect(node).not.toHaveProperty('ansible_host');expect(node).not.toHaveProperty('ansible_password')}
  expect(Object.keys(files).sort()).toEqual(['inputs/ansible/README.md',`inputs/ansible/contracts/${identity}.parameters.schema.json`,'inputs/ansible/group_vars/all.yml','inputs/ansible/inventory.yml','plans/ansible-review.json'])
  expect(canonical(p)).toBe(before)
 })
 it('withholds unsupported controller and mapping branches and sanitized operational files',async()=>{
  for(const [field,value]of [['mode','manual-operator'],['runnerOS','windows'],['runnerHost','missing']]){const p=fixture();p.config.bootstrap[field]=value;expect(ansibleReview(p).findings.some(f=>f.field===field)).toBe(true);expect((await ansibleFiles(p))['inputs/ansible/inventory.yml']).toBeUndefined()}
  for(const p of [sanitize(fixture()),fixture()]){if(!p.sharing)p.config.architecture.storage='hybrid';expect((await ansibleFiles(p))['inputs/ansible/inventory.yml']).toBeUndefined()}
 })
 it('keeps reports, schedules and review JSON aligned',async()=>{const p=fixture(),review=ansibleReview(p),files=await exportFiles(p,false,false);expect(JSON.parse(String(files['plans/ansible-review.json']))).toEqual(review);for(const text of [designMarkdown(p),implementationMarkdown(p),canonical(schedules(p)['Ansible review'])])expect(text).toContain(review.boundary)})
})
