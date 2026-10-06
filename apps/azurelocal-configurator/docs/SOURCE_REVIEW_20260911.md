# Source review — 2026-09-11

This records source evidence and unresolved support questions. It does not certify an environment or qualify a deployment adapter.

## Microsoft baseline

Twelve MicrosoftDocs files are pinned to commit `c320ca069a5e1f5137a0b6c6ff934c984ece08de`, with SHA-256 and immutable URLs in `src/contracts/microsoft/source-lock.json`. The selected product baseline remains 2604.0.0. Newer document edits are not treated as implicit baseline upgrades.

- The explicit 2604 disaggregated networking matrix lists 1–16 nodes for hyperconverged/hybrid Microsoft SDN and 1–64 for SAN-only external SDN. The newer system-requirements page mixes architecture terminology, so its larger node count does not override that matrix for S2D.
- SAN requirements still specify FC block storage, NTFS, one LUN per CSV, all-node presentation and consistent MPIO, and still contain preview wording. Newer network and post-deployment attachment guides describe iSCSI. The application records this conflict; SAN-only protocol qualification remains separate from hybrid attachment.
- The local-identity overview applies to 2510 onward and documents PowerShell/Monitor/portal management, with WAC excluded and MMC/SCVMM caveats. The 2604 landing index still labels local identity preview. Feature status requires confirmation for the exact deployment release. Independently managed AD-dependent workloads remain allowed.
- The 2604 release notes identify solution `12.2604.1003.1006` with OS `26100.32690`. A different pair requires servicing-release review; entered observations are not rewritten. Known-issue review includes MOC remediation, WAC volume-operation extension requirements and recovery restrictions. Operator-entered text does not authenticate remediation.

The architecture screen exposes these distinctions and immutable sources. Typed management target boundaries, complete region/cloud and topology coverage, detailed prerequisites, policy grammar and all consumer gates remain open.

## Actual public Surveyor download

Native Windows Chrome visited `https://azurelocal.cloud/azurelocal-surveyor/` in a fresh context and observed version 2.8.0. Storage Report → Export project JSON downloads `azurelocal-surveyor-project`, numeric schema 1/state 10. This differs from the older `SurveyorPlan` schema 1.0 exporter API.

`src/testing/surveyor/2.8.0.live-project.json` is the actual default-plan download. `live-evidence.json` records its hash and browser provenance. The public site does not expose an exact deployed commit receipt; matching version and contracts are not presented as proof of its deployed SHA.

Both formats now have strict schemas derived from pinned source types. Project files contain inputs only, so the importer recalculates estimates using pinned pure sizing functions. The original project and new estimates are separate reviewed groups. Browser persistence/actions are excluded through a local type-only boundary. The copied MIT license and shipped third-party notice accompany this runtime. The only exporter adaptation changes its package-version import path.

Legacy source workload rows are offered separately with an overlap warning because current source totals omit them. Independent Configurator identity and state are preserved. Reimport still uses the explicit source key. A source receipt is never runtime evidence.

## Review artifacts and recovery

- Public UI inspection script: `scripts/Inspect-UpstreamSurveyor.mjs`.
- Ignored public screenshots/inspection JSON: `.artifacts/upstream-surveyor/`.
- Original Microsoft source checkout: `D:/tmp/azurelocal-microsoft-contract-20260911/`; recover from immutable URLs in the committed lock if unavailable.
- Surveyor source recovery and regeneration: `docs/SURVEYOR_CONTRACT.md`.
- Full acceptance and publication still require `docs/design/implementation.md` and `docs/IMPLEMENTATION_STATUS.md`; this review does not close those lists.
