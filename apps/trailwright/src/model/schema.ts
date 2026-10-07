import { z } from 'zod';

const releaseVersionSchema = z.enum(['2605', '2606', '2607', '2608', '2609']);

const metaSchema = z.object({
  schema: z.literal(1),
  name: z.string(),
  createdAt: z.string(),
});

const releaseSchema = z.object({
  version: releaseVersionSchema.default('2609'),
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
  vlans: z.array(vlanSchema),
  intents: z.array(intentSchema),
  ipPlan: z.array(ipPlanSchema),
});

const connectivitySchema = z.object({
  path: z.enum(['direct', 'proxy', 'arc-gateway', 'private']),
  proxyUrl: z.string().optional(),
});

const landingZoneSchema = z.object({
  subscriptionName: z.string(),
  resourceGroup: z.string(),
  keyVaultName: z.string(),
  witnessStorageAccount: z.string().optional(),
  customLocation: z.string().optional(),
});

const volumeSchema = z.object({
  name: z.string(),
  sizeGiB: z.number(),
  resiliency: z.enum(['two-way', 'three-way', 'parity']),
});

const storageSchema = z.object({
  volumes: z.array(volumeSchema),
});

const operationsSchema = z.object({
  monitoring: z.boolean(),
  updateManager: z.boolean(),
  backup: z.boolean(),
  disasterRecovery: z.boolean(),
});

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