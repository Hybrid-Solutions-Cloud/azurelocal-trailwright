# Changelog

## 0.4.0 — 2026-09-13 — switchless cable map, decisions in the PDF, infrastructure.yml drift test

- The Azure site-to-site VPN decision now starts unanswered; the design reports an error until it is answered used or not used.

- Switchless storage cable map. When S2D or hybrid storage is switchless, Host networking shows a record per direct storage cable: link number, node A and its storage port, node B and its storage port, and the link subnet and VLAN. The section is hidden for switched storage and SAN-only storage; recorded links are kept.
- Cable map rules from the Microsoft switchless patterns: two nodes need 1 (single link) or 2 (dual link) links, three nodes 3 or 6, four nodes 12 (dual link only). Every pair of nodes needs the same number of links, a link cannot connect a node to itself, each storage port carries one link, and each port must belong to the node it is recorded against. An empty cable map is a review finding.
- `infrastructure.yml` lists the links under `networking.onprem.storage_connectivity.node_to_node_links` for switchless designs.
- The design PDF now includes the component decisions table, matching `reports/design.md` and the schedules.
- A unit test validates the generated `infrastructure.yml` against the pinned Toolkit `infrastructure.schema.json` and `master-registry.yaml`. Only the deviations documented in `src/masterInfrastructure.ts` are allowed, so unexpected drift fails CI.
- Project schema 10. Schema 1–9 projects open unchanged with an empty cable map.

## 0.3.0 — 2026-09-13 — component decisions and master infrastructure data

- Every network and platform component now starts with a used / not used or which-option decision. The answer reveals only the questions that apply. A "not used" answer hides the questions, keeps the earlier answers in the project (retained inactive) and leaves the component out of `infrastructure.yml`.
- New decisions and detail fields: TierPoint management in Azure; perimeter firewall (TierPoint-managed FortiGate by default, customer firewall, or not used) with firewall units; Azure site-to-site VPN, point-to-site VPN and ExpressRoute; outbound connectivity (direct, proxy, Arc gateway, both, or private path); top-of-rack switches (Dell PowerSwitch by default, customer, or not used) with switch units and switched-storage DCB settings; out-of-band management (Opengear with Lighthouse, standard OOB switch, or not used); external SAN protocol (Fibre Channel or iSCSI) with array, fabric and iSCSI path details; backup; monitoring.
- Port maps: node port to ToR port, firewall interface to ToR port, BMC to out-of-band port, and Opengear console port to device.
- Add `infrastructure.yml` to private design packages. It follows the pinned Toolkit master-registry v4.0.0 shape (`networking.onprem.network_devices[]`, `networking.hybrid.vpn`, flat `vlan_*` keys, `compute.cluster_nodes[]`) with clearly named extensions, and lists every component decision under `decisions`. Data only; no scripts.
- Gate corrections: storage connectivity is hidden for SAN-only storage; SDN detail fields show only when SDN is enabled (opt-out reason only when it is not); the witness reference shows only for a witness type that needs one; the ARM witness storage account shows only for a cloud witness; Toolkit metadata shows only when the Toolkit export is enabled; SAN zoning and FC switch fields show only for Fibre Channel and target portals only for iSCSI.
- New rules from current Microsoft guidance: switchless storage supports 1–4 machines (3–4 nodes ARM only, no storage automatic IP, 4 nodes dual link only); RoCE storage needs non-zero VLANs; external SAN needs 2604 or later and is not rack-aware; fabric protocol must match the SAN protocol; two-node and rack-aware clusters need a witness; private path needs ExpressRoute or VPN and 2608 or later; VPN BGP ASN, Basic SKU and ExpressRoute ASN limits; MABS certificate authentication for local identity.
- SAN-only iSCSI is no longer an error. Microsoft documents Fibre Channel and iSCSI for 2604 and later; the remaining preview-versus-GA wording difference is a review finding.
- Reports and schedules include a component decisions table. The topology export adds a network devices page.
- Project schema 9. Schema 1–8 projects open unchanged and receive the new decisions with their defaults.

## 0.2.1 — 2026-09-12 — code review corrections

- Export the finished ARM parameter file for ARM and Terraform/Ansible route designs, not only when Toolkit conversion is selected. It is withheld for the portal route, sanitized designs and unqualified storage branches.
- Report `design-only` rather than `design-data` qualification when no Terraform or Toolkit data is exported, and point the PowerShell review at the parameter file only when it exists.
- Report the Toolkit conversion data version consistently in the adapter status.
- Stop coupling unit tests to frozen evidence hashes that can no longer be regenerated, and stop writing fixtures for the removed ARM-TTK job.
- Escape the file-extension checks in the browser tests.

## 0.2.0 — 2026-09-12 — automation input data only

- Scope correction: the configurator captures design decisions and emits data for existing automation. It no longer ships Terraform, Ansible, PowerShell or DSC code.
- Export Terraform input values as `inputs/terraform/terraform.tfvars.json`; remove the `arm-deployment` Terraform module, provider lock and module lock.
- Export Ansible inventory and group variables under `inputs/ansible/`; remove the playbook, `azurelocal_terraform` role, Python module and dependency locks.
- Export a finished ARM parameter file as `inputs/arm/azuredeploy.parameters.json`; remove the `Convert-ToolkitArm.ps1` converter, its restore script and the bundled ARM templates.
- Reduce the PowerShell and DSC handoff to review data.
- Remove the `arm_contract`, `terraform_contract` and `ansible_contract` CI jobs. Pages now depends on secret detection, unit tests and browser tests.
- Add a package-boundary test that fails when an export contains executable files, adapter or execution paths, playbooks, roles or ARM templates.
- Project schema remains 8; saved projects open unchanged.

## 0.1.0 — 2026-09-11

- Implement the standalone fourteen-screen Azure Local design application, owned schema 8 with migrations, autosave/revision recovery and selective Surveyor import/reimport.
- Add independent management/bootstrap, physical hosts/networking, S2D/SAN/hybrid budgets, fixed/thin CSVs, storage paths, Arc SDN and workload/commercial/operations inventories.
- Validate release-specific support, preservation, references, capacity, network/NSG grammar and prerequisite order with correction links.
- Produce private/sanitized project files, complete PDF/Markdown reports, XLSX/CSV schedules, editable draw.io/PNG topology, hash manifests and individual/ZIP downloads.
- Map Portal worksheets to identity/storage branches. Retain immutable ARM/Toolkit source conflicts and qualify only named local PowerShell/Terraform/Ansible contract stages.
- Add explicit DSC version/resource contract requests with blocked executable output when no consumer is qualified.
- Retain external receipts separately from intent; preview conflicts and explicitly reconcile observations into a new revision without claiming runtime authenticity.
- Preserve the existing Hyper-V 0.32 catalog release. Production builds and private Pages publication use GitLab CI only.
