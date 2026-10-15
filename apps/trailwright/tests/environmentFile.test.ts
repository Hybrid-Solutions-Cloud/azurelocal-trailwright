import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import Ajv2020 from 'ajv/dist/2020';
import { describe, expect, it } from 'vitest';
import { parse } from 'yaml';
import { buildEnvironmentFile, buildTerraformVars } from '../src/exports';
import { buildClusterFacts, CLUSTER_FACT_KEYS, LANDING_ZONE_KEYS, PLACEHOLDER, toNetbios } from '../src/exports/clusterFacts';
import { createExampleProject } from '../src/examples/exampleLab';
import { exportProjects } from './exportProjects';
import { project } from './helpers';

// The contract: a vendored copy of the deploy automation's environment schema (tests/fixtures, see its $comment for source and date).
const schema = JSON.parse(readFileSync(resolve(__dirname, 'fixtures', 'azure-local.environment.schema.json'), 'utf8')) as { required: string[]; properties: Record<string, unknown> };
const ajv = new Ajv2020({ allErrors: true, strict: false, validateFormats: false });
const validate = ajv.compile(schema);

type Doc = Record<string, any>;
const at = (doc: unknown, pointer: string): unknown => pointer.split('/').filter(Boolean).reduce((node: any, key) => (node == null ? node : node[key]), doc);

// What the design cannot describe, so a schema error here is expected and documented: the landing-zone block, the VLANs a design does not have,
// and every value that is still the CHANGE-ME placeholder. Anything else is a real mismatch with the contract.
function unexpectedErrors(doc: Doc): string[] {
  validate(doc);
  const landing = new Set(LANDING_ZONE_KEYS.map((k) => k.key));
  const out: string[] = [];
  for (const e of validate.errors ?? []) {
    const value = at(doc, e.instancePath);
    const missing = (e.params as { missingProperty?: string }).missingProperty;
    if (e.keyword === 'required' && e.instancePath === '' && missing && landing.has(missing)) continue;
    if (e.keyword === 'required' && e.instancePath === '/vlans') continue;
    if (e.keyword === 'minItems' && e.instancePath === '/nodes') continue; // an empty design has no nodes yet
    if (typeof value === 'string' && value.includes(PLACEHOLDER)) continue;
    if (e.instancePath === '/release/azure_local_version' && /^12\.\d{4}\.0\.0$/.test(String(value))) continue;
    out.push(`${e.instancePath || '(root)'} ${e.message} ${JSON.stringify(e.params)}`);
  }
  return out;
}

