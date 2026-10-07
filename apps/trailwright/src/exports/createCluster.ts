import type { Project } from '../model/schema';
import { slug } from './types';
import { storageSubnetsFor, patternFor } from '../network/patterns';
import { allPorts, roleOf } from '../network/ports';

// The parameters of Microsoft's Azure Local deployment templates (azure-quickstart-templates, microsoft.azurestackhci):
//   create-cluster (Active Directory) and create-adless-cluster-external-dns-public-preview (local identity with Key Vault).
// Every template parameter is produced from the design. Secure values are never stored: they are null in the JSON file
// (as in Microsoft's sample) and read from environment variables in the Bicep parameter file.

export type TemplateName =
  | 'create-cluster'
  | 'create-adless-cluster'
  | 'create-cluster-san'
  | 'create-cluster-adless-san'
  | 'create-cluster-rac-enabled'
  | 'create-rack-aware-adless-cluster-external-dns'
  | 'create-cluster-rac-enabled-disconnected';
export type Params = Record<string, unknown>;

export const SECURE_PARAMS = ['localAdminPassword', 'AzureStackLCMAdminPassword'] as const;

// Microsoft publishes a template for each combination of architecture, topology and identity.
export function templateFor(p: Project): TemplateName {
  const local = p.identity.mode === 'local-identity-key-vault';
  if (p.deployment.architecture === 'disaggregated') return local ? 'create-cluster-adless-san' : 'create-cluster-san';
  if (p.hardware.topology === 'rack-aware') return p.deployment.mode === 'disconnected' ? 'create-cluster-rac-enabled-disconnected' : local ? 'create-rack-aware-adless-cluster-external-dns' : 'create-cluster-rac-enabled';
  return local ? 'create-adless-cluster' : 'create-cluster';
}

// Rack-aware: the machines of each rack. A machine without a zone goes to Zone1 in the first half and Zone2 in the second.
export function zonesOf(p: Project): { localAvailabilityZoneName: string; nodes: string[] }[] {
  const n = p.hardware.nodes.length;
  const zones: { localAvailabilityZoneName: string; nodes: string[] }[] = [];
  p.hardware.nodes.forEach((node, i) => {
    const name = node.zone?.trim() || (i < n / 2 ? 'Zone1' : 'Zone2');
    const found = zones.find((z) => z.localAvailabilityZoneName === name);
    if (found) found.nodes.push(node.name);
    else zones.push({ localAvailabilityZoneName: name, nodes: [node.name] });
  });
  return zones;
}

export function witnessTypeFor(p: Project): 'Cloud' | 'No Witness' {
  if (p.hardware.nodes.length === 2) return 'Cloud';
  return p.hardware.witness === 'cloud' ? 'Cloud' : 'No Witness';
}

const patternName = (p: Project): string =>
  ({ all: 'hyperConverged', 'mgmt-compute': 'convergedManagementCompute', 'compute-storage': 'convergedComputeStorage', custom: 'custom' })[p.networking.intentGrouping];

const networkingType = (p: Project): string =>
  p.hardware.nodes.length === 1 ? 'singleServerDeployment' : p.networking.storage === 'switchless' ? 'switchlessMultiServerDeployment' : 'switchedMultiServerDeployment';

const cap = (t: string): string => t.charAt(0).toUpperCase() + t.slice(1);

// CIDR to address base and mask, for the storage subnets of the switchless patterns.
function parseCidr(cidr: string): { base: string; mask: string } | undefined {
  const m = /^(\d+)\.(\d+)\.(\d+)\.(\d+)\/(\d+)$/.exec(cidr.trim());
  if (!m) return undefined;
  const bits = Number(m[5]);
  if (bits < 0 || bits > 32) return undefined;
  const maskNum = bits === 0 ? 0 : (0xffffffff << (32 - bits)) >>> 0;
  const mask = [24, 16, 8, 0].map((s) => (maskNum >>> s) & 255).join('.');
  return { base: `${m[1]}.${m[2]}.${m[3]}`, mask };
}

type AdapterIp = { physicalNode: string; ipv4Address: string; subnetMask: string };

