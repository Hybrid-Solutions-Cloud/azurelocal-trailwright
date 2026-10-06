# Toolkit conversion data and ARM parameters

> **Scope correction — 2026-09-12.** Version 0.1.0 shipped `Convert-ToolkitArm.ps1`, a powershell-yaml restore script and the Microsoft ARM templates so users could convert Toolkit YAML into an ARM parameter file themselves. They were removed in 0.2.0. The configurator now emits the finished ARM parameter file directly and ships no converter script or template.

## What is exported

When Toolkit conversion is selected and passes validation for a new standard S2D design, private designs export:

| File | Content |
|---|---|
| `inputs/arm/azuredeploy.parameters.json` | Finished ARM parameter file — `$schema`, `contentVersion` `1.0.0.0`, and every parameter for the selected identity template. Secure values are Key Vault references. |
| `toolkit/conversion/infrastructure.yml` | Canonical Toolkit v4 hierarchy for this design |
| `toolkit/conversion/companion.json` | Values the Toolkit hierarchy cannot express faithfully, bound to that YAML by SHA-256 |
| `toolkit/conversion/contracts/toolkit/bridge/<identity>.*.json` | Fixed mapping, parameter schema and companion schema |
| `toolkit/conversion/contracts/*/source-lock.json`, `infrastructure.schema.json` | Source pins and the Toolkit schema the data was validated against |

`plans/toolkit-conversion-review.json` lists every parameter's source and any reason the data is withheld.

## Companion supplements

| Identity | Supplemental values |
|---|---|
| Both | Witness type/account, explicit new-vault choice, exact Microsoft storage configuration mode, networking type/pattern |
| Local identity | Identity provider, DNS server configuration and DNS zones |
| AD | Two explicit Key Vault credential bindings |
| Local identity | One explicit Key Vault credential binding |

Bindings keep the complete source vault resource ID, secret name and optional 32-character version. No credential value, vault, storage mode or networking choice is invented.

## Validation

The parameter file is produced by the same strict ARM mapping used throughout the application and validated against the pinned template parameter declarations and API definitions. Duplicate or case-colliding Toolkit tag keys are rejected. SAN, hybrid, rack-aware and existing-cluster branches withhold this data and keep the entered design.

## Not included

No PowerShell converter, restore script, ARM templates or template licenses.

Tests: `src/toolkitBridge.test.ts` and `src/configurationPackage.test.ts`.
