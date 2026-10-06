# Implementation and release status

## 0.2.0 — automation input data only (2026-09-12)

Version 0.2.0 removes all authored automation code. Exports contain reports, schedules, diagrams and automation input data — Terraform values, Ansible inventory, a finished ARM parameter file and Toolkit conversion data — and no Terraform, Ansible, PowerShell or DSC code. Project schema remains 8.

Local verification on branch `feat/azurelocal-data-only`: TypeScript clean; 198 unit tests including the new package-boundary suite; 17 browser journeys; all workspace regressions (Hyper-V Configurator 450, Hyper-V Surveyor 178, Azure Local Surveyor 301). The CI pipeline, Pages publication and live verification for 0.2.0 are pending.

## 0.1.0 — first publication (2026-09-11)

Azure Local Configurator 0.1.0 (schema 8, catalog 0.35.0) was published and verified at https://tierpoint.gitlab.io/prodtech/hybrid-cloud/toolkits/configurators/azurelocal-configurator/.

The published application commit is fdb7ebf4bd099b35e5565674b9c6740c3f56f2a0. GitLab main pipeline 2842373283 and Pages job 16458970426 passed. TypeScript, 195 application unit/contract tests, all workspace regressions and the CI browser suite passed. All 17 native Windows Chrome journeys also passed against the actual deployed application. The live catalog exactly matched the Pages artifact; private access remained enforced and existing releases were preserved.

Five live-generated packages passed independent hashes/size/membership, JSON/YAML, 380 CSV-to-workbook comparisons, 20 draw.io/PNG page checks and 223 PDF page checks. Representative application, mobile, report and topology images were visually reviewed. Original downloads and summaries are retained in evidence/release-20260911/live/. See RELEASE_VERIFICATION.md, REQUIREMENT_AUDIT.md and requirements-evidence.json for the release and source-entry mapping.

That release was a Configurator with downloadable handoffs and no infrastructure execution path. Its named Terraform, Ansible and PowerShell consumer stages were removed in 0.2.0.