// A full mesh between the nodes: every pair has `links` subnets; the node that comes first in the pair gets .1 and the other .2.
// A node's k-th storage adapter is the k-th link it takes part in, so storage network k lists, for each node, the address of its k-th adapter.
export function switchlessStorageIps(nodeNames: string[], links: number, subnets: string[]): AdapterIp[][] {
  const n = nodeNames.length;
  const perNode: AdapterIp[][] = Array.from({ length: n }, () => []);
  let subnetIndex = 0;
  for (let i = 0; i < n; i++) {
    for (let j = i + 1; j < n; j++) {
      for (let l = 0; l < links; l++) {
        const cidr = parseCidr(subnets[subnetIndex] ?? `10.0.${subnetIndex + 1}.0/24`) ?? { base: `10.0.${subnetIndex + 1}`, mask: '255.255.255.0' };
        perNode[i].push({ physicalNode: nodeNames[i], ipv4Address: `${cidr.base}.1`, subnetMask: cidr.mask });
        perNode[j].push({ physicalNode: nodeNames[j], ipv4Address: `${cidr.base}.2`, subnetMask: cidr.mask });
        subnetIndex++;
      }
    }
  }
  // Transpose: storage network k is the k-th adapter of every node.
  const adapters = perNode[0]?.length ?? 0;
  return Array.from({ length: adapters }, (_, k) => perNode.map((node) => node[k]));
}

export function storageNetworkList(p: Project): unknown[] {
  const storageAdapters = p.networking.intents.filter((i) => i.traffic.includes('storage')).flatMap((i) => i.adapters);
  const names = p.hardware.nodes.map((n) => n.name);
  const links = p.networking.switchlessLinks === 'single' ? 1 : 2;
  const custom = !p.networking.storageAutoIp && p.networking.storage === 'switchless' && names.length >= 3;
  const ips = custom ? switchlessStorageIps(names, links, p.networking.storageSubnets.length ? p.networking.storageSubnets : (patternFor(p) ? storageSubnetsFor(patternFor(p)!) : [])) : [];
  return storageAdapters.map((adapter, k) => ({
    name: `StorageNetwork${k + 1}`,
    networkAdapterName: adapter,
    vlanId: String(p.networking.storageVlans[k] ?? p.networking.storageVlans[p.networking.storageVlans.length - 1] ?? 711),
    ...(custom && ips[k] ? { storageAdapterIPInfo: ips[k] } : {}),
  }));
}

// Disaggregated: the cluster networks run on standalone ports, described here instead of storage networks.
export function sanNetworkList(p: Project): Record<string, unknown> {
  const vlans = [1711, 1712];
  const adapters = allPorts(p).filter((x) => roleOf(x.ref).kind === 'cluster').sort((a, b) => a.ref.role.localeCompare(b.ref.role)).map((x) => x.ref.osName);
  return {
    clusterNetworkConfig: {
      adapterProperties: { bandwidthPercentageSmb: 50, jumboPacket: 9014, priorityValue8021ActionCluster: 7, priorityValue8021ActionSmb: 3 },
      adapterIPConfig: ['A', 'B'].map((x, k) => ({ name: `clusterNetwork-${x}`, networkAdapterName: adapters[k] ?? '', vlanId: vlans[k], addressPrefix: p.networking.clusterSubnets[k] ?? '' })),
    },
  };
}

export function intentList(p: Project): unknown[] {
  return p.networking.intents.map((i) => ({
    name: i.name,
    trafficType: i.traffic.map(cap),
    adapter: i.adapters,
    overrideVirtualSwitchConfiguration: i.overrideVSwitch ?? false,
    virtualSwitchConfigurationOverrides: i.overrideVSwitch ? { enableIov: i.enableIov ?? 'true', loadBalancingAlgorithm: i.loadBalancingAlgorithm ?? 'Dynamic' } : { enableIov: '', loadBalancingAlgorithm: '' },
    overrideQosPolicy: i.overrideQos ?? false,
    qosPolicyOverrides: {
      priorityValue8021Action_Cluster: i.qosClusterPriority ?? '7',
      priorityValue8021Action_SMB: i.qosSmbPriority ?? '3',
      bandwidthPercentage_SMB: i.qosSmbBandwidth ?? '50',
    },
    overrideAdapterProperty: i.overrideAdapter ?? false,
    adapterPropertyOverrides: {
      jumboPacket: i.jumboPacket ?? '9014',
      networkDirect: i.networkDirect ?? 'Enabled',
      networkDirectTechnology: i.networkDirect === 'Disabled' ? '' : (i.networkDirectTechnology ?? 'RoCEv2'),
    },
  }));
}

