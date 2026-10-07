import {collections} from './catalog'
import type {Finding} from './assessment'
import type {Project} from './project'
import {activeRecords,bytes,number} from './selectors'
import {storageBudgets,volumeCost,poolLayout} from './storage'
import {storagePlacement} from './storagePlacement'

export const STORAGE_SOURCES={
 volumes:'https://learn.microsoft.com/en-us/windows-server/storage/storage-spaces/plan-volumes',
 nested:'https://learn.microsoft.com/en-us/windows-server/storage/storage-spaces/nested-resiliency',
 parity:'https://learn.microsoft.com/en-us/windows-server/storage/storage-spaces/fault-tolerance',
 thin:'https://learn.microsoft.com/en-us/azure/azure-local/manage/manage-thin-provisioning-23h2?view=azloc-2604',
 paths:'https://learn.microsoft.com/en-us/azure/azure-local/manage/create-storage-path?view=azloc-2604',
 pathApi:'https://learn.microsoft.com/en-us/azure/templates/microsoft.azurestackhci/2024-01-01/storagecontainers',
 san:'https://learn.microsoft.com/en-us/azure/azure-local/concepts/san-requirements?view=azloc-2604',
 external:'https://learn.microsoft.com/en-us/azure/azure-local/deploy/enable-external-storage?view=azloc-2604',
}
export function csvDirectory(input:unknown):string|null {
 const value=String(input).replace(/\\$/,'')
 if(value.length>260||!/^C:\\ClusterStorage\\/i.test(value))return null
 const segments=value.split('\\').slice(2)
 if(!segments.length||segments.some(s=>!s||s==='.'||s==='..'||/[<>:"/|?*\x00-\x1f]/.test(s)||/[. ]$/.test(s)||/^(?:con|prn|aux|nul|com[1-9]|lpt[1-9])(?:\.|$)/i.test(s)))return null
 return value.toLowerCase()
}
export const containedDirectory=(path:unknown,mount:unknown)=>{const p=csvDirectory(path),m=csvDirectory(mount);return !!p&&!!m&&(p===m||p.startsWith(m+'\\'))}
export const validWwpn=(v:unknown)=>/^(?:[a-f0-9]{16}|[a-f0-9]{2}(?::[a-f0-9]{2}){7}|[a-f0-9]{2}(?:-[a-f0-9]{2}){7})$/i.test(String(v))
export const validIqn=(v:unknown)=>/^(?:iqn\.\d{4}-(?:0[1-9]|1[0-2])\.[a-z0-9.-]+(?::[^\s]+)?|eui\.[a-f0-9]{16}|naa\.[a-f0-9]{16,32})$/i.test(String(v))
const realTimestamp=(v:unknown)=>{if(typeof v!=='string'||!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{3})?Z$/.test(v))return false;const date=new Date(v);return Number.isFinite(date.getTime())&&date.toISOString().replace('.000Z','Z')===v.replace('.000Z','Z')}

export function storageFindings(p:Project):Finding[]{
 const findings:Finding[]=[],nodes=activeRecords(p,'nodes'),volumes=activeRecords(p,'volumes'),paths=activeRecords(p,'storagePaths')
 const add=(group:string,record:string,field:string,message:string,resolution:string,category:Finding['category']='capacity',severity:Finding['severity']='error',source?:string)=>findings.push({id:`storage:${findings.length}:${group}:${record}:${field}`,screen:collections.find(g=>g.key===group)?.screen??9,group,record,field,message,resolution,category,severity,source})
 const find=(key:string,id:unknown)=>activeRecords(p,key).find(r=>r.id===id)
 const budgets=storageBudgets(p)
 for(const budget of budgets){
  const group=budget.source==='s2d'?'pools':'arrays',record=find(group,budget.id)!
  for(const problem of budget.problems)add(group,budget.id,'telemetryScope',problem,'Correct the source inventory, allocation basis or telemetry scope before relying on headroom.')
  if(budget.nominalOvercommitRatio!==null&&budget.nominalOvercommitRatio>budget.maxOvercommit)add(group,budget.id,'maxOvercommit','Nominal commitments exceed the configured source overcommit limit.','Reduce nominal sizing or explicitly review a new limit and growth response plan.')
  if(budget.utilizationPercent!==null&&budget.utilizationPercent>=budget.alertPercent)add(group,budget.id,'alertPercent','Committed allocation has reached the configured capacity alert threshold.','Review growth reserves and arrange capacity or workload changes.','capacity','review',STORAGE_SOURCES.thin)
  if(budget.growthBytes>0&&!record.values.alertOwner)add(group,budget.id,'alertOwner','Growth reserves require an accountable capacity owner.','Assign the owner and response procedure.')
  if(record.values.telemetryScope==='observed-whole-source'&&!realTimestamp(record.values.telemetryAt))add(group,budget.id,'telemetryAt','Whole-source telemetry requires a real UTC observation timestamp.','Enter the observation time and retain the source reference.','evidence')
  if(budget.source==='s2d'&&budget.repairReserveBytes<budget.recommendedRepairBytes)add(group,budget.id,'reserveBytes','Explicit repair reserve is below the documented drive-based recommendation.','Use recommended reserve or record the reason and reviewed failure-repair design.','capacity','review',STORAGE_SOURCES.volumes)
 }
 for(const volume of volumes){const v=volume.values,cost=volumeCost(p,volume),layout=poolLayout(p,v.pool)
  for(const problem of cost.problems)add('volumes',volume.id,problem.startsWith('Resiliency')?'resiliency':problem.startsWith('Allocated')?'mirrorAllocated':problem.startsWith('Used')?'mirrorUsed':problem.includes('media')?'parityMediaBasis':'allocationBasis',problem,'Review the distinct logical allocation, tier breakdown and source evidence.')
  if(v.source==='s2d'&&String(v.resiliency).startsWith('nested-')){
   if(layout.nodes!==2||layout.drivesPerNode<4)add('volumes',volume.id,'resiliency','The nested layout requires exactly two nodes and at least four matching capacity drives per node in the reviewed guide.','Correct the inventory or obtain explicit release/OEM qualification for a different layout.','support','error',STORAGE_SOURCES.nested)
   if(activeRecords(p,'devices').some(d=>d.values.pool===v.pool&&d.values.role==='cache')&&!v.layoutEvidence)add('volumes',volume.id,'layoutEvidence','Nested resiliency with cache needs a reviewed cache-failure policy.','Record behavior while a node is down, including the delayed write-cache disable option and performance impact.','support','review',STORAGE_SOURCES.nested)
  }
  if(String(v.resiliency).includes('accelerated-parity')&&v.source==='s2d'){
   if(!v.mirrorTier||!v.parityTier)add('volumes',volume.id,'mirrorTier','Tiered CSVs require distinct mirror and parity tier identities.','Record the selected storage tier templates; inspect their properties before deployment.','input')
   if(v.mirrorTier&&v.mirrorTier===v.parityTier)add('volumes',volume.id,'parityTier','Mirror and parity tiers cannot be the same template.','Select distinct templates.','reference')
   for(const [key,max]of [['mirrorAllocated',cost.mirrorLogicalBytes],['parityAllocated',cost.parityLogicalBytes]] as const)if(bytes(v[key],v.unit)>max)add('volumes',volume.id,key,'Allocated tier capacity exceeds its desired tier size.','Correct the tier split or allocation observation.')
   if(number(v.mirrorUsed)>number(v.mirrorAllocated)||number(v.parityUsed)>number(v.parityAllocated))add('volumes',volume.id,'mirrorUsed','Tier usage exceeds the corresponding allocated tier capacity.','Reconcile the mirror/parity observations.')
  }
  if(v.lifecycle!=='new'&&v.source==='s2d'&&v.existingResiliency!=='unobserved'&&v.existingResiliency!==v.resiliency)add('volumes',volume.id,'existingResiliency','Existing resiliency differs from the intended layout; this is not an in-place conversion.','Design separate destination storage and a data migration with preservation and rollback.','preservation','error',STORAGE_SOURCES.nested)
  if(v.lifecycle!=='new'&&v.existingResiliency==='unobserved'&&v.source==='s2d')add('volumes',volume.id,'existingResiliency','Existing CSV resiliency has not been observed.','Record its actual layout before planning changes.','evidence','review')
  if(v.provisioning==='thin'&&v.source==='s2d'){
   const source=budgets.find(b=>b.id===v.pool)
   if(source?.nominalOvercommitRatio!==null&&source?.nominalOvercommitRatio!==undefined&&source.nominalOvercommitRatio>number(v.maxOvercommit))add('volumes',volume.id,'maxOvercommit','The backing pool nominal ratio exceeds this CSV thin-policy limit.','Reconcile the source policy and each thin volume policy.')
  }
  if(v.mount&&!csvDirectory(v.mount))add('volumes',volume.id,'mount','CSV mount directory is invalid or ambiguous.','Use a canonical directory under C:\\ClusterStorage without traversal or reserved Windows names.','input')
  if(v.source==='s2d'&&cost.logicalBytes>64e12)add('volumes',volume.id,'size','CSV size exceeds the Azure Local 64 TB recommendation.','Review the workload and support implications or split the layout.','support','review',STORAGE_SOURCES.volumes)
  if(v.allocationBasis==='operator-observed'&&!realTimestamp(v.telemetryAt))add('volumes',volume.id,'telemetryAt','CSV observation timestamp is invalid.','Enter a real UTC timestamp.','evidence')
 }
 if(volumes.filter(v=>v.values.source==='s2d').length>64)add('volumes','','name','The S2D CSV count exceeds the documented 64-volume recommendation.','Review metadata ownership, volume size and operational manageability.','support','review',STORAGE_SOURCES.volumes)
 const uniquePaths=new Map<string,string>()
 for(const path of paths){const v=path.values,volume=find('volumes',v.volume),directory=csvDirectory(v.directory)
  if(!directory)add('storagePaths',path.id,'directory','Storage path directory is invalid or ambiguous.','Use an explicit canonical CSV directory.','input')
  if(volume&&!containedDirectory(v.directory,volume.values.mount))add('storagePaths',path.id,'directory','Storage path does not reside on its selected CSV mount.','Correct the path or selected backing CSV.','reference', 'error',STORAGE_SOURCES.paths)
  if(volume&&volume.values.role!=='workload')add('storagePaths',path.id,'volume','Infrastructure and performance-history CSVs are reserved for platform use.','Select a workload CSV for VM/image storage paths.','support','error',STORAGE_SOURCES.paths)
  if(!/^(?:[a-z0-9]|[a-z0-9][-._a-z0-9]{0,62}[a-z0-9])$/i.test(String(v.name)))add('storagePaths',path.id,'name','Storage path resource name must be 1–64 characters and start/end with a letter or number.','Use letters, numbers, hyphens, underscores and periods.','input','error',STORAGE_SOURCES.pathApi)
  if(p.config.architecture.route==='portal'&&!/^[a-z0-9][a-z0-9-]{1,62}[a-z0-9]$/i.test(String(v.name)))add('storagePaths',path.id,'name','Portal guidance uses a narrower 3–64 character name with letters, numbers and hyphens.','Review the selected portal workflow and use its naming constraints.','support','review',STORAGE_SOURCES.paths)
  for(const key of ['customLocation','resourceGroup','cluster','subscription','location'])if(!v[key])add('storagePaths',path.id,key,'Storage path resource context is incomplete.','Record the explicit subscription, region, resource group, cluster and custom location.','input')
  if(!v.apiVersion)add('storagePaths',path.id,'apiVersion','Select an API contract for the storage path.','Record the exact reviewed API version.','qualification')
  else if(v.apiVersion!=='2024-01-01')add('storagePaths',path.id,'apiVersion','This storage-path API version differs from the reviewed reference.','Qualify the selected consumer contract; newer preview versions are not silently substituted.','qualification','review',STORAGE_SOURCES.pathApi)
  if(directory){const token=String(v.cluster).toLowerCase()+'|'+directory;if(uniquePaths.has(token))add('storagePaths',path.id,'directory','Two storage resources declare the same directory on the same cluster.','Resolve resource ownership and retain the existing resource identity.','reference');uniquePaths.set(token,path.id)}
 }
 const luns=activeRecords(p,'luns'),io=activeRecords(p,'ioPaths'),presentations=activeRecords(p,'lunPresentations')
 for(const initiator of activeRecords(p,'initiators')){const v=initiator.values,fabric=find('fabrics',v.fabric),adapter=find('adapters',v.adapter)
  if(adapter&&(adapter.values.node!==v.node||adapter.values.ownership!=='san-io'))add('initiators',initiator.id,'adapter','Initiator must use its own node’s dedicated SAN port.','Correct the node/port ownership.','reference')
  if(fabric?.values.protocol==='fc'&&(!validWwpn(v.identity)||adapter?.values.kind!=='fc-hba'))add('initiators',initiator.id,'identity','FC requires a valid 64-bit WWPN on an FC HBA port.','Record the observed WWPN and HBA mapping.','input')
  if(fabric?.values.protocol==='iscsi'){
   if(!validIqn(v.identity))add('initiators',initiator.id,'identity','iSCSI initiator identity is not a valid IQN/EUI/NAA form.','Record the initiator identity from the node.','input')
   if(adapter&&(adapter.values.kind!=='nic'||adapter.values.network!==fabric.values.network||adapter.values.intent))add('initiators',initiator.id,'adapter','iSCSI needs dedicated physical Ethernet ports on its SAN network, outside ATC.','Correct its port/network mapping.','support','error',STORAGE_SOURCES.external)
   if(!v.persistent)add('initiators',initiator.id,'persistent','Persistent iSCSI session behavior needs review.','Record reconnect behavior and the acceptance check.','input')
  }
 }
 for(const target of activeRecords(p,'targets')){const fabric=find('fabrics',target.values.fabric);if(fabric?.values.protocol==='fc'&&!validWwpn(target.values.identity)||fabric?.values.protocol==='iscsi'&&!validIqn(target.values.identity))add('targets',target.id,'identity','Target identity does not match its fabric protocol.','Use the target WWPN or IQN/EUI/NAA as appropriate.','input')}
 for(const lun of luns){const v=lun.values
  if(v.allocationBasis==='operator-observed'&&!realTimestamp(v.telemetryAt))add('luns',lun.id,'telemetryAt','LUN allocation timestamp is invalid.','Enter the actual UTC observation timestamp.','evidence')
  if(p.config.architecture.storage==='san'&&((v.role==='infrastructure'&&bytes(v.size,v.unit)<250e9)||(v.role==='performance-history'&&bytes(v.size,v.unit)<20e9)))add('luns',lun.id,'size','The platform-role LUN is below the documented minimum.','Plan at least 250 GB for infrastructure and 20 GB for performance history; verify the selected deployment contract.','capacity')
  for(const node of nodes){
   const declared=io.filter(path=>path.values.lun===lun.id&&path.values.node===node.id)
   const tuples=new Set<string>(),adapters=new Set<string>(),fabrics=new Set<string>(),controllers=new Set<string>()
   for(const path of declared){const init=find('initiators',path.values.initiator),target=find('targets',path.values.target),fabric=find('fabrics',init?.values.fabric)
    const key=String(path.values.initiator)+'|'+path.values.target;if(tuples.has(key))add('ioPaths',path.id,'target','Duplicate initiator/target entries do not add independent MPIO paths.','Remove duplicate declarations and map distinct paths.','reference');tuples.add(key)
    if(init?.values.adapter)adapters.add(String(init.values.adapter));if(fabric?.values.failureDomain)fabrics.add(String(fabric.values.failureDomain).toLowerCase());if(target?.values.controller)controllers.add(String(target.values.controller).toLowerCase())
   }
   if(declared.length&&[adapters.size,fabrics.size,controllers.size].some(n=>n<2))add('luns',lun.id,'expectedPaths',`Paths for ${node.values.name||node.id} lack independent port, fabric or controller domains.`,'Record both sides of each failure boundary and qualify vendor failover behavior.','reference')
   const optimized=declared.filter(path=>path.values.observedState==='active-optimized').length
   if(optimized<number(v.minOptimizedPaths))add('luns',lun.id,'minOptimizedPaths',`Observed optimized paths are below the minimum for ${node.values.name||node.id}.`,'Collect MPIO state and review vendor policy. Operator observations are not runtime qualification.','evidence')
   const observations=presentations.filter(r=>r.values.node===node.id&&r.values.lun===lun.id)
   if(observations.length!==1)add('luns',lun.id,'presentation',`LUN presentation on ${node.values.name||node.id} needs one explicit observation.`,'Record visibility, stable identity, size and access for every cluster node.','evidence','review',STORAGE_SOURCES.san)
   for(const observation of observations){const o=observation.values
    if(!o.visible||o.access!=='read-write'||String(o.observedStableId).toLowerCase()!==String(v.stableId).toLowerCase())add('lunPresentations',observation.id,'observedStableId','Observed presentation does not match the required writable LUN identity.','Reconcile masking, identity and access with the SAN owner.','evidence')
    if(bytes(o.observedSize,o.unit)<bytes(v.size,v.unit))add('lunPresentations',observation.id,'observedSize','Observed LUN capacity is smaller than intended.','Reconcile intent and observation before using or expanding the CSV.','evidence')
    if(![512,4096].includes(number(o.sectorBytes))||!realTimestamp(o.observedAt)||!o.evidence)add('lunPresentations',observation.id,'observedAt','Presentation needs sector size, timestamp and evidence reference.','Record the actual per-node observation.','evidence')
   }
  }
  const sectors=new Set(presentations.filter(o=>o.values.lun===lun.id).map(o=>o.values.sectorBytes));if(sectors.size>1)add('luns',lun.id,'presentation','LUN logical sector sizes differ across node observations.','Resolve inconsistent presentation with the array owner.','evidence')
 }
 const placement=storagePlacement(p)
 for(const row of placement.rows)for(const problem of row.problems)add(row.group,row.record,row.group==='workloads'&&(problem.includes('inclusion')||problem.includes('parent')||problem.includes('Parent'))?'storageAccounting':'volume',problem,'Review the backing CSV, linked resource and logical storage reservation.','capacity')
 for(const volume of placement.volumes)if(volume.remainingBytes<0)add('volumes',volume.id,'size','Placed logical workload demand exceeds this CSV size.','Increase this CSV within its source budget or move selected workloads to another qualified CSV.','capacity')
 return findings
}
