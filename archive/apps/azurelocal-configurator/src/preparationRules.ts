import {collections,settings} from './catalog'
import type {Finding} from './assessment'
import type {Project} from './project'
import {activeRecords,number} from './selectors'
import {managementCapacity,preparationGraph,serviceNeedsCompute} from './preparation'
import {sources} from './support'

export const validTimestamp=(v:unknown)=>{if(typeof v!=='string'||!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{3})?Z$/.test(v))return false;const n=new Date(v);return Number.isFinite(n.getTime())&&n.toISOString().replace('.000Z','Z')===v.replace('.000Z','Z')}
export const exactVersion=(v:unknown)=>typeof v==='string'&&/^\d+\.\d+\.\d+(?:\.\d+)?(?:-[0-9A-Za-z.-]+)?$/.test(v)
export function preparationFindings(p:Project):Finding[]{
 const out:Finding[]=[]
 const add=(group:string,record:string,field:string,message:string,resolution:string,category:Finding['category']='input',severity:Finding['severity']='error',source?:string)=>out.push({id:`preparation:${out.length}:${group}:${record}:${field}`,group,record,field,screen:((record?collections:settings).find(g=>g.key===group)??collections.find(g=>g.key===group))?.screen??3,message,resolution,category,severity,source})
 const required=(group:string,id:string,values:Record<string,unknown>,fields:string[],reason:string)=>{for(const field of fields)if(!values[field])add(group,id,field,reason,`Complete ${field} and record who accepts it.`)}
 const find=(group:string,id:unknown)=>activeRecords(p,group).find(r=>r.id===id)
 const services=activeRecords(p,'management'),hosts=activeRecords(p,'managementHosts'),b=p.config.bootstrap,auto=b.mode!=='manual-operator'
 for(const row of services){const v=row.values
  required('management',row.id,v,['acceptanceOwner','acceptance','availabilityOwner','maintenance'], 'Management service readiness and ownership are incomplete.')
  if(v.lifecycle!=='new')required('management',row.id,v,['existingId','endpoint','evidence'],'Reused or externally provided management needs identity, endpoint and acceptance evidence.')
  if(serviceNeedsCompute(row)){
   required('management',row.id,v,['count','cpu','memoryGiB','diskGiB','image'],'Hosted management capacity and image are incomplete.')
   if(v.hosting!=='target-cluster'&&!v.hostingResource)add('management',row.id,'hostingResource','Hosted management needs a separate independent hosting record.','Select Azure IaaS, independent virtualization or physical hosting with a capacity basis.','reference')
   if(number(v.minimumAvailable)>number(v.count)-number(v.reservedFailureInstances))add('management',row.id,'minimumAvailable','The service cannot meet its minimum surviving instance count.','Increase instances or reconcile the failure/maintenance reserve.','capacity')
   if(number(v.reservedFailureInstances)>0&&!v.failureDomains)add('management',row.id,'failureDomains','Availability reserve needs distinct failure-domain placement.','Record separate hosts/zones/racks and qualify recovery.','capacity')
  }
  const host=find('managementHosts',v.hostingResource)
  if(host&&v.hosting!==host.values.platform)add('management',row.id,'hostingResource','Service hosting choice and independent hosting platform disagree.','Select the matching platform or correct the component location.','reference')
  if(v.requiredBeforeCluster&&host&&!host.values.availableBeforeCluster)add('management',row.id,'hostingResource','The prerequisite host is not planned to be available before deployment.','Provide an independent predeployment host or revise the prerequisite.','reference')
  if(v.phase==='temporary-bootstrap'){
   const final=find('management',v.finalComponent)
   if(!final||final.id===row.id||final.values.phase!=='permanent')add('management',row.id,'finalComponent','Temporary service needs a distinct permanent replacement record.','Create or select permanent management; retain separate capacity and acceptance.','reference')
   if(!activeRecords(p,'bootstrapExits').some(e=>e.values.temporaryService===row.id))add('management',row.id,'finalComponent','Temporary management has no explicit exit plan.','Add credential rotation, access removal, disposition and final acceptance in Bootstrap and access.','preservation')
  }
  if(v.product==='ad-dns')required('management',row.id,v,['directoryDomain','directorySite','replicationOwner','directoryRecovery'],'Selected directory services need replication and recovery design.')
  if(v.product==='wac'){
   required('management',row.id,v,['certificate','accessGroups'],'A WAC gateway needs a certificate and access groups.')
   if(v.targetEstate==='azure-local-cluster'&&p.config.architecture.identity==='local')add('management',row.id,'targetEstate','WAC cannot administer the selected local-identity cluster.','Use a supported administration method, or explicitly scope WAC to a separate compatible estate.','support','error',sources.localOverview)
  }
  if(v.product==='ome')required('management',row.id,v,['manualHandoff','license'],'OME needs its manual appliance, licensing and support handoff.')
  if(v.product==='monitoring'||v.product==='ndm')required('management',row.id,v,['alertRoute'],'Monitoring needs a routed alert and accountable receiver.')
 }
 for(const row of hosts){const v=row.values
  required('managementHosts',row.id,v,['platformVersion','failureDomain','capacityReference','recovery'],'Independent hosting needs capacity, failure-domain and recovery evidence.')
  if(v.capacityBasis==='operator-observed'&&!validTimestamp(v.observedAt))add('managementHosts',row.id,'observedAt','Observed hosting capacity needs a real UTC timestamp.','Record when the operator inspected the available capacity.','evidence')
 }
 for(const budget of managementCapacity(p))for(const [available,demand,field]of [[budget.availableCpu,budget.cpu,'availableCpu'],[budget.availableMemoryGiB,budget.memoryGiB,'availableMemoryGiB'],[budget.availableDiskGiB,budget.diskGiB,'availableDiskGiB']] as const)if(demand>available)add('managementHosts',budget.id,field,'Management demand exceeds this independent host capacity.','Add qualified capacity or move services; target-cluster capacity cannot cover this host deficit.','capacity')
 for(const row of activeRecords(p,'managementBindings')){const v=row.values,r=Object.values(p.records).flat().find(r=>r.id===v.resource),group=collections.find(g=>p.records[g.key].some(r=>r.id===v.resource))?.key
  if(r&&((v.role==='identity'&&group!=='identities')||(v.role==='certificate'&&group!=='certificates')||(!['identity','certificate'].includes(String(v.role))&&(group!=='azureResources'||r.values.kind!==v.role))))add('managementBindings',row.id,'resource','Bound resource kind does not match the selected purpose.','Choose the corresponding Azure resource, identity or certificate.','reference')
 }
 required('bootstrap','',b,['runnerHost','acceptanceOwner','reachability','proxyTrust'],'Bootstrap needs an independent workstation/runner and access acceptance.')
 if(auto)for(const [key,product]of [['runnerComponent','runner'],['artifactComponent','artifact-store'],['secretComponent','secret-store']] as const){const service=find('management',b[key]);if(service&&service.values.product!==product)add('bootstrap','',key,`Bootstrap ${key} points to the wrong service category.`,`Select a ${product} component.`, 'reference')}
 const runner=find('managementHosts',b.runnerHost)
 if(runner&&!runner.values.availableBeforeCluster)add('bootstrap','','runnerHost','The bootstrap execution host is not planned available before the cluster.','Provide an independent execution host with accepted reachability.','reference')
 if(auto){
  required('bootstrap','',b,['repository','ref','runnerPool','serviceIdentity','rbacScope','permissions','consentOwner','rotationOwner'],'Automation access, identity or permission ownership is incomplete.')
  if(!/^https:\/\/[^\s/?#]+(?:\/[^\s]*)?$/.test(String(b.repository)))add('bootstrap','','repository','Automation repository must be an explicit HTTPS repository URL.','Enter the reviewed repository URL without embedded credentials.')
  if(b.accessReview!=='operator-reported'||!validTimestamp(b.permissionReviewAt))add('bootstrap','','accessReview','Identity permission reuse has not been explicitly reviewed.','Record least necessary roles/scope and a dated operator permission review; preserve the existing identity.','evidence')
  const identity=find('identities',b.serviceIdentity)
  if(identity&&identity.values.lifecycle!=='new'&&!identity.values.reuse)add('identities',identity.id,'reuse','Reused automation identity needs verification of existing permissions.','Inspect the existing principal and scope; do not delete or recreate it.','preservation')
  if(b.authentication==='operator')add('bootstrap','','authentication','Unattended automation cannot rely on an unspecified interactive operator session.','Select a supported runtime authentication contract or use manual preparation.','qualification')
  if(b.authentication==='federated')required('bootstrap','',b,['federationIssuer','federationSubject','federationAudience'],'Federated authentication needs an explicit trust binding.')
  if(b.authentication==='certificate')required('bootstrap','',b,['authCertificate'],'Certificate authentication needs a linked certificate contract.')
  if(b.authentication==='secret-reference')required('bootstrap','',b,['credentialRef','expiry'],'Secret authentication needs a runtime reference and expiry.')
  if(b.authentication==='managed-identity'&&identity&&identity.values.kind!=='managed-identity')add('bootstrap','','serviceIdentity','Managed-identity authentication requires a managed-identity principal.','Select the matching identity and verify its runtime availability.','reference')
 }
 if(b.runnerOS==='windows'&&(!exactVersion(b.powershellVersion)||!String(b.powershellVersion).startsWith('7.')))add('bootstrap','','powershellVersion','Native Windows preparation requires an exact PowerShell 7 version.','Pin the version used by the selected scripts and modules.','qualification')
 if(!exactVersion(b.azureCliVersion))add('bootstrap','','azureCliVersion','Azure CLI requires an exact reviewed version.','Record the tool version used by the deployment consumer.','qualification')
 if(b.runnerOS==='external-linux')add('bootstrap','','runnerOS','Linux execution is a separate external consumer; local WSL is not part of this workflow.','Declare and qualify its host, tools and playbooks.','qualification','review')
 for(const row of activeRecords(p,'toolPins')){const v=row.values
  if(!exactVersion(v.version))add('toolPins',row.id,'version','Toolchain pins must be exact versions, not ranges or latest.','Record the precise installed package/module version.','qualification')
  if(v.kind==='powershell'&&!String(v.version).startsWith('7.'))add('toolPins',row.id,'version','This workflow requires PowerShell 7 for its native script consumer.','Select and qualify an exact PowerShell 7 release.','qualification')
  if(v.sha256&&!/^[a-f0-9]{64}$/i.test(String(v.sha256)))add('toolPins',row.id,'sha256','Artifact SHA-256 must be 64 hexadecimal characters.','Use the expected digest from the approved source.','evidence')
  required('toolPins',row.id,v,['source','contract','verification'],'Toolchain source and consumer verification are incomplete.')
  if(v.executor===b.runnerHost&&v.operatingSystem!==b.runnerOS)add('toolPins',row.id,'operatingSystem','Pinned tool OS differs from the selected bootstrap runner OS.','Select the correct executor and operating system.','qualification')
  if(v.executor===b.runnerHost&&((v.kind==='powershell'&&v.version!==b.powershellVersion)||(v.kind==='azure-cli'&&v.version!==b.azureCliVersion)))add('toolPins',row.id,'version','Tool pin and bootstrap version disagree.','Use the same exact consumer-qualified version in both records.','qualification')
 }
 for(const row of activeRecords(p,'accessChecks')){const v=row.values
  required('accessChecks',row.id,v,['acceptance','requiredScope'],'Access check needs an expected result and least necessary scope.')
  if(v.observation!=='unverified'&&(!validTimestamp(v.observedAt)||!v.evidence))add('accessChecks',row.id,'observedAt','Access observations need a timestamp and retained reference.','Record the actual check time and evidence; this is not native deployment qualification.','evidence')
  if(v.observation==='unreachable')add('accessChecks',row.id,'target','The operator reported this required access path unreachable.','Resolve network, DNS, trust or permission access before the dependent preparation.','evidence')
 }
 for(const row of activeRecords(p,'bootstrapTasks')){const v=row.values
  required('bootstrapTasks',row.id,v,['executorHost','method','requirements','acceptance'],'Preparation task needs independent execution and acceptance.')
  if(v.handling==='external-consumer'&&!v.consumer)add('bootstrapTasks',row.id,'consumer','External preparation has no pinned consumer.','Declare the exact script/module/playbook and input contract.','qualification')
  if(v.kind==='node'){
   required('bootstrapTasks',row.id,v,['node','media','credential','bootSetup','timeDns','firmwareAcceptance','arcAcceptance'],'Node bootstrap media, access or readiness is incomplete.')
   if(v.bmcMethod==='unresolved')add('bootstrapTasks',row.id,'bmcMethod','Node bootstrap needs an explicit BMC preparation method.','Select manual console, virtual media or a separately qualified Redfish consumer.')
  }
 }
 for(const row of activeRecords(p,'bootstrapExits')){const v=row.values,temp=find('management',v.temporaryService),final=find('management',v.permanentService)
  if(temp&&temp.values.phase!=='temporary-bootstrap'||final&&final.values.phase!=='permanent'||v.temporaryService===v.permanentService)add('bootstrapExits',row.id,'permanentService','Exit must connect a temporary service to a distinct permanent service.','Correct the two service records and their phases.','reference')
  if(temp?.values.finalComponent&&temp.values.finalComponent!==v.permanentService)add('bootstrapExits',row.id,'permanentService','Exit plan and temporary-service replacement disagree.','Select the same permanent replacement.','reference')
  required('bootstrapExits',row.id,v,['permanentAcceptance','credentialRotation','accessRemoval','recovery'],'Temporary service exit acceptance and recovery are incomplete.')
  if(v.disposition==='unresolved')add('bootstrapExits',row.id,'disposition','Temporary resource disposition remains unresolved.','Plan retention, return or decommission after permanent acceptance.','preservation')
  if(v.observation!=='not-started'&&(!validTimestamp(v.observedAt)||!v.evidence))add('bootstrapExits',row.id,'observedAt','Handover observations need a real timestamp and reference.','Keep final operator evidence separate from design acceptance criteria.','evidence')
 }
 const graph=preparationGraph(p)
 for(const id of graph.blocked){const resource=graph.resources.find(r=>r.id===id)!;if(!id.startsWith('system:'))add(resource.group,id,'name','The inferred preparation graph has a cycle or missing prerequisite.','Review service hosting, declared dependencies and bootstrap bindings.','reference')}
 if(graph.blocked.includes('system:bootstrap'))add('bootstrap','','runnerHost','Bootstrap cannot become available independently with these dependencies.','Move prerequisite services to independent hosting and resolve the displayed graph.','reference')
 return out
}
