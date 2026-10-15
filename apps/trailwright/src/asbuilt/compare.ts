import type { Project } from '../model/schema';
import type { Snapshot } from './snapshot';

// Compare a design record with an as-built snapshot.
//   match         the design and the as-built agree
//   drift         both have it and they differ, or the as-built has something the design does not
//   missing       the design has it and the as-built does not
//   not-captured  the snapshot has no data for this area, so nothing can be said
export type Status = 'match' | 'drift' | 'missing' | 'not-captured';
export type Severity = 'ok' | 'warning' | 'error' | 'info';
export type Row = { area: string; item: string; design: string; asBuilt: string; status: Status; severity: Severity };

const sevOf = (status: Status, important: boolean): Severity => (status === 'match' ? 'ok' : status === 'not-captured' ? 'info' : status === 'missing' ? 'error' : important ? 'error' : 'warning');
const norm = (s: string | undefined): string => (s ?? '').trim().toLowerCase();
const list = (v: string[]): string => (v.length ? v.join(', ') : '(none)');
const sameSet = (a: string[], b: string[]): boolean => a.length === b.length && [...a].map(norm).sort().every((x, i) => x === [...b].map(norm).sort()[i]);

function row(area: string, item: string, design: string, asBuilt: string, status: Status, important = false): Row {
  return { area, item, design, asBuilt, status, severity: sevOf(status, important) };
}

export function compareAsBuilt(p: Project, s: Snapshot): Row[] {
  const rows: Row[] = [];
  const train = `12.${p.release.version}`;

  // Release
  if (s.cluster?.release === undefined) rows.push(row('Release', 'release', p.release.build || train, '', 'not-captured'));
  else {
    const want = p.release.build.trim() || train;
    const got = s.cluster.release.trim();
    const ok = p.release.build.trim() ? got === want : got === train || got.startsWith(`${train}.`);
    rows.push(row('Release', 'release', want, got, ok ? 'match' : 'drift', true));
  }

  // Cluster name
  const designName = p.landingZone.instanceName.trim();
  if (s.cluster?.name !== undefined && designName) rows.push(row('Cluster', 'name', designName, s.cluster.name, norm(designName) === norm(s.cluster.name) ? 'match' : 'drift'));

  // Identity
  if (!s.identity) rows.push(row('Identity', 'model', p.identity.mode, '', 'not-captured'));
  else {
    rows.push(row('Identity', 'model', p.identity.mode, s.identity.model, p.identity.mode === s.identity.model ? 'match' : 'drift', true));
    const dd = norm(p.identity.mode === 'active-directory' ? p.identity.domain : p.identity.dnsZoneName);
    if (dd && s.identity.domain !== undefined) rows.push(row('Identity', 'domain or DNS zone', dd, norm(s.identity.domain), dd === norm(s.identity.domain) ? 'match' : 'drift'));
  }

  // Witness
  if (!s.witness) rows.push(row('Cluster', 'witness', p.hardware.witness, '', 'not-captured'));
  else rows.push(row('Cluster', 'witness', p.hardware.witness, s.witness.type, p.hardware.witness === s.witness.type ? 'match' : 'drift', true));

  // Nodes
  if (!s.nodes) rows.push(row('Nodes', 'nodes', String(p.hardware.nodes.length), '', 'not-captured'));
  else {
    rows.push(row('Nodes', 'node count', String(p.hardware.nodes.length), String(s.nodes.length), p.hardware.nodes.length === s.nodes.length ? 'match' : 'drift', true));
    for (const n of p.hardware.nodes) {
      const found = s.nodes.find((x) => norm(x.name) === norm(n.name));
      if (!found) {
        rows.push(row('Nodes', n.name, 'present', 'absent', 'missing'));
        continue;
      }
      rows.push(row('Nodes', n.name, 'present', 'present', 'match'));
      if (n.ip && found.managementIp !== undefined) rows.push(row('Nodes', `${n.name} management IP`, n.ip, found.managementIp, n.ip === found.managementIp ? 'match' : 'drift'));
      if (n.storageIps?.length && found.storageIps) rows.push(row('Nodes', `${n.name} storage IPs`, list(n.storageIps), list(found.storageIps), sameSet(n.storageIps, found.storageIps) ? 'match' : 'drift'));
      if (n.serial && found.serial !== undefined) rows.push(row('Nodes', `${n.name} serial number`, n.serial, found.serial, norm(n.serial) === norm(found.serial) ? 'match' : 'drift'));
    }
    for (const x of s.nodes) if (!p.hardware.nodes.some((n) => norm(n.name) === norm(x.name))) rows.push(row('Nodes', x.name, 'not in the design', 'present', 'drift', true));
  }

  // VLANs: by id. The design lists the VLANs of the network design and the management VLAN.
  if (!s.vlans) rows.push(row('Network', 'VLANs', String(p.networking.vlans.length), '', 'not-captured'));
  else {
    const built = new Set(s.vlans.map((v) => v.id));
    const designed = new Set([...p.networking.vlans.map((v) => v.id), ...p.networking.storageVlans, ...(p.infrastructure.managementVlan > 0 ? [p.infrastructure.managementVlan] : [])]);
    for (const v of p.networking.vlans) rows.push(row('Network', `VLAN ${v.id} (${v.name})`, 'planned', built.has(v.id) ? 'present' : 'absent', built.has(v.id) ? 'match' : 'missing'));
    for (const id of p.networking.storageVlans) if (!p.networking.vlans.some((v) => v.id === id)) rows.push(row('Network', `Storage VLAN ${id}`, 'planned', built.has(id) ? 'present' : 'absent', built.has(id) ? 'match' : 'missing'));
    for (const id of built) if (id > 0 && !designed.has(id)) rows.push(row('Network', `VLAN ${id}`, 'not in the design', 'present', 'drift'));
  }

  // Intents: by name, else by the traffic they carry.
  if (!s.intents) rows.push(row('Network', 'intents', String(p.networking.intents.length), '', 'not-captured'));
  else {
    const used = new Set<number>();
    for (const i of p.networking.intents) {
      let idx = s.intents.findIndex((x, k) => !used.has(k) && norm(x.name) === norm(i.name));
      if (idx < 0) idx = s.intents.findIndex((x, k) => !used.has(k) && sameSet(x.traffic, i.traffic));
      if (idx < 0) {
        rows.push(row('Network', `intent ${i.name}`, `${list(i.traffic)} on ${list(i.adapters)}`, 'absent', 'missing', true));
        continue;
      }
      used.add(idx);
      const x = s.intents[idx];
      rows.push(row('Network', `intent ${i.name} traffic`, list(i.traffic), list(x.traffic), sameSet(i.traffic, x.traffic) ? 'match' : 'drift', true));
      rows.push(row('Network', `intent ${i.name} adapters`, list(i.adapters), list(x.adapters), x.adapters.length === 0 ? 'not-captured' : sameSet(i.adapters, x.adapters) ? 'match' : 'drift'));
    }
    s.intents.forEach((x, k) => {
      if (!used.has(k)) rows.push(row('Network', `intent ${x.name}`, 'not in the design', `${list(x.traffic)} on ${list(x.adapters)}`, 'drift'));
    });
  }

  // DNS servers
  if (s.dnsServers && p.infrastructure.dnsServers.length) rows.push(row('Network', 'DNS servers', list(p.infrastructure.dnsServers), list(s.dnsServers), sameSet(p.infrastructure.dnsServers, s.dnsServers) ? 'match' : 'drift'));

  // Volumes: by name.
  if (!s.volumes) rows.push(row('Storage', 'volumes', String(p.storage.volumes.length), '', 'not-captured'));
  else {
    for (const v of p.storage.volumes) {
      const found = s.volumes.find((x) => norm(x.name) === norm(v.name));
      if (!found) {
        rows.push(row('Storage', v.name, `${v.sizeGiB} GiB ${v.resiliency}`, 'absent', 'missing'));
        continue;
      }
      if (found.resiliency !== undefined) rows.push(row('Storage', `${v.name} resiliency`, v.resiliency, found.resiliency, v.resiliency === found.resiliency ? 'match' : 'drift', true));
      if (found.sizeGiB !== undefined) rows.push(row('Storage', `${v.name} size (GiB)`, String(v.sizeGiB), String(found.sizeGiB), Math.abs(found.sizeGiB - v.sizeGiB) <= Math.max(1, v.sizeGiB * 0.01) ? 'match' : 'drift'));
    }
    for (const x of s.volumes) if (!p.storage.volumes.some((v) => norm(v.name) === norm(x.name))) rows.push(row('Storage', x.name, 'not in the design', `${x.sizeGiB ?? '?'} GiB ${x.resiliency ?? ''}`.trim(), 'drift'));
  }
  return rows;
}

