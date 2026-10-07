import { z } from 'zod';
import { regionValues } from './regions';

import { CURRENT_RELEASE } from './release';

const metaSchema = z.object({
  schema: z.literal(1),
  name: z.string(),
  createdAt: z.string(),
});

const releaseSchema = z.object({
  // Recorded for the handoff; the rules always follow the current release.
  version: z.string().default(CURRENT_RELEASE),
});

const projectDetailsSchema = z.object({
  customer: z.string(),
  owner: z.string(),
  notes: z.string(),
});

const nodeSchema = z.object({
  name: z.string(),
  // Management IP of the node (static assignment); the template calls it ipv4Address.
  ip: z.string().default(''),
  serial: z.string().optional(),
  cores: z.number(),
  memoryGiB: z.number(),
  drives: z.number(),
});

const hardwareSchema = z.object({
  topology: z.enum(['standard', 'rack-aware']),
  // Rack-aware only: how storage and nodes are cabled between the two rooms (four documented options).
  rackAwareUplink: z.enum(['dedicated-storage', 'aggregated-storage', 'per-room', 'cross-room']).default('dedicated-storage'),
  // Disaggregated only: racks (1 to 8) and the nodes in each (up to 16).
  racks: z.number().int().min(1).max(8).default(1),
  nodes: z.array(nodeSchema),
  witness: z.enum(['cloud', 'file-share', 'none']),
});

const identitySchema = z.object({
  mode: z.enum(['active-directory', 'local-identity-key-vault']),
  domain: z.string().optional(),
  keyVaultName: z.string().optional(),
  // Active Directory: the dedicated OU (distinguished name) and the LCM deployment user (name only, no domain).
  ouPath: z.string().default(''),
  lcmUsername: z.string().default(''),
  // Local administrator user name for the machines (the password is a secret, never stored here).
  localAdminUsername: z.string().default(''),
  // Local identity: how DNS is configured and the DNS zone.
  dnsServerConfig: z.enum(['UseDnsServer', 'UseForwarder']).default('UseDnsServer'),
  dnsZoneName: z.string().default(''),
  dnsForwarders: z.array(z.string()).default([]),
});

const vlanSchema = z.object({
  name: z.string(),
  id: z.number().int().min(1).max(4094),
});

const intentSchema = z.object({
  name: z.string(),
  traffic: z.array(z.enum(['management', 'compute', 'storage'])),
  adapters: z.array(z.string()),
  // Network ATC overrides (defaults are Network ATC's own; only set them when you override).
  overrideQos: z.boolean().default(false),
  qosClusterPriority: z.string().default('7'),
  qosSmbPriority: z.string().default('3'),
  qosSmbBandwidth: z.string().default('50'),
  overrideAdapter: z.boolean().default(false),
  jumboPacket: z.enum(['1514', '4088', '9014']).default('9014'),
  networkDirect: z.enum(['Enabled', 'Disabled']).default('Enabled'),
  networkDirectTechnology: z.enum(['iWARP', 'RoCE', 'RoCEv2']).default('RoCEv2'),
  overrideVSwitch: z.boolean().default(false),
  enableIov: z.enum(['true', 'false']).default('true'),
  loadBalancingAlgorithm: z.enum(['Dynamic', 'HyperVPort']).default('Dynamic'),
});

const ipPlanSchema = z.object({
  name: z.string(),
  cidr: z.string(),
});

// The physical network cards in every node (the layout is symmetric across nodes) and what each port is used for.
// A port's role is one of: unused, intent:<intent name>, cluster:1, cluster:2, iscsi:a, iscsi:b.
const portSchema = z.object({
  osName: z.string().default(''),
  speedGbps: z.number().default(25),
  rdma: z.enum(['none', 'iWARP', 'RoCE', 'RoCEv2']).default('none'),
  role: z.string().default('unused'),
});

const cardSchema = z.object({
  label: z.string().default(''),
  make: z.string().default(''),
  model: z.string().default(''),
  ports: z.array(portSchema).default([]),
});

