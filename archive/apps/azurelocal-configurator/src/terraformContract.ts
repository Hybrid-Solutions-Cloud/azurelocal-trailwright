import {mapArm,guid} from './armMapping'
import {canonical,type Project} from './project'
import type {Finding} from './assessment'
import lock from './contracts/terraform/source-lock.json'
export const TERRAFORM_LOCK=lock
/** Terraform input values for the user's existing automation. No Terraform configuration is emitted. */
export function terraformReview(p:Project){
 const requested=p.config.architecture.route==='terraform-ansible',mapping=mapArm(p),findings:Finding[]=[]
 const add=(group:string,field:string,message:string,resolution:string,category:Finding['category']='input')=>findings.push({id:`terraform:${field}`,severity:'error',category,screen:group==='azure'?4:1,group,record:'',field,message,resolution})
 const identity=mapping.identity,clouds:Record<string,string>={AzureCloud:'public',AzureUSGovernment:'usgovernment'},environment=clouds[String(p.config.azure.cloud)]
 if(requested){
  if(!guid(p.config.azure.tenant)&&!mapping.findings.some(f=>f.group==='azure'&&f.field==='tenant'))add('azure','tenant','Terraform requires an explicit tenant GUID.','Enter the target tenant GUID; a display label is not a provider tenant ID.')
  if(!environment)add('azure','cloud','There is no Terraform environment mapping for the selected cloud.','Keep this as a design handoff until that cloud and release are qualified.','support')
  if(p.config.architecture.storage!=='s2d')add('architecture','storage','Terraform input values currently cover new S2D clusters only.','Retain the storage design; SAN-only and hybrid values need their own reviewed mapping.','support')
 }
 const blocked=mapping.findings.filter(f=>f.severity==='error'),candidate=requested&&!p.sharing&&findings.length===0&&blocked.length===0
 const variables=candidate?{
  subscription_id:String(p.config.azure.subscription),tenant_id:String(p.config.azure.tenant),environment,
  resource_group_name:String(p.config.azure.resourceGroup),deployment_name:`azl-${p.config.azure.clusterName}-${identity}`,
  identity,parameters_content:canonical(mapping.parameters),deployment_authorized:false,
 }:null
 return {kind:'azurelocal-terraform-review',version:lock.version,projectId:p.id,revision:p.revision,requested,identity,
  qualification:candidate?'design-data':'design-only',deploymentQualification:'design-only',executionReady:false,runtimeQualified:false,
  output:'inputs/terraform/terraform.tfvars.json',provider:lock.provider,terraform:lock.terraform,stage:lock.declaredStage,
  findings:requested?[...findings,...blocked]:[],draftCandidate:candidate,candidateVariables:variables,
  resourceEffects:mapping.inspection?.resources??[],limitations:lock.limitations,
  secretResolution:'Existing source Key Vault references pass unchanged through parameters_content. The browser retrieves no secret.',
  boundary:'Input values only. The configurator emits terraform.tfvars.json for your existing Terraform automation and ships no Terraform code. Exported deployment_authorized is always false.',
 }
}
export function terraformRows(p:Project):unknown[][]{const r=terraformReview(p);return [['Terraform route selected',r.requested],['Output',r.output],['Declared stage',r.stage],['Input qualification',r.qualification],['Deployment qualification',r.deploymentQualification],['Deployment authorized',false],['Runtime qualified',false],['Reference Terraform CLI',r.terraform.version],['Reference provider',`${r.provider.source} ${r.provider.version}`],['Input values available',r.draftCandidate],['Secret resolution',r.secretResolution],['Boundary',r.boundary],...r.limitations.map(x=>['Limitation',x]),...r.findings.map(f=>['Correction',`${f.message} ${f.resolution}`])]}
