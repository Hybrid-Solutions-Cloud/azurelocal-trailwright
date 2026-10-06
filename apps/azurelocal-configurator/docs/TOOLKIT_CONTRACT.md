# Toolkit hierarchy contract checkpoint

This implements part of C07. It does not close C07 or qualify deployment. Source is the private TierPoint `azl-toolkit` repository at `2af2f2a0698bb178e95c9fe5579d955770cb9d60`. The original repository was read only. Exact generator, infrastructure schema and master registry bytes are saved under `src/contracts/toolkit`, with SHA-256 values in `source-lock.json` and Git attributes preserving those bytes.

## Implemented mapping

Schema 7 adds persistent Toolkit selection, explicit physical-site binding/code, environment name/classification, JSON tags and stage/preservation boundary. Versions 1–6 migrate without enabling this export or inventing metadata.

`toolkitMapping.ts` produces a draft in the actual v4 hierarchy:

| Destination | Source and boundary |
|---|---|
| `site`, `environment`, `tags` | Explicit Toolkit settings and selected active site; no environment classification is inferred from project purpose |
| `azure_platform.azure_tenants` | Exact Azure tenant and region; cluster subscription is not mislabelled as bootstrap subscription |
| `identity.accounts` | Usernames and explicit ARM credential bindings translated to Key Vault references, retaining selected source vault/name/version |
| `identity.active_directory` | AD domain/OU aliases actually declared by the schema and registry; omitted for local identity |
| `identity.local_identity` | Local-identity deployment vault and username; omitted for AD |
| `compute.clusters.azure_local` | Cluster name/count, identity, switching and deployment mode |
| `compute.cluster_nodes[]` | Active node hostname, management/BMC IPv4 and selected hardware identifiers; no invented memory-unit or BIOS interpretation |
| `networking.onprem.network_intents[]` | Canonical traffic/adapter arrays and explicit storage automation/switching choices |
| `compute.cluster_arm_deployment` | Named registry fields mapped from reviewed ARM inputs, including full explicit per-node storage addresses, SBE details and custom location |

Unmapped stages and scope are listed in each review. Hybrid has no declared scenario and is never renamed S2D or SAN. Scenario selection remains in the review: the schema's `infrastructure_scenarios` section defines registry metadata, not an established selected-scenario input. SAN LUN/HBA and disaggregated fields, management/bootstrap, SDN, CSV/path, workload and operational consumer mappings remain open. Node memory GB semantics, subscription/resource-group aliases and complete ARM parameter round trip also remain open.

The review panel, correction links, Markdown/PDF reports, workbook/CSV schedules and ZIP share this mapping. Private exports include `toolkit/infrastructure.draft.yml` and `plans/toolkit-mapping-review.json`; sanitized exports omit the operational hierarchy. Owned `environment.yml` remains the application project contract. No file is labelled executable or runtime-qualified.

## Three independent checks

1. **Source schema assertions:** Ajv validates a cloned assertion view of the pinned draft-07 schema. Invalid scalar `examples` annotations are removed with other non-validation annotations; property names and every assertion remain intact. No coercion, default injection or property removal occurs. Bounded input traversal additionally rejects credential literals, unsafe keys and oversized/deep data.
2. **Registry assertions:** `registry-arm.assertions.json` contains the 56 typed fields in the actual registry's ARM section, retaining nested assertions and allowed values. Tests independently reconstruct this projection from the immutable YAML and compare it exactly. Schema acceptance does not suppress registry conflicts.
3. **Native reader (removed in 0.2.0):** version 0.1.0 invoked the unchanged upstream reader in a negative CI check. That check, its script and the vendored reader copy were removed with the other consumer code; the captured result remains in `docs/evidence/toolkit-20260911`. The original reader stays in the Toolkit repository.

## Source conflicts retained

- Root legacy reader paths conflict with v4 `identity`, `compute` and `networking.onprem` paths. Root `additionalProperties:false` forbids simply adding legacy aliases to canonical YAML.
- The reader always emits the AD parameter shape, even for local identity, and forces new vault/cloud witness behavior. It rewrites secret references and may collapse singleton arrays or replace explicit zero with defaults. It omits explicit storage addresses and several advanced fields.
- The schema declares `account_lcm_password`; the scenario registry requires `account_lcm_deployment_password`. No unqualified duplicate credential alias is generated.
- Registry `express`/`advanced` is not a proven mapping to the pinned ARM `Express`/`InfraOnly`/`KeepStorage` contract. The draft does not guess a destructive storage mode.
- ARM uses string storage VLAN IDs, a manifest date-time and custom-location name; the registry declares integer VLAN IDs, `date` and an Azure resource ID respectively. Original design values are retained and conflicts are reported.
- Registry retention minimums can reject an explicit zero accepted elsewhere. Zero is preserved with a conflict, never silently changed.
- The schema caps nodes at 16 and does not qualify all requested storage/topology combinations.
- Registry prose describing `validate_only` as non-deploying conflicts with actual Microsoft template behavior. ARM Validate changes Azure resources. Nothing here invokes Azure CLI deployment or any infrastructure operation.

## Open acceptance

In 0.2.0 the configurator emits the finished ARM parameter file directly as `inputs/arm/azuredeploy.parameters.json`, alongside the hierarchy and companion data. See [TOOLKIT_BRIDGE.md](TOOLKIT_BRIDGE.md). No converter script is shipped. Full stage, scenario and resource-lifecycle mapping remains open.
