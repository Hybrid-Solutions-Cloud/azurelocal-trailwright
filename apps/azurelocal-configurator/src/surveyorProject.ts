import projectSchema from './contracts/surveyor/2.8.0.project.schema.json'
import {createPlanManifest} from './contracts/surveyor/runtime280/exporters/json'
import type {SurveyorProject280} from './contracts/surveyor/types'
import {parseSurveyor,validateContract,type SurveyorPlan} from './surveyorContract'
import {canonical,MAX_FILE_BYTES} from './project'

export interface SizingSource {plan:SurveyorPlan;project?:SurveyorProject280;recalculatedAt?:string}
/** Project files contain only inputs; computed outputs are explicitly new estimates. */
export function parseSizingSource(raw:string):SizingSource {
 if(new TextEncoder().encode(raw).length>MAX_FILE_BYTES)throw new Error('Sizing file exceeds the 4 MiB limit')
 let value:unknown;try{value=JSON.parse(raw)}catch{throw new Error('Sizing file is not valid JSON')}
 if(!value||typeof value!=='object'||Array.isArray(value)||!('kind' in value)||value.kind!=='azurelocal-surveyor-project')return {plan:parseSurveyor(raw)}
 validateContract(value,projectSchema,'project')
 const project=value as SurveyorProject280
 const date=new Date(project.savedAt)
 if(!Number.isFinite(date.getTime())||date.toISOString().replace('.000Z','Z')!==project.savedAt.replace('.000Z','Z'))throw new Error('Project savedAt must be a real UTC timestamp')
 // Keep source-only names, legacy rows and planning metadata out of the owned Configurator state.
 // They remain accessible in the reviewed original source group.
 const computed=createPlanManifest(project.inputs,{provenance:{source:'imported',notes:'Recalculated during Configurator import with pinned Surveyor 2.8.0 sizing functions. Not a frozen source result or runtime observation.'}})
 const recalculatedAt=computed.generatedAt
 computed.generatedAt=project.savedAt
 return {plan:parseSurveyor(canonical(computed)),project,recalculatedAt}
}
