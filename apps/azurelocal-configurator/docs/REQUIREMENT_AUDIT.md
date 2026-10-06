# Saved requirement audit

> **Scope correction — 2026-09-12.** This document records work before version 0.2.0. Its Terraform, Ansible, PowerShell and converter consumer items describe code that has since been removed: the configurator now emits automation input data only and ships no automation code. See the [README](../README.md).

Audit date: 2026-09-11. Application 0.1.0, owned schema 8. This matrix audits the saved implementation checklist against code and retained evidence. The design outline and four original flows remain authoritative. “Implemented” describes application behavior, not deployed infrastructure. Publication and live checks passed for fdb7ebf4bd099b35e5565674b9c6740c3f56f2a0; see RELEASE_VERIFICATION.md and evidence/release-20260911/live/.

## Project and design requirements

| ID | Actual implementation and evidence | Result |
|---|---|---|
| D01–D03 | App-owned design/outline/references and original four-page draw.io; immutable Microsoft, ARM, Toolkit, Surveyor, Terraform and Ansible source locks | Implemented |
| D04 | All four original PNGs previously visually inspected against editable source; published design retained in catalog documentation | Design and application published; exact-source live checks passed |
| A01 | Standalone React/Vite entry, independent version.json and localStorage keys; fourteen-screen browser journey | Implemented |
| A02 | project.ts, strictJson.ts: owned discriminator, strict primitives/keys, 4 MiB/record limits, versions 1–7 migrated to 8, duplicate/prototype rejection, reference-only secret fields; project/automation migration tests | Implemented |
| A03 | catalog.ts/App.tsx: fourteen screens, typed repeatable inventories, conditional branches, stable references, navigation/focus and correction links; workflow browser suite | Implemented |
| A04 | persistence.ts/App.tsx: compare-before-save, incoming revision preview, ten checkpoints, corrupt original download, reviewed replacement and download when storage is blocked; delivery browser cases | Implemented; all 17 Windows Chrome journeys passed |
| A05 | surveyor.ts/provenance.ts, pinned source schemas/exporters, selective group/record merge and stable source identities; Surveyor unit/native-browser contracts | Implemented |
| A06 | Explicit Surveyor sizing/thin-provisioning/drive-layout links; source unit assumptions and sizing-only import boundary; routes confirmed in separate Surveyor app | Implemented |
| B01 | support.ts/assessment.ts and dated immutable source-lock; 2604 solution/OS baseline, SAN-only Arc SDN blocker, protocol/preview conflicts and identity/topology review states | Implemented; unresolved product combinations remain review/blocked |
| B02 | Architecture route/depth/intent fields, per-consumer reviews, disabled execution and draft-only unsupported branches; ARM/Terraform/Ansible browser cases | Implemented |
| B03 | Management components/hosts/bindings, independent hosting, capacity/HA/owner/lifecycle and manual OME; preparation rules and tests | Implemented |
| B04 | Independent access, runner/node/media/bootstrap/service exit fields and prerequisite graph; cycle and unresolved access tests | Implemented |
| B05 | Azure resources, AD/local identity, DNS zones, credential bindings, vault/security/certificates/connectivity inventories and branch rules; ARM identity and preparation contracts | Implemented |
| B06 | Per-node OEM/firmware/SBE/media/BMC/OS/Arc/port/device inventories; reference, hash, duplicate and readiness checks | Implemented; actual OEM/runtime evidence remains operator responsibility |
| B07 | Network ATC/physical mapping, IP/CIDR/VLAN/RDMA/DCB, switched/switchless, dedicated SAN ownership; network/storage/ARM tests | Implemented |
| B08 | Per-node S2D pools/devices/media, reserve, supported mirror/parity/nested/tier calculations; storage accounting/source tests | Implemented |
| B09 | Arrays/fabrics/initiators/targets/LUNs and per-node MPIO paths, stable IDs, allocation/preservation/presentation checks | Implemented; FC/iSCSI certification conflicts remain explicit |
| B10 | Reviewed CSV count changes, fixed default, per-volume source/unit/resiliency/thin policies and separate source budgets; CSV browser and storage tests | Implemented |
| B11 | Independent CSV/storage-path/I/O-path inventories/counts/references; topology reference nodes and placement validation | Implemented |
| B12 | Arc SDN default/opt-out, existing-controller/irreversibility gates, 1–8 alphanumeric prefix, DNS, NSG grammar/order/overlap/attachments, ordered terminal and traffic acceptance; network and evidence tests | Implemented; traffic/runtime acceptance is unverified until external qualification |
| B13 | Per-workload placement, AKS worker/service overhead, imported management reconciliation, independent hosting and capacity reserves; Surveyor/storage/preparation tests | Implemented |
| B14 | Per-product entitlement/acquisition/quantity/term/source/owner; commercial totals by currency and period, unpriced/unresolved-rights records; commercial arithmetic test | Implemented; no entitlement inference |
| B15 | Monitoring/alerts/backup/restore/patch/security/witness/support/handover records, RTO/RPO, dependency and acceptance/recovery stages | Implemented |

## Outputs and consumer boundaries