export function summarize(rows: Row[]): Record<Status, number> {
  const out: Record<Status, number> = { match: 0, drift: 0, missing: 0, 'not-captured': 0 };
  for (const r of rows) out[r.status]++;
  return out;
}

const csvCell = (v: string): string => {
  const safe = /^[=+\-@\t\r]/.test(v) ? `'${v}` : v;
  return /[",\n]/.test(safe) ? `"${safe.replace(/"/g, '""')}"` : safe;
};

export function buildCompareCsv(rows: Row[]): string {
  return ['Area,Item,Design,As-built,Status,Severity', ...rows.map((r) => [r.area, r.item, r.design, r.asBuilt, r.status, r.severity].map(csvCell).join(','))].join('\n');
}

export function buildCompareMarkdown(p: Project, rows: Row[]): string {
  const c = summarize(rows);
  const cell = (v: string) => v.replace(/\|/g, '\\|').replace(/\n/g, ' ');
  return [
    `# As-built compare: ${p.meta.name}`,
    '',
    `Release 12.${p.release.version} (latest). ${c.match} match, ${c.drift} drift, ${c.missing} missing, ${c['not-captured']} not captured.`,
    '',
    '| Area | Item | Design | As-built | Status |',
    '|---|---|---|---|---|',
    ...rows.map((r) => `| ${cell(r.area)} | ${cell(r.item)} | ${cell(r.design)} | ${cell(r.asBuilt)} | ${r.status} |`),
    '',
  ].join('\n');
}
