# Active goal: complete Azure Local Configurator

> **Scope correction — 2026-09-12.** This document records work before version 0.2.0. Its Terraform, Ansible, PowerShell and converter consumer items describe code that has since been removed: the configurator now emits automation input data only and ships no automation code. See the [README](../README.md).

Started 2026-09-11. User explicitly authorized Azure Local implementation now, superseding the earlier Hyper-V-first sequence for this task. The separate Hyper-V work and its uncommitted files must remain intact.

## Destination and isolation

- Canonical repository: `D:/git/tierpoint/prodtech/hybrid-cloud/toolkits/configurators`.
- Canonical application: `apps/azurelocal-configurator`.
- Isolated worktree: `D:/git/tierpoint/prodtech/hybrid-cloud/toolkits/configurators-azurelocal`.
- Branch: `feat/azurelocal-configurator`, started at `ce881af`.
- GitLab project `86119904`, tracking issue `#2`.
- Do not overwrite the original repository's `.ai/state` files. App-owned checkpoints live beside this goal.

## Authoritative scope

Implement every requirement in `design/implementation.md`, all sixteen sections of `design/outline.md`, `design/references.md`, and all four pages of `design/flows.drawio` and their PNGs. The highlights below are a work breakdown, not a scope reduction.

1. Own a strictly validated, bounded, versioned project schema; stable identities, migrations, revision/conflict previews, safe autosave/recovery, save/open and secret references. Pin and selectively import/reimport Surveyor plans with provenance, unit normalization and conflict decisions.
2. Deliver all fourteen screens: project/import; architecture/deployment; management; bootstrap/access; Azure foundation; identity/security; nodes; host networking; storage sources; CSVs/storage paths; Arc SDN; workloads; licensing/operations; review/export. Support repeatable inventories, typed references, accessible correction links, keyboard and responsive navigation.
3. Model existing/new lifecycle, preservation boundaries, ownership and intent separately from observations and runtime evidence. Retain inactive answers but exclude them from executable handoffs.
4. Verify Microsoft release-specific support against the saved 2604.0.0 baseline. Distinguish documented support, preview, unknown and unsupported combinations across storage, identity, topology, network and SDN. Newer mutable documentation must not silently upgrade the baseline.
5. Complete TierPoint management, independent access/node bootstrap, physical hardware/media/firmware/readiness, AD/local identity, Azure/Arc resources, security/certificates/connectivity and dependency ownership. Detect bootstrap cycles and preserve manual OME installation.
6. Complete Network ATC and physical port mappings, RDMA/VLAN/IP validation, S2D sources/resiliency/reserve, separate SAN arrays/fabrics/initiators/targets/LUNs/MPIO, hybrid source budgets, fixed/thin CSVs, distinct Azure storage paths and per-host SAN I/O paths. Protect existing data.
7. Default Arc SDN to enabled with explicit opt-out; validate existing NC conflicts, irreversibility, DNS/prefix/access, logical networks/NSGs and ordered terminal verification. Complete workload placement, capacity reconciliation, licensing, operations and recovery.
8. Generate consistent canonical JSON/YAML, private/sanitized output, Markdown/PDF reports, XLSX/CSV schedules, editable draw.io/PNG topology, individual downloads and deterministic ZIP/hash manifests. Draft findings remain visible.
9. Qualify named Portal, ARM, Toolkit, Terraform, Ansible, PowerShell 7 and selected DSC contracts against pinned actual consumers. State unmapped fields and block unsupported execution; never label arbitrary YAML as a working adapter. Keep design-only, contract-tested and runtime-qualified statuses separate.
10. Test the entire saved acceptance matrix, negative inputs, security, calculations, imports/conflicts and browser journeys. Independently parse and inspect generated artifacts. Run relevant other-app regressions.
11. Reconcile the branch with the latest remote before publication; retain every current catalog release. Commit/push and publish using existing GitLab CI/Pages with private access unchanged. Verify exact deployed SHA/version through the actual catalog and exercise live journeys/downloads.
12. Audit every requirement against code and evidence before completion. Keep native qualification open wherever separately authorized runtime targets/evidence are unavailable.

## Execution constraints

Native Windows and PowerShell only. No WSL. No local production builds. Local type checks, unit/contract tests and Windows browser tests are authorized. CI owns production build/publication. No provisioning, reimaging or modification of live infrastructure is authorized. Browser tests or mocked commands do not qualify native deployment. Do not send messages to other people or update issue comments without separate authorization.

## Completion evidence

The implementation checklist and a source-to-code/evidence matrix must show concrete outcomes for every requirement. Delivery evidence must include final commit, app/catalog versions, pipeline and job results, authenticated live catalog/version checks, browser outcomes and independently checked artifact contents/layout. Unavailable runtime qualification must remain explicit and must not be represented as a completed deployment.
