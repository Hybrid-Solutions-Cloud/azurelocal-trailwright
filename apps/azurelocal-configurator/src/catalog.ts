/** Owned field contracts drive parsing, forms and schedules. A field is never accepted merely because it exists in an imported file. */
import {applyHelp} from './help'
export type Value = string | number | boolean
export type Values = Record<string, Value>
export type BranchName = 'ad' | 'local' | 's2d' | 'san' | 'sdn' | 'arm' | 'dsc'
/** A component gate: active when config[group][key] is one of values. A list of gates is active only when every gate is active. */
export interface Gate { group: string; key: string; values: Value[] }
export type Branch = BranchName | Gate[]
export interface Field { since?: number; optionSince?:Record<string,number>; when?:Record<string,Value[]>; key: string; label: string; type: 'text' | 'number' | 'boolean' | 'select' | 'reference' | 'secret' | 'notes'; options?: string[]; targets?: string[]; required?: boolean; min?: number; max?: number; integer?: boolean; default?: Value; branch?: Branch; help?: string; public?: boolean }
export interface Group { since?:number; key: string; title: string; screen: number; fields: Field[]; branch?: Branch; help?: string }
const t = (key: string, label: string, required = false): Field => ({ key, label, type: 'text', required })
const m = (key: string, label: string): Field => ({ key, label, type: 'notes' })
const n = (key: string, label: string, max = 1e9, integer = false): Field => ({ key, label, type: 'number', min: 0, max, integer })
const b = (key: string, label: string, value = false): Field => ({ key, label, type: 'boolean', default: value, public: true })
const s = (key: string, label: string, options: string[], value = options[0]): Field => ({ key, label, type: 'select', options, default: value, public: true })
const r = (key: string, label: string, targets: string[], required = false): Field => ({ key, label, type: 'reference', targets, required, public: true })
const secret = (key: string, label: string): Field => ({ key, label, type: 'secret', help: 'Reference only: secret-ref://store/name or keyvault://vault/secret. Never enter the secret value.' })
const unit = () => s('unit', 'Capacity unit', ['GB', 'GiB', 'TB', 'TiB'], 'TB')
const life = () => s('lifecycle', 'Lifecycle', ['new', 'existing-preserve', 'extend', 'external', 'not-required'])
const owner = () => t('owner', 'Responsible owner', true)
const evidence = () => m('evidence', 'Operator-supplied evidence reference')
const common = (): Field[] => [t('name', 'Name', true), life(), owner(), t('existingId', 'Existing immutable identity'), evidence()]
export const screens = [
  ['Project and import', 'Start from a new design, a supported sizing plan, or an existing environment.'],
  ['Architecture and deployment', 'Choose intent. Support and consumer qualification are evaluated separately.'],
  ['TierPoint management', 'Define each service, its owner, hosting and prerequisites.'],
  ['Bootstrap and access', 'Plan independent access and node preparation before the target cluster exists.'],
  ['Azure foundation', 'Record Azure resources, connectivity and least necessary access.'],
  ['Identity and security', 'Prepare the selected identity model and common security requirements.'],
  ['Nodes and physical readiness', 'Inventory physical nodes, firmware, media and readiness evidence.'],
  ['Host networking', 'Map Network ATC intents to physical ports. Keep SAN I/O ownership separate.'],
  ['Storage sources', 'Model S2D pools and SAN resources with independent capacity budgets.'],
  ['CSVs and storage paths', 'A CSV, Azure storage path and SAN I/O path are different objects.'],
  ['Azure Local SDN', 'Arc-managed Network Controller runs as a cluster service. Enablement cannot be undone here.'],
  ['Workloads and platform services', 'Place workloads and reconcile demand with management reservations.'],
  ['Licensing and operations', 'Record commercial assumptions, recovery and acceptance responsibilities.'],
  ['Review and export', 'Review findings, prerequisite order, reports and consumer qualification.'],
] as const
export const settings: Group[] = [
 { key:'project', title:'Project context', screen:0, fields:[t('name','Project name',true),t('customer','Customer'),t('purpose','Environment purpose',true),t('technicalOwner','Technical owner',true),t('businessOwner','Business owner'),t('approver','Approver'),t('targetDate','Target date'),s('environment','Environment starting state',['new-deployment','existing-hardware','existing-cluster']),s('scope','Design scope',['complete-platform','cluster-only','management-only','assessment']),m('preservation','Preservation boundary and allowed changes'),m('tags','Customer tags')] },
 { key:'architecture', title:'Architecture choices', screen:1, fields:[t('release','Azure Local release',true),t('osBuild','Exact OS build',true),t('solutionVersion','Solution version'),t('sbeVersion','SBE version'),s('storage','Storage architecture',['s2d','san','hybrid']),s('identity','Cluster identity',['ad','local']),s('topology','Cluster topology',['standard','rack-aware','existing']),s('route','Cluster deployment route',['portal','arm','terraform-ansible']),s('depth','Delivery depth',['design-only','operator-handoff','automation-package']),s('intent','Deployment intent',['new','reuse','extend','assess']),s('networkPattern','Host network pattern',['converged','separated','custom']),s('switching','Storage connectivity',['switched','switchless']),t('supportEvidence','Release and topology support review')] },
 { key:'management',title:'Management boundary',screen:2,fields:[s('mode','Management approach',['reuse-existing','deploy-new','extend-existing','customer-managed']),m('boundary','Service ownership and preservation'),t('acceptanceOwner','Management acceptance owner')] },
 { key:'bootstrap',title:'Independent bootstrap',screen:3,fields:[s('mode','Bootstrap approach',['manual-operator','existing-automation','new-tierpoint-automation']),t('repository','Repository URL'),t('ref','Branch or immutable ref'),t('runnerPool','Runner pool'),s('runnerOS','Runner operating system',['windows','external-linux']),t('powershellVersion','PowerShell 7 version'),t('azureCliVersion','Azure CLI version'),m('modulePins','Exact module versions'),s('authentication','Authentication method',['federated','managed-identity','certificate','secret-reference','operator']),secret('credentialRef','Runner credential reference'),t('rbacScope','RBAC scope'),m('permissions','Necessary permissions and reuse verification'),t('consentOwner','Consent owner'),t('rotationOwner','Expiry and rotation owner'),t('expiry','Credential expiry date'),m('reachability','Management, BMC, DNS and package reachability'),m('proxyTrust','Proxy and trust configuration'),m('exitPlan','Temporary access removal, final ownership and exit evidence')] },
 { key:'azure',title:'Azure resource context',screen:4,fields:[s('cloud','Azure cloud',['AzureCloud','AzureUSGovernment','AzureChinaCloud']),t('region','Azure region',true),t('tenant','Tenant reference',true),t('subscription','Subscription reference',true),t('resourceGroup','Resource group reference',true),t('clusterName','Azure Local instance name',true),t('customLocation','Custom location reference'),t('resourceBridge','Resource bridge reference'),m('providers','Resource providers and registration evidence'),m('rbac','RBAC assignees, roles and scopes'),m('connectivity','Egress endpoints and connectivity validation'),m('policy','Policy exemptions and ownership'),s('witness','Witness choice',['cloud','file-share','existing','unresolved']),t('witnessRef','Witness resource reference'),m('witnessEvidence','Quorum and witness evidence')] },
 { key:'identity',title:'Identity preparation',screen:5,fields:[...([t('domain','Forest/domain FQDN',true),t('ou','OU distinguished name',true),secret('deploymentAccount','Deployment account reference'),m('delegation','Directory preparation and delegated permissions')] .map(f=>({...f,branch:'ad' as const}))),...([t('localUser','Local administrator username',true),secret('localAdmin','Local administrator credential reference'),t('vault','Cluster-specific Key Vault reference',true),m('vaultPermissions','Resource-provider permissions'),b('vaultPrivateEndpoint','Vault uses a private endpoint'),m('vaultRecovery','Secret backup, recovery and vault reachability'),b('sshEnabled','SSH readiness observed')] .map(f=>({...f,branch:'local' as const}))),t('dnsNamespace','DNS namespace',true),t('dnsServers','DNS servers',true),t('dnsOwner','DNS record owner',true),t('timeSource','Time source',true),t('preparationOwner','Identity preparation owner',true),m('acceptance','Preparation acceptance evidence')] },
 { key:'security',title:'Security baseline',screen:5,fields:[s('profile','Security profile',['recommended','customized','existing']),b('secureBoot','Secure Boot readiness observed'),b('tpm','TPM readiness observed'),b('bitlocker','BitLocker selected',true),t('keyRecovery','Key recovery reference'),m('adminGroups','Administrator groups and access model'),m('firewall','Firewall and remote access policy'),m('audit','Audit retention'),m('exceptions','Security exceptions and approval')] },
 { key:'sdn',title:'Arc SDN intent',screen:10,fields:[b('enabled','Enable Azure Local SDN',true),s('existingState','Existing SDN state',['none','arc-enabled','onprem-controller','unknown']),t('existingOwner','Existing SDN owner'),m('optOutReason','Reason for opting out'),t('prefix','SDN prefix'),s('dnsMode','SDN DNS mode',['static','ad-dynamic']),t('dnsRecord','Network Controller DNS record'),t('reservedIp','Reserved Network Controller IPv4'),t('dnsOwner','SDN DNS owner'),t('permissionEvidence','SDN permissions evidence'),t('owner','Enablement owner'),t('maintenanceWindow','Maintenance window'),b('irreversibleAcknowledged','One-way enablement reviewed'),m('terminalEvidence','Operator-supplied terminal action-plan evidence'),m('trafficAcceptance','Intended allow/deny traffic acceptance evidence')] },
 { key:'capacity',title:'Compute and placement policy',screen:11,fields:[n('failureReserveNodes','Compute failure/maintenance reserve nodes',16,true),n('vcpuRatio','vCPU per physical core',64),n('osMemoryGiB','OS memory reserve per node (GiB)'),n('osCpu','OS vCPU reserve per node'),m('sizingBasis','Sizing assumptions and source units'),m('migration','Migration sequencing and recovery')] },
]
export const collections: Group[] = [
 {key:'sites',title:'Sites and racks',screen:0,fields:[...common(),t('country','Country'),t('region','Geographic region'),t('rack','Rack'),t('failureDomain','Failure domain'),m('powerCooling','Power, cooling and cabling')]},
 {key:'management',title:'Management components',screen:2,fields:[...common(),s('product','Service category',['azure-network','ad-dns','utility-jump','ndm','wac','ome','oem-other','monitoring','backup','security','lighthouse','runner','artifact-store','secret-store']),s('hosting','Hosting location',['azure-iaas','independent-hypervisor','physical','target-cluster','external']),r('site','Site',['sites']),t('endpoint','Endpoint'),t('version','Product version'),t('image','Image and OS version'),n('count','Instance count',1000,true),n('cpu','vCPU per instance'),n('memoryGiB','Memory per instance (GiB)'),n('diskGiB','Disk per instance (GiB)'),t('network','Network placement'),t('ha','HA and failure domains'),m('recovery','Startup order and recovery'),t('license','License/support evidence'),secret('credential','Credential reference'),r('certificate','Certificate',['certificates']),b('requiredBeforeCluster','Required before cluster deployment'),t('temporaryHost','Temporary bootstrap host'),t('finalPlacement','Final service placement'),s('execution','Installation handling',['manual','external-automation']),t('capacityEvidence','Hosting capacity acceptance')]},
 {key:'dependencies',title:'Service dependencies',screen:2,fields:[t('name','Dependency name',true),r('from','Dependent resource',['management','bootstrapTasks','stages'],true),r('to','Prerequisite resource',['management','bootstrapTasks','stages','azureResources','identities'],true),s('kind','Dependency type',['startup','bootstrap','recovery','network','identity']),owner(),evidence()]},
 {key:'bootstrapTasks',title:'Bootstrap tasks',screen:3,fields:[...common(),s('kind','Task kind',['access','workstation','node','temporary-exit']),r('node','Target node',['nodes']),t('method','Preparation method'),r('media','Media',['media']),secret('credential','Initial account reference'),m('requirements','Required access and prerequisites'),m('acceptance','Readiness acceptance'),m('exit','Temporary resource disposition')]},
 {key:'azureResources',title:'Azure resources',screen:4,fields:[...common(),s('kind','Resource kind',['resource-group','vnet','subnet','vpn','expressroute','dns-resolver','bastion','private-endpoint','key-vault','workspace','dcr','custom-location','resource-bridge','arc-machine','witness','policy','rbac']),t('resourceId','Azure resource ID'),t('region','Resource region'),r('parent','Parent resource',['azureResources']),t('cidr','Address space'),m('configuration','Resource configuration and routing'),m('permissions','Required permissions')]},
 {key:'identities',title:'Service identities',screen:5,fields:[...common(),s('kind','Identity type',['ad-user','gmsa','local-user','service-principal','managed-identity','group']),t('principal','Principal reference'),secret('credential','Credential reference'),t('scope','Permission scope'),t('roles','Roles'),t('expiry','Expiry date'),t('rotationOwner','Rotation owner'),m('reuse','Existing permission verification')]},
 {key:'certificates',title:'Certificates and trust',screen:5,fields:[...common(),t('subject','Subject/SANs'),t('issuer','Issuer'),t('thumbprint','Public thumbprint'),t('expiry','Expiry date'),secret('privateKey','Private key reference'),m('trust','Trust chain and distribution'),m('renewal','Renewal and recovery')]},
 {key:'nodes',title:'Physical nodes',screen:6,fields:[...common(),r('site','Site',['sites'],true),t('rack','Rack/failure domain',true),t('oem','OEM',true),t('model','Model',true),t('catalog','Hardware catalog evidence',true),t('serial','Serial/asset'),t('cpuModel','CPU model'),n('sockets','Sockets',64,true),n('cores','Total physical cores',8192,true),{...n('threadsPerCore','Hardware threads per physical core',2,true),default:1,since:3},n('memoryGiB','Memory (GiB)'),t('firmware','Firmware baseline'),t('sbe','SBE version'),t('bmc','BMC DNS name or IP'),secret('bmcCredential','BMC credential reference'),r('media','OS media',['media']),t('osBuild','Observed OS build'),t('managementIp','Management IPv4'),t('arcId','Arc machine ID'),m('readiness','Physical/Arc readiness evidence'),b('secureBoot','Secure Boot observed'),b('tpm','TPM observed')]},
 {key:'media',title:'Media and artifacts',screen:6,fields:[...common(),s('kind','Media type',['oem-image','os-image','driver','firmware','package']),t('version','Media version'),t('source','Source URI'),t('expectedHash','Expected SHA-256'),t('observedHash','Observed SHA-256'),t('signature','Signature and trust evidence'),t('license','Usage entitlement'),secret('access','Source access reference')]},
 {key:'networks',title:'Physical networks',screen:7,fields:[...common(),s('role','Network role',['management','compute','s2d-storage','migration','oob','backup','iscsi']),t('routingScope','Routing domain',true),n('vlan','VLAN',4094,true),t('cidr','IPv4 CIDR'),t('poolStart','Pool start IPv4'),t('poolEnd','Pool end IPv4'),t('reserved','Reserved IPv4 addresses'),t('gateway','Gateway IPv4'),t('dns','DNS servers'),n('mtu','MTU',9216,true),n('speedGbps','Link speed (Gbps)',800),s('rdma','RDMA mode',['none','roce','iwarp']),m('dcb','DCB/PFC/ETS configuration'),m('switches','Switch configuration and redundancy')]},
 {key:'intents',title:'Network ATC intents',screen:7,fields:[...common(),s('traffic','Traffic types',['management-compute','management-compute-storage','compute-storage','storage','management','compute']),s('ownership','Configuration owner',['network-atc','existing-review']),r('network','Primary physical network',['networks'],true),t('qos','QoS settings and evidence'),m('overrides','Reviewed ATC overrides')]},
 {key:'adapters',title:'Physical ports and adapters',screen:7,fields:[...common(),r('node','Node',['nodes'],true),s('kind','Port type',['nic','fc-hba']),t('model','NIC/HBA model'),t('driver','Driver version'),t('firmware','Adapter firmware'),t('port','Physical port identity',true),t('mac','MAC address'),n('speedGbps','Port speed (Gbps)',800),r('network','Physical network',['networks']),r('intent','Network ATC intent',['intents']),s('ownership','Port owner',['network-atc','san-io','oob','existing-review']),t('switchPort','Physical switch/port'),t('redundancyDomain','Switch/fabric failure domain'),t('ip','Port IPv4'),s('rdma','Port RDMA',['none','roce','iwarp'])]},
 {key:'pools',title:'S2D pools',screen:8,branch:'s2d',fields:[...common(),n('reserveBytes','Repair reserve (bytes)',Number.MAX_SAFE_INTEGER,true),n('metadataPercent','Metadata reserve (%)',100),t('faultDomains','Fault domains'),n('growthPercent','Expected growth (%)',1000),t('performance','Performance target'),m('reserveBasis','Repair reserve basis')]},
 {key:'devices',title:'Local disks',screen:8,branch:'s2d',fields:[...common(),r('node','Node',['nodes'],true),r('pool','S2D pool',['pools']),s('role','Device role',['capacity','cache','boot']),s('media','Media',['nvme','ssd','hdd']),t('serial','Stable device identity'),n('size','Device capacity'),unit(),n('count','Device count',1000,true),t('endurance','Endurance rating'),b('eligible','Eligibility verified'),t('firmware','Drive firmware')]},
 {key:'arrays',title:'SAN arrays',screen:8,branch:'san',fields:[...common(),t('oem','Array OEM'),t('model','Array model'),t('firmware','Array software/firmware'),t('certification','Support/certification evidence'),t('controllers','Controller failure domains'),t('pool','Array pool/tier'),n('capacity','Usable pool capacity after array protection'),unit(),n('allocated','Observed allocated capacity'),n('used','Observed used capacity'),t('protection','Array protection'),t('managementRef','Management endpoint/reference')]},
 {key:'fabrics',title:'SAN fabrics',screen:8,branch:'san',fields:[...common(),s('protocol','Protocol',['fc','iscsi']),t('failureDomain','Fabric failure domain'),t('switch','Switch/port'),n('speedGbps','Fabric speed (Gbps)',800),r('network','Dedicated SAN network',['networks']),m('zoning','Zoning policy and timing'),t('window','Maintenance window')]},
 {key:'initiators',title:'SAN initiators',screen:8,branch:'san',fields:[...common(),r('node','Node',['nodes'],true),r('adapter','Dedicated physical port',['adapters'],true),r('fabric','Fabric',['fabrics'],true),t('identity','WWPN or IQN',true),t('hostGroup','Host group'),secret('authentication','Authentication reference'),b('persistent','Session persistence reviewed')]},
 {key:'targets',title:'SAN targets',screen:8,branch:'san',fields:[...common(),r('array','Array',['arrays'],true),r('fabric','Fabric',['fabrics'],true),t('identity','Target WWPN or IQN',true),t('portal','Target portal IPv4'),t('controller','Controller failure domain')]},
 {key:'luns',title:'SAN LUNs',screen:8,branch:'san',fields:[...common(),r('array','Array',['arrays'],true),t('stableId','Stable array disk identity',true),n('lunNumber','LUN number',65535,true),s('role','LUN role',['workload','infrastructure','performance-history']),n('size','LUN capacity'),unit(),s('provisioning','Array provisioning',['thick','thin']),n('allocated','Observed allocated capacity'),n('used','Observed used capacity'),b('existingData','Contains existing data'),t('hostGroup','Host group and masking'),t('dsm','DSM and version'),t('persona','Vendor host persona'),t('mpioPolicy','MPIO policy/timers'),n('expectedPaths','Expected paths per node',256,true),m('presentation','Consistent presentation acceptance')]},
 {key:'ioPaths',title:'Per-node SAN I/O paths',screen:8,branch:'san',fields:[t('name','Path name',true),r('node','Node',['nodes'],true),r('lun','LUN',['luns'],true),r('initiator','Initiator',['initiators'],true),r('target','Target',['targets'],true),s('observedState','Observed state',['unverified','active-optimized','active-unoptimized','standby','failed']),owner(),evidence()]},
 {key:'volumes',title:'CSVs',screen:9,fields:[...common(),s('role','CSV role',['workload','infrastructure','performance-history']),s('source','Backing source',['s2d','san']),r('pool','S2D pool',['pools']),r('lun','SAN LUN',['luns']),n('size','Desired size'),unit(),n('allocated','Allocated capacity'),n('used','Observed used capacity'),s('provisioning','CSV provisioning',['fixed','thin']),n('growthReservePercent','Thin growth reserve (%)',100),n('maxOvercommit','Maximum nominal overcommit ratio',1000),t('alertPolicy','Thin capacity alert policy'),s('resiliency','S2D resiliency',['two-way-mirror','three-way-mirror','nested-two-way','mirror-accelerated-parity','dual-parity']),n('mirrorPercent','Mirror tier share (%)',100),s('filesystem','Filesystem',['ReFS','NTFS']),n('allocationUnitKiB','Allocation unit (KiB)',2048,true),t('mount','CSV mount directory'),t('placement','Placement/performance policy')]},
 {key:'storagePaths',title:'Azure storage paths',screen:9,fields:[...common(),r('volume','Backing CSV',['volumes'],true),t('directory','Directory on CSV',true),t('customLocation','Custom location'),t('resourceGroup','Resource group'),t('cluster','Target cluster resource'),t('apiVersion','API version'),m('mappingEvidence','Directory mapping support evidence')]},
 {key:'logicalNetworks',title:'Workload logical networks',screen:10,fields:[...common(),s('mode','Logical network mode',['sdn-static','static','dhcp']),n('vlan','VLAN',4094,true),t('cidr','IPv4 CIDR'),t('poolStart','Pool start IPv4'),t('poolEnd','Pool end IPv4'),t('gateway','Gateway IPv4'),t('dns','DNS servers'),r('nsg','Network security group',['nsgs']),t('customLocation','Custom location')]},
 {key:'nsgs',title:'Network security groups',screen:10,branch:'sdn',fields:[...common(),s('defaultPolicy','Default network access',['deny','allow']),m('managementAccess','Management access acceptance')]},
 {key:'rules',title:'NSG rules',screen:10,branch:'sdn',fields:[t('name','Rule name',true),r('nsg','NSG',['nsgs'],true),n('priority','Priority',4096,true),s('direction','Direction',['inbound','outbound']),s('action','Action',['allow','deny']),s('protocol','Protocol',['tcp','udp','icmp','any']),t('source','Source CIDRs'),t('destination','Destination CIDRs'),t('sourcePorts','Source ports'),t('destinationPorts','Destination ports'),owner()]},
 {key:'workloads',title:'Workloads',screen:11,fields:[...common(),s('kind','Workload type',['vm','avd','aks','management']),{...s('role','Workload role',['general','aks-control-plane','aks-worker','platform-service','profile-storage','sofs','mabs','inventory']),since:3},{...s('computeAccounting','Compute accounting',['own-demand','aks-worker-capacity']),since:3},{...n('cpuDemandRatio','Workload CPU demand division ratio',64),default:1,min:1,since:3},{...n('externalStorageGiB','Storage outside target cluster (GiB)'),since:3},n('count','Instance count',100000,true),n('vcpu','vCPU per instance'),n('memoryGiB','Memory per instance (GiB)'),n('storageGiB','Storage per instance (GiB)'),n('growthPercent','Growth (%)',1000),t('guestOS','Guest OS/image'),r('image','Image media',['media']),r('volume','CSV placement',['volumes']),r('storagePath','Azure storage path',['storagePaths']),r('network','Logical network',['logicalNetworks']),r('managementComponent','Reconciled management component',['management']),s('hosting','Placement boundary',['target-cluster','external']),s('vhdx','VHDX allocation',['fixed','dynamic']),t('availability','Availability requirement'),t('performance','IOPS/latency target'),t('backup','Backup and recovery'),m('migration','Migration requirements')]},
 {key:'licenses',title:'Licenses and costs',screen:12,fields:[...common(),s('product','Product',['azure-local','azure-hybrid-benefit','windows-guest','management-os','system-center','sql','oem-support','workload-other']),t('edition','Edition/version'),t('program','Agreement/program'),s('acquisition','Acquisition',['existing','purchase','included','unresolved']),n('quantity','Licensed quantity'),t('licenseUnit','License unit'),t('term','License term'),t('renewal','Renewal date'),t('rightsEvidence','Entitlement evidence'),n('unitPrice','Price per unit'),t('currency','Currency'),s('period','Price period',['one-time','monthly','annual']),t('priceDate','Price basis date'),t('priceSource','Quote/source'),b('priceReviewed','Price basis reviewed')]},
 {key:'operations',title:'Operations and acceptance',screen:12,fields:[...common(),s('kind','Operational requirement',['monitoring','alerts','backup','restore-test','patching','security','capacity','witness','support','handover']),t('target','Target/service'),t('window','Maintenance or review schedule'),t('rto','Recovery time objective'),t('rpo','Recovery point objective'),m('procedure','Procedure and acceptance criteria'),m('recovery','Recovery and escalation'),t('evidenceDate','Evidence date')]},
 {key:'stages',title:'Deployment and verification stages',screen:13,fields:[...common(),s('kind','Stage type',['foundation','identity','bootstrap','node-readiness','cluster','storage','sdn-enable','sdn-policy','workload','operations','exit']),s('handling','Execution handling',['manual','external-consumer']),t('consumer','Consumer ID and version'),t('sourceCommit','Consumer source commit'),t('contract','Consumer path/input schema'),m('toolPins','Exact toolchain pins'),r('target','Target resource',['nodes','management','azureResources','volumes','luns','storagePaths','logicalNetworks','workloads']),s('observation','Operator-reported status',['not-started','running','succeeded','failed']),m('acceptance','Terminal and acceptance requirements'),m('recovery','Resume/recovery constraints')]},
]
// Schema 4 adds storage accounting and per-node presentation without reinterpreting older observations.
const extendStorage=(key:string,fields:Field[])=>collections.find(g=>g.key===key)!.fields.push(...fields.map(f=>({...f,since:4})))
extendStorage('pools',[
 s('reserveMode','Repair reserve calculation',['explicit','recommended']),
 n('otherCommittedBytes','Other commitments outside listed CSVs (bytes)',Number.MAX_SAFE_INTEGER,true),
 s('telemetryScope','Allocation accounting scope',['planned-inventory','observed-whole-source']),
 n('observedAllocatedBytes','Observed whole-pool allocation (bytes)',Number.MAX_SAFE_INTEGER,true),
 n('observedUsedBytes','Observed whole-pool usage (bytes)',Number.MAX_SAFE_INTEGER,true),
 t('telemetryAt','Allocation observation timestamp'),t('telemetryRef','Allocation observation reference'),
 {...n('maxOvercommit','Maximum source nominal overcommit ratio',1000),default:1,min:1},
 {...n('alertPercent','Pool capacity alert threshold (%)',100),default:70},t('alertOwner','Capacity alert owner'),
])
extendStorage('arrays',[
 n('reserveBytes','Array pool operating reserve (bytes)',Number.MAX_SAFE_INTEGER,true),
 n('otherCommittedBytes','Other commitments outside listed LUNs (bytes)',Number.MAX_SAFE_INTEGER,true),
 s('telemetryScope','Allocation accounting scope',['planned-inventory','observed-whole-source']),
 t('telemetryAt','Array observation timestamp'),t('telemetryRef','Array observation reference'),
 {...n('maxOvercommit','Maximum source nominal overcommit ratio',1000),default:1,min:1},
 n('growthPercent','Additional source growth reserve (%)',1000),
 {...n('alertPercent','Array pool capacity alert threshold (%)',100),default:70},t('alertOwner','Capacity alert owner'),
 m('dataReduction','Data-reduction evidence (no automatic capacity credit)'),
])
extendStorage('luns',[
 s('allocationBasis','LUN allocation basis',['unresolved','planned','operator-observed']),
 n('growthReservePercent','LUN thin growth reserve (%)',1000),
 t('telemetryAt','LUN observation timestamp'),t('telemetryRef','LUN observation reference'),
 n('minOptimizedPaths','Minimum optimized paths per node',256,true),
])
extendStorage('volumes',[
 s('allocationBasis','CSV allocation basis',['unresolved','planned','operator-observed']),
 t('telemetryAt','CSV observation timestamp'),t('telemetryRef','CSV observation reference'),
 s('parityMediaBasis','Parity capacity media',['derive-from-pool','all-flash','hdd']),
 n('mirrorAllocated','Allocated mirror tier capacity'),n('parityAllocated','Allocated parity tier capacity'),
 n('mirrorUsed','Used mirror tier capacity'),n('parityUsed','Used parity tier capacity'),
 t('mirrorTier','Mirror storage tier identity'),t('parityTier','Parity storage tier identity'),
 m('layoutEvidence','Resiliency/tier layout qualification'),
 s('existingResiliency','Observed existing resiliency',['unobserved','two-way-mirror','three-way-mirror','nested-two-way','nested-mirror-accelerated-parity','mirror-accelerated-parity','dual-parity']),
])
const volumeResiliency=collections.find(g=>g.key==='volumes')!.fields.find(f=>f.key==='resiliency')!
volumeResiliency.options!.push('nested-mirror-accelerated-parity')
volumeResiliency.optionSince={'nested-mirror-accelerated-parity':4}
extendStorage('storagePaths',[t('subscription','Storage path subscription'),t('location','Storage path Azure region')])
extendStorage('management',[r('volume','Management CSV placement',['volumes']),r('storagePath','Management Azure storage path',['storagePaths'])])
extendStorage('workloads',[
 s('storageAccounting','Storage accounting',['own-demand','included-in-parent']),
 r('storageIncludedIn','Storage demand included in workload',['workloads']),
 m('storageAccountingEvidence','Storage inclusion and placement basis'),
])
collections.push({key:'lunPresentations',title:'Per-node LUN presentation observations',screen:8,branch:'san',since:4,fields:[
 t('name','Observation name',true),r('node','Node',['nodes'],true),r('lun','LUN',['luns'],true),
 t('observedStableId','Observed disk unique identity',true),b('visible','LUN visibility observed'),
 n('observedSize','Observed disk capacity'),unit(),n('sectorBytes','Logical sector bytes',4096,true),
 s('access','Observed access',['unverified','read-write','read-only','offline']),t('observedAt','Observation timestamp'),owner(),evidence(),
]})
// Schema 5: independent management, bootstrap access and explicit handover records.
const extendPreparation=(key:string,fields:Field[],config=false)=>(config?settings:collections).find(g=>g.key===key)!.fields.push(...fields.map(f=>({...f,since:5})))
const only=(field:Field,key:string,values:Value[]):Field=>({...field,when:{[key]:values}})
extendPreparation('management',[
 s('targetEstate','Managed estate',['azure-local-cluster','independent-estate','customer-workloads']),
 s('phase','Service placement phase',['permanent','temporary-bootstrap']),
 r('hostingResource','Independent hosting resource',['managementHosts']),
 r('serviceIdentity','Access service identity',['identities']),
 r('finalComponent','Permanent replacement service',['management']),
 t('availabilityOwner','Availability owner'),t('failureDomains','Distinct service failure domains'),
 n('minimumAvailable','Minimum surviving instances',1000,true),n('reservedFailureInstances','Unavailable instances to reserve',1000,true),
 t('maintenance','Maintenance schedule and owner'),t('acceptanceOwner','Service acceptance owner'),m('acceptance','Service readiness acceptance'),
 only(t('directoryDomain','Managed directory domain'),'product',['ad-dns']),only(t('directorySite','Directory site and replication partners'),'product',['ad-dns']),
 only(t('replicationOwner','Directory replication owner'),'product',['ad-dns']),only(m('directoryRecovery','Directory backup and restore acceptance'),'product',['ad-dns']),
 only(t('accessGroups','Gateway authorized access groups'),'product',['wac']),
 only(m('manualHandoff','OEM manual appliance handoff'),'product',['ome','oem-other']),
 only(t('alertRoute','Monitoring alert route and owner'),'product',['monitoring','ndm']),
 only(t('retention','Backup or audit retention'),'product',['backup','monitoring','security']),
])
extendPreparation('bootstrap',[
 r('runnerHost','Deployment workstation or runner host',['managementHosts']),r('serviceIdentity','Bootstrap service identity',['identities']),
 r('runnerComponent','Runner management component',['management']),r('artifactComponent','Artifact repository service',['management']),r('secretComponent','Secret store service',['management']),
 t('acceptanceOwner','Bootstrap acceptance owner'),t('permissionReviewAt','Permission review timestamp'),
 s('accessReview','Permission review state',['unreviewed','operator-reported']),
 t('federationIssuer','Federation issuer'),t('federationSubject','Federation subject'),t('federationAudience','Federation audience'),
 r('authCertificate','Authentication certificate',['certificates']),
],true)
extendPreparation('bootstrapTasks',[
 r('executorHost','Independent execution host',['managementHosts']),r('serviceIdentity','Task service identity',['identities']),
 r('temporaryService','Temporary management service',['management']),r('permanentService','Permanent management service',['management']),
 s('handling','Task handling',['manual','external-consumer']),t('consumer','Pinned external consumer reference'),
 only(s('bmcMethod','BMC preparation method',['unresolved','manual-console','virtual-media','redfish']),'kind',['node']),
 only(m('bootSetup','Boot mode, boot order and initial networking'),'kind',['node']),
 only(m('timeDns','Initial time and DNS preparation'),'kind',['node']),
 only(m('firmwareAcceptance','Firmware/SBE readiness acceptance'),'kind',['node']),
 only(m('arcAcceptance','Arc registration and readiness acceptance'),'kind',['node']),
])
const preparationGroups:Group[]=[
 {key:'managementHosts',title:'Independent management hosting',screen:2,fields:[...common(),s('platform','Hosting platform',['azure-iaas','independent-hypervisor','physical','external']),t('platformVersion','Platform and OS version'),t('endpoint','Management endpoint'),t('failureDomain','Host failure domain'),r('site','Site',['sites']),n('availableCpu','Available vCPU capacity'),n('availableMemoryGiB','Available memory (GiB)'),n('availableDiskGiB','Available disk (GiB)'),n('reservedCpu','Other vCPU commitments'),n('reservedMemoryGiB','Other memory commitments (GiB)'),n('reservedDiskGiB','Other disk commitments (GiB)'),s('capacityBasis','Host capacity basis',['planned','operator-observed']),t('observedAt','Host observation timestamp'),t('capacityReference','Capacity source reference'),b('availableBeforeCluster','Planned available before cluster'),m('reachability','Management, BMC and package reachability'),m('recovery','Host recovery and capacity acceptance')]},
 {key:'managementBindings',title:'Management resource bindings',screen:2,fields:[t('name','Binding name',true),r('component','Management component',['management'],true),s('role','Resource purpose',['vnet','subnet','vpn','expressroute','dns-resolver','bastion','private-endpoint','workspace','dcr','key-vault','policy','rbac','identity','certificate']),r('resource','Bound resource',['azureResources','identities','certificates'],true),owner(),m('acceptance','Resource binding acceptance')]},
 {key:'accessChecks',title:'Bootstrap access checks',screen:3,fields:[t('name','Check name',true),r('executor','Execution host',['managementHosts'],true),s('targetKind','Access target',['management','bmc','dns','media','packages','azure','repository','proxy']),t('target','Target endpoint or node reference',true),s('transport','Protocol',['https','ssh','winrm-https','dns','ntp','rdp','other']),n('port','Destination port',65535,true),r('identity','Access identity',['identities']),t('requiredScope','Least necessary scope or permission'),owner(),m('acceptance','Expected access acceptance'),s('observation','Operator observation',['unverified','reachable','unreachable']),t('observedAt','Access observation timestamp'),evidence()]},
 {key:'toolPins',title:'Bootstrap toolchain pins',screen:3,fields:[t('name','Tool name',true),r('executor','Execution host',['managementHosts'],true),s('kind','Tool kind',['powershell','azure-cli','powershell-module','ansible','terraform','dsc','other']),t('version','Exact version',true),t('source','Package or signed artifact source'),t('sha256','Expected artifact SHA-256'),s('operatingSystem','Execution operating system',['windows','external-linux']),t('contract','Script, module or role contract'),owner(),m('verification','Version/signature validation acceptance')]},
 {key:'bootstrapExits',title:'Temporary service exit plans',screen:3,fields:[t('name','Exit plan name',true),r('temporaryService','Temporary service',['management'],true),r('permanentService','Permanent replacement',['management'],true),owner(),t('finalOwner','Final service owner',true),m('permanentAcceptance','Permanent management acceptance'),m('credentialRotation','Credential rotation owner and procedure'),m('accessRemoval','Temporary access removal procedure'),s('disposition','Temporary resource disposition',['unresolved','retain-independent','decommission-after-acceptance','return-to-owner']),m('recovery','Handover failure and rollback procedure'),s('observation','Operator handover observation',['not-started','accepted','failed']),t('observedAt','Handover observation timestamp'),evidence()]},
]
collections.push(...preparationGroups.map(g=>({...g,since:5})))
const bootstrapFields=settings.find(g=>g.key==='bootstrap')!.fields
for(const key of ['repository','ref','runnerPool','authentication','credentialRef','rbacScope','permissions','consentOwner','rotationOwner','expiry','serviceIdentity','runnerComponent','artifactComponent','secretComponent','permissionReviewAt','accessReview'])bootstrapFields.find(f=>f.key===key)!.when={mode:['existing-automation','new-tierpoint-automation']}
for(const key of ['federationIssuer','federationSubject','federationAudience'])bootstrapFields.find(f=>f.key===key)!.when={mode:['existing-automation','new-tierpoint-automation'],authentication:['federated']}
bootstrapFields.find(f=>f.key==='authCertificate')!.when={mode:['existing-automation','new-tierpoint-automation'],authentication:['certificate']}
collections.find(g=>g.key==='management')!.fields.find(f=>f.key==='finalComponent')!.when={phase:['temporary-bootstrap']}
const dependencyTargets=collections.find(g=>g.key==='dependencies')!.fields.find(f=>f.key==='to')!.targets!
dependencyTargets.push('managementHosts')
export function fieldApplicable(f:Field,values:Values,config:Record<string,Values>){return activeBranch(f.branch,config)&&Object.entries(f.when??{}).every(([key,choices])=>choices.includes(values[key]))}
// Schema 6: explicit inputs for separately pinned AD and local-identity ARM consumers.
settings.push({key:'arm',title:'ARM deployment inputs',screen:1,since:6,branch:'arm',fields:[
 s('deploymentMode','ARM deployment stage',['Validate','Deploy']),t('priorValidation','Prior validation deployment ID and terminal evidence'),
 r('managementNetwork','Deployment infrastructure network',['networks']),t('namingPrefix','Deployment object prefix'),
 r('keyVault','Deployment Key Vault',['azureResources']),r('diagnosticsAccount','Key Vault diagnostic storage account',['azureResources']),r('witnessAccount','Cloud witness storage account',['azureResources']),
 {...n('softDeleteRetentionDays','Vault soft-delete retention (days)',90,true),min:7,default:30},{...n('logsRetentionInDays','Diagnostic log retention (days)',365,true),default:30},
 s('configurationMode','Deployment volume configuration',['unresolved','Express','InfraOnly','KeepStorage']),m('storageHandling','Storage creation or preservation handoff'),
 {...t('localAdminUsername','AD-route node local administrator username'),branch:'ad'},{...secret('localAdminSecret','AD-route node local administrator password reference'),branch:'ad'},
 t('hciResourceProviderObjectId','Azure Local resource provider object ID'),t('customLocationName','Deployment custom location name'),
 b('enableStorageAutoIp','Network ATC assigns storage IPs',true),{...s('dnsServerConfig','Local-identity DNS mode',['UseDnsServer','UseForwarder']),branch:'local'},
 t('sbeFamily','SBE family'),t('sbePublisher','SBE publisher'),t('sbeManifestSource','SBE manifest source'),t('sbeManifestCreationDate','SBE manifest creation timestamp'),
 b('previewApiReviewed','Preview deployment API reviewed'),m('templateEffects','Template resource changes and owner review'),m('qualificationNotes','Template qualification and known issues'),
]})
const extendArm=(key:string,fields:Field[],config=false)=>(config?settings:collections).find(g=>g.key===key)!.fields.push(...fields.map(f=>({...f,since:6})))
extendArm('identity',[{...t('deploymentUser','AD deployment account username'),branch:'ad'}],true)
extendArm('security',[
 b('driftControlEnforced','Enforce security baseline drift control',true),b('credentialGuardEnforced','Enable Credential Guard',true),b('smbSigningEnforced','Require SMB signing',true),b('smbClusterEncryption','Encrypt intra-cluster SMB'),
 b('bitlockerBootVolume','Encrypt OS volumes',true),b('bitlockerDataVolumes','Encrypt data volumes',true),b('wdacEnforced','Enforce application control',true),
 b('streamingDataClient','Enable streaming telemetry',true),b('euLocation','EU telemetry location'),b('episodicDataUpload','Enable episodic diagnostics',true),
],true)
extendArm('adapters',[t('osName','Exact operating-system adapter name')])
extendArm('intents',[
 b('overrideAdapterProperty','Override adapter properties'),t('jumboPacket','OEM jumbo-packet override'),t('networkDirect','OEM Network Direct override'),s('networkDirectTechnology','OEM RDMA technology',['unresolved','iWARP','RoCEv2','RoCE']),
 b('overrideQosPolicy','Override QoS policy'),n('bandwidthPercentageSmb','SMB bandwidth percentage',100,true),n('priorityCluster','Cluster 802.1p priority',7,true),n('prioritySmb','SMB 802.1p priority',7,true),
 b('overrideVirtualSwitch','Override virtual-switch configuration'),t('enableIov','OEM IOV override'),t('loadBalancingAlgorithm','OEM load-balancing algorithm'),m('overrideEvidence','OEM override qualification'),
])
const azureResourceKind=collections.find(g=>g.key==='azureResources')!.fields.find(f=>f.key==='kind')!
azureResourceKind.options!.push('storage-account');azureResourceKind.optionSince={'storage-account':6}
collections.push(
 {key:'armSecretBindings',title:'ARM credential bindings',screen:1,since:6,branch:'arm',fields:[t('name','Binding name',true),secret('reference','Design credential reference'),r('vault','Existing source Key Vault',['azureResources'],true),t('secretName','Existing secret name',true),t('secretVersion','Pinned secret version'),owner(),m('permissions','ARM secret-read permissions and template-deployment acceptance')]},
 {key:'armStorageNetworks',title:'Deployment storage networks',screen:7,since:6,branch:'s2d',fields:[t('name','Storage network name',true),r('network','Physical storage network',['networks'],true),t('adapterName','Operating-system adapter name',true),owner()]},
 {key:'storageAddresses',title:'Per-node storage addresses',screen:7,since:6,branch:'s2d',fields:[t('name','Address assignment name',true),r('storageNetwork','Deployment storage network',['armStorageNetworks'],true),r('node','Physical node',['nodes'],true),t('ip','Storage IPv4',true),owner(),evidence()]},
 {key:'dnsZones',title:'Local-identity DNS zones',screen:5,since:6,branch:'local',fields:[t('name','DNS zone name',true),t('forwarders','DNS forwarder IPv4 addresses'),owner(),m('acceptance','DNS authority and resolution acceptance')]},
 {key:'sbeProperties',title:'SBE partner properties',screen:6,since:6,fields:[t('name','Partner property name',true),t('value','Non-secret property value',true),owner(),m('contract','OEM property contract')]},
 {key:'sbeCredentials',title:'SBE credential requirements',screen:6,since:6,fields:[t('name','Partner credential name',true),secret('reference','Partner credential reference'),owner(),m('contract','OEM credential consumer contract')]},
)
export const groups = [...settings, ...collections]
export const defaultValues = (fields: Field[]): Values => Object.fromEntries(fields.map(f => [f.key, f.default ?? (f.type === 'number' ? 0 : f.type === 'boolean' ? false : '')]))
export function activeBranch(branch: Branch | undefined, config: Record<string, Values>) {if(!branch)return true;if(Array.isArray(branch))return branch.every(g=>g.values.includes(config[g.group]?.[g.key] as Value));if(branch==='dsc')return config.automation?.dsc!=='none';if(branch==='sdn')return config.sdn.enabled===true;if(branch==='arm')return config.architecture.route!=='portal';if(branch==='ad'||branch==='local')return config.architecture.identity===branch;return config.architecture.storage===branch||config.architecture.storage==='hybrid'}

