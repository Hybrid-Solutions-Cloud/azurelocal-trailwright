import type {Project} from './project'
import type {Finding} from './assessment'
import {terraformReview} from './terraformContract'
import {activeRecords} from './selectors'
export const ANSIBLE_INPUT_VERSION='0.2.0'
/** Ansible inventory data for the user's existing automation. No playbook, role or module is emitted. */
export function ansibleReview(p:Project){
 const requested=p.config.architecture.route==='terraform-ansible',terraform=terraformReview(p),bootstrap=p.config.bootstrap,controller=activeRecords(p,'managementHosts').find(r=>r.id===bootstrap.runnerHost),findings:Finding[]=[]
 const add=(field:string,message:string,resolution:string)=>findings.push({id:`ansible:${field}`,severity:'review',category:'qualification',screen:3,group:'bootstrap',record:'',field,message,resolution})
 if(requested){
  if(bootstrap.mode==='manual-operator')add('mode','Ansible inventory needs an explicitly selected automation controller.','Select existing/new automation to request this data, or retain a manual handoff.')
  if(bootstrap.runnerOS!=='external-linux')add('runnerOS','Windows is not a supported Ansible control node.','Select an independent external Linux controller for Ansible.')
  if(!controller)add('runnerHost','Select the independent host your Ansible automation runs on.','Add or select an active independent management host. No controller is deployed by this package.')
 }
 const candidate=requested&&!p.sharing&&findings.length===0&&terraform.draftCandidate
 return {kind:'azurelocal-ansible-review',version:ANSIBLE_INPUT_VERSION,requested,projectId:p.id,revision:p.revision,qualification:candidate?'design-data':'design-only',runtimeQualified:false,executionReady:false,
  controllerId:controller?.id??null,output:'inputs/ansible/',
  draftCandidate:candidate,findings,terraformFindings:requested?terraform.findings:[],
  stage:'Ansible inventory and group variables for the cluster ARM stage',
  boundary:'Inventory data only. The configurator emits inventory.yml and group_vars for your existing Ansible automation and ships no playbooks, roles or modules.',
  unmapped:['Physical host imaging, firmware, BMC and Arc registration','Directory or local-identity preparation','Management service deployment and bootstrap exit','SAN/S2D CSV and Azure storage-path operations','Arc SDN enablement and policy operations','Workloads, backup, restore and terminal acceptance'],
 }
}
export function ansibleRows(p:Project):unknown[][]{const r=ansibleReview(p);return [['Ansible requested',r.requested],['Named stage',r.stage],['Output',r.output],['Controller record',r.controllerId??'Not selected'],['Qualification',r.qualification],['Runtime qualified',false],['Inventory available',r.draftCandidate],['Boundary',r.boundary],...r.unmapped.map(x=>['Stage not covered by this data',x]),...r.findings.map(x=>['Correction',`${x.message} ${x.resolution}`])]}
