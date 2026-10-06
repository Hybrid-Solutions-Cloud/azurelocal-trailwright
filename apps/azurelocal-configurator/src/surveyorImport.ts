import {canonical,newRecord,parseProject,revise,sha256,uid,type Project,type InventoryRecord} from './project'
import {parseSizingSource} from './surveyorProject'
import type {Values} from './catalog'
export type ImportDecision='skip'|'keep'|'replace'
export interface ImportOptions {sourceKey:string;memoryGB:'GB'|'GiB';storageGB:'GB'|'GiB'}
export const DEFAULT_IMPORT_OPTIONS:ImportOptions={sourceKey:'main',memoryGB:'GiB',storageGB:'GiB'}
export interface ImportItem {collection:string;record:InventoryRecord;sourceId:string;sizingFields:string[]}
export interface ImportConflict {collection:string;id:string;name:string;fields:{key:string;current:unknown;incoming:unknown}[]}
export interface ImportGroup {key:string;title:string;records:ImportItem[];config?:Record<string,Values>;source:string;conflicts:ImportConflict[];removed:{id:string;name:string}[]}
export interface ImportPreview {version:string;schema:string;generatedAt:string;sha256:string;projectId:string;projectRevision:number;projectHash:string;projectSnapshot:string;options:ImportOptions;groups:ImportGroup[];limitations:string[]}
const stable=async(group:string,id:string,sourceKey:string)=>`surveyor-${group}-${(await sha256(sourceKey==='main'?id:`${sourceKey}:${id}`)).slice(0,24)}`
const presetCatalog:Record<string,{name:string;cpu:number;memory:number;storage:number;aks:boolean}>={
 'arc-sql-mi-gp':{name:'Arc SQL MI (GP)',cpu:16,memory:64,storage:.5,aks:true},
 'arc-sql-mi-bc':{name:'Arc SQL MI (BC)',cpu:32,memory:128,storage:1,aks:true},
 'arc-iot-operations':{name:'IoT Operations',cpu:12,memory:32,storage:.1,aks:true},
 'arc-ai-foundry-local':{name:'AI Foundry Local',cpu:32,memory:128,storage:.5,aks:true},
 'arc-container-apps':{name:'Container Apps',cpu:8,memory:32,storage:.05,aks:true},
}
export async function previewSurveyor(raw:string,p:Project,options:ImportOptions=DEFAULT_IMPORT_OPTIONS):Promise<ImportPreview>{
 if(!/^[a-zA-Z0-9_-]{1,50}$/.test(options.sourceKey)||!['GB','GiB'].includes(options.memoryGB)||!['GB','GiB'].includes(options.storageGB))throw new Error('Choose a source key and explicit legacy GB unit interpretations')
 const sizingSource=parseSizingSource(raw),plan=sizingSource.plan,input=plan.inputs,out=plan.outputs,groups:ImportGroup[]=[]
 const memory=(n:number)=>n*(options.memoryGB==='GB'?1e9/2**30:1)
 const smallStorage=(n:number)=>n*(options.storageGB==='GB'?1e9/2**30:1)
 const tb=(n:number)=>n*1e12/2**30
 const group=(key:string,title:string,original:unknown)=>{const g:ImportGroup={key,title,records:[],source:canonical({original,unitInterpretation:options,resultBasis:sizingSource.project?'Recalculated with pinned Surveyor 2.8.0 engine':'Frozen source estimates',recalculatedAt:sizingSource.recalculatedAt??null}),conflicts:[],removed:[]};groups.push(g);return g}
 async function item(g:ImportGroup,collection:string,idGroup:string,sourceId:string,values:Values,sizingFields=Object.keys(values)){
  const record=newRecord(collection);record.id=await stable(idGroup,sourceId,options.sourceKey);Object.assign(record.values,values);g.records.push({collection,record,sourceId,sizingFields});return record
 }
 async function workload(g:ImportGroup,idGroup:string,sourceId:string,values:Values){return item(g,'workloads',idGroup,sourceId,values)}
 const hardware=group('hardware','Hardware sizing',input.hardware)
 const nodeIds:string[]=[]
 for(let i=0;i<input.hardware.nodeCount;i++){
  const node=await item(hardware,'nodes','node',String(i),{name:`Sizing node ${i+1}`,cores:input.hardware.coresPerNode,memoryGiB:memory(input.hardware.memoryPerNodeGB),threadsPerCore:input.hardware.hyperthreadingEnabled?2:1},['cores','memoryGiB','threadsPerCore']);nodeIds.push(node.id)
 }
 const drives=group('drives','S2D pool and drive sizing',{hardware:input.hardware,capacity:out.capacity})
 const pool=await item(drives,'pools','pool','sizing-pool',{name:'Imported sizing pool',reserveBytes:out.capacity.reserveTB*1e12,metadataPercent:1,reserveBasis:'Imported Surveyor repair reserve, kept separate from infrastructure CSVs. One percent metadata is a sizing assumption; confirm against the selected release.'})
 for(let i=0;i<nodeIds.length;i++)for(const role of ['capacity','cache'] as const){const count=role==='capacity'?input.hardware.capacityDrivesPerNode:input.hardware.cacheDrivesPerNode;if(!count)continue;const media=role==='capacity'?input.hardware.capacityMediaType:input.hardware.cacheMediaType;if(media==='none')throw new Error('Nonzero cache count cannot use cache media none');await item(drives,'devices',`device-${role}`,String(i),{name:`Sizing node ${i+1} ${role} drives`,node:nodeIds[i],pool:pool.id,role,media,size:role==='capacity'?input.hardware.capacityDriveSizeTB:input.hardware.cacheDriveSizeTB,count,unit:'TB'},['name','role','media','size','count','unit'])}
 const capacity=group('capacity','Compute and reserve settings',{advanced:input.advanced,capacity:out.capacity,compute:out.compute})
 capacity.config={capacity:{vcpuRatio:input.advanced.vCpuOversubscriptionRatio,osCpu:input.advanced.systemReservedVCpus,osMemoryGiB:memory(input.advanced.systemReservedMemoryGB),failureReserveNodes:input.advanced.maintenanceReserveMode==='n+2'?2:input.advanced.maintenanceReserveMode==='n+1'?1:0,sizingBasis:`Surveyor ${plan.surveyorVersion}; memory GB interpreted as ${options.memoryGB}, small storage GB as ${options.storageGB}, explicit TB as decimal. Hardware threads recorded separately. Source outputs remain imported estimates.`}}
 const volumes=group('volumes','Edited volume layout',{volumes:input.volumes,volumeMode:input.volumeMode,volumeSummary:out.volumeSummary})
 for(const v of input.volumes)await item(volumes,'volumes','volume',v.id,{name:v.name,size:v.plannedSizeTB,unit:'TB',provisioning:v.provisioning,resiliency:v.resiliency},['name','size','unit','provisioning','resiliency'])
 const infrastructure=group('infrastructure','Automatic infrastructure volume sizing',{infraVolumeSizeTB:input.advanced.infraVolumeSizeTB,defaultResiliency:input.advanced.defaultResiliency})
 if(input.advanced.infraVolumeSizeTB>0)await item(infrastructure,'volumes','infrastructure','infrastructure-volume',{name:'Infrastructure volume sizing',role:'infrastructure',size:input.advanced.infraVolumeSizeTB,unit:'TB',resiliency:input.advanced.defaultResiliency})
 const vms=group('vms','VM groups',input.virtualMachines)
 if(input.virtualMachines.enabled)for(const vm of input.virtualMachines.groups)await workload(vms,'workload-vm',vm.id,{name:vm.name,count:vm.vmCount,vcpu:vm.vCpusPerVm,cpuDemandRatio:input.virtualMachines.vCpuOvercommitRatio,memoryGiB:memory(vm.memoryPerVmGB),storageGiB:smallStorage(vm.storagePerVmGB)})
 const customs=group('custom','Custom workloads',input.customWorkloads)
 for(const w of input.customWorkloads.filter(x=>x.enabled)){if(!w.vmCount)throw new Error('Enabled custom workloads require a positive instance count');await workload(customs,'workload-custom',w.id,{name:w.name,count:w.vmCount,vcpu:w.vCpusPerVm,memoryGiB:memory(w.memoryPerVmGB),storageGiB:smallStorage(w.osDiskPerVmGB)+tb(w.storageTB)*w.internalMirrorFactor/w.vmCount,performance:w.bandwidthMbps?`${w.bandwidthMbps} Mbps sizing requirement`:'',migration:w.description})}
 const avd=group('avd','AVD host pools and profiles',{enabled:input.avdEnabled,input:input.avd,output:out.avd??null,overrides:input.advanced.overrides})
 if(input.avdEnabled&&out.avd)for(const host of out.avd.pools){if(!Number.isInteger(host.sessionHostCount)||host.sessionHostCount<0)throw new Error('AVD session-host count must be an integer');await workload(avd,'workload-avd',host.id,{name:host.name,count:host.sessionHostCount,kind:'avd',vcpu:host.vCpusPerHost,memoryGiB:memory(host.memoryPerHostGB),storageGiB:smallStorage(host.osDiskPerHostGB+host.dataDiskPerHostGB),performance:`Imported ${host.sizingUsers} sizing users; ${host.usersPerHost} users per host; ${host.limitingFactor} limited.`,guestOS:host.multiSession?'Windows multi-session sizing':'Windows single-session sizing'})
  const profiles=host.profileStorageWithGrowthTB+host.totalOfficeContainerStorageTB
  if(profiles>0){const local=host.profileStorageLocation==='sofs';await workload(avd,'workload-avd-profiles',host.id,{name:`${host.name} profile storage`,kind:'avd',role:'profile-storage',count:1,storageGiB:0,externalStorageGiB:local?0:tb(profiles),hosting:local?'target-cluster':'external',migration:local?'Profile demand is included in the separately imported SOFS backing service. Verify the source linkage and SOFS sizing before placement.':`Profile storage is ${host.profileStorageLocation}; keep it outside the target cluster budget.`})}
 }
 const aks=group('aks','AKS control plane and workers',input.aks)
 if(input.aks.enabled)for(const cluster of input.aks.clusters){await workload(aks,'workload-aks-control',cluster.id,{name:`${cluster.name} control plane`,kind:'aks',role:'aks-control-plane',count:cluster.controlPlaneNodesPerCluster,vcpu:4,memoryGiB:memory(16),storageGiB:smallStorage(cluster.osDiskPerNodeGB)});await workload(aks,'workload-aks-worker',cluster.id,{name:`${cluster.name} workers`,kind:'aks',role:'aks-worker',count:cluster.workerNodesPerCluster,vcpu:cluster.vCpusPerWorker,memoryGiB:memory(cluster.memoryPerWorkerGB),storageGiB:smallStorage(cluster.osDiskPerNodeGB)+(cluster.workerNodesPerCluster?tb(cluster.persistentVolumesTB)/cluster.workerNodesPerCluster:0),migration:'Persistent volume requirement is distributed for aggregate sizing only. Confirm actual PVC placement.'});if(!cluster.workerNodesPerCluster&&cluster.persistentVolumesTB>0)throw new Error('AKS PVC demand has no worker nodes')}
 const sofs=group('sofs','SOFS service and internal storage',{enabled:input.sofsEnabled,input:input.sofs,output:out.sofs??null,overrides:input.advanced.overrides})
 if(input.sofsEnabled&&out.sofs){const n=input.sofs.sofsGuestVmCount;if(!n)throw new Error('Enabled SOFS requires guest VMs');await workload(sofs,'workload-sofs','sofs',{name:'SOFS service',kind:'management',role:'sofs',count:n,vcpu:input.sofs.sofsVCpusPerVm,memoryGiB:memory(input.sofs.sofsMemoryPerVmGB),storageGiB:smallStorage(input.sofs.sofsOsDiskPerVmGB)+tb(out.sofs.internalFootprintTB)/n,availability:`${n} guest VMs; ${input.sofs.volumeLayout} storage layout. Internal ${input.sofs.internalMirror} overhead already included; apply outer CSV resiliency separately.`})}
 const mabs=group('mabs','MABS service and internal storage',{enabled:input.mabsEnabled,input:input.mabs,output:out.mabs??null})
 if(input.mabsEnabled&&out.mabs)await workload(mabs,'workload-mabs','mabs',{name:'MABS service',kind:'management',role:'mabs',count:1,vcpu:out.mabs.mabsVCpus,memoryGiB:memory(out.mabs.mabsMemoryGB),storageGiB:smallStorage(input.mabs.mabsOsDiskGB)+tb(out.mabs.internalFootprintTB),backup:`Protected ${input.mabs.protectedDataTB} TB; ${input.mabs.onPremRetentionDays} retention days; internal ${input.mabs.internalMirror} already included.`})
 const services=group('services','Platform service reservations',input.servicePresets)
 for(const preset of input.servicePresets.filter(x=>x.enabled)){const c=presetCatalog[preset.catalogId];if(!c)throw new Error(`Unknown service preset ${preset.catalogId}; preserve the source file for a new contract review`);await workload(services,'workload-service',preset.id,{name:c.name,role:'platform-service',count:preset.instanceCount,vcpu:preset.vCpusOverride??c.cpu,memoryGiB:memory(preset.memoryGBOverride??c.memory),storageGiB:tb(preset.storageTBOverride??c.storage),computeAccounting:input.aks.enabled&&c.aks?'aks-worker-capacity':'own-demand',migration:`Source preset ${preset.catalogId}. Defaults are source sizing assumptions, not a current support or licensing claim.`})}
 if(plan.surveyorVersion==='2.8.0'){
  const inventory=group('inventory','Individual VM inventory and measurements',{inventory:plan.inputs.inventory??[],settings:plan.inputs.inventorySettings??null,sources:plan.inputs.inventorySources??[],output:plan.outputs.inventory??null})
  const settings=plan.inputs.inventorySettings??{sizingBasis:'allocation',storageBasis:'provisioned',comfortFactor:1.25,growthPct:0}
  for(const vm of (plan.inputs.inventory??[]).filter(vm=>vm.include)){const growth=1+settings.growthPct/100;const factor=(value:number|undefined)=>settings.sizingBasis==='measured-p95'&&value!==undefined?Math.max(.05,value/100*settings.comfortFactor):1;await workload(inventory,'workload-inventory',vm.id,{name:vm.name,kind:'vm',role:'inventory',count:1,vcpu:vm.vCpu*factor(vm.measurement?.cpuP95Pct)*growth,memoryGiB:vm.memoryGiB*factor(vm.measurement?.memoryP95Pct)*growth,storageGiB:(settings.storageBasis==='consumed'?vm.consumedGiB:vm.provisionedGiB)*growth,guestOS:vm.guestOs,performance:vm.measurement?canonical(vm.measurement):'No measured performance supplied; allocation fallback.',migration:`Imported source ${vm.sourceCluster}/${vm.sourceHost}. ${settings.sizingBasis} and ${settings.storageBasis}; source power ${vm.powerState}; source reviewed=${vm.reviewed}. This is a sizing proposal; original allocations and observations remain in provenance.`})}
 }
 if(sizingSource.project){
  group('project-source','Original Surveyor project inputs and metadata',sizingSource.project)
  const legacy=group('legacy-workloads','Legacy workload rows (review for overlap)',sizingSource.project.inputs.workloads)
  const ids=new Set<string>();for(const w of sizingSource.project.inputs.workloads){if(ids.has(w.id)||!w.id.trim())throw new Error('Legacy workloads have duplicate or invalid IDs');ids.add(w.id);await workload(legacy,'workload-legacy',w.id,{name:w.name,count:w.vmCount,vcpu:w.vCpusPerVm,memoryGiB:memory(w.memoryPerVmGB),storageGiB:smallStorage(w.storagePerVmGB),availability:`Source legacy resiliency ${w.resiliency}; confirm backing volume.`,migration:'Legacy row excluded by the source current planning totals. Import only after reviewing overlap with other scenarios.'})}
 }
 group('source-results',sizingSource.project?'Recalculated sizing results and assumptions':'Frozen source results and assumptions',{outputs:out,provenance:plan.provenance})
 for(const g of groups){
  for(const x of g.records){const current=p.records[x.collection].find(r=>r.id===x.record.id);if(current){const fields=x.sizingFields.filter(k=>current.values[k]!==x.record.values[k]).map(key=>({key,current:current.values[key],incoming:x.record.values[key]}));g.conflicts.push({collection:x.collection,id:current.id,name:String(current.values.name||current.id),fields})}}
  if(g.config)for(const [key,values]of Object.entries(g.config)){const fields=Object.entries(values).filter(([k,v])=>v!==p.config[key][k]).map(([key2,incoming])=>({key:key2,current:p.config[key][key2],incoming}));if(fields.length)g.conflicts.push({collection:`config.${key}`,id:key,name:'Current capacity settings',fields})}
  const previous=p.provenance.filter(s=>s.source===`azurelocal-surveyor:${options.sourceKey}`&&s.group===g.key).at(-1)
  const newIds=new Set(g.records.map(x=>x.record.id));for(const id of previous?.recordIds??[]){const row=Object.values(p.records).flat().find(r=>r.id===id);if(row&&!newIds.has(id))g.removed.push({id,name:String(row.values.name||id)})}
 }
 const probe=structuredClone(p);for(const g of groups){for(const x of g.records)probe.records[x.collection]=[...probe.records[x.collection].filter(r=>r.id!==x.record.id),x.record];if(g.config)for(const [k,v]of Object.entries(g.config))Object.assign(probe.config[k],v)}parseProject(canonical(probe))
 return {version:plan.surveyorVersion,schema:sizingSource.project?'project:1/state:10':'1.0',generatedAt:plan.generatedAt,sha256:await sha256(raw),projectId:p.id,projectRevision:p.revision,projectHash:await sha256(canonical(p)),projectSnapshot:canonical(p),options,groups,limitations:[
 sizingSource.project?'This Surveyor project contains inputs only. Proposed results were recalculated locally with the pinned source sizing engine; they are not frozen source results. Original planning metadata remains a separate import group.':'This SurveyorPlan includes frozen source estimates, kept separate from recalculated Configurator budgets.',
 'Imported values describe sizing intent. They do not establish hardware certification, resource existence or verified runtime state.',
 `Legacy fields labelled GB use the visible import choices: RAM ${options.memoryGB}; small disks ${options.storageGB}. Explicit TB values use decimal TB; explicit inventory GiB stays binary. Original values and frozen results are retained separately.`,
 'Source TB results include rounded and legacy /1024 calculations. Recalculated byte budgets can differ; review the original source assumptions before accepting capacity.',
 'Source namespace identifies a reimport stream. Use another key for an unrelated sizing plan. Missing source rows are retained for explicit inventory review.',
 'No CSV is assigned to a pool/LUN or workload by name. Imported automatic infrastructure sizing is separate from workload CSVs; review any existing manually entered equivalents.',
 ]}
}
export function mergeSurveyor(p:Project,preview:ImportPreview,choices:Record<string,ImportDecision>,now=new Date().toISOString()):Project{
 if(p.id!==preview.projectId||p.revision!==preview.projectRevision||canonical(p)!==preview.projectSnapshot)throw new Error('The project changed after import preview. Reopen the source file to review current conflicts.')
 const next=structuredClone(p),source=`azurelocal-surveyor:${preview.options.sourceKey}`
 for(const g of preview.groups){const choice=choices[g.key]??'skip';if(choice==='skip')continue;const ids:string[]=[],mappings:unknown[]=[]
  for(const x of g.records){const recordChoice=choices[`${x.collection}:${x.record.id}`]??choice,index=next.records[x.collection].findIndex(r=>r.id===x.record.id)
   if(recordChoice==='skip'||index>=0&&recordChoice==='keep'){mappings.push({sourceId:x.sourceId,targetId:x.record.id,collection:x.collection,decision:'retained-current'});continue}
   if(index>=0){const merged=structuredClone(next.records[x.collection][index]);for(const f of x.sizingFields)merged.values[f]=x.record.values[f];next.records[x.collection][index]=merged}else next.records[x.collection].push(structuredClone(x.record))
   ids.push(x.record.id);mappings.push({sourceId:x.sourceId,targetId:x.record.id,collection:x.collection,decision:index<0?'added':'updated-sizing'})
  }
  if(g.config&&choice==='replace')for(const [key,values]of Object.entries(g.config))Object.assign(next.config[key],values)
  if(g.config&&choice==='keep')mappings.push({configuration:'retained-current'})
  const original=canonical({snapshot:JSON.parse(g.source),sourceRecordMappings:mappings,missingSourceRowsRetained:g.removed})
  // Keep earlier source receipts: a new source does not rewrite provenance for values retained from the previous import.
  if(ids.length||g.config&&choice==='replace'||!g.records.length&&!g.config)next.provenance.push({id:uid(),source,schema:preview.schema,version:preview.version,sha256:preview.sha256,generatedAt:preview.generatedAt,importedAt:now,group:g.key,recordIds:ids,original})
 }
 if(canonical(next)===canonical(p))return p
 return parseProject(canonical(revise(next,now)))
}