// Toolkit v4 requires explicit environment metadata; migration does not invent it.
settings.push({key:'toolkit',title:'Toolkit hierarchy export',screen:1,since:7,fields:[
 b('enabled','Include Toolkit hierarchy review'),r('site','Toolkit deployment site',['sites']),t('siteCode','Toolkit site code'),t('environmentName','Toolkit environment name'),s('environmentType','Toolkit environment type',['unresolved','management','lab','demo','poc','production']),m('tagsJson','Toolkit Azure tags (JSON object)'),m('boundary','Toolkit stage and preservation boundary')
]})
settings.push({key:'automation',title:'PowerShell and DSC handoff',screen:13,since:8,fields:[
 s('powershellVersion','PowerShell toolchain',['7.4.6','7.6.6'],'7.4.6'),
 s('dsc','DSC selection',['none','dsc-v3-design-handoff','powershell-dsc-design-handoff']),
 t('dscVersion','Exact requested DSC version'),m('dscBoundary','DSC stage, target and preservation boundary'),
 ]})
collections.push({key:'dscResources',title:'Requested DSC resource contracts',screen:13,since:8,branch:'dsc',help:'Design-only requests. No DSC resource is deployment-qualified by the current adapter catalog; these records never generate an executable DSC configuration.',fields:[...common(),t('resourceType','Fully qualified resource type',true),t('version','Exact resource version',true),t('sourceCommit','Immutable source commit',true),t('consumerPath','Resource manifest or module path',true),t('inputSchema','Input schema reference',true),m('parametersJson','Non-secret requested properties (JSON)'),r('target','Intended resource',['nodes','management','volumes','logicalNetworks']),m('limitations','Known limitations and acceptance requirements')]})