const networkingSchema = z.object({
  storage: z.enum(['switched', 'switchless']),
  // Top-of-rack switches for north-south traffic, how storage shares the ports, and links between switchless nodes.
  torSwitches: z.union([z.literal(1), z.literal(2)]).default(2),
  storageLayout: z.enum(['dedicated', 'converged']).default('dedicated'),
  switchlessLinks: z.enum(['single', 'dual']).default('dual'),
  // Physical network ports per node, and whether Network ATC assigns the storage IP addresses.
  portsPerNode: z.number().int().min(1).max(16).default(4),
  // Decision 7: how traffic is grouped into Network ATC intents.
  intentGrouping: z.enum(['all', 'mgmt-compute', 'compute-storage', 'custom']).default('mgmt-compute'),
  // Decision 9: a dedicated network for guest (VM) backup traffic.
  backupNetwork: z.boolean().default(false),
  cards: z.array(cardSchema).default([]),
  // Disaggregated Fibre Channel: host bus adapter ports to the SAN fabrics (A and B).
  fcHbaPorts: z.number().int().default(2),
  storageAutoIp: z.boolean().default(true),
  storageSubnets: z.array(z.string()).default([]),
  // Storage VLAN per storage network (Network ATC defaults are 711 and 712, and 713 for a third).
  storageVlans: z.array(z.number().int().min(1).max(4094)).default([711, 712]),
  vlans: z.array(vlanSchema),
  intents: z.array(intentSchema),
  ipPlan: z.array(ipPlanSchema),
});

const privatePathSchema = z
  .object({
    transport: z.enum(['', 'expressroute', 'site-to-site-vpn']).default(''),
    virtualNetwork: z.string().default(''),
    workloadSubnet: z.string().default(''),
    firewallSubnet: z.string().default(''),
    firewallPrivateIp: z.string().default(''),
    firewallPort: z.string().default(''),
    arcPrivateLinkScopeOnNetwork: z.boolean().default(false),
    proxyBypass: z.string().default(''),
  })
  .default({});

const connectivitySchema = z.object({
  path: z.enum(['direct', 'proxy', 'arc-gateway', 'proxy-arc-gateway', 'private-path']),
  proxyUrl: z.string().optional(),
  // Needed by every path that uses Arc gateway: the gateway resource, in the same subscription as the machines.
  arcGatewayName: z.string().default(''),
  privatePath: privatePathSchema,
});

const landingZoneSchema = z.object({
  subscriptionName: z.string(),
  resourceGroup: z.string(),
  keyVaultName: z.string(),
  witnessStorageAccount: z.string().optional(),
  customLocation: z.string().optional(),
  region: z.enum(regionValues).default('eastus'),
  // Identifiers the deployment template needs.
  subscriptionId: z.string().default(''),
  tenantId: z.string().default(''),
  instanceName: z.string().default(''),
  namingPrefix: z.string().default(''),
  keyVaultRetentionDays: z.number().int().default(30),
  diagnosticStorageAccountName: z.string().default(''),
  logsRetentionDays: z.number().int().default(30),
  hciResourceProviderObjectId: z.string().default(''),
});

const volumeSchema = z.object({
  name: z.string(),
  sizeGiB: z.number(),
  resiliency: z.enum(['two-way', 'three-way', 'four-way', 'parity']),
});

// The drives in every node (the layout is symmetric): capacity drives and, optionally, a cache tier.
const driveGroupSchema = z.object({
  media: z.enum(['nvme', 'ssd', 'hdd']),
  count: z.number().int().min(0).default(0),
  sizeTB: z.number().min(0).default(0),
});

const driveLayoutSchema = z
  .object({
    capacity: driveGroupSchema.default({ media: 'nvme', count: 0, sizeTB: 0 }),
    cache: driveGroupSchema.default({ media: 'nvme', count: 0, sizeTB: 0 }),
  })
  .default({});

const sanLunSchema = z.object({
  name: z.string(),
  sizeGiB: z.number(),
});

const storageSchema = z.object({
  // s2d: Storage Spaces Direct only; san: external SAN (disaggregated) only; hybrid: both.
  architecture: z.enum(['s2d', 'san', 'hybrid']).default('s2d'),
  volumes: z.array(volumeSchema),
  sanLuns: z.array(sanLunSchema).default([]),
  driveLayout: driveLayoutSchema,
  // How the deployment creates volumes: Express (infrastructure and workload volumes), InfraOnly, or KeepStorage (existing data drives, single node).
  configurationMode: z.enum(['Express', 'InfraOnly', 'KeepStorage']).default('Express'),
});

