# infrastructure.yml field reference

`infrastructure.yml` is the design record Trailwright writes for the Azure Local Toolkit. It follows the shape of a subset of the Toolkit registry (`schema_version: 4.0.0`); it is not the full registry. The machine-readable contract is [`apps/trailwright/public/schema/infrastructure.schema.json`](../apps/trailwright/public/schema/infrastructure.schema.json) (JSON Schema 2020-12), published with the site at `/schema/infrastructure.schema.json`.

A unit test (`tests/infrastructureSchema.test.ts`) builds the export for every design in `tests/exportProjects.ts` and validates it against the schema. `npm run build` runs that test first, so the build fails when the exporter and the schema drift apart. Change both together.

Secrets are never values. Credentials are `keyvault://<vault>/<secret>` references, and the secure ARM parameters are `null`.

To deploy with the NIC deployment automation, use the **Environment file (deploy automation)** or **Terraform variables** export instead; see [ENVIRONMENT-FILE.md](ENVIRONMENT-FILE.md).

| Section | Fields | Source in the design |
|---|---|---|
| `_metadata` | `version`, `schema_version` (always `4.0.0`), `environment_name`, `generated_by`, `azure_local_release` (four digits, for example `2609`) | Project name, release |
| `site` | `name`, `owner` | Project: customer, owner |
| `environment` | `env_name`, `azure_region`, `azure_cloud` (`public`, `government`), `connectivity_mode` (`connected`, `disconnected`), `architecture` (`hyperconverged`, `hybrid`, `disaggregated`) | Connectivity mode and architecture, Azure resources |
| `azure_platform` | `subscriptions.{sub_azure_local_name, sub_azure_local_id}`, `tenant_id`, `resource_groups.rg_azurelocal_cluster`, `instance_name`, `naming_prefix`, `hci_resource_provider_object_id`, `custom_location`, `key_vault.{name, soft_delete_retention_days, audit_storage_account, audit_retention_days}`, `witness_storage_account` | Azure resources |
| `provisioning` | `os_install` (`iso`, `simplified`), `deploy_method` (`portal`, `arm`), `deployment_template`; `site.{hardware, time_zone, time_server}` only for simplified provisioning | Provisioning and deployment method |
| `identity` | `mode`, `local_admin_username`, `secrets[]` (`name`, `value` as a Key Vault reference); `active_directory.{ad_domain_fqdn, ou_path, lcm_username}` for Active Directory (two secrets), or `local_identity.{dns_server_config, dns_zone, dns_forwarders}` for local identity (one secret) | Identity |
| `connectivity` | `outbound_path`, `proxy_url`, `arc_gateway_name`; `private_path.*` only for the private path | Outbound connectivity |
| `infrastructure_network` | `use_dhcp`, `subnet_mask`, `default_gateway`, `ip_pool.{start, end}`, `dns_servers`, `management_vlan` | Management network |
| `networking` | `storage_mode` (`switched`, `switchless`, `san`), `tor_switches`, `ports_per_node`, `intent_grouping`, `storage_auto_ip`, `storage_vlans`, `vlans[]`, `intents[]` (`name`, `traffic`, `adapters`, `override_qos`, `override_adapter`), `ip_plan[]` | Network design, intents, VLANs and IP plan |
| `compute` | `cluster.{topology, witness_type, node_count}`, `nodes[]` (`name`, `ip`, `serial`, `cores`, `memory_gib`, `drives`) | Hardware and topology |
| `storage` | `architecture`, `configuration_mode`, `volumes[]` (`name`, `size_gib`, `resiliency`: `two-way`, `three-way`, `four-way`, `parity`, `nested-two-way`), `san_luns[]`; `infra_volume_lun_id` and `infra_performance_lun_id` for disaggregated designs only | Storage |
| `sdn` | `enabled`; when enabled: `prefix`, `dns_records`, `default_access_policy`, `logical_networks[]` | Software defined networking |
| `security` | `level`, the individual protections, `backup_key_vault`, `telemetry.*`, `key_vault_name` | Security |
| `operations` | `update_method`, `monitoring.*` (more fields when enabled), `backup.*`, `disaster_recovery` | Operations |
| `arm_parameters` | The same parameter set as the ARM parameter export, values only; required: `deploymentMode`, `clusterName`, `location`, `tenantId`, `namingPrefix` | All of the above |

Free-text notes are not exported to this file, but the project JSON and the handoff document do include them. Never type a secret into a note.