// Schema 9: every network and platform component starts with a used / not-used or which-option decision.
// The answer reveals only the questions that apply. Hidden answers are retained and excluded from infrastructure.yml.
export const gate=(group:string,key:string,values:Value[]):Gate=>({group,key,values})
const at=(field:Field,...gates:Gate[]):Field=>({...field,branch:gates})
const dflt=(field:Field,value:Value):Field=>({...field,default:value})
const whenAll=(field:Field,when:Record<string,Value[]>):Field=>({...field,when:{...field.when,...when}})
const v9=(fields:Field[])=>fields.map(f=>({...f,since:9}))
export const S2D_STORAGE=['s2d','hybrid'],SAN_STORAGE=['san','hybrid'],USED=['used']
export const FIREWALL_USED=gate('firewall','provider',['tierpoint-fortinet']),TOR_USED=gate('tor','provider',['tierpoint-dell','customer']),OOB_USED=gate('oob','model',['opengear','oob-switch']),OPENGEAR_USED=gate('oob','model',['opengear'])
export const STORAGE_SWITCHED=[gate('architecture','storage',S2D_STORAGE),gate('architecture','switching',['switched'])]
const setting=(key:string)=>settings.find(g=>g.key===key)!
const collection=(key:string)=>collections.find(g=>g.key===key)!
const settingField=(group:string,key:string)=>setting(group).fields.find(f=>f.key===key)!
// Cheap gate corrections for existing fields (no schema change: the fields already exist).
settingField('architecture','switching').when={storage:S2D_STORAGE}
for(const key of ['prefix','dnsMode','reservedIp','dnsOwner','permissionEvidence','owner','maintenanceWindow','irreversibleAcknowledged','terminalEvidence','trafficAcceptance'])settingField('sdn',key).when={enabled:[true]}
settingField('sdn','dnsRecord').when={enabled:[true],dnsMode:['static']}
settingField('sdn','optOutReason').when={enabled:[false]}
const witness=settingField('azure','witness');witness.options!.push('none');witness.optionSince={none:9}
settingField('azure','witnessRef').when={witness:['cloud','file-share','existing']}
settingField('arm','witnessAccount').branch=[gate('architecture','route',['arm','terraform-ansible']),gate('azure','witness',['cloud'])]
// tagsJson stays visible: the Portal panel reuses it for customer Azure tags.
for(const key of ['site','siteCode','environmentName','environmentType','boundary'])settingField('toolkit',key).when={enabled:[true]}
collection('fabrics').fields.find(f=>f.key==='zoning')!.branch=[gate('architecture','sanProtocol',['fc'])]
collection('fabrics').fields.find(f=>f.key==='switch')!.branch=[gate('architecture','sanProtocol',['fc'])]
collection('targets').fields.find(f=>f.key==='portal')!.branch=[gate('architecture','sanProtocol',['iscsi'])]
setting('architecture').fields.push(...v9([
 only(s('switchlessLinks','Switchless storage links',['dual-link','single-link']),'switching',['switchless']),
 only(s('sanProtocol','SAN protocol',['fc','iscsi']),'storage',SAN_STORAGE),
]))
setting('architecture').fields.find(f=>f.key==='switchlessLinks')!.when={storage:S2D_STORAGE,switching:['switchless']}
// TierPoint management in Azure.
const plane=(f:Field)=>only(f,'azurePlane',USED)
setting('management').fields.push(...v9([
 s('azurePlane','TierPoint management in Azure',['used','not-used']),
 plane(s('landingZone','Azure landing zone',['simplified','full-caf'])),plane(t('managementSubscription','Management subscription reference')),plane(t('managementRegion','Management Azure region')),plane(t('hubCidr','Management hub VNet address space')),plane(m('managementServices','TierPoint management services in Azure')),
]))
collection('managementBindings').branch=[gate('management','azurePlane',USED)]
const s2s=(f:Field,extra:Record<string,Value[]>={})=>whenAll(f,{s2sVpn:USED,...extra}),p2s=(f:Field,extra:Record<string,Value[]>={})=>whenAll(f,{p2sVpn:USED,...extra}),er=(f:Field)=>whenAll(f,{expressRoute:USED})
const asn=(key:string,label:string,value=0)=>dflt(n(key,label,4294967295,true),value)
settings.push({key:'hybrid',title:'Hybrid connectivity to Azure',screen:4,since:9,fields:[
 s('s2sVpn','Azure site-to-site VPN',['unanswered','used','not-used'],'unanswered'),
 s2s(t('onPremPublicIp','On-premises VPN public IPv4 or FQDN')),s2s(s('vpnGatewaySku','Azure VPN gateway SKU',['VpnGw1AZ','VpnGw2AZ','VpnGw3AZ','VpnGw4AZ','VpnGw5AZ','VpnGw1','VpnGw2','VpnGw3','VpnGw4','VpnGw5','Basic'],'VpnGw2AZ')),s2s(b('vpnActiveActive','Active-active Azure VPN gateway')),
 s2s(t('gatewaySubnet','GatewaySubnet address prefix')),s2s(t('localAddressSpaces','On-premises address spaces')),s2s(t('azureAddressSpaces','Azure address spaces')),
 s2s(s('ikeVersion','IKE version',['IKEv2','IKEv1'])),s2s(s('ipsecPolicy','IPsec/IKE policy',['default','custom'])),s2s(t('ikeProposal','IKE phase 1 proposal'),{ipsecPolicy:['custom']}),s2s(t('ipsecProposal','IPsec phase 2 proposal'),{ipsecPolicy:['custom']}),
 s2s(dflt(n('dpdTimeout','Dead peer detection timeout (seconds)',3600,true),45)),s2s(secret('sharedKeyRef','VPN shared key reference')),
 s2s(b('bgpEnabled','BGP over the tunnel',true)),s2s(asn('onPremAsn','On-premises BGP ASN'),{bgpEnabled:[true]}),s2s(asn('azureAsn','Azure VPN gateway BGP ASN',65515),{bgpEnabled:[true]}),s2s(t('onPremBgpPeerIp','On-premises BGP peer IPv4'),{bgpEnabled:[true]}),s2s(t('azureBgpPeerIp','Azure BGP peer IPv4'),{bgpEnabled:[true]}),
 dflt(s('p2sVpn','Point-to-site VPN',['used','not-used']),'not-used'),
 p2s(t('p2sAddressPool','Client address pool')),p2s(s('p2sTunnel','Tunnel type',['OpenVPN','IKEv2','IKEv2-OpenVPN','SSTP','IKEv2-SSTP'])),p2s(s('p2sAuth','Client authentication',['entra-id','certificate','radius'])),
 p2s(t('p2sEntraTenant','Entra ID tenant URL'),{p2sAuth:['entra-id']}),p2s(t('p2sEntraAudience','Entra ID audience'),{p2sAuth:['entra-id']}),
 p2s(t('p2sRootCertificate','Root certificate name'),{p2sAuth:['certificate']}),p2s(t('p2sRadiusServers','RADIUS server IPv4 addresses'),{p2sAuth:['radius']}),p2s(secret('p2sRadiusSecretRef','RADIUS shared secret reference'),{p2sAuth:['radius']}),
 dflt(s('expressRoute','ExpressRoute private connectivity',['used','not-used']),'not-used'),
 er(t('erProvider','Connectivity provider')),er(t('erCircuit','Circuit name or resource ID')),er(t('erPeeringLocation','Peering location')),er(n('erBandwidthMbps','Circuit bandwidth (Mbps)',100000,true)),er(s('erSku','Circuit SKU',['Standard','Premium','Local'])),er(s('erBilling','Billing model',['metered','unlimited'])),
 er(t('erPrimarySubnet','Private peering primary /30')),er(t('erSecondarySubnet','Private peering secondary /30')),er(n('erVlanId','Private peering VLAN ID',4094,true)),er(asn('erPeerAsn','Customer peer ASN')),er(secret('erMd5Ref','BGP MD5 key reference')),
 er(t('erGatewaySku','ExpressRoute gateway SKU')),er(t('erGatewaySubnet','ExpressRoute GatewaySubnet prefix')),
]})
const egress=(f:Field,values:string[])=>only(f,'egressModel',values)
settings.push({key:'outbound',title:'Arc gateway and proxy',screen:4,since:9,fields:[
 s('egressModel','Outbound connectivity',['direct','proxy','arc-gateway','proxy-arc-gateway','private-path']),
 egress(t('proxyUrl','Proxy URL'),['proxy','proxy-arc-gateway']),egress(m('proxyBypass','Proxy bypass list'),['proxy','proxy-arc-gateway']),
 egress(t('arcGatewayId','Arc gateway resource ID'),['arc-gateway','proxy-arc-gateway','private-path']),
 egress(t('privateFirewallIp','Azure Firewall explicit proxy private IPv4'),['private-path']),egress(n('privateFirewallPort','Explicit proxy port',65535,true),['private-path']),
 m('endpointEvidence','Allow-list and Environment Checker evidence'),
]})
// Perimeter firewall: TierPoint-managed FortiGate HA pair is part of the Azure Local hardware package.
const fortinet=(f:Field,extra:Record<string,Value[]>={})=>whenAll(f,{provider:['tierpoint-fortinet'],...extra}),customerFirewall=(f:Field)=>only(f,'provider',['customer'])
settings.push({key:'firewall',title:'Perimeter firewall',screen:7,since:9,fields:[
 s('provider','Firewall provider',['tierpoint-fortinet','customer','not-used']),
 fortinet(s('model','FortiGate model',['FortiGate-90G','FortiGate-30G','FortiGate-120G','other'])),fortinet(t('osVersion','FortiOS version')),fortinet(s('haMode','High availability mode',['active-passive','active-active','standalone'])),fortinet(t('haGroupName','HA group name')),
 fortinet(t('wanCidr','WAN subnet (CIDR)')),fortinet(t('wanGateway','WAN gateway IPv4')),fortinet(t('publicIps','Public IPv4 addresses')),
 fortinet(m('gatewayVlans','VLAN gateways on the firewall')),fortinet(m('dhcpScopes','DHCP scopes on the firewall')),
 fortinet(s('vdomMode','VDOM mode',['no-vdom','multi-vdom'])),fortinet(m('vdoms','VDOMs and tenants'),{vdomMode:['multi-vdom']}),
 fortinet(s('centralManagement','Central management',['none','fortimanager'])),fortinet(t('logTargets','Syslog and SNMP targets')),fortinet(secret('credentialRef','Firewall administrator credential reference')),
 customerFirewall(t('customerVendor','Customer firewall vendor')),customerFirewall(t('customerModel','Customer firewall model')),customerFirewall(t('customerOwner','Customer firewall owner')),customerFirewall(t('customerContact','Customer firewall contact')),
 customerFirewall(t('customerGatewayIps','Gateway IPv4 addresses on the customer firewall')),customerFirewall(m('endpointApproach','Outbound endpoint approach')),customerFirewall(b('httpsInspectionDisabled','HTTPS inspection disabled for Azure Local traffic')),
]})
// Top-of-rack switches: Dell PowerSwitch is the TierPoint default.
const torUsed=(f:Field,extra:Record<string,Value[]>={})=>whenAll(f,{provider:['tierpoint-dell','customer'],...extra}),pair={pairMode:['vlt-pair','mlag-pair']}
settings.push({key:'tor',title:'Top-of-rack switches',screen:7,since:9,fields:[
 s('provider','Top-of-rack switch provider',['tierpoint-dell','customer','not-used']),
 only(t('customerVendor','Customer switch vendor'),'provider',['customer']),only(t('customerOwner','Customer switch owner'),'provider',['customer']),
 torUsed(t('model','Switch model')),torUsed(s('os','Switch operating system',['OS10','SONiC','other'])),torUsed(t('osVersion','Switch OS version')),
 torUsed(s('pairMode','Switch pairing',['vlt-pair','mlag-pair','single'])),torUsed(dflt(n('vltDomain','VLT or MLAG domain ID',255,true),1),pair),torUsed(t('peerLinkPorts','Peer-link ports'),pair),torUsed(t('backupDestination','Peer backup destination IPv4'),pair),
 torUsed(m('uplinks','Uplinks to core or firewall')),torUsed(dflt(n('mtu','Switch port MTU',9216,true),9216)),
 ...[dflt(t('storageVlans','Storage VLANs on the switches'),'711,712'),s('rdmaType','Storage RDMA type',['RoCEv2','iWARP']),dflt(n('pfcPriority','PFC priority for SMB Direct',7,true),3),dflt(n('etsSmbPercent','ETS share for SMB Direct (%)',100,true),50),dflt(n('etsClusterPercent','ETS share for cluster heartbeat (%)',100,true),1),dflt(n('etsDefaultPercent','ETS share for default traffic (%)',100,true),49)].map(f=>at(torUsed(f),...STORAGE_SWITCHED)),
]})
// Out-of-band management: a standard OOB switch, or an Opengear console manager enrolled in Lighthouse.
const oobUsed=(f:Field)=>only(f,'model',['opengear','oob-switch']),oobSwitch=(f:Field)=>only(f,'model',['oob-switch']),opengear=(f:Field,extra:Record<string,Value[]>={})=>whenAll(f,{model:['opengear'],...extra})
settings.push({key:'oob',title:'Out-of-band management',screen:7,since:9,fields:[
 s('model','Out-of-band management model',['opengear','oob-switch','not-used']),
 oobUsed(n('vlan','Out-of-band VLAN',4094,true)),oobUsed(t('cidr','Out-of-band subnet (CIDR)')),oobUsed(t('gateway','Out-of-band gateway IPv4')),
 oobSwitch(t('switchVendor','OOB switch vendor')),oobSwitch(t('switchModel','OOB switch model')),oobSwitch(t('switchHostname','OOB switch hostname')),oobSwitch(t('switchManagementIp','OOB switch management IPv4')),oobSwitch(t('switchUplink','OOB switch uplink')),
 opengear(t('ogModel','Opengear model')),opengear(t('ogHostname','Opengear hostname')),opengear(t('ogManagementIp','Opengear management IPv4')),opengear(n('serialPorts','Serial console ports',96,true)),
 opengear(t('lighthouseAddress','Lighthouse server address')),opengear(dflt(n('lighthousePort','Lighthouse port',65535,true),443)),opengear(secret('enrollmentTokenRef','Lighthouse enrollment token reference')),opengear(t('enrollmentBundle','Lighthouse enrollment bundle')),
 opengear(m('internetUplink','Opengear internet uplink')),opengear(b('cellularFailover','Cellular failover')),opengear(t('cellularApn','Cellular APN'),{cellularFailover:[true]}),
]})
// External SAN details. The project-level protocol lives in architecture.sanProtocol.
settings.push({key:'san',title:'External SAN connectivity',screen:8,since:9,branch:'san',fields:[
 s('arrayVendor','Array vendor',['pure','dell-powerstore','hpe-alletra','hitachi','netapp','lenovo','other']),s('administeredBy','Array administered by',['customer','tierpoint']),
 ...[t('fcSwitchVendor','Fibre Channel switch vendor'),t('fabricASwitch','Fabric A switch'),t('fabricBSwitch','Fabric B switch'),s('zoningModel','Zoning model',['single-initiator-single-target','other'])].map(f=>at(f,gate('architecture','storage',SAN_STORAGE),gate('architecture','sanProtocol',['fc']))),
 ...[n('iscsiVlanA','iSCSI path A VLAN',4094,true),n('iscsiVlanB','iSCSI path B VLAN',4094,true),t('iscsiSubnetA','iSCSI path A subnet (CIDR)'),t('iscsiSubnetB','iSCSI path B subnet (CIDR)'),dflt(n('iscsiMtu','iSCSI MTU',9216,true),9014),t('iscsiPortals','Target portal IPv4 addresses'),t('iscsiTargetIqn','Target IQN')].map(f=>at(f,gate('architecture','storage',SAN_STORAGE),gate('architecture','sanProtocol',['iscsi']))),
]})
const backupUsed=(f:Field,extra:Record<string,Value[]>={})=>whenAll(f,{solution:['azure-backup','mabs','third-party'],...extra})
settings.push({key:'backup',title:'Backup',screen:12,since:9,fields:[
 s('solution','Backup solution',['azure-backup','mabs','third-party','not-used']),
 backupUsed(t('vault','Backup vault or server reference')),backupUsed(t('retention','Retention policy')),backupUsed(t('rpo','Recovery point objective')),backupUsed(t('rto','Recovery time objective')),
 only(s('mabsScope','MABS protection level',['host-level','guest-level','both']),'solution',['mabs']),only(s('mabsAuth','MABS agent authentication',['domain','certificate']),'solution',['mabs']),
 only(t('product','Third-party backup product'),'solution',['third-party']),
 backupUsed(b('dedicatedNetwork','Dedicated backup network')),backupUsed(n('vlan','Backup VLAN',4094,true),{dedicatedNetwork:[true]}),
]})
const monitored=(f:Field)=>only(f,'solution',['azure-monitor','tierpoint-noc'])
settings.push({key:'monitoring',title:'Monitoring',screen:12,since:9,fields:[
 s('solution','Monitoring solution',['azure-monitor','tierpoint-noc','customer-tool','not-used']),
 monitored(t('workspace','Log Analytics workspace reference')),monitored(t('dataCollectionRule','Data collection rule reference')),monitored(t('alertRecipients','Alert recipients')),
 only(s('serviceTier','TierPoint monitoring tier',['professional','premium']),'solution',['tierpoint-noc']),only(b('deviceTelemetry','Collect firewall, switch and Opengear syslog and SNMP'),'solution',['tierpoint-noc']),
 only(t('customerTool','Customer monitoring tool'),'solution',['customer-tool']),
]})
const device=():Field[]=>[t('name','Hostname',true),life()]
collections.push(...[
 {key:'firewalls',title:'Firewall units',screen:7,branch:[FIREWALL_USED],fields:[...device(),s('role','HA role',['primary','secondary','standalone']),t('managementIp','Management IPv4'),t('oobIp','Out-of-band IPv4'),t('wanIp','WAN or public IPv4'),t('serial','Serial number'),n('haPriority','HA priority',255,true),t('heartbeatPorts','HA heartbeat ports'),t('rackPosition','Rack position')]},
 {key:'torSwitches',title:'Top-of-rack switch units',screen:7,branch:[TOR_USED],fields:[...device(),s('role','Pair role',['primary','secondary','standalone']),t('managementIp','Management IPv4'),t('oobIp','Out-of-band IPv4'),t('serial','Serial number'),n('vltPriority','VLT priority',65535,true),t('rackPosition','Rack position'),secret('credentialRef','Switch administrator credential reference')]},
 {key:'nicLinks',title:'Node port to ToR port map',screen:7,branch:[TOR_USED],fields:[t('name','Link name',true),r('adapter','Node physical port',['adapters'],true),r('torSwitch','Top-of-rack switch',['torSwitches'],true),t('torPort','Switch port',true),s('mode','Switch port mode',['trunk','access']),t('vlans','Allowed VLANs')]},
 {key:'firewallLinks',title:'Firewall port to ToR port map',screen:7,branch:[FIREWALL_USED,TOR_USED],fields:[t('name','Link name',true),r('firewall','Firewall unit',['firewalls'],true),t('firewallPort','Firewall interface',true),r('torSwitch','Top-of-rack switch',['torSwitches'],true),t('torPort','Switch port',true),s('mode','Switch port mode',['trunk','access']),t('vlans','Allowed VLANs')]},
 {key:'bmcLinks',title:'BMC to out-of-band port map',screen:7,branch:[OOB_USED],fields:[t('name','Link name',true),r('node','Node',['nodes'],true),t('oobPort','Out-of-band port',true),t('vlan','Access VLAN')]},
 {key:'consolePorts',title:'Console port map',screen:7,branch:[OPENGEAR_USED],fields:[t('name','Console port label',true),dflt(n('port','Serial port number',96,true),1),r('device','Connected device',['firewalls','torSwitches','nodes']),t('deviceLabel','Connected device if not recorded'),s('baud','Baud rate',['115200','9600']),s('pinout','Port pinout',['cisco-rolled','cisco-straight'])]},
].map(g=>({...g,since:9} as Group)))
// Schema 10: switchless node-to-node storage cable map. Revealed only for S2D or hybrid storage with switchless connectivity.
export const STORAGE_SWITCHLESS=[gate('architecture','storage',S2D_STORAGE),gate('architecture','switching',['switchless'])]
collections.push({key:'storageLinks',title:'Switchless storage cable map',screen:7,since:10,branch:STORAGE_SWITCHLESS,fields:[
 t('name','Link name',true),{...n('linkIndex','Link number',12,true),min:1,default:1},
 r('nodeA','Node A',['nodes'],true),r('portA','Node A storage port',['adapters'],true),
 r('nodeB','Node B',['nodes'],true),r('portB','Node B storage port',['adapters'],true),
 t('subnet','Link storage subnet (CIDR)'),n('vlan','Link storage VLAN',4094,true),
]})
applyHelp(settings, collections)