const operationsSchema = z.object({
  monitoring: z.boolean(),
  // Updates are not optional. This is how they are applied: one of the two supported interfaces.
  updateManager: z.boolean().default(true),
  updateMethod: z.enum(['portal', 'powershell', 'powershell-limited']).default('portal'),
  backup: z.boolean(),
  disasterRecovery: z.boolean(),
  // Backup follow-ups: which approach, and the customer's chosen supported solution (named by the customer, not by this tool).
  backupApproach: z.enum(['host', 'guest', 'both']).default('both'),
  backupSolution: z.string().default(''),
  // Disaster recovery follow-up: how VMs are replicated.
  drMethod: z.enum(['none', 'asr', 'hyperv-replica']).default('none'),
  // Insights (Azure Monitor): where the data goes and what is enabled. Asked only when monitoring is on.
  workspaceName: z.string().default(''),
  workspaceResourceGroup: z.string().default(''),
  useExistingDcr: z.boolean().default(false),
  dcrName: z.string().default(''),
  agentPrivateLinks: z.boolean().default(false),
  dceName: z.string().default(''),
  refsDedupMonitoring: z.boolean().default(false),
  healthAlerts: z.boolean().default(true),
  alertEmail: z.string().default(''),
});

const deploymentSchema = z
  .object({
    // Decision 1: how the instance reaches Azure. Decision 2: the architecture.
    mode: z.enum(['connected', 'disconnected']).default('connected'),
    architecture: z.enum(['hyperconverged', 'hybrid', 'disaggregated']).default('hyperconverged'),
    // Disaggregated only: the type of external SAN.
    sanType: z.enum(['fibre-channel', 'iscsi']).default('fibre-channel'),
    cloud: z.enum(['public', 'government']).default('public'),
  })
  .default({});

const provisioningSchema = z
  .object({
    // Step 3A (install the OS from an ISO) or 3B (simplified machine provisioning, preview) of the deployment sequence.
    osInstall: z.enum(['iso', 'simplified']).default('iso'),
    // Simplified provisioning: the validated hardware and the site-level configuration.
    hardwareSku: z.enum(['', 'lenovo-mx650-v3', 'lenovo-mx650-v4', 'hpe-dl360-gen11', 'dell-ax-750', 'dell-ax-650', 'other']).default(''),
    timeZone: z.string().default(''),
    timeServer: z.string().default(''),
    // Simplified machine provisioning: the site (created in the portal) and its configuration; the provisioning resource is East US only in the preview.
    siteName: z.string().default(''),
    siteResourceGroup: z.string().default(''),
    proxyServer: z.string().default(''),
    adminKeyVaultName: z.string().default(''),
    // The operating system software version chosen for the machines when they are provisioned.
    osVersion: z.string().default(''),
    // Step 6A (Azure portal) or 6B (ARM template).
    deployMethod: z.enum(['portal', 'arm']).default('portal'),
  })
  .default({});

// Decision 8 of the network design framework: the management IP pool and the infrastructure network.
const infrastructureSchema = z
  .object({
    useDhcp: z.boolean().default(false),
    subnetMask: z.string().default(''),
    gateway: z.string().default(''),
    startIp: z.string().default(''),
    endIp: z.string().default(''),
    dnsServers: z.array(z.string()).default([]),
    // 0 means the default (untagged) VLAN; it cannot be changed after deployment.
    managementVlan: z.number().int().min(0).max(4094).default(0),
  })
  .default({});

// The security level and settings of the deployment, and the telemetry choices.
const securitySchema = z
  .object({
    level: z.enum(['Recommended', 'Customized']).default('Recommended'),
    driftControl: z.boolean().default(true),
    credentialGuard: z.boolean().default(true),
    smbSigning: z.boolean().default(true),
    smbClusterEncryption: z.boolean().default(false),
    bitlockerBootVolume: z.boolean().default(true),
    bitlockerDataVolumes: z.boolean().default(true),
    wdac: z.boolean().default(true),
    backupKeyVaultName: z.string().default(''),
    streamingData: z.boolean().default(true),
    euLocation: z.boolean().default(false),
    episodicData: z.boolean().default(true),
  })
  .default({});

const findingSchema = z.object({
  id: z.string(),
  severity: z.enum(['error', 'warning', 'info']),
  field: z.string(),
  message: z.string(),
  learnUrl: z.string(),
});

export const projectSchema = z.object({
  meta: metaSchema,
  release: releaseSchema,
  deployment: deploymentSchema,
  infrastructure: infrastructureSchema,
  security: securitySchema,
  provisioning: provisioningSchema,
  // Steps the person has confirmed (the steps that carry a confirm gate).
  confirmed: z.array(z.string()).default([]),
  project: projectDetailsSchema,
  hardware: hardwareSchema,
  identity: identitySchema,
  networking: networkingSchema,
  connectivity: connectivitySchema,
  landingZone: landingZoneSchema,
  storage: storageSchema,
  operations: operationsSchema,
  findings: z.array(findingSchema),
});

export type Project = z.infer<typeof projectSchema>;
export type Hardware = Project['hardware'];
export type Networking = Project['networking'];