describe('environment file export', () => {
  for (const [label, make] of exportProjects) {
    it(`matches the deploy automation schema, apart from documented placeholders: ${label}`, () => {
      const doc = parse(buildEnvironmentFile(make())) as Doc;
      expect(unexpectedErrors(doc)).toEqual([]);
    });
  }

  it('writes only keys the schema knows (the schema rejects unknown keys)', () => {
    for (const [, make] of exportProjects) {
      const doc = parse(buildEnvironmentFile(make())) as Doc;
      for (const key of Object.keys(doc)) expect(Object.keys(schema.properties), key).toContain(key);
    }
  });

  it('is fully valid once the documented placeholders and the landing-zone block are supplied', () => {
    const doc = parse(buildEnvironmentFile(createExampleProject())) as Doc;
    const fill: Record<string, unknown> = {
      kv_ops_name: 'kv-example-ops-001',
      deployment_identity_name: 'id-example-deploy',
      smb1: '198.51.100.11',
      smb2: '203.0.113.11',
      bmc_name: 'node1-bmc',
      bmc_ip: '192.0.2.201',
      lom1_mac: '00-00-5E-00-53-01',
    };
    const fillIn = (node: any): any => {
      if (Array.isArray(node)) return node.map(fillIn);
      if (node && typeof node === 'object') return Object.fromEntries(Object.entries(node).map(([k, v]) => [k, v === PLACEHOLDER ? (fill[k] ?? v) : fillIn(v)]));
      return node;
    };
    const filled = fillIn(doc) as Doc;
    filled.release.azure_local_version = '12.2609.1003.7';
    filled.vlans = {
      ...filled.vlans,
      compute: { id: 110, name: 'compute-110', subnet: '192.0.2.128/25', gateway: '192.0.2.129', routed: true },
      avd: { id: 120, name: 'avd-120', subnet: '192.0.2.0/25', gateway: '192.0.2.1', routed: true },
      oob: { id: 90, name: 'oob-90', subnet: '192.0.2.200/29', gateway: '192.0.2.201', routed: true },
    };
    Object.assign(filled, {
      spoke_address_space: '10.20.0.0/22',
      subnet_jump_prefix: '10.20.0.0/27',
      subnet_pe_prefix: '10.20.0.32/27',
      subnet_mgmt_prefix: '10.20.0.64/27',
      subnet_asr_prefix: '10.20.0.96/27',
      subnet_asr_test_prefix: '10.20.0.128/27',
      budget_monthly_amount: 500,
      budget_contact_emails: ['owner@example.com'],
      enable_monitor_private_link: false,
      enable_voucher_storage: false,
      enable_jump_server: true,
      jump_vm_size: 'Standard_D2s_v5',
      jump_admin_username_secret: 'keyvault://kv-example-ops-001/jump-user',
      jump_admin_password_secret: 'keyvault://kv-example-ops-001/jump-pass',
      entra_groups: { platform_operators: 'grp-platform-operators', azl_admins: 'grp-azl-admins', azl_operators: 'grp-azl-operators', azl_readers: 'grp-azl-readers' },
      group_object_ids: { grp_platform_operators: '00000000-0000-0000-0000-000000000001', grp_azl_admins: '00000000-0000-0000-0000-000000000002', grp_azl_operators: '00000000-0000-0000-0000-000000000003', grp_azl_readers: '00000000-0000-0000-0000-000000000004' },
      pim_max_activation_hours: 8,
      law_retention_days: 30,
      law_daily_cap_gb: 5,
      defender_servers_plan: 'P1',
      enable_defender_keyvault: false,
      enable_defender_storage: false,
      kv_public_network_access: { ops: 'Enabled', azl: 'Enabled' },
      rsv_storage_redundancy: 'LocallyRedundant',
    });
    validate(filled);
    expect(validate.errors ?? []).toEqual([]);
  });

  it('keeps the landing-zone key list in step with the schema: required keys = cluster facts + landing-zone block', () => {
    expect([...CLUSTER_FACT_KEYS, ...LANDING_ZONE_KEYS.map((k) => k.key)].sort()).toEqual([...schema.required].sort());
  });

  it('puts a TODO comment on the placeholders, and never writes a secret value', () => {
    const p = createExampleProject();
    const text = buildEnvironmentFile(p);
    const { placeholders } = buildClusterFacts(p);
    expect(placeholders.length).toBeGreaterThan(0);
    expect(text.match(/TODO:/g)?.length ?? 0).toBeGreaterThanOrEqual(placeholders.length - 1);
    for (const line of text.split('\n').filter((l) => /_secret:\s/.test(l))) expect(line).toMatch(/keyvault:\/\//);
    expect(text).not.toMatch(/password:\s*\S/i);
  });
});

describe('field mapping', () => {
  const doc = (over = {}) => parse(buildEnvironmentFile(project(over as never))) as Doc;

  it('maps identity, release, cluster name, subscription, vault and nodes', () => {
    const d = doc({
      release: { build: '12.2609.1003.7' },
      landingZone: { instanceName: 'Example_Cluster_Name_Is_Long', keyVaultName: 'kv-example-azl', keyVaultRetentionDays: 14 },
      hardware: { nodes: [{ name: 'NODE1', ip: '192.0.2.11', serial: 'SN1', cores: 16, memoryGiB: 256, drives: 4, storageIps: ['198.51.100.11', '203.0.113.11'] }] },
    });
    expect(d.release.azure_local_version).toBe('12.2609.1003.7');
    expect(d.cluster_name).toBe('example-cluster');
    expect(d.cluster_name.length).toBeLessThanOrEqual(15);
    expect(d.kv_azl_name).toBe('kv-example-azl');
    expect(d.kv_soft_delete_days).toBe(14);
    expect(d.identity.model).toBe('ad-joined');
    expect(d.identity.dns_zone).toBe('example.com');
    expect(d.nodes[0]).toMatchObject({ name: 'node1', management_ip: '192.0.2.11', service_tag: 'SN1', storage_ips: { smb1: '198.51.100.11', smb2: '203.0.113.11' } });
  });

  it('keeps the 12.2609 train and marks the build as a TODO when the build is not known; rejects a build from another train', () => {
    expect(buildEnvironmentFile(project())).toMatch(/azure_local_version: 12\.2609\.0\.0 # TODO/);
    expect((parse(buildEnvironmentFile(project({ release: { build: '12.2610.1.1' } } as never))) as Doc).release.azure_local_version).toBe('12.2609.0.0');
  });

  it('maps intents to the capitalised enums with overrides, and the intent adapters to anchored adapter_names', () => {
    const over = {
      networking: {
        storageVlans: [711, 712],
        storageAutoIp: false,
        intents: [
          { name: 'Management', traffic: ['management', 'compute'], adapters: ['Port1', 'Port2'] },
          { name: 'Storage', traffic: ['storage'], adapters: ['Port3', 'Port4'], overrideAdapter: true, jumboPacket: '9014', networkDirect: 'Enabled', networkDirectTechnology: 'iWARP' },
        ],
      },
    };
    const d = doc(over);
    expect(d.intents[0]).toMatchObject({ name: 'Management', traffic_types: ['Management', 'Compute'], adapters: ['Port1', 'Port2'] });
    expect(d.intents[1].overrides).toEqual({ jumbo_packet: 9014, rdma_enabled: true, rdma_protocol: 'iWARP', storage_vlans: [711, 712], enable_storage_auto_ip: false });
    expect(Object.values(d.adapter_names)).toEqual(['Port1', 'Port2', 'Port3', 'Port4']);
    expect(buildEnvironmentFile(project(over as never))).toMatch(/- \*port1/);
  });

  it('writes the IP plan as a CIDR and a pool, VLANs as a named map and volumes with the schema enums', () => {
    const d = doc({
      networking: { vlans: [{ name: 'Management', id: 100 }, { name: 'Compute', id: 110 }, { name: 'Storage A', id: 711 }, { name: 'Storage B', id: 712 }], ipPlan: [{ name: 'Compute', cidr: '192.0.2.128/25' }] },
      storage: { volumes: [{ name: 'vmstore', sizeGiB: 2048, resiliency: 'two-way' }, { name: 'nested', sizeGiB: 512, resiliency: 'nested-two-way' }, { name: 'parity1', sizeGiB: 512, resiliency: 'parity' }] },
    });
    expect(d.ip_plan.management_subnet).toBe('192.0.2.0/24');
    expect(d.ip_plan.infrastructure_pool).toEqual({ start: '192.0.2.21', end: '192.0.2.27' });
    expect(Object.keys(d.vlans)).toEqual(['management', 'compute', 'storage_a', 'storage_b']);
    expect(d.vlans.compute).toMatchObject({ id: 110, subnet: '192.0.2.128/25', routed: true });
    expect(d.vlans.storage_a).toMatchObject({ gateway: null, routed: false });
    expect(d.storage.volumes).toEqual([
      { name: 'csv-vmstore', resiliency: 'two-way-mirror', size_gb: 2048 },
      { name: 'csv-nested', resiliency: 'nested-two-way-mirror', size_gb: 512 },
    ]);
  });

  it('maps SDN to the sdn block and logical networks to top-level logical_networks', () => {
    const d = doc({ sdn: { enabled: true, prefix: 'sdn01', logicalNetworks: [{ name: 'compute', vlan: 110, addressPrefix: '192.0.2.128/25', gateway: '192.0.2.129', dnsServers: ['192.0.2.10'], poolStart: '192.0.2.140', poolEnd: '192.0.2.200' }] } });
    expect(d.sdn).toEqual({ enabled: true, prefix: 'sdn01' });
    expect(d.logical_networks).toEqual([{ name: 'lnet-compute', vlan_id: 110, subnet: '192.0.2.128/25', gateway: '192.0.2.129', ip_pool: { start: '192.0.2.140', end: '192.0.2.200' }, dns_servers: ['192.0.2.10'] }]);
  });

  it('turns a value the automation would reject into a placeholder instead of passing it on', () => {
    const d = doc({ landingZone: { subscriptionId: 'not-a-guid', keyVaultName: 'bad_vault_name' } });
    expect(d.subscription_id).toBe(PLACEHOLDER);
    expect(d.kv_azl_name).toBe(PLACEHOLDER);
  });

  it('makes NetBIOS names lowercase, 15 characters at most', () => {
    expect(toNetbios('Example Cluster-ONE_longer')).toBe('example-cluster');
    expect(toNetbios('--A--')).toBe('a');
  });
});

describe('Terraform variables export', () => {
  const vars = (over = {}) => JSON.parse(buildTerraformVars(project({ identity: { mode: 'local-identity-key-vault', dnsZoneName: 'lab.example.com' }, ...over } as never))) as Doc;
  // The variable names declared by variables.tf of the deploy automation's cluster-deploy Terraform root (copied 15 Oct 2026).
  const declared = readFileSync(resolve(__dirname, 'fixtures', 'cluster-deploy.variables.names.txt'), 'utf8').split(/\s+/).filter(Boolean);

  it('writes only variable names the cluster-deploy Terraform root declares', () => {
    for (const key of Object.keys(vars())) expect([...declared, '_comment']).toContain(key);
  });
  it('writes every variable the root requires (no default)', () => {
    const required = ['tenant_id', 'subscription_id', 'location', 'token', 'tags', 'cluster_name', 'identity', 'kv_azl_name', 'witness', 'azl_rp_app_object_id', 'nodes', 'intents', 'ip_plan', 'vlans', 'qos', 'release', 'names'];
    const v = vars();
    for (const key of required) expect(v, key).toHaveProperty(key);
    for (const key of ['rg_azl', 'rg_sec', 'kv_azl', 'st_witness', 'st_diag', 'cl_azl']) expect(v.names, key).toHaveProperty(key);
  });
  it('shapes nodes, identity and the intents as the variables declare them', () => {
    const v = vars();
    expect(v.identity.model).toBe('local-identity-keyvault');
    expect(Object.keys(v.nodes[0]).sort()).toEqual(['lom1_mac', 'management_ip', 'name', 'storage_ips']);
    expect(v.intents[0].adapters.every((a: unknown) => typeof a === 'string')).toBe(true);
    expect(v.tags).toMatchObject({ 'managed-by': 'azurelocal-trailwright' });
    expect(v.names.rg_sec).toBe(PLACEHOLDER);
  });
  it('flags a naming prefix longer than eight characters (the root rejects it)', () => {
    expect((JSON.parse(buildTerraformVars(project({ landingZone: { namingPrefix: 'ninechars' } } as never))) as Doc)._comment).toContain('longer than 8');
  });
});
