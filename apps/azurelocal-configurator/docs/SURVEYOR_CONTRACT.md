# Surveyor import contract

Reviewed 2026-09-11. SurveyorPlan formats 2.7.0 and 2.8.0 use schema 1.0. The live 2.8.0 website instead exports a project with numeric schema 1/state 10; that format now has its own strict contract. Exact source commits and file hashes are in `src/contracts/surveyor/source-lock.json`. Unknown versions, nested fields and wrong primitive types fail before the project changes.

The schemas are derived from each pinned source exporter's `SurveyorPlan` and `SurveyorProject` types. The checked manifest fixtures were produced by the actual source `exportJson` function with synthetic state and a captured browser-download sink. The live project fixture came from the visible public report download in native Chrome. This establishes file-format behavior; it is not native deployment qualification. `src/testing/surveyor/evidence.json` and `live-evidence.json` record fixture and source evidence.

## Recovery and regeneration

Use native PowerShell and Node from the repository root. The vendored 2.7.0 source must match its lock; do not regenerate it from a changed Surveyor without reviewing a new pin.

```powershell
# Restore to a new scratch directory when the previous scratch source is unavailable.
./apps/azurelocal-configurator/scripts/Restore-SurveyorContract.ps1 -Destination D:/tmp/azurelocal-surveyor-recovered
node apps/azurelocal-configurator/scripts/Generate-SurveyorSchemas.mjs D:/tmp/azurelocal-surveyor-recovered
node apps/azurelocal-configurator/scripts/Capture-SurveyorFixtures.mjs D:/tmp/azurelocal-surveyor-recovered
npm run check --workspace apps/azurelocal-configurator
npm run test --workspace apps/azurelocal-configurator
npm run test:browser --workspace apps/azurelocal-configurator
```

Review generated diffs. These commands do not run a production build.

## Decisions and provenance

Select an explicit source key for a reimport stream. The default key is `main`; use a different key for an unrelated environment. Stable source IDs produce stable proposed record IDs. Reimport replaces only displayed sizing-owned fields. Existing host names, provider identities, network addresses and CSV mounts remain unchanged. Missing source rows are retained for review. Group and individual decisions are displayed before application; stale previews fail.

Legacy RAM and small-disk fields labelled GB require a visible GB/GiB interpretation. Explicit TB means decimal TB; inventory GiB remains binary. Frozen source results preserve source rounding and older /1024 conventions separately from recalculated byte budgets. Repair reserve is separate from the automatic infrastructure volume. No imported CSV is silently assigned to a pool or LUN.

Hardware threads, per-VM CPU demand ratios, AKS control plane/workers, AVD profiles, SOFS/MABS inner storage overhead, custom workloads and platform reservations have separate mappings. AKS-hosted services consume worker capacity when workers are present; missing worker capacity produces a finding. Individual VM measurements remain source observations and sizing proposals, never verified runtime evidence.

The private package includes `plans/import-provenance.json`, provenance schedules and source-ID mapping schedules. Original source snapshots stay separate from the evidence ledger. Sanitized exports remove source receipts and private identities.

## Open acceptance work

Broader source scenarios/negative semantic tests, complete storage and management demand reconciliation, resource-link review, and the final requirement audit remain open. Passing the importer suite does not close the rest of the saved implementation plan. The public upstream UI review is recorded in SOURCE_REVIEW_20260911.md; it does not establish an exact deployed upstream commit.

The project-import sizing runtime is committed under `src/contracts/surveyor/runtime280`, with original hashes, explicit local adaptations and MIT notice. Restore it from the recorded source paths if needed; do not import the upstream state store. Project input names/planning metadata remain original-source data. Calculated results are labelled as new estimates rather than frozen source outputs.
