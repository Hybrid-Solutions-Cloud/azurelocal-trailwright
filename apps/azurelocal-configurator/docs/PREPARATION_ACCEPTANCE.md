# Management and bootstrap implementation audit

> **Scope correction — 2026-09-12.** This document records work before version 0.2.0. Its Terraform, Ansible, PowerShell and converter consumer items describe code that has since been removed: the configurator now emits automation input data only and ships no automation code. See the [README](../README.md).

2026-09-11 · schema 5. This is a partial requirement audit; it does not close B03/B04 or the application goal.

| Saved requirement | Implemented evidence | Still open |
|---|---|---|
| outline-L61: management modes, per-component lifecycle, hosting, owner and evidence | Existing mode/lifecycle fields plus typed host, acceptance and resource links; `preparationRules.ts`, round-trip and browser tests | Exhaustive existing/extend/customer-managed acceptance and preservation semantics |
| outline-L65: management network and access | Typed Azure resource inventory and purpose-checked management bindings, inferred prerequisite edges | Complete route/subnet/DNS/egress design, actual Terraform module mapping and route validation |
| outline-L66: directory services and redundancy | Conditional directory domain/site/replication/recovery fields; instance failure reserve and domain checks; independent local-identity estate remains allowed | Detailed directory topology/site links, per-instance placement, actual AD preparation contract |
| outline-L67: utility and NDM | Explicit selected product, image/version, CPU/RAM/disk, independent host capacity, maintenance and alert routing | OEM/product version qualification and fully typed network attachment |
| outline-L68: WAC | Gateway certificate/access groups, explicit managed estate, local-identity cluster blocker, independent estate retention | Specific gateway/extension release compatibility and consumer installation contract |
| outline-L69: OME | Manual execution gate, appliance hosting/capacity, license/support and manual handoff | Vendor version-specific acceptance and full physical failure-domain review |
| outline-L70: operations services | Typed resource bindings for workspace/DCR/vault/policy/RBAC, alert and retention fields, independent capacity where explicitly sized | Full alert/backup/security/Lighthouse contracts, policy and recovery implementation |
| outline-L71: automation services | Linked runner/artifact/secret services and service identity; service-category checks | Actual runner registration, repository/provider module contract; runtime authorization remains external |
| outline-L73: independent hosting and temporary/final services | Separate hosting and temporary/permanent service records, replacement link, host capacity, predeployment availability, inferred graph and exit plan | Every hosting scenario, placement fault-domain inventory, reuse/extend/existing-cluster graph semantics |
| outline-L75: local identity does not force/prohibit independent AD; OME manual | Focused unit cases and WAC estate selection; unchanged local cluster identity branch | Full release/management matrix and runtime qualification |
| outline-L81: CI/CD identity/permissions/consent/rotation | Typed identity/trust links and dated operator permission review; existing identity reuse check; manual mode avoids CI enrollment | Detailed role-assignment and consent schema, expiry/rotation validation, least-privilege contracts |
| outline-L82: execution workstation | Independent host, access checks and exact tool pins; runner OS/version consistency | Required access coverage for every target, module dependency/conflict matrix and executable consumers |
| outline-L83: node bootstrap | Per-node media/account/BMC/boot/time/DNS/firmware/Arc acceptance fields and validation | Exact OEM/Redfish/media consumer contracts, all-node task coverage and terminal evidence import |
| outline-L84: temporary exit | Distinct service identities, rotation, access removal, disposition, final owner/acceptance and rollback; observation timestamp/ref | Detailed live handover receipt reconciliation; no resource deletion or access mutation performed |
| outline-L86: graph, reuse, native Windows | Graph includes explicit dependencies, independent hosting, certificates, resource parents, service bindings, tool/access preparation and cluster availability. Missing references/cycles block ordering. Inactive automation bindings are retained but excluded in manual mode. | External consumer and stage integration, existing-cluster observation semantics and broad graph performance tests |

## Implementation and evidence boundaries

`preparation.ts` computes independent host capacity and a prerequisite graph; `preparationRules.ts` produces actionable findings. `PreparationPanel.tsx` shows waves, owners, edges and direct links to blocked records. `preparationExport.ts` feeds the same results to Markdown/PDF reports and XLSX/CSV schedules. Packages include `plans/preparation.json`, and stage plans embed the same preparation contract.

Schema 5 migrates schemas 1–4. It adds no observation or identity verification during migration. Product- and mode-specific fields retain inactive answers; reports label them. The parser still requires known fields/types and secret references. Tool pins are operator input until the corresponding consumer is qualified. Dated reachability, permission and handover observations remain unverified.

Source review used the saved TierPoint management/bootstrap runbooks. The management runbook has inconsistent VNet nesting, and the bootstrap runbook invokes Bash and suggests deleting an existing app registration. Those are source findings, not implemented actions. The app preserves an existing identity and requires permission review. The local Windows workflow has no WSL dependency.

Microsoft's local-identity overview was rechecked through its official Learn result (July 27, 2026 revision); WAC remains unsupported for the local-identity cluster while PowerShell, Monitor and portal are listed. The mutable result now uses a 2607 view, so it does not silently upgrade the saved 2604 baseline. The earlier immutable Microsoft source lock remains the baseline evidence.

## Checks

- TypeScript passed.
- 102 unit/contract tests passed, including 21 preparation cases for graph ordering/cycles/missing references, capacity, WAC/AD/OME scope, permission reuse, tool/access observations, schema migration, inactive retention, secrets and report/export consistency.
- Eight native Windows Chrome journeys passed in 36.2 seconds (session 2350), including the new independent hosting/conditional-field/blocked-service navigation/reload journey. The first run identified a missing cross-screen graph correction link; the link was implemented and the rerun passed.
- Final graph review added certificate/tool/access vertices and a regression case after the full browser run. Unit tests passed again, then the management and package browser journeys passed again in 10.7 seconds (session 4140).
- No local production build, CI publication, live infrastructure mutation or runtime deployment qualification.
