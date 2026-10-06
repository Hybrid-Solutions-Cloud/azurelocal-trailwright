# Remaining Azure Local Configurator delivery goal

Requested by the user on 2026-09-11. Delivery verification is complete for fdb7ebf; all six exit criteria below passed. This goal was limited to finishing the working Configurator and its requested exports. It does not authorize a separate automation solution or any infrastructure operation.

## Folders and release candidate

- Canonical application: `D:/git/tierpoint/prodtech/hybrid-cloud/toolkits/configurators/apps/azurelocal-configurator`.
- Existing isolated worktree: `D:/git/tierpoint/prodtech/hybrid-cloud/toolkits/configurators-azurelocal`.
- Branch: `feat/azurelocal-configurator`; release candidate already pushed to `main`.
- Candidate: `fdb7ebf4bd099b35e5565674b9c6740c3f56f2a0`.
- Application 0.1.0, owned schema 8, catalog 0.35.0.
- GitLab project 86119904; main pipeline 2842373283; Pages job 16458970426.

## Completed evidence carried forward

The 14-screen application, persistent projects, editable inventories, validation, reports, diagrams and exports are implemented. Native Windows TypeScript checks, 195 unit/contract tests and all 17 Chrome journeys passed. Five browser-generated ZIPs passed independent manifest/hash, JSON/YAML, workbook, XML/PNG and PDF checks with representative visual inspection. The catalog link that previously blocked VitePress has been corrected; the candidate's feature production build passed in GitLab. No production build ran locally.

## Remaining tasks and exit criteria

1. Finish the exact-source default-branch pipeline and Pages publication. Fix concrete failures without disabling checks. Record the successful pipeline and Pages job for the published commit.
2. Verify the actual private website. Confirm the catalog card launches Azure Local, version.json and rendered header identify the expected commit/version, all fourteen screens appear, private access settings remain unchanged and existing application releases remain present.
3. Run all 17 browser journeys against the deployed application using native Windows Chrome. Verify project persistence, save/open, import/reimport, correction links, architecture branches, responsive/keyboard access and real downloads. Any failure must be resolved and the affected verification repeated.
4. Inspect the actual live-generated artifacts independently: ZIP membership and hashes, canonical JSON/YAML agreement, workbook schedules, PDF readability/content, and editable draw.io/PNG mappings. Preserve original summaries and representative visual evidence.
5. Reconcile REQUIREMENT_AUDIT.md and the saved acceptance cases with actual implementation and release evidence. Retain explicit unresolved source/support and consumer limitations. No mock, local conversion test or browser result is native infrastructure qualification.
6. Record durable final release evidence and checkpoint. Report the working URL, exact published commit/version, passing checks and remaining qualification limits. Mark this goal complete only after publication and deployed verification pass.

## Boundaries

Keep the complete saved design scope; do not replace it with an MVP. Deliver the Configurator and requested exports. Do not build or expand a separate automation solution or add infrastructure execution to the browser. Do not remove requested exports merely because they contain deployment inputs. Do not provision, reimage or change Azure resources, hosts, networking, storage or clusters.

Use Windows and native PowerShell, no WSL and no local production builds. Existing GitLab CI/Pages owns production builds and publication. Preserve original-worktree changes, private access, existing applications and shared state. Further changes should address concrete delivery defects, not expand the product scope.

Completion evidence: RELEASE_VERIFICATION.md and evidence/release-20260911/live/. All 17 deployed journeys passed; exact catalog/app version and private access verified; live downloads independently inspected. No infrastructure changes.
