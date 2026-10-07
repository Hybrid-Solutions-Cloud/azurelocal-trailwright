import type {Project} from './project'
import type {Finding} from './assessment'
import {terraformReview} from './terraformContract'
export function TerraformPanel({project,onCorrect}:{project:Project;onCorrect:(f:Finding)=>void}){
 const review=terraformReview(project)
 if(!review.requested)return null
 return <section className="card" aria-label="Terraform orchestration review"><h2>Terraform orchestration review</h2><p><strong>Input values · no Terraform code emitted</strong></p><p>{review.boundary}</p><p>Declared stage: {review.stage}. Reference versions: Terraform {review.terraform.version}; AzureRM {review.provider.version}.</p><p>{review.draftCandidate?'The private package includes terraform.tfvars.json with the reviewed values. Deployment remains disabled.':'Correct the mapping findings to prepare the Terraform input values.'}</p><ul>{review.findings.map(f=><li key={f.id}>{f.message} <button onClick={()=>onCorrect(f)}>Correct {f.group}.{f.field}</button></li>)}</ul><details><summary>Resource scope and remaining qualification</summary><ul>{review.limitations.map(x=><li key={x}>{x}</li>)}</ul></details></section>
}
