# Reference and contract review

> **Scope correction — 2026-09-12.** This document records work before version 0.2.0. Its Terraform, Ansible, PowerShell and converter consumer items describe code that has since been removed: the configurator now emits automation input data only and ships no automation code. See the [README](../../README.md).

Version 0.1.0 · reviewed 2026-09-11. This records read-only research; it is not runtime qualification. No customer environment configuration was copied into this design.

## Local source baselines

| Source | Revision inspected | Material reviewed |
|---|---|---|
| TierPoint documentation | `a28302d66ddf285786244e678eade892adb3a08e` | `azure-local_versioned_docs/version-2604.0.0/implementation` |
| Azure Local Toolkit | `2af2f2a0698bb178e95c9fe5579d955770cb9d60` | `configs/variables/assets/infrastructure.schema.json`, `configs/Generate-AzureLocal-Parameters.ps1`, ARM deployment README |
| Configurators repository | `827960b1b33c11033b4055d84cbd6a2f48db17e6` | Existing Surveyor JSON exporter/state serializer and Hyper-V design patterns |

Primary local documentation paths, relative to the implementation directory:

- `04-cluster-deployment/phase-06-post-deployment/task-01-deploy-sdn.mdx`: Arc-integrated NC, optional irreversible enablement and operation order.
- `04-cluster-deployment/phase-05-cluster-deployment/deployment-methods/san/local-identity/arm-template-instructions.mdx`: conditional SAN/local identity preparation and ARM route. Treat numeric limits and zoning timing as claims requiring release/vendor corroboration before automation.
- `01-tierpoint-cicd-infra/phase-02-cicd-setup/task-01-bootstrap.mdx`: service identity, RBAC, consent and pipeline bootstrap responsibilities.
- `02-azure-foundation/phase-04-azure-management-infrastructure/01-pcs-cicd-pipeline-deployment/phase-01-configuration/task-02-configure-management-mode.mdx`: management network, access, optional utility and NDM services.

## Observed contract mismatches

| Evidence | Consequence for implementation |
|---|---|
| Toolkit schema describes v4.0.0, a hand-maintained 13-section hierarchy, and a TODO to generate from the master registry | Key presence alone is insufficient; validate types, conditional requirements and actual reader behaviour |
| Schema describes `s2d_ad`, `s2d_localid`, `san_ad`, `san_localid` scenario keys | Do not invent a hybrid scenario identifier without a matching consumer |
| Parameter generator reads `cluster_arm_deployment`, `accounts`, `cluster_nodes`, `networking.network_intents` and `compute` | Build an explicit adapter to these paths, or qualify a newer generator; do not pass the owned nested project directly |
| ARM README references a mutable Microsoft `master` template and preview API | Resolve immutable template SHA and API schema per adapter release before claiming a stable contract |
| Bootstrap runbook invokes a Bash script and suggests deleting an existing app registration | Do not copy that destructive reuse path. Plan native PowerShell or a declared external consumer with reuse/permission verification |
| Management sample uses inconsistent VNet path nesting in adjacent fields | Resolve actual module variables and tests before exporting management tfvars |
| Surveyor exporter has versioned `SurveyorPlan` with `inputs` and computed outputs; URL serializer has a different subset | Prefer explicit supported plan-file import; do not treat a URL share blob as the full deployment contract |

Candidate mapping groups: project/site → Toolkit metadata/site/environment; Azure references → Azure platform sections; identities → identity model plus consumer-specific accounts; nodes → consumer physical node settings; intents → explicit ARM intent mapping; storage → pool/LUN/CSV/path contracts; SDN → explicit post-deployment action plan and network policy consumers. Each mapping needs source-field/type/default/null/unit tests and rejected-combination fixtures.

## Public references

All links were investigated on 2026-09-11. Microsoft version query strings can serve revised content; record the actual source revision when shipping a qualification catalog.

- [Azure Local Surveyor](https://azurelocal.cloud/azurelocal-surveyor/): direct HTTP read returned 200 with the correct page title. Web text extraction failed, so the existing local Surveyor exporter/model was inspected for the proposed import. Full live Surveyor UI review is still required before implementing that importer.
- [Surveyor source](https://github.com/AzureLocal/azurelocal-surveyor): reference supplied by the user; inspect/pin its current export implementation when qualifying the importer, independently of the vendored copy.
- [Azure Local SDN integration](https://learn.microsoft.com/en-us/azure/azure-local/deploy/enable-sdn-integration?view=azloc-2604): NC cluster-service architecture, mutually exclusive controller ownership, DNS and action-plan requirements, irreversible enablement and existing-workload disruption.
- [External storage](https://learn.microsoft.com/en-us/azure/azure-local/deploy/enable-external-storage?view=azloc-2604): SAN connectivity, host/LUN presentation and MPIO. Do not infer universal SAN-only protocol or SDN compatibility from hybrid attachment instructions.
- [Local identity deployment](https://learn.microsoft.com/en-us/azure/azure-local/deploy/deployment-local-identity-with-key-vault?view=azloc-2604) and [local identity ARM deployment](https://learn.microsoft.com/en-us/azure/azure-local/deploy/deployment-local-identity-with-key-vault-template?view=azloc-2604): DNS, vault, identity and deployment-path requirements. Some current index pages still label this preview; pin status for the selected release.
- [Portal deployment](https://learn.microsoft.com/en-us/azure/azure-local/deploy/deploy-via-portal?view=azloc-2604): source for the future ordered portal worksheet.

## Qualification questions to resolve during implementation

1. Authoritative support matrix for 2604 storage × identity × topology × SDN; specifically SAN-only with Arc-managed SDN.
2. Exact supported FC/iSCSI combinations, OEM models, drivers and firmware, and infrastructure LUN requirements for each path.
3. Node-count and provisioning constraints for each S2D resiliency, including nested and mirror-accelerated parity volumes.
4. Supported identity/management tools and feature status for the pinned release.
5. Canonical Toolkit consumer and registry revisions; no global ProductLabs schema prerequisite.
6. Exact management module and safe bootstrap contracts, with independently hosted prerequisite services.
7. Pinned Terraform/Ansible/PowerShell/DSC consumers and evidence of their behaviour for each exported stage.

These questions limit automation qualification. They do not prevent documenting choices or collecting a draft design. Any live provisioning requires separately authorized targets.
