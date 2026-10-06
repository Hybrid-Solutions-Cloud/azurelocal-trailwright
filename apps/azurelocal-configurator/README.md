# Azure Local Configurator

Application version **0.2.0**, 2026-09-12. This directory owns the standalone Azure Local Configurator and its authoritative design. Version 0.1.0 was published and verified at commit fdb7ebf; see [release evidence](docs/RELEASE_VERIFICATION.md). Hyper-V is a separate workstream.

The application captures deployment decisions, imports supported Surveyor sizing with reviewed conflicts, validates the selected release and architecture, and produces reports plus the input data your existing automation consumes. It owns its persistent project schema; it does not require a ProductLabs project.

**Scope: data, not automation.** The configurator emits data files — Terraform input values (`inputs/terraform/terraform.tfvars.json`), Ansible inventory and group variables (`inputs/ansible/`), a finished ARM parameter file (`inputs/arm/azuredeploy.parameters.json`) and the Toolkit hierarchy with its companion (`toolkit/conversion/`). It ships no Terraform, Ansible, PowerShell, DSC or Bicep code. `src/configurationPackage.test.ts` fails the build if an export ever contains executable files.

- Automation input data: [Terraform values](docs/TERRAFORM_CONTRACT.md), [Ansible inventory](docs/ANSIBLE_CONTRACT.md), [Toolkit conversion data and ARM parameters](docs/TOOLKIT_BRIDGE.md), [PowerShell and DSC](docs/POWERSHELL_DSC_CONTRACT.md).
- [User guide](docs/USER_GUIDE.md), [development and release](docs/DEVELOPMENT.md), [implementation status](docs/IMPLEMENTATION_STATUS.md) and [requirement audit](docs/REQUIREMENT_AUDIT.md).
- [Detailed outline](docs/design/outline.md): screen order, conditional choices, defaults, records, validation and exports.
- [Flowcharts](docs/design/flows.drawio): four editable pages; PNG exports are alongside the source.
- [Reference and contract review](docs/design/references.md): inspected sources, pinned revisions and conflicts to resolve.
- [Implementation checklist](docs/design/implementation.md): delivery tasks and acceptance cases.

SDN is selected by default in a new design, with an opt-out before deployment. Compatibility checks still apply. Azure Local Arc-managed SDN is its own architecture. CSV provisioning defaults to thick/fixed where applicable; array-side LUN provisioning is recorded separately.

The browser does not execute infrastructure commands. A YAML or JSON extension alone does not establish compatibility with a consumer; map each input file to your automation's own variables.
