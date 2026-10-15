import type { Project } from '../model/schema';
import { maskBits, toNum } from '../network/ip';
import { slug } from './types';

// The cluster facts of a design in the form the deploy automation reads (its environment file and its Terraform variables).
// Only what the design knows is written. Everything the design cannot know (BMC details, vault names for the operations
// vault, the landing-zone block, secret names) is a PLACEHOLDER ('CHANGE-ME') that is listed, so nobody deploys with a guess.

export const PLACEHOLDER = 'CHANGE-ME';

export type Placeholder = { path: (string | number)[]; reason: string };
export type Facts = {
  facts: Record<string, unknown>;
  placeholders: Placeholder[];
  // Things the design holds that the deploy automation has no field for, or values that were changed to fit its rules.
  notes: string[];
  // Anchor name -> operating-system adapter name, for the adapter_names map. Intent adapters hold the operating-system names.
  adapterNames: Record<string, string>;
};

const RX = {
  guid: /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/,
  ipv4: /^((25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)\.){3}(25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)$/,
  cidr: /^((25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)\.){3}(25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)\/(3[0-2]|[12]?\d)$/,
  hostname: /^([a-z0-9]([a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z]{2,}$/,
  keyVault: /^[a-zA-Z](([a-zA-Z0-9]-?)*[a-zA-Z0-9])?$/,
  storageAccount: /^[a-z0-9]{3,24}$/,
  netbios: /^[a-z0-9]([a-z0-9-]{0,13}[a-z0-9])?$/,
  resourceGroup: /^rg-[a-z0-9-]+$/,
  customLocation: /^cl-[a-z0-9-]+$/,
  vlanName: /^[a-z0-9]([a-z0-9-]{0,30}[a-z0-9])?$/,
  sdnPrefix: /^[A-Za-z0-9](?!.*--)[A-Za-z0-9-]{0,6}[A-Za-z0-9]?$/,
  release: /^\d+\.\d+\.\d+\.\d+$/,
};
export const isIpv4 = (v: string): boolean => RX.ipv4.test(v);

// A cluster name or node name as a lowercase NetBIOS name of at most 15 characters.
export function toNetbios(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9-]+/g, '-')
    .replace(/^-+/, '')
    .slice(0, 15)
    .replace(/-+$/, '');
}

const secretRef = (vault: string, secret: string): string => `keyvault://${vault}/${secret}`;
const cap = (t: string): string => t.charAt(0).toUpperCase() + t.slice(1);

// The base address of the subnet that holds `ip` for a dotted mask, as a CIDR.
function cidrOf(ip: string, mask: string): string | undefined {
  const bits = maskBits(mask);
  const n = toNum(ip);
  if (bits === undefined || n === undefined) return undefined;
  const m = bits === 0 ? 0 : (0xffffffff << (32 - bits)) >>> 0;
  const base = (n & m) >>> 0;
  return `${[24, 16, 8, 0].map((s) => (base >>> s) & 255).join('.')}/${bits}`;
}

