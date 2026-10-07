import { stringify } from 'yaml';
import type { Project } from '../model/schema';

const SECRET_NAMES = ['local-admin-password', 'lcm-password'];

// A subset of the Azure Local Toolkit registry shape (schema 4.0.0): the sections a design can fill.
// Credentials are Key Vault references (keyvault://<vault>/<secret>), never values.
export function buildInfrastructureYml(p: Project): string {
  const vault = p.landingZone.keyVaultName || p.identity.keyVaultName || '';
  const identity: Record<string, unknown> = {
    mode: p.identity.mode,
    secrets: SECRET_NAMES.map((name) => ({ name, value: `keyvault://${vault}/${name}` })),
  };
  if (p.identity.mode === 'active-directory' && p.identity.domain) {
    identity.active_directory = { ad_domain_fqdn: p.identity.domain };
  }

  return stringify({
    _metadata: { version: '1.0.0', schema_version: '4.0.0', environment_name: p.meta.name, generated_by: 'azurelocal-trailwright' },
    site: { name: p.project.customer, owner: p.project.owner },
    environment: { env_name: p.meta.name, azure_region: p.landingZone.region },
    azure_platform: {
      subscriptions: { sub_azure_local_name: p.landingZone.subscriptionName },
      resource_groups: { rg_azurelocal_cluster: p.landingZone.resourceGroup },
    },
    identity,
    networking: {
      storage_mode: p.storage.architecture === 'san' ? 'san' : p.networking.storage,
      vlans: p.networking.vlans.map((v) => ({ name: v.name, id: v.id })),
      intents: p.networking.intents.map((i) => ({ name: i.name, traffic: i.traffic, adapters: i.adapters })),
      ip_plan: p.networking.ipPlan.map((r) => ({ name: r.name, cidr: r.cidr })),
    },
    compute: {
      cluster: { topology: p.hardware.topology, witness_type: p.hardware.witness, node_count: p.hardware.nodes.length },
      nodes: p.hardware.nodes.map((n) => ({ name: n.name, serial: n.serial ?? '', cores: n.cores, memory_gib: n.memoryGiB, drives: n.drives })),
    },
    storage: {
      architecture: p.storage.architecture,
      volumes: p.storage.volumes.map((v) => ({ name: v.name, size_gib: v.sizeGiB, resiliency: v.resiliency })),
      san_luns: p.storage.sanLuns.map((l) => ({ name: l.name, size_gib: l.sizeGiB })),
    },
    security: { key_vault_name: vault },
    operations: {
      monitoring: p.operations.monitoring,
      update_manager: p.operations.updateManager,
      backup: p.operations.backup,
      disaster_recovery: p.operations.disasterRecovery,
    },
  });
}