import type {InventoryRecord,Project} from './project'
import {activeRecords,bytes,number} from './selectors'
export {bytes} from './selectors'
export type ParityMedia='all-flash'|'hdd'|'unresolved'

/** Microsoft fault-tolerance tables; HDD here means capacity media, not SAN attachment. */
export function parityFactor(nodes:number,media:ParityMedia):number|null {
 if(!Number.isInteger(nodes)||nodes<4||nodes>16)return null
 if(nodes<=6)return 2 // RS 2+2
 if(nodes<=8)return 1.5 // RS 4+2
 if(media==='all-flash')return nodes===16?15/12:8/6
 if(media==='hdd')return nodes>=12?11/8:6/4
 return null
}
export function resiliencyFactor(layout:unknown,nodes:number,mirror:unknown,media:ParityMedia='unresolved',drivesPerNode=0):number|null {
 if(!Number.isInteger(nodes)||nodes<1||nodes>16)return null
 if(layout==='two-way-mirror')return nodes>=2?2:null
 if(layout==='three-way-mirror')return nodes>=3?3:null
 if(layout==='nested-two-way')return nodes===2?4:null
 if(layout==='dual-parity')return parityFactor(nodes,media)
 const share=number(mirror)/100
 if(!(share>0&&share<1))return null
 if(layout==='mirror-accelerated-parity'){const factor=parityFactor(nodes,media);return factor===null?null:3*share+factor*(1-share)}
 if(layout==='nested-mirror-accelerated-parity'&&nodes===2&&Number.isInteger(drivesPerNode)&&drivesPerNode>=4){
  const columns=Math.min(drivesPerNode,7)
  return share*4+(1-share)*2*columns/(columns-1)
 }
 return null
}
export function poolLayout(p:Project,poolId:unknown){
 const nodes=activeRecords(p,'nodes'),devices=activeRecords(p,'devices').filter(d=>d.values.pool===poolId&&d.values.role==='capacity')
 const media=new Set(devices.map(d=>String(d.values.media)))
 const counts=nodes.map(node=>devices.filter(d=>d.values.node===node.id).reduce((sum,d)=>sum+number(d.values.count),0))
 const derived:ParityMedia=media.size===0?'unresolved':media.has('hdd')?'hdd':'all-flash'
 const parityCounts=nodes.map(node=>devices.filter(d=>d.values.node===node.id&&(derived!=='hdd'||d.values.media==='hdd')).reduce((sum,d)=>sum+number(d.values.count),0))
 return {nodes:nodes.length,media:derived,drivesPerNode:counts.length&&new Set(counts).size===1?counts[0]:0,parityDrivesPerNode:parityCounts.length&&new Set(parityCounts).size===1?parityCounts[0]:0,counts,devices}
}
export interface VolumeCost {id:string;source:string;factor:number|null;logicalBytes:number;nominalBytes:number;allocatedBytes:number;committedBytes:number;growthBytes:number;usedBytes:number;mirrorLogicalBytes:number;parityLogicalBytes:number;problems:string[]}
export function volumeCost(p:Project,row:InventoryRecord):VolumeCost {
 const v=row.values,layout=poolLayout(p,v.pool),tiered=String(v.resiliency).includes('accelerated-parity'),nested=v.resiliency==='nested-mirror-accelerated-parity'
 const media=v.parityMediaBasis==='derive-from-pool'?layout.media:v.parityMediaBasis as ParityMedia
 const factor=v.source==='san'?1:resiliencyFactor(v.resiliency,layout.nodes,v.mirrorPercent,media,layout.parityDrivesPerNode)
 const logical=bytes(v.size,v.unit),allocated=bytes(v.allocated,v.unit),used=bytes(v.used,v.unit),share=number(v.mirrorPercent)/100
 const problems:string[]=[]
 if(factor===null)problems.push('Resiliency, capacity media, node count or nested drive layout is unresolved.')
 if(v.source==='s2d'&&v.parityMediaBasis!=='derive-from-pool'&&media!==layout.media)problems.push('Selected parity media conflicts with the capacity drive inventory.')
 const mirrorFactor=nested?4:3
 const parity=nested&&layout.parityDrivesPerNode>=4?2*Math.min(layout.parityDrivesPerNode,7)/(Math.min(layout.parityDrivesPerNode,7)-1):parityFactor(layout.nodes,media)
 let allocatedFootprint=allocated*(factor??0),usedFootprint=used*(factor??0)
 if(v.source==='s2d'&&tiered){
  allocatedFootprint=bytes(v.mirrorAllocated,v.unit)*mirrorFactor+bytes(v.parityAllocated,v.unit)*(parity??0)
  usedFootprint=bytes(v.mirrorUsed,v.unit)*mirrorFactor+bytes(v.parityUsed,v.unit)*(parity??0)
  if(Math.abs(bytes(v.mirrorAllocated,v.unit)+bytes(v.parityAllocated,v.unit)-allocated)>1)problems.push('Allocated mirror and parity logical capacities do not sum to the CSV allocation.')
  if(Math.abs(bytes(v.mirrorUsed,v.unit)+bytes(v.parityUsed,v.unit)-used)>1)problems.push('Used mirror and parity logical capacities do not sum to the CSV usage.')
 }
 const thin=v.provisioning==='thin',nominal=logical*(factor??0),committed=thin?allocatedFootprint:nominal
 if(thin&&v.allocationBasis==='unresolved')problems.push('Thin allocation needs a planned or operator-observed basis.')
 if(v.allocationBasis==='operator-observed'&&(!v.telemetryAt||!v.telemetryRef))problems.push('Operator-observed allocation needs a timestamp and source reference.')
 const growth=thin?Math.min(Math.max(0,nominal-committed),committed*number(v.growthReservePercent)/100):0
 if([logical,allocatedFootprint,usedFootprint,nominal].some(n=>!Number.isFinite(n)||Math.abs(n)>Number.MAX_SAFE_INTEGER))problems.push('Capacity exceeds precise byte accounting limits.')
 return {id:row.id,source:String(v.source),factor,logicalBytes:logical,nominalBytes:nominal,allocatedBytes:allocatedFootprint,committedBytes:committed,growthBytes:growth,usedBytes:usedFootprint,mirrorLogicalBytes:tiered&&v.source==='s2d'?logical*share:0,parityLogicalBytes:tiered&&v.source==='s2d'?logical*(1-share):0,problems}
}
export interface Budget {
 id:string;name:string;source:string;rawBytes:number;reserveBytes:number;repairReserveBytes:number;recommendedRepairBytes:number;metadataBytes:number;
 committedBytes:number;modeledCommittedBytes:number;otherCommittedBytes:number;growthBytes:number;nominalBytes:number;usedBytes:number;remainingBytes:number|null;resolved:boolean;
 usableBytes:number;nominalOvercommitRatio:number|null;maxOvercommit:number;utilizationPercent:number|null;alertPercent:number;evidenceClass:string;problems:string[]
}
export function storageBudgets(p:Project):Budget[]{
 const nodes=activeRecords(p,'nodes'),nodeIds=new Set(nodes.map(n=>n.id)),volumes=activeRecords(p,'volumes')
 return [...activeRecords(p,'pools').map(pool=>({record:pool,source:'s2d'})),...activeRecords(p,'arrays').map(array=>({record:array,source:'san'}))].map(({record,source})=>{
  const v=record.values,isS2d=source==='s2d',layout=poolLayout(p,record.id),problems:string[]=[]
  const raw=isS2d?layout.devices.reduce((a,d)=>a+bytes(d.values.size,d.values.unit)*number(d.values.count),0):bytes(v.capacity,v.unit)
  if(isS2d&&layout.devices.some(d=>!nodeIds.has(String(d.values.node))))problems.push('A capacity device does not resolve to an active node.')
  if(isS2d&&(!nodes.length||layout.counts.some(count=>count===0)))problems.push('Each active node needs capacity devices in this pool.')
  const media=new Set(layout.devices.map(d=>String(d.values.media)))
  // Reserve a largest capacity device of each capacity media type per node, capped at four nodes.
  const recommended=[...media].reduce((sum,m)=>sum+Math.max(0,...layout.devices.filter(d=>d.values.media===m).map(d=>bytes(d.values.size,d.values.unit)))*Math.min(nodes.length,4),0)
  const repair=isS2d&&v.reserveMode==='recommended'?recommended:number(v.reserveBytes),metadata=isS2d?raw*number(v.metadataPercent)/100:0,reserve=repair+metadata
  const rows=isS2d?volumes.filter(r=>r.values.source==='s2d'&&r.values.pool===record.id):activeRecords(p,'luns').filter(r=>r.values.array===record.id)
  let modeled=0,nominal=0,used=0,individualGrowth=0,existingObserved=0
  for(const row of rows){const r=row.values
   const cost=isS2d?volumeCost(p,row):null
   const logical=bytes(r.size,r.unit),allocated=cost?.allocatedBytes??bytes(r.allocated,r.unit)
   const commit=cost?.committedBytes??(r.provisioning==='thin'?allocated:logical),potential=cost?.nominalBytes??logical
   modeled+=commit;nominal+=potential;used+=cost?.usedBytes??bytes(r.used,r.unit)
   individualGrowth+=cost?.growthBytes??(r.provisioning==='thin'?Math.min(Math.max(0,potential-commit),commit*number(r.growthReservePercent)/100):0)
   if(cost)problems.push(...cost.problems.map(message=>`${r.name||row.id}: ${message}`))
   if(!isS2d&&r.provisioning==='thin'&&r.allocationBasis==='unresolved')problems.push(`${r.name||row.id}: Thin LUN allocation has no basis.`)
   if(!isS2d&&r.allocationBasis==='operator-observed'&&(!r.telemetryAt||!r.telemetryRef))problems.push(`${r.name||row.id}: Observed LUN allocation needs a timestamp and source reference.`)
   if(r.lifecycle!=='new'){
    if(r.allocationBasis==='operator-observed')existingObserved+=allocated
    else if(v.telemetryScope==='observed-whole-source')problems.push(`${r.name||row.id}: Existing allocation must be observed to reconcile whole-source telemetry.`)
   }
  }
  const whole=v.telemetryScope==='observed-whole-source',observed=isS2d?number(v.observedAllocatedBytes):bytes(v.allocated,v.unit)
  let other=number(v.otherCommittedBytes)
  if(whole){
   if(!v.telemetryAt||!v.telemetryRef)problems.push('Whole-source allocation needs a timestamp and source reference.')
   if(observed<existingObserved)problems.push('Whole-source allocation is less than the listed existing allocations.')
   if(other>0)problems.push('Do not add manual outside commitments to whole-source telemetry; select one accounting scope.')
   other=Math.max(0,observed-existingObserved)
   used=isS2d?number(v.observedUsedBytes):bytes(v.used,v.unit)
   if(used>observed)problems.push('Observed whole-source usage exceeds its allocation.')
  }
  const committed=modeled+other,growth=Math.max(individualGrowth,committed*number(v.growthPercent)/100),usable=raw-reserve
  if(!Number.isFinite(raw)||raw>Number.MAX_SAFE_INTEGER||committed>Number.MAX_SAFE_INTEGER)problems.push('Source exceeds precise byte accounting limits.')
  const resolved=problems.length===0
  return {id:record.id,name:String(v.name),source,rawBytes:raw,reserveBytes:reserve,repairReserveBytes:repair,recommendedRepairBytes:isS2d?recommended:0,metadataBytes:metadata,committedBytes:committed,modeledCommittedBytes:modeled,otherCommittedBytes:other,growthBytes:growth,nominalBytes:nominal+other,usedBytes:used,remainingBytes:resolved?usable-committed-growth:null,resolved,usableBytes:usable,nominalOvercommitRatio:usable>0?(nominal+other)/usable:null,maxOvercommit:number(v.maxOvercommit),utilizationPercent:raw>0?committed/raw*100:null,alertPercent:number(v.alertPercent),evidenceClass:whole?'Operator-observed baseline plus design commitments; runtime unverified':'Design inventory estimate; runtime unverified',problems}
 })
}
