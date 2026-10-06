import {dump,DEFAULT_SCHEMA,Type} from 'js-yaml'
import adSchema from './contracts/toolkit/bridge/ad.parameters.schema.json?raw'
import localSchema from './contracts/toolkit/bridge/local.parameters.schema.json?raw'
import {canonical,type Project} from './project'
import {activeRecords} from './selectors'
import {ansibleReview} from './ansibleContract'
class Literal {constructor(public value:string){}}
const schema=DEFAULT_SCHEMA.extend([new Type('!unsafe',{kind:'scalar',instanceOf:Literal,represent:(value:object)=>(value as Literal).value})])
/** User-entered strings stay data when Ansible loads the inventory. */
export function ansibleYaml(value:unknown):string{return dump(value,{schema,noRefs:true,sortKeys:true,lineWidth:100})}
/** Inventory data only. No playbook, role or module is ever emitted. */
export async function ansibleFiles(p:Project):Promise<Record<string,string>>{
 const review=ansibleReview(p),files:Record<string,string>={'plans/ansible-review.json':canonical(review)}
 if(!review.draftCandidate)return files
 const prefix='inputs/ansible/',controller=activeRecords(p,'managementHosts').find(r=>r.id===review.controllerId)!
 const literal=(value:unknown)=>new Literal(String(value??'')),identity=p.config.architecture.identity==='local'?'local':'ad'
 files[prefix+'inventory.yml']=ansibleYaml({all:{children:{azurelocal_control:{hosts:{azurelocal_controller:{ansible_connection:'local',ansible_python_interpreter:'{{ ansible_playbook_python }}',azl_controller_record:controller.id,azl_controller_name:literal(controller.values.name)}}},azurelocal_design_nodes:{hosts:Object.fromEntries(activeRecords(p,'nodes').map(node=>['design_'+node.id.replaceAll('-','_'),{azl_design_only:true,azl_record_id:node.id,azl_name:literal(node.values.name),azl_management_ip:literal(node.values.managementIp),azl_arc_id:literal(node.values.arcId)}]))}}}})
 files[prefix+'group_vars/all.yml']=ansibleYaml({azl_project_id:p.id,azl_project_revision:p.revision,azl_execution_authorized:false,azl_runtime_qualified:false,azl_identity:identity,azl_runtime_credential_reference:literal(p.config.bootstrap.credentialRef),azl_authentication_design:literal(p.config.bootstrap.authentication)})
 files[prefix+`contracts/${identity}.parameters.schema.json`]=identity==='ad'?adSchema:localSchema
 files[prefix+'README.md']=`# Ansible inventory data\n\n${review.boundary}\n\ninventory.yml lists the selected automation controller and the cluster nodes as design records (azl_design_only: true); it sets no connection credentials. group_vars/all.yml carries project identity, identity mode and the runtime credential reference. User-entered strings are tagged !unsafe so Ansible keeps them literal. The parameter schema describes the ARM parameters this design produces.\n\nUse these files with your existing Ansible automation. Credential references are descriptive; resolve them in your own secret store.\n\nStages not covered by this data:\n${review.unmapped.map(x=>'- '+x).join('\n')}\n`
 return files
}
