# Azure Local implementation checklist

> **Scope correction — 2026-09-12.** This document records work before version 0.2.0. Its Terraform, Ansible, PowerShell and converter consumer items describe code that has since been removed: the configurator now emits automation input data only and ships no automation code. See the [README](../../README.md).

Version 0.1.0 · 2026-09-11. The outline and diagrams are authored. The user explicitly authorized full Azure Local implementation and publication. Checked items have application/local-contract evidence in ../REQUIREMENT_AUDIT.md; unchecked consumer items retain the exact qualification limits described there. Publication alone does not establish infrastructure qualification.

## Design artifacts

- [x] D01: Own the design under `apps/azurelocal-configurator`.
- [x] D02: Define the complete questionnaire, branches, user defaults and output menu.
- [x] D03: Record source revisions, actual consumer mismatches and unresolved support.
- [x] D04: Verify all four draw.io pages and PNG exports, publish the design and verify exact-commit CI/live catalog.

## Project and user journey

- [x] A01: Scaffold the standalone website with separate autosave and version metadata.
- [x] A02: Implement owned typed schema, bounded import/parser, migrations and secret-reference policy.
- [x] A03: Implement fourteen sections, conditional fields, repeatable records, cross-references and accessible navigation.
- [x] A04: Save/open/revision/conflict preview and corrupt-draft recovery.
- [x] A05: Pin Surveyor plan formats and implement selective import/reimport with provenance and unit normalization.
- [x] A06: Preserve sizing, thin provisioning and drive layout resource links without importing unrelated project state.

## Design and rules

- [x] B01: Dated release/support catalog and storage/identity/topology/network/SDN combination validation.
- [x] B02: Deployment-route and operator-versus-automation choices with clear qualification status.
- [x] B03: TierPoint management components, lifecycle/hosting/HA/capacity, dependencies and manual OME.
- [x] B04: Independent CI/CD and node bootstrap, least necessary access, reuse checks and exit plan.
- [x] B05: Azure resources, AD/local identity, DNS/vault/security and connectivity records.
- [x] B06: Per-node hardware/OEM evidence, BMC/media, NIC/HBA/device inventory and readiness.
- [x] B07: Network ATC intent/physical port mapping, switched/switchless, IP/VLAN/RDMA and SAN exceptions.
- [x] B08: S2D pools/devices, reserve and per-volume supported resiliency calculations.
- [x] B09: SAN arrays/fabrics/initiators/targets/LUNs, MPIO paths and existing-data protection.
- [x] B10: CSV import/edit/count/size/unit, thick default/thin policy, separate source budgets and mixed layouts.
- [x] B11: Distinct CSV, Azure storage path and per-host/LUN I/O path records and counts.
- [x] B12: Azure Arc SDN default/opt-out/existing state, compatibility, DNS, policy and ordered enablement.
- [x] B13: Workload placement and sizing reconciliation without double-counted management reservations.
- [x] B14: License/entitlement/cost records with dated basis and unresolved-rights findings.
- [x] B15: Monitoring, patch/backup/restore, support, acceptance and dependency stages.

## Outputs and consumers

- [x] C01: Deterministic canonical JSON/YAML and valid sanitized sharing exports.
- [x] C02: Complete Markdown/PDF design and implementation reports with visible findings.
- [x] C03: XLSX/CSV schedules and editable draw.io/PNG topology.
- [x] C04: ZIP/hash manifest, individual downloads, provenance and pinned qualification metadata.
- [x] C05: Portal worksheets verified against selected release/architecture screens.
- [x] C06: ARM parameter generator qualified against immutable template/API and negative fixtures.
- [ ] C07: Actual Toolkit hierarchy mapping tested against its pinned reader and schema.
- [x] C08: Terraform module/provider pins and validated variables for declared resources only.
- [x] C09: Ansible inventory/vars/collection locks and role contracts for declared stages.
- [ ] C10: PowerShell 7 and selected DSC version/resource contracts, with no local WSL dependency.
- [x] C11: External execution handoff, exact target authorization, runtime secret resolution, evidence/resume and as-built reconciliation where in scope; no browser-side infrastructure execution.

## Acceptance matrix

| Case | Required evidence |
|---|---|
| S2D + AD + Portal | Complete worksheet, thick default, qualified mirror plan, SDN default and actual opt-out |
| S2D + local identity + ARM | DNS/vault requirements; no accidental AD preparation; pinned parameter contract |
| SAN-only + AD | Complete FC/SAN/LUN/MPIO records, infrastructure roles and explicit SDN support gate |
| SAN-only + local identity | Both prerequisite branches; release/protocol gate; no format of existing LUNs |
| Hybrid + Terraform/Ansible | Source-specific budgets, explicit qualified orchestration stages, correct port ownership |
| Mixed CSV resiliency and thin | Qualified layouts, unit/overcommit/reserve calculations; separate array provisioning |
| Existing hardware/SAN/management | Existing identity preservation, path evidence and no forced recreation |
| Surveyor import/reimport | Supported schemas, selective merge, provenance, no duplicate records or overhead |
| Existing SDN conflict | On-prem controller rejected for Arc enablement; checkbox does not promise uninstall |
| Failed/incomplete design | Draft reports succeed with findings; unsupported automation never marked ready |

- [x] T01: Unit and contract tests cover every row plus reference/cycle/capacity failures.
- [x] T02: Malformed/oversized imports, secret literals, formula/XML injection, path traversal and sanitized references tested.
- [x] T03: Browser tests cover all branches, save/open/downloads, keyboard use, mobile layout and import conflicts.
- [x] T04: Reports visually reviewed, diagrams readable and download formats parsed independently.
- [x] T05: Existing Surveyors and Hyper-V regression suite stays green.
- [x] R01: Versions, changelog, catalog and user/developer/deployment documentation updated to actual status.
- [x] R02: Exact final commit passes GitLab test/browser/security/build/Pages gates.
- [x] R03: Actual website reports matching version/commit and critical journeys/downloads pass.
- [ ] R04: Runtime qualification is backed by authorized environment evidence for every adapter claiming it.

Qualification limits: C07 has a tested, separately named corrected local converter; the pinned original Toolkit reader remains broken. C10 has native PowerShell local-conversion proof; no selected DSC deployment resource has native qualification. R04 remains open for any future runtime-qualified adapter; none is advertised by this release. See the requirement audit for source evidence and explicit design-only handoffs.
