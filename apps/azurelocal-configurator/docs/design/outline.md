# Azure Local Configurator — detailed design

Design version **0.1.0** · reviewed **2026-09-11** · baseline documentation **2604.0.0**.

This is the proposed design for a standalone website at `apps/azurelocal-configurator`. It lets an engineer turn a sizing plan or existing hardware inventory into a detailed Azure Local deployment design. It produces reviewable files for operators and automation. The design is now documented; the interactive tool and its adapters remain to be implemented.

## 1. Start with the user's task

The start page offers **Create a deployment design**, **Import a sizing plan**, and **Open an existing design**. An existing-cluster assessment can seed a new revision without pretending a greenfield installation is required.

Users who only need capacity sizing can follow a clearly labelled link to Azure Local Surveyor. Import is optional. The Configurator has its own project files, autosave key and revision history. Opening Hyper-V or ProductLabs files does not silently reinterpret them as Azure Local projects.

For each step, show required answers, unresolved decisions and a short summary. Allow navigation in any order, save incomplete work, and produce draft reports with visible findings. Filter execution exports to combinations with a qualified consumer. Explain disabled choices in place and preserve earlier answers when changing branches; exclude inactive records from generated automation.

## 2. Screen order

| Step | Screen | Primary decisions and collected records |
|---|---|---|
| 01 | Project and import | Purpose, owners, site, new/existing, release, optional Surveyor input, design scope |
| 02 | Architecture and deployment | S2D/SAN/hybrid, identity choice, topology, Portal/ARM/Terraform-Ansible, handoff depth |
| 03 | TierPoint management | New/reuse/partial/customer-managed, service inventory, hosting, availability and ownership |
| 04 | Bootstrap and access | CI/CD identity, runner, network access, node preparation, independent prerequisites |
| 05 | Azure foundation | Cloud/region, subscription and resource references, resource providers, RBAC, connectivity |
| 06 | Identity and security | AD or local identity with Key Vault, DNS, accounts, certificates, security settings |
| 07 | Nodes and physical readiness | Qualified hardware, BMC, firmware/SBE, boot media, adapters, disks and rack placement |
| 08 | Host networking | Network ATC intents, physical ports, VLANs, IP pools, switchless/switched and SAN exceptions |
| 09 | Storage sources | Local S2D devices and/or SAN arrays, fabrics, initiators, targets, LUNs and MPIO |
| 10 | CSVs and storage paths | Import or author volumes, counts, sizes, thick/thin, per-volume resiliency, Azure storage path mappings |
| 11 | Azure Local SDN | Default enabled intent, compatibility, prefix/DNS, enablement stage, logical networks and NSGs |
| 12 | Workloads and platform services | VM/AVD/AKS requirements, images, placements, CPU/memory/storage reservations and migration |
| 13 | Licensing and operations | Entitlements, priced assumptions, monitoring, backup, patching, recovery and acceptance |
| 14 | Review and export | Decisions, topology, findings, prerequisite order, report selection and consumer-specific bundles |

## 3. Project, release and import

Collect project name/ID, customer/site labels, technical/business owners, environment purpose, target date, design revision and approver. Collect country/region and customer-defined tags without embedding real private environments into shipped examples.

Choose **new deployment**, **existing hardware to configure**, or **existing Azure Local cluster to assess/extend**. Record selected Azure Local release, exact OS build, solution/SBE version and hardware support evidence. The initial reference baseline is 2604.0.0; a newer source page must not silently upgrade that baseline.

Import a supported Surveyor plan JSON with a preview of hardware, capacity settings, volumes, workloads and management overhead. Record source schema/app version, file hash, generation/import timestamps and original record IDs. Let users accept individual groups, merge by stable ID, or retain current values. Display every conflict. Reimport must not duplicate volumes or overwrite deployment identifiers without review.

Surveyor capacity numbers are sizing evidence, not proof that a LUN, CSV, Azure resource or named host exists. Missing names, paths, network addresses and array identifiers remain questions. Normalize units explicitly, preserve original values and show recalculated estimates separately. Unsupported or malformed source schemas fail with a useful explanation; they never replace the current project.