| ID | Actual implementation and evidence | Result |
|---|---|---|
| C01 | Strict reopenable JSON, canonical YAML, sanitized identifiers/references/provenance/evidence; round-trip and deterministic export tests | Implemented |
| C02 | Complete field/inventory Markdown/PDF, visible findings, source budgets, commercial reviews, declared stages, evidence and vector topology pages | Implemented; independent PDF parsing and representative visual review passed |
| C03 | Workbook and individual CSV schedules; editable physical/storage/logical/dependency draw.io and matching PNG pages; typed cross-page edges | Implemented; five browser ZIPs independently parsed and representative diagrams visually reviewed |
| C04 | Frozen revision export preview, individual downloads, ZIP and per-file size/SHA-256 manifest, support/source/provenance/consumer locks | Implemented |
| C05 | portal.ts maps Basics, Configuration, Networking, Management, Security, Advanced, Tags, Validation, Review/create and recovery. Both identity branches, SAN disaggregated flow, hybrid attachment and explicit fixed-versus-auto-thin handoff are distinguished | Implemented documentation-mapped worksheet; actual Portal deployment unqualified |
| C06 | Two immutable Microsoft templates/API contracts, 54 AD/53 local parameters, type/shape/preservation/secure-reference negatives and native ARM-TTK evidence | Contract review implemented. Upstream failed checks and nested/deployment qualification remain open; no executable ARM submission promised |
| C07 | Canonical Toolkit hierarchy, pinned schema/registry and original broken-reader evidence; separately named corrected native local converter, 26 positive/negative cases | Local conversion contract-tested. Complete upstream deployment stages remain design-only |
| C08 | Named Terraform ARM wrapper, CLI/provider/module locks, real provider validation and 18 mock-plan cases | Local contract-tested; mock plans are not infrastructure qualification; deployment disabled |
| C09 | Actual inventory/vars/core/collection/role locks; 28 native Linux cases in CI 2842304805, job 16458541387 | Named local validation stage contract-tested. Other stages and deployment remain design-only |
| C10 | PowerShell 7.4.6/7.6.6 selection; actual converter parameter splat, native WhatIf and local conversion for both identities; explicit DSC generation/version/resource requests and source/schema/property checks | PowerShell local conversion contract-tested. No DSC deployment-qualified resource is available; selected requests produce a blocked design handoff, never arbitrary executable DSC YAML |
| C11 | evidence.ts/EvidencePanel: bounded exact-project receipt schema, activity/terminal state, original hash, revision/baseline conflicts, retain without mutation, explicit as-built adoption; external exact-target authorization skeleton, secret-resolution and resume requirements | Implemented. Imported evidence remains unverified; no browser infrastructure execution or automatic resume |

## Acceptance cases

| Saved case | Evidence |
|---|---|
| S2D + AD + Portal | Portal/tab/fixed-layout tests, default/opt-out stage tests, storage mirror accounting and CSV browser case |
| S2D + local identity + ARM | ARM fixture, strict 53-parameter contract, DNS/vault branch, no AD OU browser assertion |
| SAN-only + AD | SAN source/presentation/LUN/NTFS/path rules and AD support-matrix tests; disaggregated worksheet |
| SAN-only + local identity | SAN/local browser branch and explicit Arc SDN/protocol gates; preservation checks |
| Hybrid + Terraform/Ansible | Independent source budgets/ports and named-stage eligibility tests; unsupported orchestration remains blocked rather than silently qualified |
| Mixed CSV resiliency/thin | storage.test.ts and STORAGE_ACCOUNTING.md: unit/reserve/tier/array-versus-CSV accounting |
| Existing hardware/SAN/management | Stable identity, existing-data, preservation and independent-management rules; source and native negative cases |
| Surveyor import/reimport | Original exporter fixtures, unit normalization, record-level conflicts, stable IDs and two native browser import journeys |
| Existing SDN conflict | On-prem controller rejection, one-way enablement and opt-out omission tests |
| Failed/incomplete design | Draft PDF/XLSX/ZIP browser export and qualification gate tests; unavailable inputs do not become executable |

## Release gates

| ID | Evidence/status |
|---|---|
| T01 | 195 unit/contract tests across 15 files; source-to-case mapping above |
| T02 | Strict malformed/oversized/duplicate/secret/reference/XML/formula/path tests and native negative consumers |
| T03 | All 17 native Windows Chrome journeys passed after the final PNG mapping-legend change (session 53919) |
| T04 | Five actual downloaded ZIPs: 604 member hashes/sizes, five 76-sheet workbooks, 20 PNG/draw.io pages and 223 PDF pages checked independently; representative mobile, report and topology pages visually reviewed. Original summaries/images: evidence/release-20260911/ |
| T05 | All workspace regression and browser checks passed final release pipeline 2842373283; Hyper-V 0.32 remains present |
| R01 | Catalog 0.35.0, Azure Local 0.1.0/schema 8, user/developer guides and changelog prepared; Hyper-V 0.32 preserved |
| R02 | Passed: pipeline 2842373283, Pages job 16458970426, release fdb7ebf4bd099b35e5565674b9c6740c3f56f2a0 |
| R03 | Passed: exact catalog artifact SHA-256 match, app header/version.json and fourteen screens; all 17 deployed Windows browser journeys; five live download packages independently checked |
| R04 | No adapter claims runtime qualification. Authorized infrastructure targets and authenticated terminal evidence are unavailable and remain explicitly open |

No infrastructure deployment, storage formatting, reimaging or real Azure change was performed. Missing runtime qualification does not authorize the application to relax any support or preservation gate.
