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
  serial: z.string().optional(),
  cores: z.number(),
  memoryGiB: z.number(),
  drives: z.number(),
});

const hardwareSchema = z.object({
  topology: z.enum(['standard', 'rack-aware']),
  nodes: z.array(nodeSchema),
  witness: z.enum(['cloud', 'file-share', 'none']),
});

const identitySchema = z.object({
  mode: z.enum(['active-directory', 'local-identity-key-vault']),
  domain: z.string().optional(),
  keyVaultName: z.string().optional(),
});

const vlanSchema = z.object({
  name: z.string(),
  id: z.number().int().min(1).max(4094),
});

const intentSchema = z.object({
  name: z.string(),
  traffic: z.array(z.enum(['management', 'compute', 'storage'])),
  adapters: z.array(z.string()),
});

const ipPlanSchema = z.object({
  name: z.string(),
  cidr: z.string(),
});

const networkingSchema = z.object({
  storage: z.enum(['switched', 'switchless']),
  // Top-of-rack switches for north-south traffic, how storage shares the ports, and links between switchless nodes.
  torSwitches: z.union([z.literal(1), z.literal(2)]).default(2),
  storageLayout: z.enum(['dedicated', 'converged']).default('dedicated'),
  switchlessLinks: z.enum(['single', 'dual']).default('dual'),
  // Physical network ports per node, and whether Network ATC assigns the storage IP addresses.
  portsPerNode: z.number().int().min(1).max(16).default(4),
  storageAutoIp: z.boolean().default(true),
  storageSubnets: z.array(z.string()).default([]),
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
});

const volumeSchema = z.object({
  name: z.string(),
  sizeGiB: z.number(),
  resiliency: z.enum(['two-way', 'three-way', 'four-way', 'parity']),
});

const sanLunSchema = z.object({
  name: z.string(),
  sizeGiB: z.number(),
});

const storageSchema = z.object({
  // s2d: Storage Spaces Direct only; san: external SAN (disaggregated) only; hybrid: both.
  architecture: z.enum(['s2d', 'san', 'hybrid']).default('s2d'),
  volumes: z.array(volumeSchema),
  sanLuns: z.array(sanLunSchema).default([]),
});

const operationsSchema = z.object({
  monitoring: z.boolean(),
  updateManager: z.boolean(),
  backup: z.boolean(),
  disasterRecovery: z.boolean(),
  // Backup follow-ups: which approach, and the customer's chosen supported solution (named by the customer, not by this tool).
  backupApproach: z.enum(['host', 'guest', 'both']).default('both'),
  backupSolution: z.string().default(''),
  // Disaster recovery follow-up: how VMs are replicated.
  drMethod: z.enum(['none', 'asr', 'hyperv-replica']).default('none'),
});

const deploymentSchema = z
  .object({
    // connected: hyperconverged with Azure; disconnected: disconnected operations; disaggregated: external SAN, multi-rack
    type: z.enum(['connected', 'disconnected', 'disaggregated']).default('connected'),
    cloud: z.enum(['public', 'government']).default('public'),
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
