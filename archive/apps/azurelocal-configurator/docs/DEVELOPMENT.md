# Development and release

Work in the isolated Azure Local worktree while Hyper-V has active work. App-owned goal, checkpoint and audit files live under docs/. Do not replace the original repository shared state.

Use native PowerShell on Windows. From the repository root:

```powershell
npm run check --workspace apps/azurelocal-configurator
npm run test --workspace apps/azurelocal-configurator
npm run test:browser --workspace apps/azurelocal-configurator
```

Browser tests launch installed Windows Chrome and the Vite development server; no local production build is needed. Run tests against a stable source snapshot. Root workspace tests and GitLab CI also protect the other apps. There are no consumer CI jobs: the configurator exports data only, and src/configurationPackage.test.ts fails if an export contains executable files.

The owned catalog drives fields, strict parsing and schedules. New fields/collections require a schema version and migration fixtures. Preserve secret-reference and stable-ID rules. Recalculate contextual findings against the frozen export snapshot; do not mutate design values to make a consumer pass. Record source conflicts and qualify individual stages.

Release through the existing GitLab project 86119904 pipeline. Fetch and merge latest main before changing the shared catalog. Preserve all current application releases and private Pages access. Root catalog 0.35.0 introduces Azure Local app 0.1.0; Hyper-V remains 0.32.0. Never run npm run build locally. Production builds run in GitLab CI, and the default-branch Pages job depends on test, security, browser and native contract gates.

Verify exact commit/version using the live catalog card and application version.json, then run deployed browser journeys and inspect actual downloads. The application does not execute live infrastructure. Do not close runtime qualification based on UI, mock or local file-contract tests.
