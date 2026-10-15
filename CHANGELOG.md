# Changelog

All notable changes to Azure Local Trailwright are recorded here. The format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/), and the project uses [Semantic Versioning](https://semver.org/).

## [Unreleased]

## [1.0.0] - 2026-10-15

First complete release. Plans against Azure Local 12.2609 (latest).

### Added
- Published JSON Schema (2020-12) for `infrastructure.yml` at `/schema/infrastructure.schema.json`, a field reference (`docs/INFRASTRUCTURE-YML.md`) and a contract test that fails the build when the exporter and the schema drift apart.
- Environment file (deploy automation) export: the cluster-facts subset of the deploy automation's `environment.yml`, with `CHANGE-ME` placeholders and TODO comments for what a design cannot know. Contract-tested against a vendored copy of that schema (`docs/ENVIRONMENT-FILE.md`).
- Terraform variables export (`terraform.tfvars.json`) for the deploy automation's cluster-deploy Terraform root.
- As-built compare: load an `as-built-snapshot.v1` file (for example from Azure Local Ranger) and see match, drift, missing and not-captured rows, with CSV and Markdown export (`docs/AS-BUILT.md`).
- Nested two-way mirror volumes for two-server clusters, including the Surveyor import mapping.
- Optional release build field; exports never guess the full build.
- Rules AZ-005 (deployment prefix, 1 to 8 characters), REL-001, and a stricter AZ-002 (machine name character set). `docs/RULES.md` is generated from the rule registry and a test keeps it current.
- Notes warning (do not type secrets) on the Project step and a notice in the project JSON export.
- LICENSE, CHANGELOG, CONTRIBUTING, AGENTS.md, repo-intent.md, Dependabot configuration and `npm run lint`.

### Changed
- Excel schedules are written by a small built-in writer (fflate) instead of the SheetJS `xlsx` package, which has known vulnerabilities and no fix on npm. Cell values are unchanged (golden-file test).
- Dependencies updated (jsPDF 4, jspdf-autotable 5, Vite, Vitest).
- Heavy libraries (PDF export) load on demand, which splits the large bundle chunk.
- The Playwright web server timeout is 180 seconds.
- `docs/REBUILD.md` replaced by `docs/HISTORY.md`.

### Removed
- The unused screen placeholder component.
