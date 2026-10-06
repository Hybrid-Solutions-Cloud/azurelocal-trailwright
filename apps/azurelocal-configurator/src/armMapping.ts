import {collections,settings} from './catalog'
import type {Finding} from './assessment'
import type {Project,InventoryRecord} from './project'
import {activeRecords,number} from './selectors'
import {ipv4,subnet,subnetMask} from './networkMath'
import {ARM_LOCK,templates,parameterFile,validateArmParameters,type Json,type ArmParameter} from './armContract'
import {inspectArmDeployment} from './armDeployment'
export const guid=(s:unknown)=>typeof s==='string'&&/^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/i.test(s)
export const dnsName=(s:unknown)=>typeof s==='string'&&s.length<=253&&s.split('.').every(label=>/^[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?$/i.test(label))
const addressList=(value:unknown)=>String(value).split(/[,;\s]+/).filter(Boolean)
const traffic:Record<string,string[]>={'management-compute':['Management','Compute'],'management-compute-storage':['Management','Compute','Storage'],'compute-storage':['Compute','Storage'],storage:['Storage'],management:['Management'],compute:['Compute']}
export interface ParameterMapping {parameter:string;source:string;recordIds:string[]}
export function mapArm(p:Project){
 const identity:'ad'|'local'=p.config.architecture.identity==='local'?'local':'ad',template=templates[identity],parameters:Record<string,ArmParameter>={},mappings:ParameterMapping[]=[],findings:Finding[]=[]
 const a=p.config.architecture,arm=p.config.arm,azure=p.config.azure,security=p.config.security,nodes=activeRecords(p,'nodes'),intents=activeRecords(p,'intents'),ports=activeRecords(p,'adapters')
 const add=(group:string,record:string,field:string,message:string,resolution:string,category:Finding['category']='qualification',severity:Finding['severity']='error')=>findings.push({id:`arm:${findings.length}:${group}:${record}:${field}`,screen:((record?collections:settings).find(g=>g.key===group)??collections.find(g=>g.key===group))?.screen??1,group,record,field,message,resolution,category,severity})
 const set=(name:string,value:Json,source:string,recordIds:string[]=[])=>{parameters[name]={value};mappings.push({parameter:name,source,recordIds})}
 const fail=(field:string,message:string)=>add('arm','',field,message,'Correct this deployment input or keep the selected branch as a design-only handoff.')
 const find=(key:string,id:unknown)=>activeRecords(p,key).find(r=>r.id===id)
 const resource=(field:string,kind:string)=>{const row=find('azureResources',arm[field]);if(!row||row.values.kind!==kind){fail(field,`Select an active ${kind} resource for ${field}.`);return undefined}return row}
 const namedResource=(field:string,kind:string,pattern:RegExp)=>{const row=resource(field,kind);if(row&&!pattern.test(String(row.values.name)))add('azureResources',row.id,'name','Resource name does not satisfy this ARM consumer.','Use the Azure resource name, not a display label.','input');return row}
 const requested=a.route!=='portal'
 if(!requested)return {requested,identity,parameters,mappings,findings,inspection:null,document:parameterFile(parameters),consumer:ARM_LOCK.templates.find(t=>t.id===identity)!}
 if(p.sharing)fail('qualificationNotes','Sanitized projects do not contain the operational inputs required for ARM exports.')
 if(a.storage==='san')add('architecture','','storage','Neither pinned ARM template contains the SAN-only deployment fields.','Keep the SAN design and qualify its separate release-specific template.','support')
 if(a.topology!=='standard')add('architecture','','topology','These pinned templates do not map rack-aware or existing topology settings.','Use a separately qualified topology contract.','support')
 if(a.intent!=='new'||p.config.project.environment==='existing-cluster')add('architecture','','intent','These templates are not qualified for reuse, extension or assessment of an existing cluster.','Preserve the cluster and use an explicit existing-environment consumer.','preservation')
 if(a.release!=='2604.0.0')add('architecture','','release','ARM mapping is reviewed against the saved 2604 baseline only.','Qualify the selected release before emitting consumer inputs.','support')
 if(azure.cloud==='AzureChinaCloud')add('azure','','cloud','These templates map only public Azure and US Government service endpoints.','Use a separately reviewed sovereign-cloud template.','support')
 if(!guid(azure.tenant)||!guid(azure.subscription))add('azure','','tenant','ARM deployment needs actual tenant and subscription GUIDs.','Replace context labels with the exact target GUIDs.','input')
 if(!azure.region||!azure.resourceGroup)fail('qualificationNotes','Record an explicit deployment region and resource group.')
 if(!/^[a-z][a-z0-9-]{1,13}[a-z0-9]$/i.test(String(azure.clusterName)))add('azure','','clusterName','Cluster name must satisfy the pinned template name and host-name constraints.','Use 3–15 letters/numbers/hyphens, beginning with a letter and ending with a letter or number.','input')
 if(!/^[a-z0-9](?:[a-z0-9-]{0,6}[a-z0-9])?$/i.test(String(arm.namingPrefix)))fail('namingPrefix','Deployment naming prefix must be 1–8 letters/numbers or internal hyphens.')
 if(!guid(arm.hciResourceProviderObjectId))fail('hciResourceProviderObjectId','Record the Azure Local resource provider service principal object GUID.')
 if(!arm.previewApiReviewed)fail('previewApiReviewed','The pinned deploymentSettings API is a preview contract and needs explicit review.')
 if(!arm.templateEffects)fail('templateEffects','Review the template resource changes, role assignments and secret writes with their owners.')
 if(arm.deploymentMode==='Deploy'&&!arm.priorValidation)fail('priorValidation','Deploy requires a prior validation deployment identity and terminal evidence reference.')
 const vault=namedResource('keyVault','key-vault',/^[a-z][a-z0-9-]{1,22}[a-z0-9]$/i),diagnostics=namedResource('diagnosticsAccount','storage-account',/^[a-z0-9]{3,24}$/),witness=namedResource('witnessAccount','storage-account',/^[a-z0-9]{3,24}$/)
 if(azure.witness!=='cloud')add('azure','','witness','Both pinned templates unconditionally declare a witness storage account and secret.','Use the reviewed cloud-witness path or a different qualified template; No Witness and file-share are not safe substitutions.','support')
 for(const row of [vault,diagnostics,witness].filter(Boolean) as InventoryRecord[]){const id=String(row.values.resourceId)
  if(id){const expected=`/subscriptions/${azure.subscription}/resourceGroups/${azure.resourceGroup}/providers/${row.values.kind==='key-vault'?'Microsoft.KeyVault/vaults':'Microsoft.Storage/storageAccounts'}/${row.values.name}`;if(id.toLowerCase()!==expected.toLowerCase())add('azureResources',row.id,'resourceId','This template resolves the resource in the deployment resource group.','Use the exact same-scope resource or a qualified cross-scope template.','reference')}
  if(row.values.region&&row.values.region!==azure.region)add('azureResources',row.id,'region','Template resource region differs from its declared design region.','Reconcile the resource placement.','reference')
 }
 for(const row of [vault,witness,...(vault?.values.lifecycle==='new'?[diagnostics]:[])].filter(Boolean) as InventoryRecord[]){
  if(['existing-preserve','external'].includes(String(row.values.lifecycle)))add('azureResources',row.id,'lifecycle','This template writes this resource or its secrets/role assignments even when it already exists.','Preserve it with a different consumer or explicitly design an owner-reviewed extension.','preservation')
  if(row.values.lifecycle==='extend'&&(!row.values.resourceId||!row.values.configuration))add('azureResources',row.id,'configuration','An extension needs the existing resource ID and an explicit owner-reviewed change boundary.','Record which properties, credentials and role assignments may change.','preservation')
 }
 if(vault?.values.lifecycle==='new')add('arm','','keyVault','The pinned new-vault resource declares enableSoftDelete=false; current service behavior needs review.','Inspect the source conflict and qualify the new-vault branch before deployment.','support','review')
 set('deploymentMode',String(arm.deploymentMode),'config.arm.deploymentMode');set('keyVaultName',String(vault?.values.name??''),'config.arm.keyVault',vault?[vault.id]:[]);set('createNewKeyVault',vault?.values.lifecycle==='new','azureResources.lifecycle',vault?[vault.id]:[])
 set('softDeleteRetentionDays',number(arm.softDeleteRetentionDays),'config.arm.softDeleteRetentionDays');set('diagnosticStorageAccountName',String(diagnostics?.values.name??''),'config.arm.diagnosticsAccount',diagnostics?[diagnostics.id]:[]);set('logsRetentionInDays',number(arm.logsRetentionInDays),'config.arm.logsRetentionInDays');set('storageAccountType','Standard_LRS','Pinned template supported SKU')
 set('clusterName',String(azure.clusterName),'config.azure.clusterName');set('location',String(azure.region),'config.azure.region');set('tenantId',String(azure.tenant),'config.azure.tenant');set('witnessType','Cloud','config.azure.witness (cloud-only contract)');set('clusterWitnessStorageAccountName',String(witness?.values.name??''),'config.arm.witnessAccount',witness?[witness.id]:[])
 const secret=(parameter:string,reference:unknown,source:string)=>{
  const bindings=activeRecords(p,'armSecretBindings').filter(b=>b.values.reference===reference&&reference)
  if(bindings.length!==1){fail('qualificationNotes',`${parameter} requires exactly one explicit ARM credential binding.`);return}
  const binding=bindings[0],v=binding.values,sourceVault=find('azureResources',v.vault)
  if(!sourceVault||sourceVault.values.kind!=='key-vault'||sourceVault.values.lifecycle==='new'||!sourceVault.values.resourceId){add('armSecretBindings',binding.id,'vault','ARM secret resolution needs an existing source Key Vault resource ID.','Select the vault containing the credential before template submission.','reference');return}
  if(!v.permissions)add('armSecretBindings',binding.id,'permissions','Credential binding has no secret-read permission acceptance.','Review ARM template-deployment and secret-read permissions; do not copy the secret value.','evidence')
  const uri=String(reference).match(/^keyvault:\/\/([^/]+)\/([^/]+)(?:\/([^/]+))?$/)
  if(uri&&(uri[1].toLowerCase()!==String(sourceVault.values.name).toLowerCase()||uri[2]!==v.secretName||(uri[3]&&uri[3]!==v.secretVersion)))add('armSecretBindings',binding.id,'reference','Design Key Vault reference and ARM binding disagree.','Select the same source vault, secret name and version.','reference')
  parameters[parameter]={reference:{keyVault:{id:String(sourceVault.values.resourceId)},secretName:String(v.secretName),...(v.secretVersion?{secretVersion:String(v.secretVersion)}:{})}};mappings.push({parameter,source,recordIds:[binding.id,sourceVault.id]})
 }
 const localUser=identity==='local'?p.config.identity.localUser:arm.localAdminUsername,localSecret=identity==='local'?p.config.identity.localAdmin:arm.localAdminSecret
 if(!localUser||/^administrator$/i.test(String(localUser))&&identity==='local')fail('localAdminUsername','Provide a permitted node local administrator username for the selected identity route.')
 set('localAdminUserName',String(localUser),identity==='local'?'config.identity.localUser':'config.arm.localAdminUsername');secret('localAdminPassword',localSecret,identity==='local'?'config.identity.localAdmin':'config.arm.localAdminSecret')
 if(identity==='ad'){
  set('AzureStackLCMAdminUsername',String(p.config.identity.deploymentUser),'config.identity.deploymentUser');secret('AzureStackLCMAdminPassword',p.config.identity.deploymentAccount,'config.identity.deploymentAccount');set('domainFqdn',String(p.config.identity.domain),'config.identity.domain');set('adouPath',String(p.config.identity.ou),'config.identity.ou')
  if(!dnsName(p.config.identity.domain)||!String(p.config.identity.domain).includes('.')||!String(p.config.identity.ou).match(/^OU=.+,DC=/i)||!p.config.identity.deploymentUser)add('identity','','deploymentUser','AD ARM inputs need the prepared domain, OU and deployment username.','Complete the AD-specific inputs and preserve account delegation evidence.','input')
 }else set('identityProvider','LocalIdentity','Selected local-identity template')
 set('hciResourceProviderObjectID',String(arm.hciResourceProviderObjectId),'config.arm.hciResourceProviderObjectId');set('namingPrefix',String(arm.namingPrefix),'config.arm.namingPrefix')
 const nodeNames=new Set<string>(),arcIds=new Set<string>(),ips=new Set<string>()
 for(const node of nodes){const v=node.values,name=String(v.name),id=String(v.arcId),ip=String(v.managementIp)
  if(!/^[a-z][a-z0-9-]{0,13}[a-z0-9]$/i.test(name)||name.toLowerCase()===String(azure.clusterName).toLowerCase()||nodeNames.has(name.toLowerCase()))add('nodes',node.id,'name','Node name is invalid, duplicated or equals the cluster name.','Use unique physical node names that differ from the cluster name.','input');nodeNames.add(name.toLowerCase())
  const expected=`/subscriptions/${azure.subscription}/resourceGroups/${azure.resourceGroup}/providers/Microsoft.HybridCompute/machines/`
  if(!id.toLowerCase().startsWith(expected.toLowerCase())||id.slice(expected.length).includes('/')||!id.slice(expected.length)||arcIds.has(id.toLowerCase()))add('nodes',node.id,'arcId','Arc machine ID must be unique and in this template deployment scope.','Record the exact registered machine ID in the selected subscription/resource group.','reference');arcIds.add(id.toLowerCase())
  if(ipv4(ip)===null||ips.has(ip))add('nodes',node.id,'managementIp','Node management IPv4 is invalid or duplicated.','Correct the static host address.','input');ips.add(ip)
 }
 if(!nodes.length||nodes.length>16)fail('managementNetwork','These S2D-based templates require a reviewed 1–16-node design.')
 set('arcNodeResourceIds',nodes.map(n=>String(n.values.arcId)),'nodes.arcId',nodes.map(n=>n.id));set('physicalNodesSettings',nodes.map(n=>({name:String(n.values.name),ipv4Address:String(n.values.managementIp)})),'nodes.name/managementIp',nodes.map(n=>n.id))
 set('securityLevel',security.profile==='recommended'?'Recommended':'Customized','config.security.profile')
 if(security.profile==='existing')add('security','','profile','Existing security observations cannot be silently converted into a deployment profile.','Choose a deliberate supported security design and review its changes.','preservation')
 for(const key of ['driftControlEnforced','credentialGuardEnforced','smbSigningEnforced','smbClusterEncryption','bitlockerBootVolume','bitlockerDataVolumes','wdacEnforced','streamingDataClient','euLocation','episodicDataUpload'])set(key,(key.startsWith('bitlocker')?security.bitlocker===true:true)&&security[key]===true,`config.security.${key}`)
 set('configurationMode',String(arm.configurationMode),'config.arm.configurationMode')
 if(arm.configurationMode==='unresolved'||!arm.storageHandling)fail('configurationMode','Select the storage creation/preservation mode and its handoff.')
 const volumes=activeRecords(p,'volumes')
 if(arm.configurationMode==='Express'&&volumes.some(v=>v.values.role==='workload'))fail('configurationMode','Express creates automatic workload volumes and cannot promise the explicit CSV plan.')
 if(arm.configurationMode!=='KeepStorage'&&volumes.some(v=>v.values.source==='s2d'&&v.values.lifecycle!=='new'))fail('configurationMode','Existing S2D CSVs need a preservation contract; this creation mode does not qualify it.')
 const net=find('networks',arm.managementNetwork),network=net?subnet(net.values.cidr):null,dns=addressList(p.config.identity.dnsServers)
 if(!net||net.values.role!=='management'||!network)fail('managementNetwork','Select a valid management infrastructure network with a CIDR.')
 if(dns.length===0||dns.some(ip=>ipv4(ip)===null))add('identity','','dnsServers','ARM requires an explicit array of valid DNS IPv4 addresses.','Correct the selected DNS servers.','input')
 const start=ipv4(net?.values.poolStart),end=ipv4(net?.values.poolEnd),gateway=ipv4(net?.values.gateway)
 if(!network||start===null||end===null||start<=network.start||end>=network.end||end-start<5||gateway===null||gateway<=network.start||gateway>=network.end)fail('managementNetwork','Infrastructure pool must contain at least six usable contiguous addresses with an in-subnet gateway.')
 for(const node of nodes){const ip=ipv4(node.values.managementIp);if(ip!==null&&network&&(ip<=network.start||ip>=network.end||start!==null&&end!==null&&ip>=start&&ip<=end))add('nodes',node.id,'managementIp','Host address must be in the management subnet and outside the infrastructure pool.','Correct host or pool addressing.','input')}
 set('subnetMask',network?subnetMask(network.prefix):'','networks.cidr',net?[net.id]:[]);set('defaultGateway',String(net?.values.gateway??''),'networks.gateway',net?[net.id]:[]);set('startingIPAddress',String(net?.values.poolStart??''),'networks.poolStart',net?[net.id]:[]);set('endingIPAddress',String(net?.values.poolEnd??''),'networks.poolEnd',net?[net.id]:[]);set('dnsServers',dns,'config.identity.dnsServers');set('useDhcp',false,'Owned static node and infrastructure address design')
 if(identity==='local'){
  const zones=activeRecords(p,'dnsZones');if(!zones.length)fail('dnsServerConfig','Local identity requires an explicit DNS zone array.')
  for(const zone of zones){if(!dnsName(zone.values.name))add('dnsZones',zone.id,'name','DNS zone is not a valid domain name.','Enter the authoritative cluster DNS namespace.','input');const forwarders=addressList(zone.values.forwarders);if(forwarders.some(v=>ipv4(v)===null)||arm.dnsServerConfig==='UseForwarder'&&!forwarders.length)add('dnsZones',zone.id,'forwarders','DNS forwarders must be valid explicit IPv4 addresses.','Complete forwarder addresses for the selected DNS mode.','input')}
  set('dnsServerConfig',String(arm.dnsServerConfig),'config.arm.dnsServerConfig');set('dnsZones',zones.map(z=>({dnsZoneName:String(z.values.name),dnsForwarder:addressList(z.values.forwarders)})),'dnsZones',zones.map(z=>z.id))
 }
 set('networkingType',nodes.length===1?'singleServerDeployment':a.switching==='switchless'?'switchlessMultiServerDeployment':'switchedMultiServerDeployment','architecture.switching + node count')
 set('networkingPattern',a.networkPattern==='converged'?'hyperConverged':a.networkPattern==='separated'?'convergedManagementCompute':'custom','config.architecture.networkPattern')
 const mappedIntents:Json[]=intents.map(intent=>{const v=intent.values,perNode=nodes.map(node=>ports.filter(port=>port.values.node===node.id&&port.values.intent===intent.id&&port.values.ownership==='network-atc'))
  const names=perNode.map(list=>list.map(port=>String(port.values.osName)).sort((a,b)=>a.toLowerCase().localeCompare(b.toLowerCase()))),first=names[0]??[]
  if(first.length<2||first.some(n=>!n.trim())||names.some(list=>new Set(list.map(n=>n.toLowerCase())).size!==list.length||JSON.stringify(list.map(n=>n.toLowerCase()))!==JSON.stringify(first.map(n=>n.toLowerCase()))))add('intents',intent.id,'name','Every node needs the same explicit redundant OS adapter names for this intent.','Map each physical port to its exact OS adapter name; aliases must be unique on each node.','reference')
  if(perNode.flat().some(port=>port.values.kind!=='nic'))add('intents',intent.id,'name','An FC HBA cannot be a Network ATC intent adapter.','Keep FC ports in SAN I/O ownership.','support')
  const result:Record<string,Json>={name:String(v.name),trafficType:traffic[String(v.traffic)]??[],adapter:first,overrideAdapterProperty:v.overrideAdapterProperty===true,overrideQosPolicy:v.overrideQosPolicy===true,overrideVirtualSwitchConfiguration:v.overrideVirtualSwitch===true}
  if(v.overrideAdapterProperty){result.adapterPropertyOverrides={jumboPacket:String(v.jumboPacket),networkDirect:String(v.networkDirect),networkDirectTechnology:String(v.networkDirectTechnology)};if(!v.jumboPacket||!v.networkDirect||v.networkDirectTechnology==='unresolved')add('intents',intent.id,'jumboPacket','Adapter override is incomplete.','Use exact OEM-qualified override values.','input')}
  if(v.overrideQosPolicy)result.qosPolicyOverrides={bandwidthPercentage_SMB:String(v.bandwidthPercentageSmb),priorityValue8021Action_Cluster:String(v.priorityCluster),priorityValue8021Action_SMB:String(v.prioritySmb)}
  if(v.overrideVirtualSwitch)result.virtualSwitchConfigurationOverrides={enableIov:String(v.enableIov),loadBalancingAlgorithm:String(v.loadBalancingAlgorithm)}
  if((v.overrideAdapterProperty||v.overrideQosPolicy||v.overrideVirtualSwitch)&&!v.overrideEvidence)add('intents',intent.id,'overrideEvidence','Network overrides have no OEM qualification basis.','Record the reviewed configuration and exact supported values.','support')
  return result
 })
 if(!intents.length||intents.length>3)fail('managementNetwork','Map one to three supported Network ATC intents before generating ARM inputs.')
 set('intentList',mappedIntents,'intents + per-node OS adapter mappings',intents.map(i=>i.id))
 const storageNetworks=activeRecords(p,'armStorageNetworks'),addresses=activeRecords(p,'storageAddresses')
 if(arm.enableStorageAutoIp&&addresses.length)add('arm','','enableStorageAutoIp','Explicit storage addresses are retained but omitted while automatic storage addressing is selected.','Review automatic addressing or select explicit per-node addresses.','preservation','info')
 const mappedStorage:Json[]=storageNetworks.map(row=>{const v=row.values,source=find('networks',v.network),cidr=source?subnet(source.values.cidr):null
  if(!source||source.values.role!=='s2d-storage'||!cidr)add('armStorageNetworks',row.id,'network','Deployment storage network must resolve to an S2D storage subnet.','Select a valid S2D network; SAN I/O is a separate design.','reference')
  const usedAddresses=new Set<string>()
  const infos=nodes.map(node=>{const match=addresses.filter(a=>a.values.storageNetwork===row.id&&a.values.node===node.id),ip=match[0]?.values.ip
   if(!ports.some(port=>port.values.node===node.id&&String(port.values.osName).toLowerCase()===String(v.adapterName).toLowerCase()&&port.values.ownership==='network-atc'&&intents.some(i=>i.id===port.values.intent&&String(i.values.traffic).includes('storage'))))add('armStorageNetworks',row.id,'adapterName',`Storage adapter does not resolve on ${node.values.name||node.id}.`,'Use an OS adapter name owned by a storage Network ATC intent on every node.','reference')
   if(!arm.enableStorageAutoIp&&(match.length!==1||ipv4(ip)===null||!cidr||ipv4(ip)!<=cidr.start||ipv4(ip)!>=cidr.end))add('armStorageNetworks',row.id,'network',`Explicit storage addressing is incomplete for ${node.values.name||node.id}.`,'Add exactly one usable address per node and storage network.','input')
   if(!arm.enableStorageAutoIp&&ip&&usedAddresses.has(String(ip)))add('storageAddresses',match[0].id,'ip','Storage IPv4 is duplicated on this storage network.','Give each node a unique usable address.','input');usedAddresses.add(String(ip))
   return {physicalNode:String(node.values.name),ipv4Address:String(ip??''),subnetMask:cidr?subnetMask(cidr.prefix):''}
  })
  return {name:String(v.name),networkAdapterName:String(v.adapterName),vlanId:String(source?.values.vlan??''),...(!arm.enableStorageAutoIp?{storageAdapterIPInfo:infos}:{})}
 })
 if(intents.some(i=>String(i.values.traffic).includes('storage'))&&!storageNetworks.length)fail('enableStorageAutoIp','Storage intents require explicit storage network-to-adapter mappings.')
 set('storageNetworkList',mappedStorage,'armStorageNetworks + storageAddresses',storageNetworks.map(n=>n.id));set('storageConnectivitySwitchless',a.switching==='switchless','config.architecture.switching');set('enableStorageAutoIp',arm.enableStorageAutoIp===true,'config.arm.enableStorageAutoIp');set('customLocation',String(arm.customLocationName),'config.arm.customLocationName')
 set('sbeVersion',String(a.sbeVersion),'config.architecture.sbeVersion');for(const key of ['sbeFamily','sbePublisher','sbeManifestSource','sbeManifestCreationDate'])set(key,String(arm[key]),`config.arm.${key}`)
 const properties=activeRecords(p,'sbeProperties');set('partnerProperties',properties.map(r=>({name:String(r.values.name),value:String(r.values.value)})),'sbeProperties',properties.map(r=>r.id));set('partnerCredentiallist',[],'No secret literals in non-secure template arrays')
 if(activeRecords(p,'sbeCredentials').length)add('sbeCredentials','','name','The pinned partner credential input is a non-secure array and has no qualified reference mapping.','Retain credential requirements and qualify a secret-safe OEM consumer.','qualification')
 for(const error of validateArmParameters(template,parameterFile(parameters)))fail('qualificationNotes',error)
 const inspection=inspectArmDeployment(template,parameters,{cloud:String(azure.cloud),subscription:String(azure.subscription),resourceGroup:String(azure.resourceGroup)})
 for(const issue of inspection.issues)fail(issue.path.includes('sbeManifestCreationDate')?'sbeManifestCreationDate':'qualificationNotes',issue.message)
 return {requested,identity,parameters,mappings,findings,inspection,document:parameterFile(parameters),consumer:ARM_LOCK.templates.find(t=>t.id===identity)!}
}
