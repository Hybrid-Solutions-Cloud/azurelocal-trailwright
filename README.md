# Azure Local Trailwright

Design Azure Local deployments, validate the choices against the current release (12.2609, latest) and export files for automation. [Azure Local Surveyor](https://github.com/AzureLocal/azurelocal-surveyor) answers "does it fit"; Trailwright answers "how is it built". Neither tool deploys anything, and Trailwright never stores a secret.

**Use it now:** https://labs.hybridsolutions.cloud/azurelocal-trailwright/ (runs in your browser; nothing is sent to a server).

## What you get

A guided flow (hardware, storage, network design, intents and VLANs, management network, outbound connectivity, identity, security, provisioning, Azure resources, operations) with a Microsoft Learn source for every rule, then:

| Output | For |
|---|---|
| ARM parameters (validate, deploy) and Bicep parameters | Microsoft's eight quickstart templates, contract-tested |
| `infrastructure.yml` (published [schema](apps/trailwright/public/schema/infrastructure.schema.json)) | The Azure Local Toolkit registry shape |
| Environment file and Terraform variables | The Azure Local deploy automation ([how it maps](docs/ENVIRONMENT-FILE.md)) |
| Schedules (CSV, Excel), switch port plan, topology (draw.io), handoff (Markdown, PDF), project JSON | Teams and records |
| As-built compare | Design versus what Ranger or your own script found ([format](docs/AS-BUILT.md)) |

## Quick start

You need Node.js 22 or later.

```powershell
git clone https://github.com/Hybrid-Solutions-Cloud/azurelocal-trailwright.git
cd azurelocal-trailwright
npm install
npm run dev            # http://localhost:5173
```

Open the app, choose **Load the example project** on the Project step, and walk through the steps. Or import a plan from [Surveyor](https://github.com/AzureLocal/azurelocal-surveyor).

```powershell
npm run check          # type check
npm run lint           # ESLint
npm test               # unit and contract tests
npm run build          # contract tests, type check, production build
npm run test:browser   # Playwright journeys (builds and previews the app)
```

## Documentation

- [User guide](docs/USER-GUIDE.md)
- [Validation rules](docs/RULES.md) (generated from the code)
- [infrastructure.yml field reference](docs/INFRASTRUCTURE-YML.md)
- [Environment file and Terraform variables](docs/ENVIRONMENT-FILE.md)
- [As-built compare](docs/AS-BUILT.md)
- [History of the rebuild](docs/HISTORY.md), [Changelog](CHANGELOG.md), [Contributing](CONTRIBUTING.md)

MIT licensed.