export function buildClusterFacts(p: Project): Facts {
  const placeholders: Placeholder[] = [];
  const notes: string[] = [];
  const mark = (path: (string | number)[], reason: string): string => {
    placeholders.push({ path, reason });
    return PLACEHOLDER;
  };
  // A value the design holds, kept only when it satisfies the deploy automation's rule; otherwise a placeholder says why.
  const take = (path: (string | number)[], value: string | undefined, ok: (v: string) => boolean, what: string): string => {
    const v = (value ?? '').trim();
    if (!v) return mark(path, `${what}: not set in the design`);
    if (!ok(v)) return mark(path, `${what}: "${v}" does not meet the deploy automation's rule`);
    return v;
  };

  const lz = p.landingZone;
  const facts: Record<string, unknown> = {};

  // Release: the 12.<train> train is known from the design; the full a.b.c.d build is only known when the person entered it.
  const train = `12.${p.release.version}`;
  const build = p.release.build.trim();
  if (build && RX.release.test(build) && build.startsWith(`${train}.`)) facts.release = { azure_local_version: build };
  else {
    if (build) notes.push(`The release build "${build}" is not a ${train}.x.y build and was not used.`);
    facts.release = { azure_local_version: `${train}.0.0` };
    placeholders.push({ path: ['release', 'azure_local_version'], reason: `Replace with the full deployed build (a.b.c.d); the design only knows the ${train} release train` });
  }

  // Cluster name: the Azure Local instance name, as a lowercase NetBIOS name.
  const rawName = lz.instanceName.trim() || p.meta.name;
  const clusterName = toNetbios(rawName);
  if (clusterName !== rawName) notes.push(`The cluster name "${rawName}" became "${clusterName}" (lowercase NetBIOS name, at most 15 characters).`);
  facts.cluster_name = RX.netbios.test(clusterName) && !/^\d+$/.test(clusterName) ? clusterName : mark(['cluster_name'], 'The cluster name could not be made a valid NetBIOS name');

  facts.subscription_id = take(['subscription_id'], lz.subscriptionId, (v) => RX.guid.test(v), 'Subscription ID');
  facts.azl_rp_app_object_id = take(['azl_rp_app_object_id'], lz.hciResourceProviderObjectId, (v) => RX.guid.test(v), 'Azure Local resource provider object ID');
  const vault = lz.keyVaultName || p.identity.keyVaultName || '';
  facts.kv_azl_name = take(['kv_azl_name'], vault, (v) => v.length >= 3 && v.length <= 24 && RX.keyVault.test(v), 'Cluster Key Vault name');
  facts.kv_ops_name = mark(['kv_ops_name'], 'The operations Key Vault belongs to the landing zone, which the design does not describe');
  const days = lz.keyVaultRetentionDays;
  facts.kv_soft_delete_days = days >= 7 && days <= 90 ? days : mark(['kv_soft_delete_days'], 'Soft-delete retention must be 7 to 90 days');
  const kvName = RX.keyVault.test(vault) && vault.length >= 3 && vault.length <= 24 ? vault : PLACEHOLDER;

  // Identity.
  const ad = p.identity.mode === 'active-directory';
  const zone = (ad ? p.identity.domain ?? '' : p.identity.dnsZoneName).trim().toLowerCase();
  const dnsZone = take(['identity', 'dns_zone'], zone, (v) => RX.hostname.test(v), ad ? 'Active Directory domain (identity.dns_zone)' : 'DNS zone');
  facts.identity = {
    model: ad ? 'ad-joined' : 'local-identity-keyvault',
    dns_zone: dnsZone,
    deployment_identity_name: mark(['identity', 'deployment_identity_name'], 'The deployment managed identity is created by the landing zone (id-<name>)'),
    local_admin_username_secret: kvName === PLACEHOLDER ? mark(['identity', 'local_admin_username_secret'], 'Needs the cluster Key Vault name') : secretRef(kvName, `${clusterName}-cluster-admin-username`),
    local_admin_password_secret: kvName === PLACEHOLDER ? mark(['identity', 'local_admin_password_secret'], 'Needs the cluster Key Vault name') : secretRef(kvName, `${clusterName}-cluster-admin-password`),
  };
  if (!p.identity.localAdminUsername.trim()) notes.push('No local administrator user name in the design: store one in the username secret.');
  else notes.push(`Store the local administrator user name from the design ("${p.identity.localAdminUsername}") in the username secret, and the password in the password secret; the files carry only the references.`);
  if (ad) notes.push('Active Directory identity (ad-joined): the OU path and the deployment (LCM) user are not in the deploy automation environment file; they stay in the ARM parameters.');

  // Witness.
  const w = p.hardware.witness;
  const witnessAccount = (lz.witnessStorageAccount ?? '').trim();
  if (w === 'cloud') {
    facts.witness = {
      type: 'cloud',
      storage_account_name: take(['witness', 'storage_account_name'], witnessAccount, (v) => RX.storageAccount.test(v), 'Witness storage account'),
      ...(kvName !== PLACEHOLDER ? { storage_key_secret: secretRef(kvName, `${clusterName}-WitnessStorageKey`) } : {}),
    };
  } else {
    facts.witness = { type: w === 'file-share' ? 'fileshare' : 'cloud', storage_account_name: mark(['witness', 'storage_account_name'], w === 'file-share' ? 'The design uses a file share witness; the environment file describes a storage account witness' : 'The design has no witness; the environment file needs one') };
    notes.push(w === 'file-share' ? 'File share witness: the environment file has no field for the share path; the deploy automation uses a cloud witness.' : 'No witness in the design; the deploy automation expects one.');
  }

  // Nodes.
  const nodes = p.hardware.nodes.map((n, i) => {
    const name = toNetbios(n.name);
    if (name !== n.name) notes.push(`Node "${n.name}" became "${name}" (lowercase NetBIOS name).`);
    const at = (k: string) => ['nodes', i, k];
    const storage = n.storageIps ?? [];
    const out: Record<string, unknown> = {
      name: RX.netbios.test(name) ? name : mark(at('name'), `Node name "${n.name}" is not a valid NetBIOS name`),
      management_ip: take(at('management_ip'), n.ip, (v) => RX.ipv4.test(v), `Management IP of ${n.name}`),
      storage_ips: {
        smb1: storage[0] && RX.ipv4.test(storage[0]) ? storage[0] : mark(['nodes', i, 'storage_ips', 'smb1'], p.networking.storageAutoIp ? `Storage Auto IP assigns the storage addresses of ${n.name}; the environment file needs them written down` : `Storage address 1 of ${n.name}`),
        smb2: storage[1] && RX.ipv4.test(storage[1]) ? storage[1] : mark(['nodes', i, 'storage_ips', 'smb2'], p.networking.storageAutoIp ? `Storage Auto IP assigns the storage addresses of ${n.name}; the environment file needs them written down` : `Storage address 2 of ${n.name}`),
      },
      bmc_name: mark(at('bmc_name'), 'Baseboard management controller (BMC) name: not in the design'),
      bmc_ip: mark(at('bmc_ip'), 'BMC address: not in the design'),
      lom1_mac: mark(at('lom1_mac'), 'MAC address of the first on-board adapter: not in the design (read it from the machine)'),
    };
    const tag = (n.serial ?? '').trim();
    if (tag) out.service_tag = tag.slice(0, 32);
    return out;
  });
  if (nodes.length > 16) notes.push('More than 16 nodes: the environment file allows 16.');
  facts.nodes = nodes;

  // VLANs: a named map. Names are matched on their words; anything that cannot be placed keeps a slug of its own name.
  const vlanKey = (name: string, id: number, index: number): string => {
    const n = name.toLowerCase();
    if (/(^|[^a-z0-9])(manage[a-z]*|mgmt)([^a-z0-9]|$)/.test(n)) return 'management';
    if (/(^|[^a-z0-9])(compute|workload|vms?)([^a-z0-9]|$)/.test(n)) return 'compute';
    if (/(^|[^a-z0-9])avd([^a-z0-9]|$)/.test(n)) return 'avd';
    if (/(^|[^a-z0-9])(oob|bmc|idrac|ilo)([^a-z0-9]|$)/.test(n)) return 'oob';
    if (id === p.networking.storageVlans[0]) return 'storage_a';
    if (id === p.networking.storageVlans[1]) return 'storage_b';
    if (/storage|smb|rdma/.test(n)) {
      if (/(^|[^a-z0-9])(a|1)$/.test(n) || id === p.networking.storageVlans[0]) return 'storage_a';
      if (/(^|[^a-z0-9])(b|2)$/.test(n) || id === p.networking.storageVlans[1]) return 'storage_b';
      return `storage_${index}`;
    }
    const own = n.replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '');
    return /^[a-z]/.test(own) ? own : `vlan_${own || id}`;
  };
  const vlans: Record<string, unknown> = {};
  const planByName = (name: string): string | undefined => p.networking.ipPlan.find((r) => r.name.trim().toLowerCase() === name.trim().toLowerCase())?.cidr;
  p.networking.vlans.forEach((v, i) => {
    let key = vlanKey(v.name, v.id, i);
    if (key in vlans) key = `${key}_${v.id}`;
    const isMgmt = key === 'management';
    const storage = key.startsWith('storage');
    const subnetRaw = planByName(v.name) ?? (isMgmt ? cidrOf(p.infrastructure.startIp, p.infrastructure.subnetMask) : undefined);
    const path = ['vlans', key];
    const name = slug(v.name).slice(0, 32).replace(/-+$/, '');
    vlans[key] = {
      id: v.id,
      name: RX.vlanName.test(name) ? name : mark([...path, 'name'], `VLAN name "${v.name}"`),
      subnet: subnetRaw && RX.cidr.test(subnetRaw.trim()) ? subnetRaw.trim() : mark([...path, 'subnet'], `Subnet of VLAN ${v.id} (${v.name}): add it to the IP plan with the same name as the VLAN`),
      gateway: storage ? null : isMgmt && RX.ipv4.test(p.infrastructure.gateway) ? p.infrastructure.gateway : mark([...path, 'gateway'], `Gateway of VLAN ${v.id} (${v.name})`),
      routed: !storage,
    };
  });
  // The environment file requires these VLANs by name; the design may not define all of them.
  for (const required of ['management', 'compute', 'storage_a', 'storage_b', 'avd', 'oob']) {
    if (required in vlans) continue;
    if (required === 'management' && p.infrastructure.managementVlan === 0) {
      notes.push('The management network is untagged (VLAN 0 in the design); the environment file needs a VLAN id from 1 to 4094 for it.');
    }
    notes.push(`The design has no VLAN that maps to "${required}"; the environment file requires it.`);
  }
  if (p.infrastructure.managementVlan > 0 && !('management' in vlans)) {
    vlans.management = {
      id: p.infrastructure.managementVlan,
      name: 'management',
      subnet: take(['vlans', 'management', 'subnet'], cidrOf(p.infrastructure.startIp, p.infrastructure.subnetMask), (v) => RX.cidr.test(v), 'Management subnet'),
      gateway: take(['vlans', 'management', 'gateway'], p.infrastructure.gateway, (v) => RX.ipv4.test(v), 'Management gateway'),
      routed: true,
    };
  }
  facts.vlans = vlans;

  // Adapters and intents. The environment file allows the three intent names Management, Compute and Storage.
  const adapterNames: Record<string, string> = {};
  const adapterKey = (osName: string): string => {
    const key = osName.toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '') || 'adapter';
    adapterNames[key] = osName;
    return key;
  };
  for (const c of p.networking.cards) for (const port of c.ports) if (port.osName.trim() && port.role !== 'unused') adapterKey(port.osName.trim());
  for (const i of p.networking.intents) for (const a of i.adapters) if (a.trim()) adapterKey(a.trim());
  const used = new Set<string>();
  const order = ['Management', 'Compute', 'Storage'];
  if (p.networking.intents.length > 3) notes.push('More than three intents: the environment file allows at most three (Management, Compute, Storage).');
  const intents = p.networking.intents.slice(0, 3).map((i, idx) => {
    const traffic = i.traffic.map(cap);
    const name = [...traffic, ...order].find((t) => !used.has(t)) ?? order[idx];
    used.add(name);
    if (name !== i.name) notes.push(`Intent "${i.name}" is named "${name}" in the environment file (its name must be Management, Compute or Storage).`);
    const overrides: Record<string, unknown> = {};
    if (i.overrideAdapter) {
      overrides.jumbo_packet = Number(i.jumboPacket);
      overrides.rdma_enabled = i.networkDirect === 'Enabled';
      if (i.networkDirect === 'Enabled' && i.networkDirectTechnology !== 'Auto') overrides.rdma_protocol = i.networkDirectTechnology;
    }
    if (traffic.includes('Storage')) {
      overrides.storage_vlans = p.networking.storageVlans;
      overrides.enable_storage_auto_ip = p.networking.storageAutoIp;
    }
    return { name, traffic_types: traffic, adapters: i.adapters.map((a) => a.trim()), ...(Object.keys(overrides).length ? { overrides } : {}) };
  });
  // adapter_names comes first so that the intents can refer to its values (YAML anchors need the anchor before the alias).
  facts.adapter_names = Object.keys(adapterNames).length ? adapterNames : { adapter1: mark(['adapter_names', 'adapter1'], 'Name the network adapters on the Network design step') };
  facts.intents = intents;
  if (p.networking.intents.some((i) => i.overrideVSwitch)) notes.push('Virtual switch overrides (IOV, load balancing) are in the ARM parameters; the environment file has no field for them.');

  // IP plan.
  const inf = p.infrastructure;
  const mgmtCidr = cidrOf(inf.startIp, inf.subnetMask);
  const dns = inf.dnsServers.filter((d) => RX.ipv4.test(d.trim())).map((d) => d.trim());
  const ipPlan: Record<string, unknown> = {
    management_subnet: take(['ip_plan', 'management_subnet'], mgmtCidr, (v) => RX.cidr.test(v), 'Management subnet'),
    default_gateway: take(['ip_plan', 'default_gateway'], inf.gateway, (v) => RX.ipv4.test(v), 'Management gateway'),
    infrastructure_pool: {
      start: take(['ip_plan', 'infrastructure_pool', 'start'], inf.startIp, (v) => RX.ipv4.test(v), 'Infrastructure pool start'),
      end: take(['ip_plan', 'infrastructure_pool', 'end'], inf.endIp, (v) => RX.ipv4.test(v), 'Infrastructure pool end'),
    },
    dns_servers: dns.length ? dns.slice(0, 4) : [mark(['ip_plan', 'dns_servers', 0], 'DNS servers: not set in the design')],
    dns_zone: dnsZone,
    reserved_ranges: ['10.96.0.0/12', '10.244.0.0/16'],
    storage_auto_ip: p.networking.storageAutoIp,
  };
  const ntp = p.provisioning.timeServer.trim();
  if (ntp) {
    if (RX.ipv4.test(ntp)) ipPlan.ntp_servers = [ntp];
    else notes.push(`The time server "${ntp}" is a name; the environment file takes NTP server addresses (ntp_servers) as IPv4 only, so it was left out.`);
  }
  facts.ip_plan = ipPlan;
  if (inf.useDhcp) notes.push('The design uses DHCP for the management network; the deploy automation uses static addresses.');

  // QoS: only when the design overrides it.
  const q = p.networking.intents.find((i) => i.overrideQos);
  if (q) {
    const jumbo = p.networking.intents.find((i) => i.overrideAdapter)?.jumboPacket ?? '9014';
    facts.qos = { storage_priority: Number(q.qosSmbPriority), cluster_priority: Number(q.qosClusterPriority), storage_bandwidth_percent: Number(q.qosSmbBandwidth), jumbo_frame_size: Number(jumbo) };
  }

  // Software defined networking and logical networks.
  if (p.sdn.enabled) {
    const prefix = p.sdn.prefix.trim();
    facts.sdn = { enabled: true, prefix: take(['sdn', 'prefix'], prefix, (v) => RX.sdnPrefix.test(v), 'SDN prefix') };
  }
  const lnets = p.sdn.logicalNetworks.filter((l) => l.name.trim() || l.addressPrefix.trim());
  if (lnets.length) {
    facts.logical_networks = lnets.map((l, i) => {
      const at = (k: string) => ['logical_networks', i, k];
      const name = `lnet-${slug(l.name).replace(/^lnet-/, '')}`;
      const own = l.dnsServers.filter((d) => RX.ipv4.test(d.trim()));
      return {
        name,
        vlan_id: l.vlan >= 1 ? l.vlan : mark(at('vlan_id'), `Logical network ${l.name}: the VLAN is untagged (0) in the design; the environment file needs 1 to 4094`),
        subnet: take(at('subnet'), l.addressPrefix, (v) => RX.cidr.test(v), `Subnet of logical network ${l.name}`),
        gateway: take(at('gateway'), l.gateway, (v) => RX.ipv4.test(v), `Gateway of logical network ${l.name}`),
        ip_pool: {
          start: take(['logical_networks', i, 'ip_pool', 'start'], l.poolStart, (v) => RX.ipv4.test(v), `Pool start of ${l.name}`),
          end: take(['logical_networks', i, 'ip_pool', 'end'], l.poolEnd, (v) => RX.ipv4.test(v), `Pool end of ${l.name}`),
        },
        dns_servers: own.length ? own : [mark(['logical_networks', i, 'dns_servers', 0], `DNS servers of ${l.name}`)],
      };
    });
  }

  // Storage: volumes the automation creates after deployment. The infrastructure volume is created by the deployment itself.
  const resiliency: Record<string, string> = { 'two-way': 'two-way-mirror', 'three-way': 'three-way-mirror', 'nested-two-way': 'nested-two-way-mirror' };
  const volumes: Record<string, unknown>[] = [];
  for (const v of p.storage.volumes) {
    if (/^infra(structure)?$/i.test(v.name.trim())) {
      notes.push(`Volume "${v.name}" is created by the deployment itself and is not listed.`);
      continue;
    }
    const r = resiliency[v.resiliency];
    if (!r) {
      notes.push(`Volume "${v.name}" uses ${v.resiliency} resiliency, which the environment file does not support (two-way, three-way and nested two-way mirror); it was left out.`);
      continue;
    }
    const base = slug(v.name).replace(/^csv-/, '');
    if (!/[a-z0-9]/i.test(v.name)) {
      notes.push(`Volume "${v.name}" has no name that can be used after the csv- prefix; it was left out.`);
      continue;
    }
    volumes.push({ name: `csv-${base}`, resiliency: r, size_gb: Math.max(10, Math.round(v.sizeGiB)) });
  }
  if (p.storage.volumes.length) {
    facts.storage = { volumes, storage_paths: [] };
    notes.push('Volume sizes are written as size_gb with the same number as the design (GiB).');
  }

  // VM management target.
  const rg = lz.resourceGroup.trim();
  const cl = (lz.customLocation ?? '').trim();
  facts.vm_management = {
    resource_group: take(['vm_management', 'resource_group'], rg, (v) => RX.resourceGroup.test(v), 'Cluster resource group'),
    custom_location: take(['vm_management', 'custom_location'], cl, (v) => RX.customLocation.test(v), 'Custom location'),
  };

  facts.secret_refs = {};
  placeholders.push({ path: ['secret_refs'], reason: 'Named Key Vault references the automation reads at run time: not in the design' });

  if (p.hardware.topology === 'rack-aware') notes.push('Rack-aware zones are in the ARM parameters; the environment file has no field for them.');
  if (p.deployment.architecture === 'disaggregated') notes.push('Disaggregated designs (SAN LUNs, cluster networks) are not covered by the environment file; use the ARM parameters.');
  if (p.connectivity.path !== 'direct') notes.push('The outbound connectivity path (proxy, Arc gateway, private path) is not in the environment file.');

  return { facts, placeholders, notes, adapterNames };
}

