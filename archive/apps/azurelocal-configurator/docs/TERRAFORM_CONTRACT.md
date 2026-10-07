# Terraform input values

> **Scope correction — 2026-09-12.** Version 0.1.0 shipped a Terraform ARM wrapper module, provider lock and a mock-plan CI job. They were removed in 0.2.0. The configurator emits Terraform input *values* for your existing Terraform automation and ships no Terraform code. The historical wrapper and its evidence remain in git history only.

## What is exported

Private designs that select the Terraform/Ansible route and pass mapping validation export `inputs/terraform/terraform.tfvars.json`:

| Variable | Content |
|---|---|
| `subscription_id`, `tenant_id` | Explicit target subscription and tenant GUIDs |
| `environment` | `public` or `usgovernment`, mapped from the selected Azure cloud; China is withheld |
| `resource_group_name` | Existing target resource group |
| `deployment_name` | `azl-<cluster>-<identity>` |
| `identity` | `ad` or `local` |
| `parameters_content` | The complete ARM parameter map as JSON text — 54 parameters for AD, 53 for local identity |
| `deployment_authorized` | Always `false`; only your own authorization process should change it |

`plans/terraform-review.json` records findings, limitations and the boundary. Variable names follow a single-deployment ARM stage; map them to your automation's own inputs where they differ.

## Validation

The parameter map comes from the same strict ARM mapping as every other output and is validated with Ajv against the pinned Microsoft template parameters and API definitions. Secure values are Key Vault references, never literals.

The export is withheld for sanitized designs, SAN-only or hybrid storage, unsupported clouds, a missing tenant GUID, and unresolved ARM mapping errors. The entered design is always kept.

## Not included

No `.tf` files, provider or module locks, state backends, credentials, or plan/apply commands.

Tests: `src/terraform.test.ts` and the package-boundary suite `src/configurationPackage.test.ts`.
