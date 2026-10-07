import { stringify } from 'yaml';
import type { Project } from '../model/schema';
import { buildCreateClusterParams, templateFor } from './createCluster';

const SECRET_NAMES = ['local-admin-password', 'lcm-password'];

// A subset of the Azure Local Toolkit registry shape (schema 4.0.0): the sections a design can fill.
// Credentials are Key Vault references (keyvault://<vault>/<secret>), never values. The ARM parameter files carry the same values
// in the form Microsoft's deployment template takes.
export function buildInfrastructureYml(p: Project): string {
  const vault = p.landingZone.keyVaultName || p.identity.keyVaultName || '';
  const lz = p.landingZone;
  const secrets = p.identity.mode === 'active-directory' ? SECRET_NAMES : SECRET_NAMES.slice(0, 1);
  const identity: Record<string, unknown> = {
    mode: p.identity.mode,
    local_admin_username: p.identity.localAdminUsername,
    secrets: secrets.map((name) => ({ name, value: `keyvault://${vault}/${name}` })),
  };
  if (p.identity.mode === 'active-directory') {
    identity.active_directory = { ad_domain_fqdn: p.identity.domain ?? '', ou_path: p.identity.ouPath, lcm_username: p.identity.lcmUsername };
  } else {
    identity.local_identity = { dns_server_config: p.identity.dnsServerConfig, dns_zone: p.identity.dnsZoneName, dns_forwarders: p.identity.dnsForwarders };
  }
  const pp = p.connectivity.privatePath;

  return stringify({
    _metadata: { version: '1.0.0', schema_version: '4.0.0', environment_name: p.meta.name, generated_by: 'azurelocal-trailwright', azure_local_release: p.release.version },
    site: { name: p.project.customer, owner: p.project.owner },
    environment: { env_name: p.meta.name, azure_region: lz.region, azure_cloud: p.deployment.cloud, connectivity_mode: p.deployment.mode, architecture: p.deployment.architecture },
    azure_platform: {
      subscriptions: { sub_azure_local_name: lz.subscriptionName, sub_azure_local_id: lz.subscriptionId },
      tenant_id: lz.tenantId,
      resource_groups: { rg_azurelocal_cluster: lz.resourceGroup },
      instance_name: lz.instanceName || p.meta.name,
      naming_prefix: lz.namingPrefix,
      hci_resource_provider_object_id: lz.hciResourceProviderObjectId,
      custom_location: lz.customLocation ?? '',
      key_vault: { name: vault, soft_delete_retention_days: lz.keyVaultRetentionDays, audit_storage_account: lz.diagnosticStorageAccountName, audit_retention_days: lz.logsRetentionDays },
      witness_storage_account: lz.witnessStorageAccount ?? '',
    },
    provisioning: { os_install: p.provisioning.osInstall, deploy_method: p.provisioning.deployMethod, deployment_template: templateFor(p), ...(p.provisioning.osInstall === 'simplified' ? { site: { hardware: p.provisioning.hardwareSku, time_zone: p.provisioning.timeZone, time_server: p.provisioning.timeServer } } : {}) },
    identity,
    connectivity: {
      outbound_path: p.connectivity.path,
      proxy_url: p.connectivity.proxyUrl ?? '',
      arc_gateway_name: p.connectivity.arcGatewayName,
      ...(p.connectivity.path === 'private-path'
        ? { private_path: { transport: pp.transport, virtual_network: pp.virtualNetwork, workload_subnet: pp.workloadSubnet, firewall_subnet: pp.firewallSubnet, firewall_private_ip: pp.firewallPrivateIp, firewall_port: pp.firewallPort, proxy_bypass: pp.proxyBypass } }
        : {}),
    },
    infrastructure_network: {
      use_dhcp: p.infrastructure.useDhcp,
      subnet_mask: p.infrastructure.subnetMask,
      default_gateway: p.infrastructure.gateway,
      ip_pool: { start: p.infrastructure.startIp, end: p.infrastructure.endIp },
      dns_servers: p.infrastructure.dnsServers,
      management_vlan: p.infrastructure.managementVlan,
    },
    networking: {
      storage_mode: p.storage.architecture === 'san' ? 'san' : p.networking.storage,
      tor_switches: p.networking.torSwitches,
      ports_per_node: p.networking.portsPerNode,
      intent_grouping: p.networking.intentGrouping,
      storage_auto_ip: p.networking.storageAutoIp,
      storage_vlans: p.networking.storageVlans,
      vlans: p.networking.vlans.map((v) => ({ name: v.name, id: v.id })),
      intents: p.networking.intents.map((i) => ({ name: i.name, traffic: i.traffic, adapters: i.adapters, override_qos: i.overrideQos ?? false, override_adapter: i.overrideAdapter ?? false })),
      ip_plan: p.networking.ipPlan.map((r) => ({ name: r.name, cidr: r.cidr })),
    },
    compute: {
      cluster: { topology: p.hardware.topology, witness_type: p.hardware.witness, node_count: p.hardware.nodes.length },
      nodes: p.hardware.nodes.map((n) => ({ name: n.name, ip: n.ip ?? '', serial: n.serial ?? '', cores: n.cores, memory_gib: n.memoryGiB, drives: n.drives })),
    },
    storage: {
      architecture: p.storage.architecture,
      configuration_mode: p.storage.configurationMode,
      volumes: p.storage.volumes.map((v) => ({ name: v.name, size_gib: v.sizeGiB, resiliency: v.resiliency })),
      san_luns: p.storage.sanLuns.map((l) => ({ name: l.name, size_gib: l.sizeGiB })),
      ...(p.deployment.architecture === 'disaggregated' ? { infra_volume_lun_id: p.storage.infraVolLunId, infra_performance_lun_id: p.storage.infraPerfLunId } : {}),
    },
    sdn: {
      enabled: p.sdn.enabled,
      ...(p.sdn.enabled ? { prefix: p.sdn.prefix, dns_records: p.sdn.dnsRecords, default_access_policy: p.sdn.defaultAccessPolicy, logical_networks: p.sdn.logicalNetworks.map((l) => ({ name: l.name, vlan: l.vlan, address_prefix: l.addressPrefix, gateway: l.gateway, dns_servers: l.dnsServers, ip_pool: { start: l.poolStart, end: l.poolEnd } })) } : {}),
    },
    security: {
      level: p.security.level,
      drift_control: p.security.driftControl,
      credential_guard: p.security.credentialGuard,
      wdac: p.security.wdac,
      bitlocker_boot_volume: p.security.bitlockerBootVolume,
      bitlocker_data_volumes: p.security.bitlockerDataVolumes,
      smb_signing: p.security.smbSigning,
      smb_cluster_encryption: p.security.smbClusterEncryption,
      backup_key_vault: p.security.backupKeyVaultName,
      telemetry: { streaming_data: p.security.streamingData, episodic_data_upload: p.security.episodicData, eu_location: p.security.euLocation },
      key_vault_name: vault,
    },
    operations: {
      update_method: p.operations.updateMethod,
      monitoring: {
        enabled: p.operations.monitoring,
        ...(p.operations.monitoring
          ? {
              log_analytics_workspace: p.operations.workspaceName,
              workspace_resource_group: p.operations.workspaceResourceGroup,
              data_collection_rule: p.operations.useExistingDcr ? p.operations.dcrName : 'created by Insights',
              data_collection_endpoint: p.operations.agentPrivateLinks ? p.operations.dceName : '',
              refs_dedup_monitoring: p.operations.refsDedupMonitoring,
              health_alerts: p.operations.healthAlerts,
              alert_email: p.operations.alertEmail,
            }
          : {}),
      },
      backup: { enabled: p.operations.backup, approach: p.operations.backupApproach, solution: p.operations.backupSolution },
      disaster_recovery: p.operations.drMethod,
    },
    arm_parameters: buildCreateClusterParams(p),
  });
}