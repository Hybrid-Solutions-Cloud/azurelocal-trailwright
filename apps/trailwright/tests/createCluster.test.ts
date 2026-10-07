import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import { buildArmParametersFile, buildBicepParamFile, buildCreateClusterParams, switchlessStorageIps, templateFor, type TemplateName } from '../src/exports/createCluster';
import { createExampleProject } from '../src/examples/exampleLab';
import type { Project } from '../src/model/schema';
import { makeIntent } from '../src/model/defaults';

// The contract: Microsoft's own templates (tests/fixtures, from azure-quickstart-templates, MIT).
type TemplateParam = { type: string; allowedValues?: unknown[]; defaultValue?: unknown; minLength?: number };
const template = (name: TemplateName): Record<string, TemplateParam> => {
  const file = { 'create-cluster': 'create-cluster.azuredeploy.json', 'create-adless-cluster': 'create-adless-cluster.azuredeploy.json', 'create-cluster-san': 'san-azuredeploy.json' }[name];
  return (JSON.parse(readFileSync(resolve(__dirname, 'fixtures', file), 'utf8')) as { parameters: Record<string, TemplateParam> }).parameters;
};

const typeOk = (type: string, v: unknown): boolean => {
  switch (type.toLowerCase()) {
    case 'string':
      return typeof v === 'string';
    case 'securestring':
      return v === null || typeof v === 'string';
    case 'bool':
      return typeof v === 'boolean';
    case 'int':
      return Number.isInteger(v);
    case 'array':
      return Array.isArray(v);
    case 'object':
      return typeof v === 'object' && v !== null;
    default:
      return false;
  }
};

const adVariant = (): Project => {
  const p = createExampleProject();
  p.identity = { ...p.identity, mode: 'active-directory', domain: 'lab.example.com', ouPath: 'OU=azl01,DC=lab,DC=example,DC=com', lcmUsername: 'lcmuser01', localAdminUsername: 'azladmin' };
  return p;
};

const sanVariant = (): Project => {
  const p = adVariant();
  p.deployment = { ...p.deployment, architecture: 'disaggregated', sanType: 'iscsi' };
  p.storage = { ...p.storage, architecture: 'san', infraVolLunId: 'PURE1234567890ABCDEF', infraPerfLunId: 'PURE0987654321MNOPQR' };
  p.networking = { ...p.networking, clusterSubnets: ['10.10.100.0/24', '10.10.101.0/24'] };
  return p;
};

describe.each([
  ['local identity', (): Project => createExampleProject(), 'create-adless-cluster' as TemplateName],
  ['Active Directory', adVariant, 'create-cluster' as TemplateName],
  ['disaggregated SAN', sanVariant, 'create-cluster-san' as TemplateName],
])('the ARM parameters export for %s matches the Microsoft template', (_label, make, name) => {
  const p = make();
  const params = buildCreateClusterParams(p);
  const tpl = template(name);

  it('picks the right template', () => {
    expect(templateFor(p)).toBe(name);
  });

  it('has exactly the template parameters, no more and no fewer', () => {
    expect(Object.keys(params).sort()).toEqual(Object.keys(tpl).sort());
  });

  it('gives every parameter the right type and an allowed value', () => {
    for (const [key, def] of Object.entries(tpl)) {
      const v = params[key];
      expect(typeOk(def.type, v), `${key} (${def.type}) = ${JSON.stringify(v)}`).toBe(true);
      if (def.allowedValues && !(typeof def.defaultValue === 'string' && def.defaultValue === '' && v === '')) expect(def.allowedValues, key).toContain(v);
    }
  });

  it('leaves no required parameter empty, except the secure ones that are supplied at deployment', () => {
    for (const [key, def] of Object.entries(tpl)) {
      const required = !('defaultValue' in def);
      if (!required) continue;
      if (def.type.toLowerCase() === 'securestring') expect(params[key], key).toBeNull();
      else expect(params[key], key).not.toBe('');
    }
  });

  it('writes a valid parameters file with the wrapped values and no secret', () => {
    const doc = JSON.parse(buildArmParametersFile(p)) as { parameters: Record<string, { value: unknown }> };
    expect(Object.keys(doc.parameters).sort()).toEqual(Object.keys(tpl).sort());
    expect(doc.parameters.localAdminPassword.value).toBeNull();
    expect(doc.parameters.deploymentMode.value).toBe('Validate');
    expect(JSON.parse(buildArmParametersFile(p, 'Deploy')).parameters.deploymentMode.value).toBe('Deploy');
  });

  it('writes a Bicep parameter file that reads secrets from the environment', () => {
    const bicep = buildBicepParamFile(p);
    expect(bicep).toContain(`using './azuredeploy.json'`);
    expect(bicep).toContain(`param localAdminPassword = readEnvironmentVariable('AZLOCAL_LOCAL_ADMIN_PASSWORD')`);
    for (const key of Object.keys(tpl)) expect(bicep).toContain(`param ${key} = `);
  });
});

