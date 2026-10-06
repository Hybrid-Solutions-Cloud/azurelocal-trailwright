import type {Project} from './project'
import {preparationPlan} from './preparation'
export function preparationReportRows(p:Project):unknown[][]{const plan=preparationPlan(p),graph=plan.graph;return [
 ['Qualification',plan.qualification],
 ...plan.managementCapacity.map(h=>[h.name,`vCPU ${h.cpu}/${h.availableCpu}; RAM ${h.memoryGiB}/${h.availableMemoryGiB} GiB; disk ${h.diskGiB}/${h.availableDiskGiB} GiB. ${h.basis}; unverified.`]),
 ...graph.waves.flatMap((wave,i)=>wave.map(id=>{const r=graph.resources.find(r=>r.id===id)!;return [`Wave ${i+1}: ${r.name}`,`Owner: ${r.owner||'unassigned'}. Acceptance: ${r.acceptance||'unresolved'}.`]})),
 ...graph.edges.map(e=>[`${graph.resources.find(r=>r.id===e.from)?.name||e.from} requires ${graph.resources.find(r=>r.id===e.to)?.name||e.to}`,e.basis]),
 ['Blocked prerequisites',graph.blocked.map(id=>graph.resources.find(r=>r.id===id)?.name||id).join('; ')||'No graph cycle detected; other validation still applies'],
 ...plan.exits.map(e=>[`Exit ${e.id}`,Object.entries(e).map(([k,v])=>`${k}: ${v}`).join('; ')]),
]}
export function preparationSchedules(p:Project):Record<string,unknown[][]>{const plan=preparationPlan(p);return {
 'Management capacity':[['Host ID','Name','vCPU demand','vCPU available','Memory demand GiB','Memory available GiB','Disk demand GiB','Disk available GiB','Basis','Reference','Runtime qualified'],...plan.managementCapacity.map(h=>[h.id,h.name,h.cpu,h.availableCpu,h.memoryGiB,h.availableMemoryGiB,h.diskGiB,h.availableDiskGiB,h.basis,h.reference,false])],
 'Prerequisite edges':[['Dependent ID','Prerequisite ID','Basis'],...plan.graph.edges.map(e=>[e.from,e.to,e.basis])],
 'Prerequisite waves':[['Wave','Resource ID','Resource','Owner','Acceptance'],...plan.graph.waves.flatMap((wave,i)=>wave.map(id=>{const r=plan.graph.resources.find(r=>r.id===id)!;return [i+1,id,r.name,r.owner,r.acceptance]}))],
}}
