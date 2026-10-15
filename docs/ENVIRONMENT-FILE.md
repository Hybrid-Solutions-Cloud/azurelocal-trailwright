# Environment file and Terraform variables (deploy automation)

Azure Local deploy automation reads an environment file (`environment/azure-local/environment.yml`) that is checked by a JSON Schema which **rejects unknown keys**. A Trailwright `infrastructure.yml` is a design record in a different shape and is refused by that schema. Two exports bridge the gap:

| Export | File | Use |
|---|---|---|
| Environment file (deploy automation) | `environment.yml` | The cluster-facts part of the environment file |
| Terraform variables (deploy automation) | `terraform.tfvars.json` | Variables for the `cluster-deploy` Terraform root. Offered for local identity with a cloud witness, which is what that root accepts |

Neither export is complete on its own, by design. Trailwright writes **what the design knows**. Everything else is `CHANGE-ME` with a `# TODO` comment next to it, or a commented example block at the end of the file. No value is invented, and no secret value is ever written: credentials are `keyvault://<vault>/<secret>` references.

Release wording: the files say `12.2609` (latest). The full build string (`a.b.c.d`) is only written when you enter it on the Project step ("Release build"); otherwise the file carries `12.2609.0.0` and a TODO.

## Field mapping

| Environment file | From the design | Notes |
|---|---|---|
| `release.azure_local_version` | Project, release build | `12.2609.x.y` if entered, else `12.2609.0.0` + TODO |
| `cluster_name` | Azure resources, instance name (else project name) | Lowercase NetBIOS, at most 15 characters; a note says when it was changed |
| `subscription_id` | Azure resources, subscription ID | GUID checked |
| `azl_rp_app_object_id` | Azure resources, resource provider object ID | GUID checked |
| `kv_azl_name` | Azure resources, Key Vault (else identity Key Vault) | 3 to 24 characters, letters, digits, hyphens |
| `kv_soft_delete_days` | Azure resources, retention days | 7 to 90 |
| `identity.model` | Identity mode | `active-directory` is `ad-joined`; local identity is `local-identity-keyvault` (`hybrid` is never written) |
| `identity.dns_zone` | AD domain, or the DNS zone of local identity | |
| `identity.local_admin_*_secret` | Local admin user name | References `keyvault://<kv_azl_name>/<cluster>-cluster-admin-username` and `-password`. Store the user name and password there; the file holds neither |
| `witness` | Cloud witness and its storage account | Key reference `<cluster>-WitnessStorageKey`. File share or no witness: placeholder |
| `nodes[].name`, `management_ip`, `service_tag` | Node name, IP, serial number | Name lowercased |
| `nodes[].storage_ips.smb1`, `smb2` | Custom storage IPs, in storage-network order | Placeholder when Storage Auto IP assigns them |
| `vlans` | Network design VLANs | Mapped by words in the name (management, compute, avd, oob, storage A or 1, storage B or 2); subnet from the IP plan row with the same name (management: from the infrastructure network) |
| `adapter_names`, `intents[].adapters` | Port OS names | Each name is a YAML anchor; the intents use aliases |
| `intents[]` | Intents | The name must be Management, Compute or Storage (a combined intent takes its first traffic type). `traffic_types` capitalised. Overrides: `jumbo_packet`, `rdma_enabled`, `rdma_protocol` (omitted for Auto) only when the design overrides adapter properties; `storage_vlans` and `enable_storage_auto_ip` on the storage intent |
| `qos` | QoS overrides | Only when the design overrides QoS |
| `ip_plan` | Management network | `management_subnet` as a CIDR, `infrastructure_pool`, DNS servers, DNS zone, `storage_auto_ip`; `reserved_ranges` are the Arc Resource Bridge and AKS ranges (10.96.0.0/12, 10.244.0.0/16); NTP only when the time server is an IPv4 address |
| `sdn`, `logical_networks` | Software defined networking | `lnet-` prefix added to the name; VLAN, subnet, gateway, pool, DNS |
| `storage.volumes` | Volumes | `two-way`, `three-way`, `nested-two-way` map to `*-mirror`; names get the `csv-` prefix; size copied as `size_gb`. Four-way and parity volumes and the deployment-created `infrastructure` volume are left out (noted) |
| `vm_management` | Resource group, custom location | Must start `rg-` and `cl-` |

A value that does not meet the automation's rule (for example a vault name with an underscore) becomes `CHANGE-ME` with the reason in the comment, rather than a file that fails validation later.

## What you must supply (placeholders)

- `kv_ops_name`, `identity.deployment_identity_name`, `secret_refs` (names of the references the automation reads): they belong to the landing zone.
- Per node: `bmc_name`, `bmc_ip`, `lom1_mac` (and the storage addresses when Storage Auto IP is on).
- The landing-zone block that the schema requires: `spoke_address_space`, the `subnet_*_prefix` values, `budget_*`, the `enable_*` switches, jump server settings, `entra_groups`, `group_object_ids`, `pim_max_activation_hours`, `law_*`, `defender_*`, `kv_public_network_access`, `rsv_storage_redundancy`. The file lists them as commented example lines.
- Required VLANs the design does not have (the schema needs management, compute, storage_a, storage_b, avd and oob).
- The full release build, unless entered.

## Terraform variables

`terraform.tfvars.json` uses the variable names and shapes of the root's `variables.tf` (tenant, subscription, location, `token` as the naming prefix, tags, identity, witness, nodes, intents, `ip_plan`, `vlans`, `qos`, `release`, security settings, observability, storage configuration mode and the `names` map). The `_comment` key lists the placeholders. Pass `-var deployment_mode=Validate` or `Deploy` as the automation does. The root's own checks still apply: local identity, a cloud witness, a naming prefix of at most 8 characters.

## How it is tested

`tests/environmentFile.test.ts` validates the export of every design in `tests/exportProjects.ts` against a vendored copy of the environment schema (`tests/fixtures/azure-local.environment.schema.json`, with its source and date in `$comment`). The only errors allowed are the documented ones (landing-zone keys, missing VLANs, placeholders). A second test fills every placeholder and the landing-zone block and requires zero errors. The Terraform test checks the variable names against the root's declared variables.
