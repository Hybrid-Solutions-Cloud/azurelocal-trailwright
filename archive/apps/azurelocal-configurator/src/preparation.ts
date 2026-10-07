import type {InventoryRecord,Project} from './project'
import {activeRecords,number} from './selectors'

export const PREPARATION_KINDS=['managementHosts','management','azureResources','identities','certificates','media','accessChecks','toolPins','bootstrapTasks','bootstrapExits','stages']
export function preparationGraph(p:Project){
 const records=PREPARATION_KINDS.flatMap(group=>activeRecords(p,group).map(row=>({id:row.id,group,name:String(row.values.name||row.id),owner:String(row.values.owner||''),acceptance:String(row.values.acceptance||row.values.recovery||row.values.evidence||''),row})))
 const synthetic=[{id:'system:bootstrap',group:'bootstrap',name:'Independent bootstrap prerequisites',owner:String(p.config.bootstrap.acceptanceOwner),acceptance:'Independent access, permissions and pinned tools accepted.'},{id:'system:cluster',group:'architecture',name:'Target cluster availability',owner:String(p.config.project.technicalOwner),acceptance:'Terminal deployment and cluster health evidence required.'}]
 const resources=[...records.map(({row:_,...rest})=>rest),...synthetic],ids=new Set(resources.map(r=>r.id)),edges:{from:string;to:string;basis:string}[]=[]
 const link=(from:string,to:unknown,basis:string)=>{if(to)edges.push({from,to:String(to),basis})}
 for(const d of activeRecords(p,'dependencies'))link(String(d.values.from),d.values.to,`Declared ${d.values.kind} dependency`)
 for(const {group,row}of records){const v=row.values
  if(group==='management'){
   link(row.id,v.hostingResource,'Independent service hosting');link(row.id,v.serviceIdentity,'Service access identity');link(row.id,v.certificate,'Service certificate and trust')
   if(v.hosting==='target-cluster')link(row.id,'system:cluster','Service hosted on the target cluster')
   if(v.requiredBeforeCluster)link('system:cluster',row.id,'Required before cluster deployment')
   for(const binding of activeRecords(p,'managementBindings').filter(b=>b.values.component===row.id))link(row.id,binding.values.resource,`Bound ${binding.values.role} resource`)
  }
  if(group==='azureResources')link(row.id,v.parent,'Azure parent resource')
  if(group==='accessChecks'||group==='toolPins'){
   link(row.id,v.executor,'Preparation execution host');if(group==='accessChecks')link(row.id,v.identity,'Access check identity')
   link('system:bootstrap',row.id,group==='toolPins'?'Pinned toolchain preparation':'Required access acceptance')
  }
  if(group==='bootstrapTasks'){
   for(const key of ['executorHost','serviceIdentity','media','temporaryService'])link(row.id,v[key],`Task ${key}`)
   if(v.kind==='node'||v.kind==='access'||v.kind==='workstation')link('system:bootstrap',row.id,`Required ${v.kind} preparation`)
  }
  if(group==='bootstrapExits')for(const key of ['temporaryService','permanentService'])link(row.id,v[key],`Exit ${key}`)
 }
 const bootstrapKeys=p.config.bootstrap.mode==='manual-operator'?['runnerHost']:['runnerHost','serviceIdentity','runnerComponent','artifactComponent','secretComponent']
 for(const key of bootstrapKeys)link('system:bootstrap',p.config.bootstrap[key],`Bootstrap ${key}`)
 if(p.config.bootstrap.mode!=='manual-operator'&&p.config.bootstrap.authentication==='certificate')link('system:bootstrap',p.config.bootstrap.authCertificate,'Authentication certificate and trust')
 link('system:cluster','system:bootstrap','Prepare access and nodes before deployment')
 const missing=edges.filter(e=>!ids.has(e.from)||!ids.has(e.to)),remaining=new Set(ids),waves:string[][]=[]
 while(remaining.size){const ready=[...remaining].filter(id=>!edges.some(e=>e.from===id&&(remaining.has(e.to)||!ids.has(e.to))));if(!ready.length)break;waves.push(ready);ready.forEach(id=>remaining.delete(id))}
 return {resources,edges,waves,blocked:[...remaining],missing,runtimeQualified:false as const}
}
const hostedProducts=new Set(['ad-dns','utility-jump','ndm','wac','ome','oem-other','runner'])
export const serviceNeedsCompute=(row:InventoryRecord)=>(hostedProducts.has(String(row.values.product))||['cpu','memoryGiB','diskGiB'].some(k=>number(row.values[k])>0))&&row.values.hosting!=='external'
export function managementCapacity(p:Project){
 return activeRecords(p,'managementHosts').map(host=>{
  const components=activeRecords(p,'management').filter(r=>r.values.hostingResource===host.id&&serviceNeedsCompute(r))
  const demand=(key:string)=>components.reduce((sum,row)=>sum+number(row.values[key])*number(row.values.count),0)
  const v=host.values
  return {id:host.id,name:String(v.name||host.id),components:components.map(r=>r.id),cpu:demand('cpu'),memoryGiB:demand('memoryGiB'),diskGiB:demand('diskGiB'),availableCpu:number(v.availableCpu)-number(v.reservedCpu),availableMemoryGiB:number(v.availableMemoryGiB)-number(v.reservedMemoryGiB),availableDiskGiB:number(v.availableDiskGiB)-number(v.reservedDiskGiB),basis:String(v.capacityBasis),reference:String(v.capacityReference),runtimeQualified:false as const}
 })
}
export function preparationPlan(p:Project){return {qualification:'Design prerequisites, manual owner handoffs and unverified observations. No execution authorization.',managementCapacity:managementCapacity(p),graph:preparationGraph(p),exits:activeRecords(p,'bootstrapExits').map(r=>({id:r.id,...r.values})),toolchain:activeRecords(p,'toolPins').map(r=>({id:r.id,...r.values})),accessChecks:activeRecords(p,'accessChecks').map(r=>({id:r.id,...r.values}))}}
