# Azure Local Configurator release verification

Application **0.1.0**, owned schema **8**, catalog **0.35.0**. Published commit: `fdb7ebf4bd099b35e5565674b9c6740c3f56f2a0`.

[Open Azure Local Configurator](https://tierpoint.gitlab.io/prodtech/hybrid-cloud/toolkits/configurators/azurelocal-configurator/) · [successful release pipeline](https://gitlab.com/tierpoint/prodtech/hybrid-cloud/toolkits/configurators/-/pipelines/2842373283) · [Pages job](https://gitlab.com/tierpoint/prodtech/hybrid-cloud/toolkits/configurators/-/jobs/16458970426).

## Verified outcomes

- TypeScript and all 195 application unit/contract tests passed; existing workspace regression suites, browser tests and security checks passed in the release pipeline.
- Production builds ran only in GitLab CI. Pages published all applications through the existing pipeline.
- Native Windows Chrome followed the live catalog card into Azure Local and verified fourteen screens, rendered release header and exact version.json commit.
- The live catalog HTML has the same SHA-256 as the successful Pages job's original artifact. Existing application releases remain present, including Hyper-V 0.32.
- GitLab project and Pages access remain private. Anonymous access to the app version redirects to authentication (302).
- All 17 browser journeys passed against the deployed application: persistence, save/open, recovery, import/reimport, correction links, architecture branches, mobile/keyboard forms, evidence review and actual downloads.
- Five live-generated ZIPs passed 604 manifest size/hash/member checks, canonical JSON/YAML equality, five 76-sheet workbook checks, 380 exact CSV/workbook comparisons, 20 PNG/draw.io page checks and 223 PDF page/text-boundary checks. Representative report and topology pages and mobile/app screenshots were visually inspected.

Original synthetic browser downloads, hashes, pipeline/access/version summaries and representative screenshots are retained in [the live evidence directory](evidence/release-20260911/live/). The five original ZIP downloads are stored separately under original-downloads to respect the GitLab 1 MiB per-file limit; their hashes and sizes are recorded in browser-summary.json and csv-summary.json. These fixtures contain synthetic design data, not customer infrastructure observations.

## Qualification boundaries retained

The Configurator generates designs and downloadable handoffs. It has no infrastructure execution path, and no real infrastructure was provisioned or modified during delivery.

Local tests and browser checks do not establish native deployment qualification. The original Toolkit reader remains defective; a separately identified local conversion export was tested. No DSC deployment resource is qualified. ARM source conflicts and unsupported or uncertain storage/identity/topology combinations remain visible review/blocked states. No adapter is advertised as runtime-qualified. See REQUIREMENT_AUDIT.md for the complete saved checklist and requirements-evidence.json for all 342 original source entries, including headings and flow connectors.

The later evidence-only Git commit records this verification; the published application version remains the exact release commit stated above.