## 4. Architecture and deployment choices

| Decision | Choices | Conditional follow-up |
|---|---|---|
| Storage architecture | S2D; SAN only; hybrid S2D + SAN | Enable the relevant source, network and volume sections |
| Identity | Active Directory; Local identity with Azure Key Vault | AD preparation or local identity/DNS/vault preparation |
| Topology | Single-site standard; rack-aware/multi-rack candidate; existing topology | Record racks/failure domains; qualify each topology against storage and release |
| Cluster deployment route | Azure portal; ARM template; Terraform/Ansible orchestration | Operator worksheet; exact ARM parameter file; Terraform input values and Ansible inventory for your existing automation |
| Delivery depth | Design/report only; operator handoff; automation package | No automatic infrastructure execution merely from selecting a route |
| Existing state | New; reuse; extend | Discover/verify existing resources and avoid destructive recreation |

Portal is a full deployment path with a worksheet in portal order, prerequisites and verification steps. ARM uses an immutable template revision, API version, parameter mapping and runtime secret resolution. Terraform/Ansible is an orchestration choice whose supported resources and stages must be stated individually; it is not a claim that every Azure Local operation has a native provider resource.

Validate the cross-product of storage, identity, topology, networking, SDN and release. Keep unsupported combinations available as documented requirements where useful, but mark their deployment path blocked with the reason and a supported alternative. Unknown support is not a passing result.

## 5. TierPoint management solution

**Include this section.** Offer **reuse existing**, **deploy new TierPoint management**, **extend existing**, and **customer-managed services**. Each component has its own new/existing/external/not-required lifecycle, owner, hosting location, endpoint, dependencies, capacity and acceptance evidence.

| Component group | Choices and required detail |
|---|---|
| Azure management network | VNet/subnets, routing, VPN/ExpressRoute, DNS resolver, Bastion/jump access, egress/private endpoints |
| Identity services | Existing or new AD DS/DNS where required; directory redundancy, sites, replication and recovery ownership |
| Utility and device monitoring | Utility/jump server and NDM selection, image/version, CPU/memory/disks, network placement and maintenance |
| WAC and administration | Existing/new gateway, version, certificate reference, access groups and compatibility with selected identity |
| OEM management | Dell OME or other OEM integration where needed; appliance hosting/version, network, capacity, license/support and manual handoff |
| Operations services | Monitoring workspace/DCRs, alert routing, backup, vaults, security policy, delegated management/Lighthouse |
| Automation services | Existing/new runner, artifact/package repository, access identity and secret store; linked to bootstrap records |

Hosting may be Azure IaaS, an existing independent virtualization platform, or qualified physical infrastructure, per component. Collect HA/failure domains, CPU/RAM/disk capacity, startup order and recovery. Do not assume the target cluster can host services it requires before it exists. A temporary bootstrap host and eventual final placement are separate records.

Selecting local identity for the Azure Local cluster does not prohibit AD-dependent customer workloads or an independently managed directory. Conversely, it does not force deployment of AD DS just because the management catalog contains it. OME stays a manual appliance deployment unless a separate future qualification explicitly changes that scope.

## 6. Bootstrap solution

**Include this as a separate decision from management.** Ask what already exists and what must be prepared:

1. **CI/CD access bootstrap:** repository/project, branch/ref, runner pool, runner OS, service identity, authentication method, RBAC scope, consent owner, credential references and expiry/rotation owner.
2. **Deployment workstation or runner:** management reachability, BMC access, DNS, package/media source, PowerShell/Azure CLI versions, module pins and proxy/trust configuration.
3. **Node bootstrap:** OEM image/media hash, BMC method, boot/network setup, firmware/SBE readiness, initial account reference, time/DNS, Arc registration and readiness checks.
4. **Temporary service exit:** final ownership, credential rotation, access removal, temporary resource disposition and evidence that permanent management works.

