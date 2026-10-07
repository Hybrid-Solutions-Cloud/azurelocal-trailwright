import { runRules } from '../rules';
import type { Project } from '../model/schema';

const cell = (value: string | number | undefined): string => String(value ?? '').replace(/\|/g, '\\|').replace(/\r?\n/g, ' ');

function table(head: string[], rows: (string | number | undefined)[][]): string[] {
  return [`| ${head.join(' | ')} |`, `|${head.map(() => '---').join('|')}|`, ...rows.map((r) => `| ${r.map(cell).join(' | ')} |`), ''];
}

// The design as a readable report. Secrets never appear: the model holds none, only Key Vault names.
export function buildHandoffMarkdown(p: Project): string {
  const out: string[] = [`# ${p.meta.name}`, '', `Release: ${p.release.version}`, ''];
  if (p.project.customer || p.project.owner) out.push(`Customer: ${p.project.customer}. Owner: ${p.project.owner}.`, '');
  if (p.project.notes) out.push('## Notes', '', p.project.notes, '');

  out.push('## Hardware and topology', '', `- Topology: ${p.hardware.topology}`, `- Witness: ${p.hardware.witness}`, '');
  out.push(...table(['Node', 'Serial', 'Cores', 'Memory (GiB)', 'Drives'], p.hardware.nodes.map((n) => [n.name, n.serial, n.cores, n.memoryGiB, n.drives])));

  out.push('## Identity', '', `- Mode: ${p.identity.mode}`);
  if (p.identity.domain) out.push(`- Domain: ${p.identity.domain}`);
  if (p.identity.keyVaultName) out.push(`- Key Vault: ${p.identity.keyVaultName}`);
  out.push('');

  out.push('## Networking', '', `- Storage: ${p.networking.storage}`, '', '### VLANs', '');
  out.push(...table(['Name', 'ID'], p.networking.vlans.map((v) => [v.name, v.id])));
  out.push('### Network ATC intents', '');
  out.push(...table(['Name', 'Traffic', 'Adapters'], p.networking.intents.map((i) => [i.name, i.traffic.join(', '), i.adapters.join(', ')])));
  out.push('### IP plan', '');
  out.push(...table(['Name', 'CIDR'], p.networking.ipPlan.map((r) => [r.name, r.cidr])));

  out.push('## Connectivity', '', `- Path: ${p.connectivity.path}`);
  if (p.connectivity.proxyUrl) out.push(`- Proxy: ${p.connectivity.proxyUrl}`);
  out.push('', '## Azure landing zone', '', `- Subscription: ${p.landingZone.subscriptionName}`, `- Resource group: ${p.landingZone.resourceGroup}`, `- Key Vault: ${p.landingZone.keyVaultName}`);
  if (p.landingZone.witnessStorageAccount) out.push(`- Witness storage account: ${p.landingZone.witnessStorageAccount}`);
  if (p.landingZone.customLocation) out.push(`- Custom location: ${p.landingZone.customLocation}`);
  out.push('', '## Storage', '');
  out.push(...table(['Volume', 'Size (GiB)', 'Resiliency'], p.storage.volumes.map((v) => [v.name, v.sizeGiB, v.resiliency])));

  out.push('## Operations', '', `- Monitoring: ${p.operations.monitoring}`, `- Update Manager: ${p.operations.updateManager}`, `- Backup: ${p.operations.backup}`, `- Disaster recovery: ${p.operations.disasterRecovery}`, '');

  out.push('## Findings', '');
  const findings = runRules(p);
  if (findings.length === 0) out.push('No findings.');
  for (const f of findings) out.push(`- [${f.severity}] ${f.message} (${f.field}): <${f.learnUrl}>`);
  out.push('', 'Secrets are held as Key Vault references only.', '');
  return out.join('\n');
}