// The landing-zone keys the environment file requires and a design cannot describe.
export const LANDING_ZONE_KEYS: { key: string; example: string }[] = [
  { key: 'spoke_address_space', example: '10.20.0.0/22' },
  { key: 'subnet_jump_prefix', example: '10.20.0.0/27' },
  { key: 'subnet_pe_prefix', example: '10.20.0.32/27' },
  { key: 'subnet_mgmt_prefix', example: '10.20.0.64/27' },
  { key: 'subnet_asr_prefix', example: '10.20.0.96/27' },
  { key: 'subnet_asr_test_prefix', example: '10.20.0.128/27' },
  { key: 'budget_monthly_amount', example: '500' },
  { key: 'budget_contact_emails', example: '[owner@example.com]' },
  { key: 'enable_monitor_private_link', example: 'false' },
  { key: 'enable_voucher_storage', example: 'false' },
  { key: 'enable_jump_server', example: 'true' },
  { key: 'jump_vm_size', example: 'Standard_D2s_v5' },
  { key: 'jump_admin_username_secret', example: 'keyvault://<ops-vault>/<jump-admin-username>' },
  { key: 'jump_admin_password_secret', example: 'keyvault://<ops-vault>/<jump-admin-password>' },
  { key: 'entra_groups', example: '{ platform_operators: grp-..., azl_admins: grp-..., azl_operators: grp-..., azl_readers: grp-... }' },
  { key: 'group_object_ids', example: '{ grp_platform_operators: <guid>, grp_azl_admins: <guid>, grp_azl_operators: <guid>, grp_azl_readers: <guid> }' },
  { key: 'pim_max_activation_hours', example: '8' },
  { key: 'law_retention_days', example: '30' },
  { key: 'law_daily_cap_gb', example: '5' },
  { key: 'defender_servers_plan', example: 'P1' },
  { key: 'enable_defender_keyvault', example: 'false' },
  { key: 'enable_defender_storage', example: 'false' },
  { key: 'kv_public_network_access', example: '{ ops: Enabled, azl: Enabled }' },
  { key: 'rsv_storage_redundancy', example: 'LocallyRedundant' },
];

// Keys the cluster-facts file writes at the top level; the rest of the schema's required keys are the landing-zone block above.
export const CLUSTER_FACT_KEYS = ['subscription_id', 'kv_soft_delete_days', 'kv_ops_name', 'kv_azl_name', 'azl_rp_app_object_id', 'cluster_name', 'release', 'identity', 'witness', 'nodes', 'vlans', 'intents', 'ip_plan', 'secret_refs'];
