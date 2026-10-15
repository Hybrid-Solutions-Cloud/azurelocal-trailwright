# Azure Local Trailwright: rebuild plan

Drafted by `gpt-6-luna`, reviewed and corrected by the maintainer. Work happens on the `rebuild` branch; `main` keeps deploying the old application until cutover.

## Purpose

Design Azure Local deployments, validate architecture choices, and export reports for automation.

Surveyor answers "does it fit"; Trailwright answers "how is it built". Neither tool deploys anything.

## Why a rebuild

The owner decision of 6 October 2026 (D-032) is to rebuild, not patch, because:

- The imported app was built for a private company catalog, with company-default component gates, a private registry pin and a GitLab-only release process.
- It has fourteen screens and about 4,300 lines of minified, one-line TypeScript. Its contract, adapter, evidence and qualification layers validate paperwork rather than a design.
- Its support baseline is frozen at 2604 while the session deploys 2609.
- Its `xlsx` dependency is a vendor CDN tarball, which breaks `npm ci` where remote tarballs are blocked.
- Its standalone Pages entry was never verified.
- Its user guide refers to the private catalog.

## Scope and non-goals

Trailwright is a design-record web tool for Azure Local. It captures a design, validates the choices against the selected release and exports data for handoff and automation.

It uses generic defaults and puts no company names in a design. The bundled "IIC" lab is an example project, not a default.

It does not deploy anything. Deployment stays outside the tool.

## Stack and layout

The stack is the same as Surveyor 2.8.0, so the azurelocal.cloud tools feel like one family: Vite, React 18, TypeScript, Tailwind, Zustand, Zod, Radix UI, Vitest and Playwright. Dependencies come from the npm registry only, with no tarball URLs. Source is readable, with one concern per file and no minified code.

```text
.
├── apps/
│   └── trailwright/
│       ├── src/
│       │   ├── model/        project schema, defaults, store
│       │   ├── rules/        release-aware validation rules
│       │   ├── screens/      the nine screens
│       │   ├── imports/      Surveyor and project import
│       │   └── exports/      handoff, infrastructure.yml, parameters, schedules, topology
│       └── tests/            unit tests and browser journeys
├── docs/
└── .github/workflows/
```

## Data model

A saved project uses schema 1. The top-level sections are `meta`, `release` and `findings`, plus one section per screen: `project`, `hardware`, `identity`, `networking`, `connectivity`, `landingZone`, `storage`, `operations`. Review and export (screen 9) holds no design data of its own.

## Screens

The flow follows the azurelocal.cloud lifecycle.

| # | Screen | What it captures | What it validates |
|---:|---|---|---|
| 1 | Project and release | Project details, selected release | The release is supported and its rule set is loaded |
| 2 | Hardware and topology | Nodes, witness, rack-aware or standard | Node count and witness against the topology and release |
| 3 | Identity | Active Directory, or Local Identity with Key Vault | Identity mode against release support and the landing-zone Key Vault |
| 4 | Networking | VLANs, Network ATC intents, switched or switchless storage, IP plan | Intent and storage design against node count; IP plan and VLAN consistency |
| 5 | Connectivity | Direct, proxy, Arc gateway or private path; endpoint allow-list | The chosen path against the release's endpoint requirements |
| 6 | Azure landing zone | Subscription, resource group, Key Vault, witness storage, Arc, custom location | Required resources and names are present and consistent |
| 7 | Storage | Volumes, resiliency | Resiliency against node count |
| 8 | Operations | Monitoring, update, backup, disaster recovery | Required operations settings for the release |
| 9 | Review and export | Findings summary, export choices | All findings resolved or accepted before export |

The concrete rules per screen are listed in the code and in `docs/RULES.md` as they land.

## Rules

Rules live in `src/rules/`, one file per area, and are selected by the project's release; 2609 is the baseline. Every finding carries the field it concerns and the Microsoft Learn URL of its source, so a reviewer can check the claim.

## Imports

- Surveyor plan JSON (schema 2.8.0), with a conflict preview before anything is applied.
- A saved Trailwright project (schema 1).

## Exports

Exports are data only, never executable content. Secrets appear only as references.

| Export | Format | Contents | Secrets |
|---|---|---|---|
| Design handoff | Markdown, PDF | The design as a readable report | References only |
| `infrastructure.yml` | YAML in the Toolkit registry shape | Design data for the Toolkit | References only |
| ARM parameters | JSON, one file per template (Microsoft AD, Local Identity) | Template parameters | References only |
| Bicep parameters | `.bicepparam` | The same values for Bicep | References only |
| Schedules | CSV, XLSX | IP, VLAN and node schedules | References only |
| Topology | draw.io | The cluster and network diagram | None |
| Project | JSON (schema 1) | The full project | References only |

## Tests

- Unit tests for the model, the rules and each exporter.
- Browser journeys for the guided flow and the exports.
- A no-secrets test: no export contains a secret value.
- A no-executable-export test: no export contains executable content.

## CI and deployment

GitHub Actions runs type check, unit tests, build and the browser journeys, and deploys the build to GitHub Pages. On the `rebuild` branch the workflow runs but does not deploy.

## Cutover


## Open questions

- The field-by-field mapping from Surveyor 2.8.0.
- The exact Toolkit `infrastructure.yml` shape.
- The PDF layout.
