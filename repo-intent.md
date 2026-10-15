# Repo intent: azurelocal-trailwright

**Azure Local Trailwright: a guided design tool for Azure Local. Answer questions in order, get a validated design record and the files your automation needs. Runs in the browser; nothing is sent to a server and nothing is deployed.**

## What this repo is

Surveyor answers "does it fit" for sizing. Trailwright answers "how is it built". It captures a design (hardware, storage, network intents and VLANs, management network, outbound connectivity, identity, security, Azure resources, operations), validates every choice against the current release (12.2609, latest) with a Microsoft Learn source for each rule, and exports:

- the ARM and Bicep parameters for Microsoft's deployment templates (all eight templates, contract-tested);
- `infrastructure.yml` with a published JSON Schema;
- an environment file and Terraform variables for the Azure Local deploy automation (with `CHANGE-ME` placeholders for what a design cannot know);
- schedules (CSV, Excel), a switch port plan, a topology (draw.io), the design handoff (Markdown, PDF) and the project JSON.

It also compares a design with an as-built snapshot (for example from Azure Local Ranger) and shows drift.

It is a design record, not a deployment tool and not a secret store.

## How it relates to other repos

- `azurelocal-surveyor` sizes the cluster; its project and plan JSON can be imported here.
- `azurelocal-ranger` documents what was built; its manifest can be turned into an as-built snapshot (`docs/AS-BUILT.md`).
- `azurelocal-beacon` checks the environment before deployment; `azurelocal-sonar` follows the deployment while it runs.

## Status

Version 1.0.0. Live at https://labs.hybridsolutions.cloud/azurelocal-trailwright/. See [CHANGELOG.md](CHANGELOG.md).
