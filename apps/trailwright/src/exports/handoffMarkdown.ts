import { runRules } from '../rules';
import type { Project } from '../model/schema';
import { patternFor } from '../network/patterns';
import { templateFor, witnessTypeFor } from './createCluster';
import { slug } from './types';

const cell = (value: string | number | boolean | undefined): string => String(value ?? '').replace(/\|/g, '\\|').replace(/\r?\n/g, ' ');

function table(head: string[], rows: (string | number | boolean | undefined)[][]): string[] {
  return [`| ${head.join(' | ')} |`, `|${head.map(() => '---').join('|')}|`, ...rows.map((r) => `| ${r.map(cell).join(' | ')} |`), ''];
}

const yes = (b: boolean): string => (b ? 'yes' : 'no');

// The design as a readable report that carries every answer, and the commands to deploy from the parameter files.
// Secrets never appear: the model holds none, only names.
export function buildHandoffMarkdown(p: Project): string {
  const lz = p.landingZone;
  const pattern = patternFor(p);
  const file = slug(p.meta.name);
  const template = templateFor(p);
  const out: string[] = [`# ${p.meta.name}`, '', `Azure Local release: ${p.release.version}`, ''];
  if (p.project.customer || p.project.owner) out.push(`Customer: ${p.project.customer}. Owner: ${p.project.owner}.`, '');
  if (p.project.notes) out.push('## Notes', '', p.project.notes, '');

  out.push('## Deployment', '');
  out.push(`- Connectivity mode: ${p.deployment.mode}`, `- Architecture: ${p.deployment.architecture}${p.deployment.architecture === 'disaggregated' ? ` (${p.deployment.sanType})` : ''}`, `- Cloud and region: ${p.deployment.cloud}, ${lz.region}`);
  out.push(`- Operating system install: ${p.provisioning.osInstall === 'simplified' ? 'simplified machine provisioning (preview)' : 'ISO'}`, `- Deployed with: ${p.provisioning.deployMethod === 'arm' ? 'ARM template' : 'Azure portal'}`, '');

  out.push('## Hardware and topology', '', `- Topology: ${p.hardware.topology}${p.hardware.topology === 'rack-aware' ? ` (${p.hardware.rackAwareUplink})` : ''}`, `- Witness: ${witnessTypeFor(p)}`);
  if (p.deployment.architecture === 'disaggregated') out.push(`- Racks: ${p.hardware.racks}`);
  out.push('');
  out.push(...table(['Node', 'Management IP', 'Serial', 'Cores', 'Memory (GiB)', 'Drives'], p.hardware.nodes.map((n) => [n.name, n.ip, n.serial, n.cores, n.memoryGiB, n.drives])));

  out.push('## Identity', '', `- Mode: ${p.identity.mode}`, `- Local administrator user: ${p.identity.localAdminUsername}`);
  if (p.identity.mode === 'active-directory') out.push(`- Domain: ${p.identity.domain ?? ''}`, `- OU: ${p.identity.ouPath}`, `- Deployment (LCM) user: ${p.identity.lcmUsername}`);
  else out.push(`- Key Vault: ${p.identity.keyVaultName ?? ''}`, `- DNS: ${p.identity.dnsServerConfig}, zone ${p.identity.dnsZoneName}${p.identity.dnsForwarders.length ? `, forwarders ${p.identity.dnsForwarders.join(', ')}` : ''}`);
  out.push('');

  out.push('## Management network', '', `- Addressing: ${p.infrastructure.useDhcp ? 'DHCP for nodes and cluster IP' : 'static'}`, `- Subnet mask: ${p.infrastructure.subnetMask}`, `- Default gateway: ${p.infrastructure.gateway}`, `- Management IP pool: ${p.infrastructure.startIp} to ${p.infrastructure.endIp}`, `- DNS servers: ${p.infrastructure.dnsServers.join(', ')}`, `- Management VLAN: ${p.infrastructure.managementVlan === 0 ? 'default (untagged)' : p.infrastructure.managementVlan}`, '');

  out.push('## Networking', '', `- Storage connectivity: ${p.deployment.architecture === 'disaggregated' ? 'external SAN' : p.networking.storage}`, `- Top-of-rack switches: ${p.networking.torSwitches}`, `- Network ports per node: ${p.networking.portsPerNode}`, `- Intent grouping: ${p.networking.intentGrouping}`);
  if (pattern) out.push(`- Microsoft reference pattern: ${pattern.title} (${pattern.learnUrl})`);
  out.push(`- Storage auto IP: ${yes(p.networking.storageAutoIp)}`, `- Storage VLANs: ${p.networking.storageVlans.join(', ')}`);
  if (p.networking.storageSubnets.length) out.push(`- Storage subnets: ${p.networking.storageSubnets.join(', ')}`);
  out.push('', '### Network ATC intents', '');
  out.push(...table(['Name', 'Traffic', 'Adapters', 'QoS override', 'Adapter override'], p.networking.intents.map((i) => [i.name, i.traffic.join(', '), i.adapters.join(', '), i.overrideQos ? `cluster ${i.qosClusterPriority}, SMB ${i.qosSmbPriority}, ${i.qosSmbBandwidth}%` : 'defaults', i.overrideAdapter ? `jumbo ${i.jumboPacket}, ${i.networkDirect === 'Enabled' ? i.networkDirectTechnology : 'RDMA off'}` : 'defaults'])));
  out.push('### VLANs', '');
  out.push(...table(['Name', 'ID'], p.networking.vlans.map((v) => [v.name, v.id])));
  out.push('### IP plan', '');
  out.push(...table(['Name', 'CIDR'], p.networking.ipPlan.map((r) => [r.name, r.cidr])));

  out.push('## Outbound connectivity', '', `- Path: ${p.connectivity.path}`);
  if (p.connectivity.proxyUrl) out.push(`- Proxy: ${p.connectivity.proxyUrl}`);
  if (p.connectivity.arcGatewayName) out.push(`- Arc gateway: ${p.connectivity.arcGatewayName}`);
  if (p.connectivity.path === 'private-path') {
    const pp = p.connectivity.privatePath;
    out.push(`- Private connection: ${pp.transport}`, `- Virtual network: ${pp.virtualNetwork}`, `- Azure Firewall subnet: ${pp.firewallSubnet}`, `- Azure Firewall proxy: ${pp.firewallPrivateIp}:${pp.firewallPort}`, `- Proxy bypass list: ${pp.proxyBypass}`);
  }
  out.push('');

  out.push('## Azure resources', '', `- Subscription: ${lz.subscriptionName} (${lz.subscriptionId})`, `- Tenant: ${lz.tenantId}`, `- Resource group: ${lz.resourceGroup}`, `- Instance name: ${lz.instanceName}`, `- Naming prefix: ${lz.namingPrefix}`, `- Key Vault: ${lz.keyVaultName} (soft-delete ${lz.keyVaultRetentionDays} days)`, `- Key Vault audit log storage account: ${lz.diagnosticStorageAccountName} (retention ${lz.logsRetentionDays} days)`, `- Custom location: ${lz.customLocation ?? ''}`);
  if (lz.witnessStorageAccount) out.push(`- Witness storage account: ${lz.witnessStorageAccount}`);
  out.push(`- Azure Local resource provider object ID: ${lz.hciResourceProviderObjectId}`, '');

  out.push('## Security', '', `- Level: ${p.security.level}`, `- Drift control: ${yes(p.security.driftControl)}`, `- Credential Guard: ${yes(p.security.credentialGuard)}`, `- Application Control (WDAC): ${yes(p.security.wdac)}`, `- BitLocker boot volume: ${yes(p.security.bitlockerBootVolume)}`, `- BitLocker data volumes: ${yes(p.security.bitlockerDataVolumes)}`, `- SMB signing: ${yes(p.security.smbSigning)}`, `- SMB cluster encryption: ${yes(p.security.smbClusterEncryption)}`, `- Backup Key Vault: ${p.security.backupKeyVaultName || 'none'}`, `- Telemetry: streaming ${yes(p.security.streamingData)}, diagnostics ${yes(p.security.episodicData)}, EU data location ${yes(p.security.euLocation)}`, '');

  out.push('## Storage', '', `- Architecture: ${p.storage.architecture}`, `- Volume creation: ${p.storage.configurationMode}`, '');
  out.push(...table(['Volume', 'Size (GiB)', 'Resiliency'], p.storage.volumes.map((v) => [v.name, v.sizeGiB, v.resiliency])));
  if (p.storage.sanLuns.length) out.push(...table(['SAN LUN', 'Size (GiB)'], p.storage.sanLuns.map((l) => [l.name, l.sizeGiB])));

  out.push('## Operations', '', `- Updates: ${p.operations.updateMethod}`, `- Monitoring (Insights): ${yes(p.operations.monitoring)}`, `- Backup: ${yes(p.operations.backup)}${p.operations.backup ? ` (${p.operations.backupApproach}; ${p.operations.backupSolution})` : ''}`, `- Disaster recovery: ${p.operations.drMethod}`, '');

  out.push('## Deploy from the parameter files', '');
  out.push(`The ARM parameter files are for the Microsoft \`${template}\` template (azure-quickstart-templates, quickstarts/microsoft.azurestackhci). Validate first, then deploy. Supply the secrets from your own store; they are never written to these files.`, '');
  out.push('```powershell', '# Secrets come from your secret store, not from the files', '$localAdmin = Read-Host -AsSecureString "Local administrator password"');
  if (p.identity.mode === 'active-directory') out.push('$lcm = Read-Host -AsSecureString "Deployment (LCM) user password"');
  out.push(`New-AzResourceGroupDeployment -ResourceGroupName "${lz.resourceGroup}" -TemplateUri "https://raw.githubusercontent.com/Azure/azure-quickstart-templates/master/quickstarts/microsoft.azurestackhci/${template === 'create-cluster' ? 'create-cluster' : 'create-adless-cluster-external-dns-public-preview'}/azuredeploy.json" \``, `  -TemplateParameterFile ".\\${file}-validate.parameters.json" \``, `  -localAdminPassword $localAdmin${p.identity.mode === 'active-directory' ? ' -AzureStackLCMAdminPassword $lcm' : ''}`, '# when validation succeeds, repeat with the -deploy parameter file', '```', '');

  out.push('## Findings', '');
  const findings = runRules(p);
  if (findings.length === 0) out.push('No findings.');
  for (const f of findings) out.push(`- [${f.severity}] ${f.message} (${f.field}): <${f.learnUrl}>`);
  out.push('', 'Secrets are held as Key Vault references only.', '');
  return out.join('\n');
}