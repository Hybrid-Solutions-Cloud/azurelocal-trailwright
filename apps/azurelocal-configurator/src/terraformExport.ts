import {terraformReview,TERRAFORM_LOCK} from './terraformContract'
import {canonical,type Project} from './project'
/** Input values only. No Terraform configuration, provider lock or module is ever emitted. */
export async function terraformFiles(p:Project):Promise<Record<string,string>>{
 const review=terraformReview(p),files:Record<string,string>={'plans/terraform-review.json':canonical(review),'plans/terraform-source-lock.json':canonical(TERRAFORM_LOCK)}
 if(!review.candidateVariables)return files
 const prefix='inputs/terraform/'
 files[prefix+'terraform.tfvars.json']=canonical(review.candidateVariables)
 files[prefix+'README.md']=`# Terraform input values\n\n${review.boundary}\n\nterraform.tfvars.json holds the values captured in this design for project ${p.id} revision ${p.revision}: subscription, tenant, cloud environment, resource group, deployment name, identity (${review.identity}) and parameters_content, the complete ARM parameter map. Point your existing Terraform automation at this file, mapping variable names to that automation's own inputs where they differ.\n\nSecure values are Key Vault references, never secret literals. deployment_authorized is false; only your own authorization process should change it.\n\n${review.limitations.map(x=>'- '+x).join('\n')}\n`
 return files
}
