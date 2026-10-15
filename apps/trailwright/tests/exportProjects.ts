import { createExampleProject } from '../src/examples/exampleLab';
import type { Project } from '../src/model/schema';

// The designs every export is tested against: each one exercises a different branch of the exporters.
const ad = (): Project => {
  const p = createExampleProject();
  p.identity = { ...p.identity, mode: 'active-directory', domain: 'lab.example.com', ouPath: 'OU=azl01,DC=lab,DC=example,DC=com', lcmUsername: 'lcmuser01', localAdminUsername: 'azladmin' };
  return p;
};

const san = (base: Project): Project => {
  base.deployment = { ...base.deployment, architecture: 'disaggregated', sanType: 'iscsi' };
  base.storage = { ...base.storage, architecture: 'san', infraVolLunId: 'LUN-INFRA-0001', infraPerfLunId: 'LUN-PERF-0002' };
  base.networking = { ...base.networking, clusterSubnets: ['10.10.100.0/24', '10.10.101.0/24'] };
  return base;
};

const racks = (p: Project): Project => {
  p.hardware = { ...p.hardware, topology: 'rack-aware', witness: 'cloud', nodes: ['n1', 'n2', 'n3', 'n4'].map((name, i) => ({ name, ip: `192.0.2.${11 + i}`, cores: 16, memoryGiB: 256, drives: 4 })) };
  return p;
};

export const exportProjects: Array<[string, () => Project]> = [
  ['example (local identity)', () => createExampleProject()],
  ['Active Directory', ad],
  ['disaggregated SAN', () => san(ad())],
  ['rack-aware', () => racks(ad())],
  ['US Government', () => {
    const p = ad();
    p.deployment = { ...p.deployment, cloud: 'government' };
    p.landingZone = { ...p.landingZone, region: 'usgovvirginia' };
    return p;
  }],
  ['private path with SDN, simplified provisioning, no monitoring', () => {
    const p = createExampleProject();
    p.connectivity = { ...p.connectivity, path: 'private-path', privatePath: { ...p.connectivity.privatePath, transport: 'expressroute', virtualNetwork: 'vnet-example', workloadSubnet: 'snet-workload', firewallSubnet: 'AzureFirewallSubnet', firewallPrivateIp: '192.0.2.4', firewallPort: '8443', proxyBypass: 'localhost' } };
    p.sdn = { ...p.sdn, enabled: true, prefix: 'sdn01', dnsRecords: 'dynamic', defaultAccessPolicy: false, logicalNetworks: [{ name: 'lnet-compute', vlan: 110, addressPrefix: '192.0.2.128/25', gateway: '192.0.2.129', dnsServers: ['192.0.2.10'], poolStart: '192.0.2.140', poolEnd: '192.0.2.200' }] };
    p.provisioning = { ...p.provisioning, osInstall: 'simplified', hardwareSku: 'dell-ax-750', timeZone: 'UTC', timeServer: 'time.example.com' };
    p.operations = { ...p.operations, monitoring: false };
    return p;
  }],
  ['nested two-way volume, switchless', () => {
    const p = createExampleProject();
    p.networking = { ...p.networking, storage: 'switchless' };
    p.storage = { ...p.storage, volumes: [{ name: 'nested', sizeGiB: 1024, resiliency: 'nested-two-way' }] };
    return p;
  }],
  ['empty design', () => {
    const p = createExampleProject();
    p.hardware = { ...p.hardware, nodes: [] };
    return p;
  }],
];
