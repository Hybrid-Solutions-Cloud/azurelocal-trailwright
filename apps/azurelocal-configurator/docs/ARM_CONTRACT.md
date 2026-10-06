# ARM contract checkpoint

Reviewed 2026-09-11. Saved acceptance C06 remains open. This implementation maps both actual Microsoft templates and tests their parameter declarations and selected nested API definitions. It evaluates the deploymentSettings body and top-level resource conditions/names/copy counts, but does not yet qualify nested deployment bodies, other provider APIs or a native deployment. The consumer remains **design-only**, `executionReady: false`, `runtimeQualified: false`.

## Immutable sources

`src/contracts/arm/source-lock.json` records exact source and license SHA-256 values. Unmodified files are retained with their original line endings, MIT notices and tests of both SHA-256 and API Git blob identity.

| Source | Commit | Contract |
| --- | --- | --- |
| Azure/azure-quickstart-templates, create-cluster | b56eb9051390299afe2d913bf2d10861fef279fd | AD; 54 explicit parameters |
| Azure/azure-quickstart-templates, create-adless-cluster-external-dns-public-preview | 8a9101dccd2d0af06ab9387d8487d9f397360569 | Local identity; 53 explicit parameters |
| Azure/azure-rest-api-specs, StackHCI preview/2025-09-15-preview | 6a1458db4f782c36d6f82ecfa288ab0bd0a29b34 | deploymentSettings.json and hciCommon.json |

API blobs `3748514cc8f72f93e5b308c308e5b64ab5e256e7` and `b6828b62ef762b941e43b52a9a202852cf0989ba` were verified against the directory listing at the exact commit. Raw/contents downloads intermittently returned HTTP 429; Git blob retrieval recovered the files. Do not treat the earlier download failure as a continuing source blocker. `scripts/Restore-ArmSources.ps1 -OutputDirectory D:/tmp/azurelocal-arm-source-recovery` restores and hash-checks the source files and licenses without touching infrastructure.

