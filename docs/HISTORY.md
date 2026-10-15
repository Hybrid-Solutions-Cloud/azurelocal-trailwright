# History of the Trailwright rebuild

This file records why Trailwright was rebuilt and how the result differs from the original plan. For what the tool does today, read the [README](../README.md) and the [user guide](USER-GUIDE.md). The earlier plan (`REBUILD.md`) is replaced by this page.

## Why a rebuild

The decision of 6 October 2026 was to rebuild rather than patch, because the imported application:

- was built for a private catalog, with company-default component gates and a private registry pin;
- was about 4,300 lines of minified, one-line TypeScript, and its contract, adapter, evidence and qualification layers validated paperwork rather than a design;
- had a frozen support baseline and a vendor tarball dependency that broke `npm ci` where remote tarballs are blocked;
- had a user guide that referred to the private catalog.

The rebuild uses the same stack as Surveyor so the tools feel like one family: Vite, React 18, TypeScript, Tailwind, Zustand, Zod, Radix UI, Vitest and Playwright, with readable source and one concern per file. Dependencies come from the npm registry only.

## What was built (as of version 1.0.0)

| Planned | As built |
|---|---|
| Nine screens | A guided flow of sixteen steps ending with Review and export (the steps shown depend on earlier answers), plus As-built compare |
| Rules in `src/rules`, one file per area, with `docs/RULES.md` | Done. `docs/RULES.md` is generated from the registry and a test keeps it current |
| Exports: handoff, `infrastructure.yml`, ARM, Bicep, schedules, topology, project | Done, plus the switch port plan, the provisioning manifest, the disconnected operations script, an environment file and Terraform variables for the deploy automation |
| `infrastructure.yml` shape was an open question | A subset of the Toolkit registry shape (schema 4.0.0) with a published JSON Schema and a build-failing contract test |
| Surveyor import with a conflict preview | Done (project and plan formats), including nested two-way mirror volumes |
| Browser journeys, a no-secrets test and a no-executable-export test | Done |
| Spreadsheet export with the `xlsx` package | A small built-in writer, because the package has known vulnerabilities and no fix on npm |
| Deploy to GitHub Pages from `main` | Done: https://labs.hybridsolutions.cloud/azurelocal-trailwright/ |

Open questions from the plan, resolved: the field mapping from Surveyor is in `src/imports/surveyor.ts` (tested); the `infrastructure.yml` shape is in `docs/INFRASTRUCTURE-YML.md`; the PDF is a compact handoff of the schedules and findings.

## Branches

The `rebuild` branch was the working branch before cutover. It can be deleted once nothing needs its history.
