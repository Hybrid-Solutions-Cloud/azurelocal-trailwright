# PowerShell and DSC

> **Scope correction — 2026-09-12.** Version 0.1.0 exported a PowerShell parameter splat and instructions for running the Toolkit converter. Both were removed in 0.2.0 along with the converter.

Schema 8 keeps the PowerShell 7.4.6/7.6.6 toolchain choice and the DSC selection as design data. Versions 1–7 migrate without selecting DSC or inventing resource requests.

No PowerShell stage is emitted. The ARM parameters that stage used to produce are now exported directly as `inputs/arm/azuredeploy.parameters.json` — see [Toolkit conversion data](TOOLKIT_BRIDGE.md).

DSC version, resource, source, schema, property and target requests remain editable design records. Selecting DSC produces an actionable design-only review in `plans/powershell-dsc-review.json` and preserves the request. No DSC configuration is generated.