describe('values taken from the design', () => {
  it('builds Arc node resource ids from the subscription, resource group and node names', () => {
    const p = createExampleProject();
    const ids = buildCreateClusterParams(p).arcNodeResourceIds as string[];
    expect(ids[0]).toBe('/subscriptions/00000000-0000-0000-0000-000000000000/resourceGroups/rg-example-azl-001/providers/Microsoft.HybridCompute/machines/node1');
    expect(ids).toHaveLength(2);
  });

  it('maps the intent grouping, networking type and the intent list', () => {
    const p = createExampleProject();
    const params = buildCreateClusterParams(p);
    expect(params.networkingPattern).toBe('convergedManagementCompute');
    expect(params.networkingType).toBe('switchedMultiServerDeployment');
    const intents = params.intentList as { name: string; trafficType: string[]; adapter: string[] }[];
    expect(intents[0]).toMatchObject({ name: 'Management_Compute', trafficType: ['Management', 'Compute'], adapter: ['pNIC01', 'pNIC02'] });
    expect(params.storageNetworkList).toEqual([
      { name: 'StorageNetwork1', networkAdapterName: 'pNIC03', vlanId: '711' },
      { name: 'StorageNetwork2', networkAdapterName: 'pNIC04', vlanId: '712' },
    ]);
  });

  it('uses the Cloud witness type for two nodes and No Witness when there is none', () => {
    const p = createExampleProject();
    p.hardware.witness = 'none';
    expect(buildCreateClusterParams(p).witnessType).toBe('Cloud');
    p.hardware.nodes.push({ name: 'n3', ip: '', cores: 1, memoryGiB: 1, drives: 1 }, { name: 'n4', ip: '', cores: 1, memoryGiB: 1, drives: 1 }, { name: 'n5', ip: '', cores: 1, memoryGiB: 1, drives: 1 });
    expect(buildCreateClusterParams(p).witnessType).toBe('No Witness');
  });

  it('carries the Network ATC overrides only as the person set them', () => {
    const p = createExampleProject();
    p.networking.intents = [makeIntent({ name: 'Storage', traffic: ['storage'], adapters: ['a', 'b'], overrideAdapter: true, jumboPacket: '9014', networkDirect: 'Disabled' })];
    const intent = (buildCreateClusterParams(p).intentList as { overrideAdapterProperty: boolean; adapterPropertyOverrides: { networkDirect: string; networkDirectTechnology: string } }[])[0];
    expect(intent.overrideAdapterProperty).toBe(true);
    expect(intent.adapterPropertyOverrides.networkDirect).toBe('Disabled');
    expect(intent.adapterPropertyOverrides.networkDirectTechnology).toBe('');
  });
});

describe('switchless storage addresses (three and four nodes)', () => {
  it('gives each node one address per link, with the two ends of a link in one subnet', () => {
    const lists = switchlessStorageIps(['Node1', 'Node2', 'Node3'], 1, ['10.0.1.0/24', '10.0.2.0/24', '10.0.3.0/24']);
    expect(lists).toHaveLength(2); // two storage adapters per node (two other nodes, one link each)
    const flat = lists.flat();
    expect(flat).toHaveLength(6);
    // Node1 and Node2 share the first subnet, Node1 and Node3 the second, Node2 and Node3 the third.
    expect(lists[0][0]).toMatchObject({ physicalNode: 'Node1', ipv4Address: '10.0.1.1' });
    expect(lists[0][1]).toMatchObject({ physicalNode: 'Node2', ipv4Address: '10.0.1.2' });
    expect(new Set(flat.map((a) => a.ipv4Address)).size).toBe(6);
  });

  it('counts N x (N - 1) subnet ends for dual link: 6 for three nodes and 12 for four', () => {
    expect(switchlessStorageIps(['A', 'B', 'C'], 2, []).flat()).toHaveLength(12);
    expect(switchlessStorageIps(['A', 'B', 'C', 'D'], 2, []).flat()).toHaveLength(24);
    expect(switchlessStorageIps(['A', 'B', 'C', 'D'], 2, []).length).toBe(6);
  });

  it('puts the addresses in the export when storage auto IP is off', () => {
    const p = createExampleProject();
    p.hardware.nodes = ['Node1', 'Node2', 'Node3'].map((name, i) => ({ name, ip: `192.0.2.${11 + i}`, cores: 1, memoryGiB: 1, drives: 1 }));
    p.networking = { ...p.networking, storage: 'switchless', switchlessLinks: 'single', storageAutoIp: false, storageSubnets: ['10.0.1.0/24', '10.0.2.0/24', '10.0.3.0/24'], intents: [makeIntent({ name: 'Management_Compute', traffic: ['management', 'compute'], adapters: ['NIC1', 'NIC2'] }), makeIntent({ name: 'Storage', traffic: ['storage'], adapters: ['SMB1', 'SMB2'] })] };
    const list = buildCreateClusterParams(p).storageNetworkList as { storageAdapterIPInfo: unknown[] }[];
    expect(list).toHaveLength(2);
    expect(list[0].storageAdapterIPInfo).toHaveLength(3);
    expect(buildCreateClusterParams(p).networkingType).toBe('switchlessMultiServerDeployment');
    expect(buildCreateClusterParams(p).enableStorageAutoIp).toBe(false);
  });
});
describe('the disaggregated template', () => {
  it('describes the cluster networks, the infrastructure LUNs and no storage networks', () => {
    const params = buildCreateClusterParams(sanVariant());
    expect(params.storageNetworkList).toBeUndefined();
    expect(params.configurationMode).toBe('InfraOnly');
    expect(params.infraVolLunId).toBe('PURE1234567890ABCDEF');
    const net = (params.sanNetworkList as { clusterNetworkConfig: { adapterIPConfig: { name: string; vlanId: number; addressPrefix: string }[] } }).clusterNetworkConfig;
    expect(net.adapterIPConfig.map((a) => [a.name, a.vlanId, a.addressPrefix])).toEqual([['clusterNetwork-A', 1711, '10.10.100.0/24'], ['clusterNetwork-B', 1712, '10.10.101.0/24']]);
  });
});
