import type { Project } from '../model/schema';
import { buildClusterFacts, PLACEHOLDER } from './clusterFacts';
import { networkingType, patternName } from './createCluster';

// Terraform variables (terraform.tfvars.json) for the Azure Local deploy automation's cluster-deploy Terraform root.
// The variable names and shapes are those of that root's variables.tf; Terraform rejects a value of the wrong shape at
// plan time, and the root's own validations apply (a local identity design, a cloud witness, a naming prefix of at most 8
// characters). Values a design cannot know are 'CHANGE-ME' and are listed in the _comment key. No secret values.
// The deployment mode (Validate or Deploy) is passed with -var deployment_mode=..., as the automation does.

type Dict = Record<string, unknown>;

export function buildTerraformVars(p: Project): string {
  const { facts, placeholders } = buildClusterFacts(p);
  const lz = p.landingZone;
  const extra: string[] = [];
  const unset = (what: string): string => {
    extra.push(`${what}: not in the design`);
    return PLACEHOLDER;
  };
  const val = (v: string | undefined, what: string): string => (v && v.trim() ? v.trim() : unset(what));

  const prefix = (lz.namingPrefix || '').trim();
  if (prefix.length > 8) extra.push(`token: the naming prefix "${prefix}" is longer than 8 characters; Terraform will reject it`);
  const identity = facts.identity as Dict;
  const nodes = (facts.nodes as Dict[]).map((n) => ({ name: n.name, management_ip: n.management_ip, storage_ips: n.storage_ips, lom1_mac: n.lom1_mac }));
  const storageIntent = (facts.intents as Dict[]).find((i) => (i.traffic_types as string[]).includes('Storage'));
  const rdma = ((storageIntent?.overrides as Dict | undefined)?.rdma_protocol as string | undefined) ?? '';
  const q = (facts.qos as Dict | undefined) ?? { storage_priority: 3, cluster_priority: 7, storage_bandwidth_percent: 50, jumbo_frame_size: 9014 };

  const vars: Dict = {
    _comment: `Written by azurelocal-trailwright from "${p.meta.name}" (release 12.${p.release.version}). Every CHANGE-ME value must be replaced before terraform plan. No secret values are written. Not in the design: ${[...placeholders.map((x) => x.path.join('.')), ...extra].join('; ') || 'nothing'}.`,
    tenant_id: val(lz.tenantId, 'tenant_id'),
    subscription_id: facts.subscription_id,
    location: lz.region,
    token: prefix || unset('token (naming prefix)'),
    tags: { workload: 'azure-local', 'managed-by': 'azurelocal-trailwright' },
    cluster_name: facts.cluster_name,
    identity,
    kv_azl_name: facts.kv_azl_name,
    witness: facts.witness,
    azl_rp_app_object_id: facts.azl_rp_app_object_id,
    nodes,
    intents: facts.intents,
    ip_plan: facts.ip_plan,
    vlans: facts.vlans,
    qos: q,
    rdma_protocol: rdma,
    networking_type: networkingType(p),
    networking_pattern: patternName(p),
    release: facts.release,
    storage_configuration_mode: p.storage.configurationMode,
    security_settings: {
      drift_control_enforced: p.security.driftControl,
      credential_guard_enforced: p.security.credentialGuard,
      smb_signing_enforced: p.security.smbSigning,
      smb_cluster_encryption: p.security.smbClusterEncryption,
      bitlocker_boot_volume: p.security.bitlockerBootVolume,
      bitlocker_data_volumes: p.security.bitlockerDataVolumes,
      wdac_enforced: p.security.wdac,
    },
    observability: { streaming_data_client: p.security.streamingData, eu_location: p.security.euLocation, episodic_data_upload: p.security.episodicData },
    logs_retention_days: lz.logsRetentionDays,
    names: {
      rg_azl: (facts.vm_management as Dict).resource_group,
      rg_sec: unset('names.rg_sec (security resource group)'),
      kv_azl: facts.kv_azl_name,
      st_witness: (facts.witness as Dict).storage_account_name,
      st_diag: val(lz.diagnosticStorageAccountName, 'names.st_diag (diagnostic storage account)'),
      cl_azl: (facts.vm_management as Dict).custom_location,
    },
  };
  return `${JSON.stringify(vars, null, 2)}\n`;
}

// The Terraform root accepts this design only when it uses local identity with Key Vault and a cloud witness.
export const terraformSupports = (p: Project): boolean => p.identity.mode === 'local-identity-key-vault' && p.hardware.witness === 'cloud';