Offer existing automation, new TierPoint automation, and manual/operator preparation. Produce a prerequisite graph with external owner handoffs; flag bootstrap cycles. Reusing an identity requires verification of its permissions, not instructions to delete it. Existing source scripts using Bash are reference evidence; the planned Windows workflow uses PowerShell 7 or an explicitly selected external runner, without WSL.

## 7. Azure foundation, identity and security

Collect cloud, region, tenant/subscription/resource-group references, Azure Local resource names, Arc machine IDs, resource providers, custom location/resource bridge dependencies, RBAC assignees and scope, tags, policy exemptions, witness choice, registration connectivity and egress/proxy decisions. New versus existing resources must be explicit. Do not force an arbitrary six-subscription structure on every customer.

**Active Directory branch:** forest/domain FQDN, OU distinguished name, DNS servers/zones, time source, required directory preparation, deployment/service account references, delegation/permission evidence, account lifecycle and connectivity. Record which team prepares the directory and how completion is demonstrated.

**Local identity branch:** local administrator reference, DNS namespace/servers and record ownership, cluster-specific Key Vault configuration/reference, required Azure resource-provider permissions, secret backup/recovery, certificate management, vault reachability and operational compatibility. Local identity is still an Azure-connected deployment model. Keep release/preview status explicit; do not infer support for every management tool from the absence of AD. The [Microsoft local identity deployment guide](https://learn.microsoft.com/en-us/azure/azure-local/deploy/deployment-local-identity-with-key-vault?view=azloc-2604) and [ARM path](https://learn.microsoft.com/en-us/azure/azure-local/deploy/deployment-local-identity-with-key-vault-template?view=azloc-2604) define the qualified branch.

**Both branches:** security baseline/profile, Secure Boot/TPM readiness, BitLocker/key recovery, certificates/trust, administrator groups, audit retention, firewall policy and remote access. Store secret references only. An export must not contain a password, private key, bearer token or copied connection string. Customer identifiers may exist in the user's private project but are excluded from committed fixtures and sanitized sharing outputs.

## 8. Hardware and host networking

For every node collect name, site/rack/failure domain, OEM/model/catalog evidence, serial/asset reference, CPU sockets/cores/model, memory, boot devices, capacity/cache drives, HBA/NIC models and port map, firmware/drivers/SBE, BMC endpoint and credential reference, OS/media version/hash, intended management address and Arc registration evidence.

Network records include management, compute, S2D storage, migration, out-of-band and optional backup/SAN networks; VLAN, CIDR, IP pool, reserved addresses, gateway, DNS, MTU, speed, RDMA mode, DCB/PFC/ETS and physical switch ports. Validate subnet overlap, duplicate addresses, pool exhaustion, consistent per-node mapping and link redundancy.

Network ATC owns applicable host intents. Choose the release-qualified converged/separated pattern and switched/switchless topology; map each physical port explicitly. Do not generate competing manual SET configuration. Dedicated SAN ports have their own ownership and validation: iSCSI cannot be indiscriminately put in the S2D storage intent. Underlay design and workload logical-network design remain separate screens.

## 9. Storage sources: S2D, SAN and hybrid

### S2D source

Collect local drive inventory per node, media type/endurance, capacity versus cache role, device eligibility, pool name, repair reserve, fault domains, expected growth and performance target. Validate asymmetry and selected resiliency against node count and supported layout. Imported sizing remains traceable to its assumptions.

### SAN source

Collect an array record, its connections, LUNs and host mappings rather than one free-text SAN field.

| Record | Required collection |
|---|---|
| Array | OEM/model, software/firmware, support/certification evidence, controllers/failure domains, pool/tier, capacity, owner and management reference |
| FC fabrics | Fabric A/B, switch/port, speed, zoning owner/policy, initiator WWPN per host/port, target WWPN, host group and LUN masking |
| iSCSI networks | Qualified release/topology, dedicated port mappings, initiator/target IQNs, target portals, subnet/VLAN/MTU, session persistence, authentication references |
| LUN | Stable array ID/serial, name/number, role, capacity/unit, array thick/thin setting, allocated/used capacity, host presentation and existing-data flag |
| Multipathing | DSM/version, vendor host persona, MPIO policy/timers, expected paths per node/LUN, active/optimized paths, fabric/controller independence and evidence |
| Handoff | Array administrator, provisioning/zoning/masking tasks, acceptance commands, completion evidence and maintenance window |

Separate infrastructure/performance-history LUNs from workload LUNs. Do not initialize or format an existing-data LUN as a side effect of generating a plan. Identify disks using stable identities, not machine-local disk numbers. For SAN-backed volumes, record array protection; do not apply S2D mirror overhead to the same capacity.

The [Microsoft external storage guide](https://learn.microsoft.com/en-us/azure/azure-local/deploy/enable-external-storage?view=azloc-2604) covers FC/iSCSI and hybrid attachment, including dedicated physical iSCSI ports for hybrid, consistent LUN presentation and stable disk identities. Its mutable content is supporting evidence, not an immutable 2604 certification matrix. Check the specific SAN-only versus hybrid protocol path before qualifying an export.

### Hybrid source

Maintain separate S2D pool and SAN pool budgets. Every volume selects exactly one backing source; hybrid does not mean striping one CSV across unrelated S2D and SAN pools. Show source-specific free capacity and workload assignments. Do not let unused SAN capacity conceal an overcommitted S2D pool.

## 10. CSVs, provisioning and storage paths

**Default: thick/fixed provisioning**, with thin as an explicit per-volume alternative where supported. This is the requested Configurator default, not a claim about the default of every platform command. SAN array thin provisioning, CSV capacity and VHDX dynamic allocation are separate settings with separate labels.

Offer **import from Surveyor storage configuration**, **create a layout**, and **record existing volumes**. Users can set the workload CSV count, then edit rows individually; automatic infrastructure volumes are displayed and counted separately. Lowering a count must show which rows and assignments would be removed.

| CSV field | Behaviour |
|---|---|
| Identity and role | Stable ID, friendly name, workload/infrastructure/performance-history role, new/existing lifecycle |
| Backing source | S2D pool or named SAN LUN; no ambiguous inherited source |
| Size | Positive numeric size and explicit GB/GiB/TB/TiB unit; normalized byte value; desired, allocated and observed-used kept separate |
| Provisioning | Thick/fixed default or supported thin; thin growth reserve, oversubscription and alert policy |
| S2D resiliency | Release/node-qualified two-way or three-way mirror, nested resiliency or mirror-accelerated parity where supported; tier split when applicable |
| Mixed layout | Different supported resiliency on different CSVs; separately model a single supported tiered mirror/parity volume |
| Filesystem and mount | Qualified filesystem/allocation unit, CSV mount directory and existing volume identifier |
| Placement | Workload assignments, policy, preferred placement if supported and growth/performance requirements |

Show total raw capacity, usable capacity, resiliency cost, repair reserve, committed volume capacity, observed use and remaining headroom without counting reserve twice. Thin nominal size is not free physical capacity. Explain any estimate that lacks array telemetry or data-reduction evidence.

Ask separately:

1. **How many CSVs?** Derived from actual volume records, split by role/source.
2. **How many Azure storage paths?** Resource name, target cluster/custom location, backing CSV, directory, resource-group reference, existing/new and intended workloads. Support explicit directory mappings; validate the chosen API's constraints before allowing multiple resources to share backing storage.
3. **How many SAN I/O paths?** Per host and LUN, derived from initiator/fabric/target records; compare expected versus observed MPIO paths.

These counts describe different objects. A report and topology must show each mapping without assuming a CSV, an Azure storage path and an FC connection are interchangeable.

## 11. Azure Local SDN

The initial answer is **Enable Azure Local SDN: Yes**. Users may select **No** before deployment; collect a reason and omit NC/NSG deployment stages. Existing enabled SDN is discovered state: changing a design checkbox cannot uninstall it.

The default path is **SDN enabled by Azure Arc**, with Network Controller integrated as a Failover Cluster service, logical networks and NSGs. It must not inherit Hyper-V's controller-VM, SLB/MUX or gateway deployment defaults. Existing on-premises-managed NC is a conflicting architecture, requiring a separate assessment. Microsoft describes the architecture, incompatibility, irreversible enablement and potential workload interruption in its [SDN integration guide](https://learn.microsoft.com/en-us/azure/azure-local/deploy/enable-sdn-integration?view=azloc-2604).

Collect existing SDN state/owner, selected release/OS, storage/topology compatibility, intent layout, prefix, DNS mode/record ownership, reserved address evidence, permissions, enablement owner and maintenance window. Show logical-network records with VLAN/subnet/gateway/DNS/pools and named NSGs with ordered rules, protocol/ports, direction, priority, source/destination and target attachments. Validate duplicate/conflicting rules and management access before generating policy.

Stage order: cluster healthy → confirm SDN support and DNS/access prerequisites → enable NC if selected → verify terminal action-plan result → create/associate logical networks and policy → validate intended allow/deny traffic. If workloads already exist, include the maintenance impact in the implementation report. Capture acceptance evidence rather than treating command submission as success.

**Unresolved compatibility is a visible blocker.** In particular, SAN-only plus default SDN needs a pinned authoritative support decision; the existence of a SAN deployment runbook does not prove this combination. Preserve the user's intent and explain whether opting out, changing topology or selecting a qualified release resolves the blocker. The default never bypasses that check.

## 12. Workloads, licensing and operations

Workloads may be imported or entered as VM groups/individual requirements, AVD or AKS planning groups. Collect count, vCPU/RAM, storage/performance/growth, guest OS, network/security, availability, backup/recovery and migration needs. Map them to CSVs/storage paths/logical networks. Distinguish imported management overhead, new services and external services to avoid double counting. Keep sizing resources and links to Surveyor's thin provisioning and drive layout guidance accessible.

License records cover Azure Local subscription/benefit eligibility, Windows Server guest rights, management VM OS, optional System Center/SQL, OEM/support and workload products where selected. Ask existing versus purchase, agreement/program, edition/version, licensed quantity/unit, term, renewal, evidence and commercial owner. Prices are user-provided or dated sourced assumptions with currency and term; unknown rights remain unresolved. Do not infer that selecting a product supplies its license.

Operations collects monitoring/DCR/alerts, backup targets and restore tests, security policy, update rings/maintenance, capacity alerts, witness/quorum evidence, support escalation, RTO/RPO, acceptance ownership and handover. Build a prerequisites/stage graph from these choices, with manual and automated steps clearly identified.

## 13. Owned model and automation contracts

Proposed root discriminator: `azurelocal-configurator-project`; initial schema version: `1`. Store stable project/record IDs, revision, timestamps, selected release, source provenance, choices, typed collections, findings and evidence references. JSON and canonical environment YAML represent the same owned model.

Collections include sites, nodes, management components, dependencies, bootstrap tasks, Azure references, identities, network intents/adapters, physical networks, SAN arrays/fabrics/initiators/targets/LUNs/paths, S2D pools/devices, CSVs, Azure storage paths, SDN policies, workloads, licenses, operations and deployment stages. References must resolve to the correct record type. Importers and migrations are versioned, bounded and non-destructive.

Every automation input file declares its schema version, source pins, release/topology/identity applicability, secret-reference contract and known limitations. The configurator emits data only: it ships no Terraform, Ansible, PowerShell, DSC or Bicep code, and your existing automation remains the executor. Schema validation of an input file does not prove deployment success.

The inspected Toolkit schema and parameter generator currently use different nesting in places, so each consumer is mapped explicitly. The root `infrastructure.yml` is now the master infrastructure data file: it follows the pinned Toolkit `master-registry.yaml` shape, lists every component decision and whether it is in use, and carries data only for the components in use. It is data only (no scripts or templates), it is not validated against the hand-maintained Toolkit `infrastructure.schema.json`, and it is written only to private exports; sanitized sharing packages leave it out. It is not a serialization of the owned model, which stays in `environment.yml`. A missing consumer for a selected branch produces a blocked adapter report while preserving design exports.

## 14. Export menu and package layout

Allow individual downloads or a ZIP. Let the user choose full private or sanitized sharing output and preview contents. Browser downloads go to the browser's chosen location; an optional operator step copies files into an environment repository. The website does not assume it can write to an arbitrary local folder or commit customer data automatically.

| Output | Proposed file(s) | Purpose and qualification |
|---|---|---|
| Reopenable project | `project.json` | Owned, versioned design and source provenance |
| Canonical environment | `environment.yml` | Same owned data for portable processing, not automatically a Toolkit contract |
| Master infrastructure data | `infrastructure.yml` | Every component decision and the design data for components in use, shaped on the pinned Toolkit master registry; data only, private exports only |
| Design report | `reports/design.md`, `reports/design.pdf` | Decisions, assumptions, architecture, capacity, licensing, findings and diagrams |
| Implementation report | `reports/implementation.md`, PDF option | Ordered prerequisites, manual/automation stages, owners, acceptance and recovery |
| Schedules | `schedules/design.xlsx`, per-table CSV | Nodes, ports/IPs, SAN/LUN paths, CSV/storage paths, workloads, licenses and BOM |
| Topology | `diagrams/topology.drawio`, page PNGs | Editable and viewable physical/logical/storage/dependency diagrams |
| Portal handoff | `portal/deployment-worksheet.md` | Selected portal route, field values, prerequisites and verification |
| ARM parameters | `inputs/arm/azuredeploy.parameters.json` | Finished parameter file for the pinned AD or local-identity template; secure values are Key Vault references |
| Terraform values | `inputs/terraform/terraform.tfvars.json` | Input values for your existing Terraform automation, including the complete ARM parameter map; no `.tf` files |
| Ansible inventory | `inputs/ansible/inventory.yml`, `group_vars/all.yml` | Controller and node design records with literal-safe strings and credential references; no playbooks or roles |
| PowerShell and DSC | `plans/powershell-dsc-review.json` | Toolchain and DSC requests recorded as design-only review data; no script, splat or DSC configuration |
| Toolkit data | `toolkit/conversion/infrastructure.yml`, `companion.json`, `toolkit/infrastructure.draft.yml` | Canonical Toolkit hierarchy and companion values, with explicit unmapped-field findings |
| Evidence and execution plan | `plans/stages.json`, `validation.json`, evidence index | Prerequisites, manual work, blocked branches and verification requirements |
| Package manifest | `manifest.json`, `README.md` | File hashes, schema/app/design/adapter versions, target release, findings and qualification status |

Generation must be deterministic for an unchanged snapshot and export timestamp. Escape spreadsheet formulas and XML/HTML, validate reference integrity, reject path traversal and secret literals, and test JSON/YAML round trips. A sanitized export removes private identifiers while preserving valid internal links and clearly labels missing operational data.

## 15. Validation and delivery flow

Validate incrementally and again against the frozen export snapshot. Separate missing inputs, unsupported combinations, capacity shortfalls, consumer-contract failures and missing runtime evidence. Each finding links to the responsible field and explains how to resolve it.

The four draw.io pages describe: **01 — user journey**, **02 — storage/identity/deployment decisions**, **03 — management/bootstrap/SDN order**, and **04 — validation/export/verification**. Their PNG exports are included with the editable source.

Implementation follows the companion checklist: owned project and journey; release rules; management/bootstrap; detailed platform/storage/SDN; reports; qualified adapters; browser and negative tests; versioned documentation; exact-commit green CI and live website verification. Hyper-V remains a separate active goal, and creating this design does not complete either implementation.