Primary supporting references: [deploymentSettings API](https://learn.microsoft.com/en-us/azure/templates/microsoft.azurestackhci/2025-09-15-preview/clusters/deploymentsettings), [ARM Key Vault parameter references](https://learn.microsoft.com/en-us/azure/azure-resource-manager/templates/key-vault-parameter), [Ajv schema support](https://ajv.js.org/json-schema.html). Mutable documentation supplements the immutable inputs; it does not upgrade the saved 2604 baseline.

## Implemented input and output behavior

- Schema 6 adds explicit ARM settings, credential bindings, deployment storage networks and per-node addresses, DNS zones, SBE properties/credential requirements, exact OS adapter aliases, security choices and typed ATC overrides. Schemas 1–5 migrate without inventing resource reviews, credentials or runtime evidence.
- Both templates receive every parameter explicitly, including the source's `enableStorageAutoIp` parameter with its incorrectly cased `defaultvalue` attribute. Source sample addresses are never accepted as implicit defaults.
- Passwords use existing Key Vault resource/secret references. The selected vault, secret and optional version must match the design reference. Vault template-deployment enablement and deployment-principal `Microsoft.KeyVault/vaults/deploy/action` access are external prerequisites. A permissions note is an operator assertion, not proof.
- AD domain/OU/deployment account inputs and local-identity DNS/provider inputs remain distinct. Retained AD administrator inputs are inactive when local identity is selected. Switching identity preserves them.
- Node/Arc identities, scope, host and infrastructure addressing, per-node consistent adapter names, duplicate ports, ATC/SAN ownership and separate storage addressing are checked. Automatic storage addressing explicitly omits retained manual assignments and explains that omission.
- Sanitized designs omit candidate ARM parameter documents. Private packages include `plans/arm-mapping-review.json`, `plans/arm-source-lock.json`, schedules and report rows. Private designs on the ARM or Terraform/Ansible route, or with Toolkit conversion selected, also export the finished `inputs/arm/azuredeploy.parameters.json` as data when the mapping has no errors on the new standard S2D branch. UI findings link to the exact field or record.
- `armContract.ts` checks actual template parameter names, primitive types, enums/bounds and secret-reference envelopes. `armApi.ts` resolves selected input definitions from the pinned Swagger and validates them with Ajv 8.20.0, without coercion, defaults, deletion or remote schema loading. `armShapes.ts` adds the stricter owned mapping requirements and enums described in source text. The bounded offline expression reader evaluates only the pure functions used by the pinned deploymentSettings body and resource conditions. Unknown functions, runtime references, secret resolution, bad indexes and cyclic variables fail closed. This does not invoke Azure Resource Manager.

## Source effects and unresolved qualification

| Boundary | Implemented behavior / remaining qualification |
| --- | --- |
| Validate versus Deploy | Both mutate Azure resources. Neither is run by the application or tests. Deploy also requires an operator-supplied prior validation reference, which remains unverified. |
| Witness | Both sources unconditionally declare the witness account and secret. Only the mapped cloud-witness branch is retained; no-witness/file-share designs are blocked for these consumers. |
| Preservation | Deployment vaults, witness resources and conditionally created diagnostic accounts cannot be silently written under existing-preserve/external intent. Explicit extension requires immutable resource ID and reviewed change boundary. Source vaults used only to resolve secrets can remain preserved. |
| New vault | Source declares `enableSoftDelete=false`; current-service compatibility and the complete security/resource effects need qualification. |
| Security | HVCI, DRTM and side-channel mitigation are fixed true in the source; other mapped security/telemetry booleans are explicit. `securityLevel` is declared but not consumed elsewhere in the templates. Full security-profile reconciliation remains open. |
| Networking | `networkingType` and `networkingPattern` are declared but not consumed elsewhere. Actual intent/adapter/storage lists drive the settings. Complete OEM, topology, intent combinations and inactive-branch audit remain open. |
| SBE credentials | Source non-secure input contains secretValue and creates vault secrets. The app emits an empty array and blocks any requested credential records until a secret-safe consumer is qualified. API SBE credentialList is a different, derived vault-reference structure. |
| SAN / topology / existing cluster | SAN-only and rack-aware/reuse/extend cluster branches have no qualified mapping in these templates. Hybrid SAN attachment and explicit CSV/storage paths remain separate handoffs. |
| Complete ARM resources | Full deploymentSettings body, pure variable/copy expressions, top-level resource conditions/names and public/Government secret/witness endpoints are tested. Nested deployments, all other provider API contracts, downstream secret resolution and native deployment remain open. |
| Runtime | No Azure deployment, host operation or other live infrastructure change was authorized or performed. Browser and contract success does not qualify native execution. |

The fixture is synthetic. Final saved-requirement audit, other consumers, release/catalog reconciliation, CI/Pages publication and exact-commit live verification remain required by the active goal.

## Full-body and independent toolkit evidence

The source emits null for an omitted sbeManifestCreationDate even though the pinned API declares a date-time string. The app now reports that mismatch on the actual SBE date input. A supplied date is validated with ajv-formats 3.0.1; no synthetic date is inserted into a user project. Unknown or read-only API properties remain errors, and data is never coerced or deleted. Reports and the ARM mapping review include the evaluated deploymentSettings body and resource-effect inventory; sharing copies omit those operational outputs.

ARM-TTK 0.27 was pinned to 0ec9a41a4503e970a0ec8efb0cd08415cc172175 (archive and 103 file hashes in src/contracts/arm/toolchain.json). In version 0.1.0 a restore script and contract test ran the module against the exact templates and generated parameter files; both scripts and the `arm_contract` CI job were removed in 0.2.0. The captured native Windows PowerShell 7.6.6 evidence is retained under docs/evidence/arm-ttk-20260911: each identity had 30 passing checks and six failed upstream best-practice checks, all four parameter-file checks passed, and a malformed Key Vault reference failed as expected. These are offline checks, not a deployment receipt.

The six upstream findings concern recent API versions (20 AD / 19 local errors), dependsOn construction (1), hardcoded endpoints (2), location expression (1), unused selectors (3), and a blank property (1). They remain unresolved source findings, not silently waived proof of support. The harness verifies the exact known source/error counts and rejects any changed or unexpected failure, as well as any failed/missing parameter check. The old API warning is a toolkit recommendation; current provider support and replacement APIs require separate review.

No CI job runs ARM-TTK after 0.2.0. Unit tests continue to validate every generated parameter document against the pinned template declarations and API schemas with Ajv, and to check the retained ARM-TTK evidence.