export function buildCreateClusterParams(p: Project, mode: 'Validate' | 'Deploy' = 'Validate'): Params {
  const lz = p.landingZone;
  const isLocal = p.identity.mode === 'local-identity-key-vault';
  const rg = lz.resourceGroup;
  const witness = witnessTypeFor(p);
  const params: Params = {
    deploymentMode: mode,
    keyVaultName: lz.keyVaultName || p.identity.keyVaultName || '',
    createNewKeyVault: true,
    softDeleteRetentionDays: lz.keyVaultRetentionDays ?? 30,
    diagnosticStorageAccountName: lz.diagnosticStorageAccountName ?? '',
    logsRetentionInDays: lz.logsRetentionDays ?? 30,
    storageAccountType: 'Standard_LRS',
    clusterName: lz.instanceName || slug(p.meta.name),
    location: lz.region,
    tenantId: lz.tenantId ?? '',
    witnessType: witness,
    clusterWitnessStorageAccountName: witness === 'Cloud' ? lz.witnessStorageAccount ?? '' : '',
    localAdminUserName: p.identity.localAdminUsername ?? '',
    localAdminPassword: null,
    ...(isLocal ? {} : { AzureStackLCMAdminUsername: p.identity.lcmUsername ?? '', AzureStackLCMAdminPassword: null }),
    hciResourceProviderObjectID: lz.hciResourceProviderObjectId ?? '',
    arcNodeResourceIds: p.hardware.nodes.map((n) => `/subscriptions/${lz.subscriptionId ?? ''}/resourceGroups/${rg}/providers/Microsoft.HybridCompute/machines/${n.name}`),
    ...(isLocal ? {} : { domainFqdn: p.identity.domain ?? '' }),
    namingPrefix: lz.namingPrefix || slug(p.meta.name).replace(/-/g, '').slice(0, 8),
    ...(isLocal ? {} : { adouPath: p.identity.ouPath ?? '' }),
    ...(isLocal
      ? {
          identityProvider: 'LocalIdentity',
          dnsServerConfig: p.identity.dnsServerConfig ?? 'UseDnsServer',
          dnsZones: [{ dnsZoneName: p.identity.dnsZoneName ?? '', dnsForwarder: p.identity.dnsForwarders ?? [] }],
        }
      : {}),
    securityLevel: p.security.level,
    driftControlEnforced: p.security.driftControl,
    credentialGuardEnforced: p.security.credentialGuard,
    smbSigningEnforced: p.security.smbSigning,
    smbClusterEncryption: p.security.smbClusterEncryption,
    bitlockerBootVolume: p.security.bitlockerBootVolume,
    bitlockerDataVolumes: p.security.bitlockerDataVolumes,
    wdacEnforced: p.security.wdac,
    streamingDataClient: p.security.streamingData,
    euLocation: p.security.euLocation,
    episodicDataUpload: p.security.episodicData,
    configurationMode: p.storage.configurationMode,
    subnetMask: p.infrastructure.subnetMask,
    defaultGateway: p.infrastructure.gateway,
    startingIPAddress: p.infrastructure.startIp,
    endingIPAddress: p.infrastructure.endIp,
    dnsServers: p.infrastructure.dnsServers,
    useDhcp: p.infrastructure.useDhcp,
    physicalNodesSettings: p.hardware.nodes.map((n) => ({ name: n.name, ipv4Address: n.ip ?? '' })),
    networkingType: networkingType(p),
    networkingPattern: patternName(p),
    intentList: intentList(p),
    storageNetworkList: storageNetworkList(p),
    storageConnectivitySwitchless: p.networking.storage === 'switchless',
    enableStorageAutoIp: p.networking.storageAutoIp,
    customLocation: lz.customLocation ?? '',
    sbeVersion: '',
    sbeFamily: '',
    sbePublisher: '',
    sbeManifestSource: '',
    sbeManifestCreationDate: '',
    partnerProperties: [],
    partnerCredentiallist: [],
  };
  if (p.deployment.architecture === 'disaggregated') {
    // create-cluster-san and create-cluster-adless-san: infrastructure volumes on the SAN, cluster networks instead of storage networks.
    delete params.storageNetworkList;
    delete params.enableStorageAutoIp;
    Object.assign(params, {
      configurationMode: 'InfraOnly',
      infraVolLunId: p.storage.infraVolLunId,
      infraPerfLunId: p.storage.infraPerfLunId,
      sanNetworkList: sanNetworkList(p),
      networkingType: 'switchedMultiServerDeployment',
      networkingPattern: p.networking.intents.length > 1 ? 'custom' : 'convergedManagementCompute',
      storageConnectivitySwitchless: false,
    });
  }
  if (p.hardware.topology === 'rack-aware') {
    params.clusterPattern = 'RackAware';
    params.localAvailabilityZones = zonesOf(p);
  }
  if (templateFor(p) === 'create-cluster-rac-enabled-disconnected') {
    // The disconnected rack-aware template has no diagnostic storage or SBE parameters, and takes a file share witness.
    for (const k of ['diagnosticStorageAccountName', 'logsRetentionInDays', 'storageAccountType', 'clusterWitnessStorageAccountName', 'sbeVersion', 'sbeFamily', 'sbePublisher', 'sbeManifestSource', 'sbeManifestCreationDate', 'partnerProperties', 'partnerCredentiallist']) delete params[k];
    Object.assign(params, { witnessType: 'FileShare', witnessPath: p.hardware.witnessPath, keyVaultSuffix: `.vault.${p.disconnected.domainSuffix}`, edgeDevicesBatchSize: 8 });
  }  return params;
}

