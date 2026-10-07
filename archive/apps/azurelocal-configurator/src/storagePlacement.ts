import type {Project,InventoryRecord} from './project'
import {activeRecords,bytes,number} from './selectors'

export interface PlacementDemand {group:string;record:string;name:string;volume:string;logicalBytes:number;countedBytes:number;basis:string;problems:string[]}
/** Demand is logical CSV occupancy. It is compared with CSV size, never added to pool commitments again. */
export function storagePlacement(p:Project){
 const volumes=activeRecords(p,'volumes'),paths=activeRecords(p,'storagePaths'),workloads=activeRecords(p,'workloads').filter(r=>r.values.hosting==='target-cluster'),management=activeRecords(p,'management').filter(r=>r.values.hosting==='target-cluster')
 const demand=(row:InventoryRecord,key:string)=>bytes(row.values[key],'GiB')*number(row.values.count)*(1+number(row.values.growthPercent)/100)
 const locate=(row:InventoryRecord)=>{const path=paths.find(r=>r.id===row.values.storagePath),volume=String(row.values.volume||path?.values.volume||''),problems:string[]=[]
  if(row.values.storagePath&&!path)problems.push('Azure storage path does not resolve to an active resource.')
  if(path&&row.values.volume&&path.values.volume!==row.values.volume)problems.push('CSV and Azure storage path placements disagree.')
  if(volume&&!volumes.some(r=>r.id===volume))problems.push('CSV placement does not resolve to an active resource.')
  if(volumes.find(r=>r.id===volume)?.values.role!=='workload'&&volume)problems.push('Workload demand must use a workload CSV.')
  return {volume,problems}
 }
 const rows:PlacementDemand[]=workloads.map(row=>({...locate(row),group:'workloads',record:row.id,name:String(row.values.name||row.id),logicalBytes:demand(row,'storageGiB'),countedBytes:demand(row,'storageGiB'),basis:'Independent logical demand including growth'}))
 for(const row of workloads){const out=rows.find(r=>r.record===row.id)!
  if(row.values.storageAccounting==='included-in-parent'){
   const parent=workloads.find(r=>r.id===row.values.storageIncludedIn),parentOut=rows.find(r=>r.record===parent?.id)
   if(!parent||parent.id===row.id||parent.values.storageAccounting!=='own-demand'||parent.values.managementComponent){out.problems.push('Included storage needs a separate active parent with independent storage accounting.');continue}
   if(!row.values.storageAccountingEvidence){out.problems.push('Storage inclusion requires an explicit sizing and placement basis.');continue}
   if(out.volume&&out.volume!==parentOut?.volume){out.problems.push('Included storage placement differs from its parent.');continue}
   out.volume=parentOut!.volume;out.countedBytes=0;out.basis=`Included in ${parentOut!.name}; parent covers this demand`
  }
 }
 for(const parent of rows){const children=workloads.filter(r=>r.values.storageIncludedIn===parent.record&&r.values.storageAccounting==='included-in-parent').map(w=>rows.find(r=>r.record===w.id)!).filter(r=>r.countedBytes===0)
  if(children.reduce((sum,r)=>sum+r.logicalBytes,0)>parent.logicalBytes){parent.problems.push('Included child demand exceeds the parent storage reservation.');for(const child of children)child.problems.push('Parent reservation is too small for the included storage demand.')}
 }
 for(const component of management){const location=locate(component),linked=rows.filter(r=>workloads.find(w=>w.id===r.record)?.values.managementComponent===component.id),own=demand(component,'diskGiB'),total=linked.reduce((sum,r)=>sum+r.logicalBytes,0),placement=location.volume||linked[0]?.volume||'',problems=[...location.problems]
  if(linked.some(r=>r.volume&&r.volume!==placement))problems.push('Reconciled management workloads have different CSV placements.')
  if(linked.some(r=>workloads.find(w=>w.id===r.record)?.values.storageAccounting==='included-in-parent'))problems.push('Management reconciliation and parent storage inclusion cannot be combined on the same workload.')
  for(const row of linked){row.countedBytes=0;row.basis=`Reconciled with management ${component.values.name||component.id}`;row.volume=placement}
  rows.push({group:'management',record:component.id,name:String(component.values.name||component.id),volume:placement,logicalBytes:own,countedBytes:Math.max(own,total),basis:'Greater of management reservation and linked workloads, counted once',problems})
 }
 for(const row of rows)if(row.countedBytes>0&&!row.volume)row.problems.push('Logical storage demand has no CSV placement.')
 return {rows,volumes:volumes.map(v=>{const placed=rows.filter(r=>r.volume===v.id),logicalBytes=bytes(v.values.size,v.values.unit),demandBytes=placed.reduce((sum,r)=>sum+r.countedBytes,0);return {id:v.id,name:String(v.values.name||v.id),logicalBytes,demandBytes,remainingBytes:logicalBytes-demandBytes,resolved:placed.every(r=>!r.problems.length)}}),unplacedBytes:rows.filter(r=>!r.volume).reduce((sum,r)=>sum+r.countedBytes,0)}
}
