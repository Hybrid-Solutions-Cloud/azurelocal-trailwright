import {automationFindings} from './automationHandoff'
import {componentFindings} from './componentRules'
import {networkFindings} from './networkRules'
import {toolkitReview} from './toolkitMapping'
import {ipv4,subnet} from './networkMath'
import {mapArm} from './armMapping'
import {terraformReview} from './terraformContract'
import {ansibleReview} from './ansibleContract'
export {ipv4,subnet} from './networkMath'
import {preparationFindings} from './preparationRules'
import {storageFindings} from './storageRules'
import { activeBranch, fieldApplicable, collections, settings, type Field, type Values } from './catalog'
import type { InventoryRecord, Project } from './project'
export interface Finding { id:string; severity:'error'|'review'|'info'; category:'input'|'support'|'capacity'|'reference'|'preservation'|'qualification'|'evidence'; screen:number; group:string; record:string; field:string; message:string; resolution:string; source?:string }
import {sources,SUPPORT_CATALOG} from './support'
export {sources,SUPPORT_CATALOG} from './support'
import {activeRecord,activeRecords,number,bytes} from './selectors'
import {storageBudgets,resiliencyFactor,volumeCost} from './storage'
export {activeRecord,activeRecords,bytes} from './selectors'
export {storageBudgets,resiliencyFactor} from './storage'
export function computeBudget(p:Project){
 const nodes=activeRecords(p,'nodes'),c=p.config.capacity,reserve=Math.min(number(c.failureReserveNodes),nodes.length)
 const cpu=nodes.map(n=>number(n.values.cores)*Math.max(1,number(n.values.threadsPerCore))*number(c.vcpuRatio)-number(c.osCpu)).sort((a,b)=>b-a)
 const ram=nodes.map(n=>number(n.values.memoryGiB)-number(c.osMemoryGiB)).sort((a,b)=>b-a)
 const management=activeRecords(p,'management').filter(r=>r.values.hosting==='target-cluster')
 const allWorkloads=activeRecords(p,'workloads').filter(r=>r.values.hosting==='target-cluster')
 const linked=new Set(management.map(r=>r.id)),workers=allWorkloads.filter(w=>w.values.role==='aks-worker')
 const included=workers.length?allWorkloads.filter(w=>w.values.computeAccounting==='aks-worker-capacity'):[]
 const includedIds=new Set(included.map(w=>w.id))
 const workloads=allWorkloads.filter(r=>!linked.has(String(r.values.managementComponent))&&!includedIds.has(r.id))
 const demand=(rows:InventoryRecord[],key:string)=>rows.reduce((a,r)=>a+number(r.values[key])*number(r.values.count)/(key==='vcpu'?Math.max(1,number(r.values.cpuDemandRatio)):1),0)
 const managementCpu=management.reduce((a,r)=>a+Math.max(number(r.values.cpu)*number(r.values.count),demand(allWorkloads.filter(w=>w.values.managementComponent===r.id),'vcpu')),0)
 const managementMemory=management.reduce((a,r)=>a+Math.max(number(r.values.memoryGiB)*number(r.values.count),demand(allWorkloads.filter(w=>w.values.managementComponent===r.id),'memoryGiB')),0)
 return {availableVCpu:cpu.slice(reserve).reduce((a,b)=>a+b,0),availableMemoryGiB:ram.slice(reserve).reduce((a,b)=>a+b,0),demandVCpu:demand(workloads,'vcpu')+managementCpu,demandMemoryGiB:demand(workloads,'memoryGiB')+managementMemory,includedServiceVCpu:demand(included,'vcpu'),includedServiceMemoryGiB:demand(included,'memoryGiB'),aksWorkerVCpu:demand(workers,'vcpu'),aksWorkerMemoryGiB:demand(workers,'memoryGiB')}
}
export function dependencyOrder(p:Project){const resources=['management','bootstrapTasks','stages'].flatMap(k=>activeRecords(p,k));const ids=new Set(resources.map(r=>r.id));const remaining=new Set(ids),order:string[][]=[];while(remaining.size){const ready=[...remaining].filter(id=>!activeRecords(p,'dependencies').some(d=>d.values.from===id&&remaining.has(String(d.values.to))));if(!ready.length)break;order.push(ready);ready.forEach(id=>remaining.delete(id))}return {waves:order,cyclicOrBlocked:[...remaining]}}
export function assess(p:Project):Finding[]{
 const findings:Finding[]=[...networkFindings(p),...automationFindings(p)]
 const add=(group:string,record:string,field:string,message:string,resolution:string,category:Finding['category']='input',severity:Finding['severity']='error',source?:string)=>{const screen=((record?collections:settings).find(g=>g.key===group)??collections.find(g=>g.key===group))?.screen??13;findings.push({id:`${group}:${record}:${field}:${findings.length}`,severity,category,screen,group,record,field,message,resolution,source})}
 const require=(group:string,record:string,field:string,message:string)=>add(group,record,field,message,'Enter the value or record the responsible prerequisite owner.')
 const allIds=new Map<string,{group:string;row:InventoryRecord}>();for(const g of collections)for(const row of p.records[g.key])allIds.set(row.id,{group:g.key,row})
 function check(group:string,record:string,v:Values,fields:Field[]){
  for(const f of fields){if(!fieldApplicable(f,v,p.config))continue
   if(f.required&&!v[f.key])require(group,record,f.key,`${f.label} is required.`)
   if(f.type==='reference'&&v[f.key]){const target=allIds.get(String(v[f.key]));if(!target||!f.targets?.includes(target.group)||!activeRecord(target.row)||!activeBranch(collections.find(g=>g.key===target.group)?.branch,p.config))add(group,record,f.key,`${f.label} does not resolve to an active ${f.targets?.join('/')} record.`,'Select a valid record of the required type.','reference')}
  }
  if(v.lifecycle==='existing-preserve'&&!v.existingId)require(group,record,'existingId','Preserved resources require their current immutable identity.')
 }
 for(const g of settings)if(activeBranch(g.branch,p.config))check(g.key,'',p.config[g.key],g.fields)
 for(const g of collections)for(const row of activeRecords(p,g.key))check(g.key,row.id,row.values,g.fields)
 const a=p.config.architecture,sdn=p.config.sdn,nodes=activeRecords(p,'nodes'),count=nodes.length,volumes=activeRecords(p,'volumes')
 if(a.release!=='2604.0.0')add('architecture','','release','This release has no reviewed support catalog.','Select the saved 2604.0.0 baseline or obtain a new release-specific catalog.','support')
 if(a.release==='2604.0.0'){
  if(a.solutionVersion!==SUPPORT_CATALOG.release.solution||String(a.osBuild).replace(/^10\.0\./,'')!==SUPPORT_CATALOG.release.os)add('architecture','','solutionVersion','The entered solution/OS pair differs from the documented 2604 deployment pair.','Review solution 12.2604.1003.1006 with OS 26100.32690, or supply exact servicing-release evidence. Existing observations are not changed.','support','review',sources.knownIssues)
  add('architecture','','supportEvidence','The 2604 known-issues review remains an external deployment prerequisite.','Review current MOC remediation, management-tool versions and recovery restrictions; retain terminal evidence for the actual target.','support','review',sources.knownIssues)
 }
 if(a.topology!=='standard')add('architecture','','topology','Topology requires its own release/storage/fault-domain qualification.','Record rack-aware or existing-topology support evidence; automation remains blocked.','support','review')
 if(p.config.project.environment!=='new-deployment'&&!p.config.project.preservation)require('project','','preservation','Existing environments require an explicit preservation boundary.')
 if(count<1||count>(a.storage==='san'?64:16))add('nodes','','name','Node count is outside the reference architecture range.','Add the intended nodes; SAN-only permits up to 64 and S2D/hybrid up to 16 in the referenced 2604 matrix.','support','error',sources.sanSdn)
 if(a.identity==='local'){
  add('identity','','localUser','Local identity feature status and management tools need exact-release review.','Use the local identity guide and record compatibility evidence; AD preparation is not required for the cluster.','support','review',sources.localOverview)
  if(/^administrator$/i.test(String(p.config.identity.localUser)))add('identity','','localUser','The built-in Administrator cannot be the local deployment account.','Use a separately maintained local administrator.','support','error',sources.local)
  if(!p.config.identity.localAdmin)require('identity','','localAdmin','Local administrator secret reference is missing.')
  if(p.config.identity.vaultPrivateEndpoint)add('identity','','vaultPrivateEndpoint','Cluster deployment using an existing vault with private endpoints is not supported by the reviewed portal guide.','Plan a qualified reachable cluster vault.','support','error',sources.portal)
 }else if(!p.config.identity.deploymentAccount)require('identity','','deploymentAccount','AD deployment account reference is missing.')
 if(sdn.enabled){
  if(a.storage==='san')add('architecture','','storage','SAN-only 2604 uses external SDN; Arc NC/NSG enablement is blocked.','Opt out of Arc SDN and design the external fabric, or use a supported S2D/hybrid architecture.','support','error',sources.sanSdn)
  if(!/^(?:10\.0\.)?26100\.\d+$/.test(String(a.osBuild)))add('architecture','','osBuild','Arc SDN requires a qualified 26100 build or later; the entered build is not qualified by this catalog.','Enter the exact supported OS build and review newer build applicability.','support','error',sources.enableSdn)
  if(sdn.existingState==='onprem-controller')add('sdn','','existingState','On-premises NC conflicts with Arc NC enablement.','Keep the current controller preserved and assess migration separately.','support','error',sources.enableSdn)
  if(sdn.dnsMode==='ad-dynamic'&&a.identity==='local')add('sdn','','dnsMode','Dynamic DNS requires independently verified AD-integrated DNS.','Use static DNS or document a separately qualified AD DNS integration.','support','review',sources.enableSdn)
  for(const f of ['owner','maintenanceWindow','permissionEvidence','dnsOwner'])if(!sdn[f])require('sdn','',f,`SDN ${f} is missing.`)
  if(!sdn.irreversibleAcknowledged)require('sdn','','irreversibleAcknowledged','One-way enablement and maintenance impact must be reviewed.')
  if(sdn.dnsMode==='static'){
   if(!sdn.dnsRecord)require('sdn','','dnsRecord','Static SDN requires a precreated NC DNS record.')
   const management=activeRecords(p,'networks').find(r=>r.values.role==='management'),first=ipv4(management?.values.poolStart)
   if(first===null||ipv4(sdn.reservedIp)!==first+4)add('sdn','','reservedIp','Static NC DNS must resolve to the fifth address in the deployment infrastructure pool.','Record the management pool and its reserved fifth IP.','input','error',sources.enableSdn)
  }
  const intents=activeRecords(p,'intents'),traffic=intents.map(i=>String(i.values.traffic))
  if(intents.length>3||traffic.includes('compute-storage')||(count===1&&traffic.includes('compute'))||(intents.length===3&&[2,3].includes(count)&&a.switching==='switchless'))add('architecture','','networkPattern','The selected intents are excluded by the Arc SDN networking guidance.','Use a documented intent pattern for this node count and connectivity.','support','error',sources.sdn)
  if(traffic.includes('management-compute-storage')&&a.switching==='switchless')add('architecture','','switching','Fully converged traffic requires switched storage connectivity.','Choose switched connectivity.','support','error',sources.sdn)
  // The 1–4 node switchless limit applies with or without SDN and is checked once in componentRules.ts.
 }else {
  if(!sdn.optOutReason)require('sdn','','optOutReason','Record the explicit SDN opt-out reason.')
  if(sdn.existingState==='arc-enabled')add('sdn','','enabled','Changing design intent cannot remove already-enabled Arc SDN.','Preserve its actual state and revise the intended change.','preservation','error',sources.enableSdn)
 }
 for(const row of activeRecords(p,'management')){
  const v=row.values
  if(v.product==='ome'&&v.execution!=='manual')add('management',row.id,'execution','OME appliance deployment remains manual.','Select manual installation and record acceptance.','qualification')
  if(v.requiredBeforeCluster&&v.hosting==='target-cluster')add('management',row.id,'hosting','A prerequisite service cannot depend on the cluster it bootstraps.','Use independently hosted temporary or permanent services.','reference')
  for(const f of ['version','ha','recovery','capacityEvidence'])if(!v[f])require('management',row.id,f,`Management ${f} is unresolved.`)
 }
 const order=dependencyOrder(p);for(const id of order.cyclicOrBlocked){const target=allIds.get(id)!;add(target.group,id,'name','Dependency cycle or dependency on a cycle blocks this resource.','Break the cycle with an independently available prerequisite.','reference')}
 for(const row of activeRecords(p,'nodes')){
  if(ipv4(row.values.managementIp)===null)require('nodes',row.id,'managementIp','A static node management IPv4 is required.')
  for(const f of ['cores','memoryGiB','firmware','sbe','readiness'])if(!row.values[f])require('nodes',row.id,f,`Node ${f} is missing.`)
  if(row.values.osBuild&&row.values.osBuild!==a.osBuild)add('nodes',row.id,'osBuild','Observed OS build differs from selected build.','Reconcile intent and observation; do not treat a design change as an OS update.','evidence')
 }
 function duplicates(key:string,field:string,scope?:(r:InventoryRecord)=>string){const seen=new Set<string>();for(const r of activeRecords(p,key)){const v=String(r.values[field]).toLowerCase();if(!v)continue;const token=(scope?.(r)??'')+'|'+v;if(seen.has(token))add(key,r.id,field,`Duplicate ${field} in the same scope.`,'Use unique identities/addresses within this scope.','reference');seen.add(token)}}
 duplicates('nodes','name');duplicates('nodes','managementIp');duplicates('adapters','port',r=>String(r.values.node));duplicates('adapters','mac');duplicates('luns','stableId');duplicates('volumes','mount');duplicates('storagePaths','directory',r=>String(r.values.volume))
 for(const key of ['networks','logicalNetworks'])for(const row of activeRecords(p,key)){
  const v=row.values,net=subnet(v.cidr),start=ipv4(v.poolStart),end=ipv4(v.poolEnd),gw=ipv4(v.gateway)
  if(!net)add(key,row.id,'cidr','A valid IPv4 CIDR is required.','Enter a CIDR such as 192.0.2.0/24.')
  if(v.poolStart||v.poolEnd){if(start===null||end===null||start>end||!net||start<=net.start||end>=net.end)add(key,row.id,'poolStart','Pool must be ordered and fit inside usable subnet addresses.','Correct start/end and subnet.')}
  if(v.gateway&&(!net||gw===null||gw<=net.start||gw>=net.end))add(key,row.id,'gateway','Gateway is outside the usable subnet.','Correct the gateway or subnet.')
  if(key==='networks'&&v.role==='management'&&start!==null&&end!==null&&end-start+1<6)add(key,row.id,'poolEnd','The deployment infrastructure pool needs at least six addresses.','Expand the contiguous infrastructure pool.','input')
  if(v.rdma==='roce'&&!v.dcb)require(key,row.id,'dcb','RoCE requires reviewed DCB/PFC/ETS configuration.')
 }
 const networks=activeRecords(p,'networks');for(let i=0;i<networks.length;i++)for(let j=i+1;j<networks.length;j++){const a=networks[i],b=networks[j],x=subnet(a.values.cidr),y=subnet(b.values.cidr);if(x&&y&&a.values.routingScope===b.values.routingScope&&x.start<=y.end&&y.start<=x.end)add('networks',b.id,'cidr','Physical subnets overlap in the same routing domain.','Assign disjoint subnets or correct the routing-domain boundary.')}
 for(const port of activeRecords(p,'adapters')){
  if(port.values.ownership==='san-io'&&port.values.intent)add('adapters',port.id,'intent','SAN I/O ports must not be assigned to S2D Network ATC intents.','Remove the ATC mapping and retain dedicated SAN ownership.','support','error',sources.external)
  if(port.values.ownership==='network-atc'&&!port.values.intent)require('adapters',port.id,'intent','Map this ATC port to its intent.')
 }
 for(const intent of activeRecords(p,'intents'))for(const node of nodes){const ports=activeRecords(p,'adapters').filter(r=>r.values.intent===intent.id&&r.values.node===node.id);if(ports.length<2)add('intents',intent.id,'network',`Intent lacks redundant physical mappings on ${node.values.name||node.id}.`,'Map the intended physical ports for every node.','input')}
 for(const media of activeRecords(p,'media')){for(const f of ['expectedHash','observedHash'])if(media.values[f]&&!/^[a-f0-9]{64}$/i.test(String(media.values[f])))require('media',media.id,f,'SHA-256 must contain 64 hexadecimal characters.');if(media.values.expectedHash&&media.values.observedHash&&String(media.values.expectedHash).toLowerCase()!==String(media.values.observedHash).toLowerCase())add('media',media.id,'observedHash','Observed artifact hash differs from the intended artifact.','Verify the source and artifact before use.','evidence')}
 for(const device of activeRecords(p,'devices'))if(device.values.role==='capacity'&&!device.values.eligible)require('devices',device.id,'eligible','Capacity device eligibility is unverified.')
 for(const pool of activeRecords(p,'pools')){const signatures=nodes.map(node=>activeRecords(p,'devices').filter(d=>d.values.pool===pool.id&&d.values.node===node.id&&d.values.role==='capacity').map(d=>`${d.values.media}:${bytes(d.values.size,d.values.unit)}:${d.values.count}`).sort().join('|'));if(new Set(signatures).size>1)add('pools',pool.id,'faultDomains','S2D capacity device inventory is asymmetric across nodes.','Review OEM support and correct incomplete or asymmetric inventory.','support');if(!pool.values.reserveBasis)require('pools',pool.id,'reserveBasis','Repair reserve needs an explicit basis.')}
 if(a.storage!=='s2d')add('architecture','','storage','External storage requires a release/protocol/vendor review.','Confirm release 2604 or later, an array on the Microsoft supported list and the SAN protocol. Microsoft pages still differ on preview versus general availability wording.','support','review',sources.san)
 for(const fabric of activeRecords(p,'fabrics'))if(fabric.values.protocol==='iscsi'&&a.storage==='san')add('fabrics',fabric.id,'protocol','Microsoft pages differ on SAN-only iSCSI status wording (preview versus generally available).','Fibre Channel and iSCSI are both documented for 2604 and later. Record the reviewed support status for this release.','support','review',sources.external)
 for(const lun of activeRecords(p,'luns')){
  const v=lun.values;if(v.existingData&&v.lifecycle==='new')add('luns',lun.id,'lifecycle','Existing data cannot be treated as a new empty LUN.','Preserve the LUN identity and require separate data disposition authorization.','preservation')
  if(!v.dsm||!v.mpioPolicy)require('luns',lun.id,'dsm','DSM version and MPIO policy must be recorded.')
  for(const node of nodes){const paths=activeRecords(p,'ioPaths').filter(r=>r.values.lun===lun.id&&r.values.node===node.id);if(paths.length<number(v.expectedPaths)||paths.length<2)add('luns',lun.id,'expectedPaths',`Insufficient declared SAN I/O paths for ${node.values.name||node.id}.`,'Record independent initiator/fabric/target paths for each node.','reference')}
  if(bytes(v.used,v.unit)>bytes(v.allocated,v.unit)||bytes(v.allocated,v.unit)>bytes(v.size,v.unit))add('luns',lun.id,'allocated','Used, allocated and nominal LUN capacities are inconsistent.','Reconcile measured capacities using the selected unit.','capacity')
 }
 for(const path of activeRecords(p,'ioPaths')){const initiator=allIds.get(String(path.values.initiator))?.row,target=allIds.get(String(path.values.target))?.row,lun=allIds.get(String(path.values.lun))?.row;if(initiator&&initiator.values.node!==path.values.node)add('ioPaths',path.id,'initiator','Initiator belongs to a different node.','Choose this node’s initiator.','reference');if(initiator&&target&&initiator.values.fabric!==target.values.fabric)add('ioPaths',path.id,'target','Initiator and target are on different fabrics.','Map matching fabric endpoints.','reference');if(target&&lun&&target.values.array!==lun.values.array)add('ioPaths',path.id,'target','Target is on a different array from the LUN.','Select a target on the LUN array.','reference')}
 for(const v of volumes){
  if(!v.values.size)require('volumes',v.id,'size','CSV size must be positive.')
  if(v.values.source==='s2d'){
   if(!v.values.pool||v.values.lun)add('volumes',v.id,'pool','S2D CSV needs exactly one S2D pool and no SAN LUN.','Correct its backing source mapping.','reference')
   if(volumeCost(p,v).factor===null)add('volumes',v.id,'resiliency','This resiliency/node-count/tier layout has no qualified capacity factor.','Choose a supported mirror layout or obtain a qualified parity column layout.','support','error',sources.volumes)
  }else {
   if(!v.values.lun||v.values.pool)add('volumes',v.id,'lun','SAN CSV needs exactly one LUN and no S2D pool.','Correct its backing source mapping.','reference')
   if(v.values.filesystem!=='NTFS')add('volumes',v.id,'filesystem','SAN-backed CSVs require NTFS in the reviewed baseline.','Choose NTFS.','support','error',sources.san)
   const lun=allIds.get(String(v.values.lun))?.row;if(lun&&bytes(v.values.size,v.values.unit)>bytes(lun.values.size,lun.values.unit))add('volumes',v.id,'size','CSV capacity exceeds its LUN.','Correct the volume size or LUN design.','capacity')
   if(volumes.filter(x=>x.values.lun===v.values.lun&&x.values.source==='san').length>1)add('volumes',v.id,'lun','Each SAN LUN is dedicated to one CSV.','Assign a separate LUN.','support','error',sources.san)
   if(v.values.provisioning==='thin')add('volumes',v.id,'provisioning','SAN array thin allocation does not qualify thin CSV provisioning.','Use fixed CSV sizing and separately record the LUN’s array provisioning.','support','review')
  }
  if(v.values.provisioning==='thin'&&(!v.values.alertPolicy||number(v.values.maxOvercommit)<1))add('volumes',v.id,'alertPolicy','Thin growth and oversubscription require an explicit capacity policy.','Record alert ownership and a maximum overcommit ratio; distinguish planned allocation from observations.','capacity')
  if(number(v.values.used)>number(v.values.allocated)||number(v.values.allocated)>number(v.values.size))add('volumes',v.id,'allocated','CSV used/allocated/desired values are inconsistent.','Reconcile these distinct measurements.','capacity')
 }
 for(const budget of storageBudgets(p)){if(budget.remainingBytes!==null&&budget.remainingBytes<0)add(budget.source==='s2d'?'pools':'arrays',budget.id,budget.source==='s2d'?'reserveBytes':'capacity','This backing source is overcommitted. Other sources cannot cover this deficit.','Reduce committed demand or add qualified capacity to this source.','capacity');if(!budget.resolved)add(budget.source==='s2d'?'pools':'arrays',budget.id,'evidence','Source headroom is unresolved without layout/allocation evidence.','Provide source-specific layout and telemetry evidence.','capacity','review')}
 for(const path of activeRecords(p,'storagePaths')){if(!/^C:\\ClusterStorage\\[^<>:"|?*]+$/i.test(String(path.values.directory))||String(path.values.directory).split(/[\\/]/).includes('..'))add('storagePaths',path.id,'directory','Storage path requires a valid CSV directory without traversal.','Use an explicit directory under C:\\ClusterStorage.');const siblings=activeRecords(p,'storagePaths').filter(r=>r.values.volume===path.values.volume);if(siblings.length>1&&!path.values.mappingEvidence)add('storagePaths',path.id,'mappingEvidence','Multiple Azure storage paths on a CSV need API-specific mapping qualification.','Record supported directory mapping evidence.','support','review')}
 const priorities=new Set<string>();for(const rule of activeRecords(p,'rules')){const key=`${rule.values.nsg}|${rule.values.direction}|${rule.values.priority}`;if(number(rule.values.priority)<100||priorities.has(key))add('rules',rule.id,'priority','Rule priority must be unique per NSG/direction and between 100 and 4096.','Correct rule ordering.');priorities.add(key)}
 for(const workload of activeRecords(p,'workloads')){
  const v=workload.values,net=allIds.get(String(v.network))?.row,path=allIds.get(String(v.storagePath))?.row
  if(v.kind==='aks'&&net?.values.nsg)add('workloads',workload.id,'network','NSG attachment to AKS workload logical networks is unsupported.','Use a logical network without an NSG for AKS.','support','error',sources.sdn)
  if(path&&v.volume&&path.values.volume!==v.volume)add('workloads',workload.id,'storagePath','Storage path and CSV placements disagree.','Select a path backed by the selected CSV.','reference')
 }
 for(const workload of activeRecords(p,'workloads')){
  if(workload.values.computeAccounting==='aks-worker-capacity'&&!activeRecords(p,'workloads').some(w=>w.values.role==='aks-worker'&&w.values.hosting==='target-cluster'))add('workloads',workload.id,'computeAccounting','No imported or designed AKS workers cover this service. Its compute demand is counted independently.','Import the AKS worker design or keep this service as independent demand.','capacity','review')
  if(workload.values.role==='profile-storage'&&workload.values.hosting==='target-cluster'&&!activeRecords(p,'workloads').some(w=>w.values.role==='sofs'))add('workloads',workload.id,'storageGiB','AVD profiles reference SOFS capacity but no SOFS service design is present.','Import or design the linked SOFS service and its backing storage.','capacity')
 }
 const compute=computeBudget(p);
 if(compute.includedServiceVCpu>compute.aksWorkerVCpu||compute.includedServiceMemoryGiB>compute.aksWorkerMemoryGiB)add('capacity','','vcpuRatio','Service reservations exceed the declared AKS worker capacity.','Increase the relevant worker capacity or revise the service reservations; placement still requires review.','capacity');if(compute.demandVCpu>compute.availableVCpu||compute.demandMemoryGiB>compute.availableMemoryGiB)add('capacity','','failureReserveNodes','Target-cluster demand exceeds compute capacity after reserve.','Review node capacity, management placement and workload sizing.','capacity')
 for(const license of activeRecords(p,'licenses')){if(!license.values.rightsEvidence)require('licenses',license.id,'rightsEvidence','Product selection does not establish entitlement.');if(!license.values.priceReviewed||!license.values.priceSource||!license.values.priceDate||!license.values.currency)add('licenses',license.id,'priceSource','Cost estimate is unresolved without reviewed dated pricing and currency.','Enter a dated quote or explicit reviewed no-charge basis.','input','review')}
 for(const stage of activeRecords(p,'stages')){if(stage.values.handling==='external-consumer')add('stages',stage.id,'consumer','External stage execution requires a pinned and qualified adapter.','Review adapter status; no browser-side execution is available.','qualification','review');if(stage.values.observation==='succeeded'&&!stage.values.evidence)add('stages',stage.id,'evidence','Reported success has no terminal evidence reference.','Attach operator observations; these are not authenticated runtime proof.','evidence');if(!sdn.enabled&&['sdn-enable','sdn-policy'].includes(String(stage.values.kind)))add('stages',stage.id,'kind','SDN execution stages are inactive after explicit opt-out.','Retain for design history; omit from execution.','preservation','info')}
 if(p.sharing)add('project','','name','Sanitized design: private identifiers and evidence were removed.','Restore operational inputs in a private revision before handoff.','input','review')
 return [...findings,...componentFindings(p),...storageFindings(p),...preparationFindings(p),...mapArm(p).findings,...toolkitReview(p).findings,...terraformReview(p).findings.filter(f=>f.id.startsWith('terraform:')),...ansibleReview(p).findings]
}