// The ARM deployment parameters file: Microsoft's format, parameters wrapped in value.
export function buildArmParametersFile(p: Project, mode: 'Validate' | 'Deploy' = 'Validate'): string {
  const wrapped: Record<string, { value: unknown }> = {};
  for (const [k, v] of Object.entries(buildCreateClusterParams(p, mode))) wrapped[k] = { value: v };
  return `${JSON.stringify({ $schema: 'https://schema.management.azure.com/schemas/2019-04-01/deploymentParameters.json#', contentVersion: '1.0.0.0', parameters: wrapped }, null, 2)}\n`;
}

const q = (s: string): string => `'${s.replace(/\\/g, '\\\\').replace(/'/g, "\\'")}'`;

function bicepValue(v: unknown, indent = 0): string {
  const pad = '  '.repeat(indent);
  if (Array.isArray(v)) return v.length === 0 ? '[]' : `[\n${v.map((x) => `${pad}  ${bicepValue(x, indent + 1)}`).join('\n')}\n${pad}]`;
  if (v && typeof v === 'object') {
    const entries = Object.entries(v as Record<string, unknown>);
    return entries.length === 0 ? '{}' : `{\n${entries.map(([k, x]) => `${pad}  ${/^[A-Za-z_][A-Za-z0-9_]*$/.test(k) ? k : q(k)}: ${bicepValue(x, indent + 1)}`).join('\n')}\n${pad}}`;
  }
  if (typeof v === 'string') return q(v);
  return String(v);
}

const ENV_VAR: Record<string, string> = { localAdminPassword: 'AZLOCAL_LOCAL_ADMIN_PASSWORD', AzureStackLCMAdminPassword: 'AZLOCAL_LCM_PASSWORD' };

// The same values as a .bicepparam file that uses the template next to it; secure values come from environment variables.
export function buildBicepParamFile(p: Project, mode: 'Validate' | 'Deploy' = 'Validate'): string {
  const lines = [`using './azuredeploy.json'`, ''];
  for (const [k, v] of Object.entries(buildCreateClusterParams(p, mode))) {
    lines.push(`param ${k} = ${v === null && ENV_VAR[k] ? `readEnvironmentVariable('${ENV_VAR[k]}')` : bicepValue(v)}`);
  }
  return `${lines.join('\n')}\n`;
}