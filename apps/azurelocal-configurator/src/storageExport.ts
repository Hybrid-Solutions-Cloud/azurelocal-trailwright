import type {Project} from './project'
import {activeRecords} from './selectors'
import {storageBudgets,volumeCost,type Budget} from './storage'
import {storagePlacement} from './storagePlacement'
import storageSourceLock from './contracts/microsoft/storage-source-lock.json'
export {storageSourceLock}
export const budgetDescription=(b:Budget)=>`Capacity ${b.rawBytes} bytes; repair reserve ${b.repairReserveBytes}; metadata ${b.metadataBytes}; listed commitments ${b.modeledCommittedBytes}; outside commitments ${b.otherCommittedBytes}; total commitments ${b.committedBytes}; growth reserve ${b.growthBytes}; nominal potential ${b.nominalBytes}; usage ${b.usedBytes}; headroom ${b.remainingBytes??'unresolved'}. ${b.evidenceClass}. ${b.problems.join(' ')}`
export function storageAccounting(p:Project){return {qualification:'Design calculations and unverified operator observations; no runtime qualification',budgets:storageBudgets(p),volumes:activeRecords(p,'volumes').map(r=>volumeCost(p,r)),placement:storagePlacement(p)}}
export function storageReportRows(p:Project):unknown[][]{const data=storageAccounting(p);return [
 ...data.volumes.map(v=>[`CSV ${v.id}`,`Logical ${v.logicalBytes} bytes; footprint factor ${v.factor??'unresolved'}; committed ${v.problems.length?'unresolved':v.committedBytes}; nominal ${v.factor===null?'unresolved':v.nominalBytes}; mirror logical ${v.mirrorLogicalBytes}; parity logical ${v.parityLogicalBytes}. ${v.problems.join(' ')}`]),
 ...data.placement.volumes.map(v=>[`Placement ${v.name}`,`Logical size ${v.logicalBytes} bytes; assigned demand including growth ${v.demandBytes}; logical headroom ${v.resolved?v.remainingBytes:'unresolved'}. This demand is not added again to source commitments.`]),
 ...data.placement.rows.map(r=>[`${r.group}: ${r.name}`,`${r.countedBytes} logical bytes counted; requested ${r.logicalBytes}; CSV ${r.volume||'unplaced'}; ${r.basis}. ${r.problems.join(' ')}`]),
 ['Unplaced storage demand (bytes)',data.placement.unplacedBytes],
]}
export function storageSchedules(p:Project):Record<string,unknown[][]>{const data=storageAccounting(p);return {
 Capacity:[['Source ID','Source name','Source type','Capacity bytes','Repair reserve bytes','Metadata bytes','Listed commitments bytes','Outside commitments bytes','Growth reserve bytes','Nominal potential bytes','Usage bytes','Headroom bytes','Nominal ratio','Configured ratio limit','Evidence class','Unresolved issues'],...data.budgets.map(b=>[b.id,b.name,b.source,b.rawBytes,b.repairReserveBytes,b.metadataBytes,b.modeledCommittedBytes,b.otherCommittedBytes,b.growthBytes,b.nominalBytes,b.usedBytes,b.remainingBytes??'Unresolved',b.nominalOvercommitRatio??'Unresolved',b.maxOvercommit,b.evidenceClass,b.problems.join('; ')])],
 'CSV footprint':[['CSV ID','Source','Logical bytes','Physical factor','Nominal bytes','Allocated bytes','Committed bytes','Growth reserve bytes','Used bytes','Mirror logical bytes','Parity logical bytes','Unresolved issues'],...data.volumes.map(v=>[v.id,v.source,v.logicalBytes,v.factor??'Unresolved',v.factor===null?'Unresolved':v.nominalBytes,v.problems.length?'Unresolved':v.allocatedBytes,v.problems.length?'Unresolved':v.committedBytes,v.growthBytes,v.usedBytes,v.mirrorLogicalBytes,v.parityLogicalBytes,v.problems.join('; ')])],
 'Storage placement':[['Collection','Record ID','Name','CSV ID','Logical demand bytes','Counted demand bytes','Accounting basis','Unresolved issues'],...data.placement.rows.map(r=>[r.group,r.record,r.name,r.volume,r.logicalBytes,r.countedBytes,r.basis,r.problems.join('; ')])],
 'CSV placement budget':[['CSV ID','Name','Logical size bytes','Placed logical demand bytes','Logical headroom bytes','Resolved'],...data.placement.volumes.map(v=>[v.id,v.name,v.logicalBytes,v.demandBytes,v.remainingBytes,v.resolved])],
}}
