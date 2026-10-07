# Using Azure Local Configurator

Open the Azure Local Configurator card in the private catalog. Create a design, import a supported Azure Local Surveyor plan, or open a Configurator project. These are separate file formats: use the sizing import for Surveyor data.

You can visit all fourteen screens in any order. Incomplete work is saved on this device. Download a project for portability and backup. Opening a project previews differences; saved checkpoints remain available on the first screen. If browser storage is blocked or full, download the current project. A corrupt draft can be downloaded before a reviewed replacement.

Choose the environment lifecycle and preservation boundary before specifying deployment actions. Add physical nodes, management hosts/services and bootstrap dependencies independently. Select AD or local identity, S2D/SAN/hybrid storage, deployment route and delivery depth. Retained inactive answers can be displayed and restored; changing a branch does not delete resources.

## Component decisions

Each infrastructure component starts with a question: is it used, and if so, which option? The answer decides which follow-up questions and record collections appear. Choosing "not used" hides them but keeps your answers; select **Show retained answers from inactive branches** to see them, and switch back to restore them. A component that is not used is left out of `infrastructure.yml` and gets no data, but its decision is still listed.

Most gates start on the TierPoint default (used, TierPoint Fortinet, Dell switches, Opengear, Azure Backup, Azure Monitor, cloud witness, direct outbound). Point-to-site VPN and ExpressRoute start as not used. The site-to-site VPN starts unanswered: the design shows an error until you choose used or not used.

| Screen | Question | What each answer shows next |
|---|---|---|
| Architecture and deployment | Storage connectivity (S2D or hybrid) | Switched: storage VLANs, RDMA type, PFC priority and ETS shares on the top-of-rack switches. Switchless: dual or single link. |
| Architecture and deployment | SAN protocol (SAN or hybrid) | Fibre Channel: FC switch vendor, fabric A and B switches and zoning model. iSCSI: path A and B VLANs and subnets, MTU, target portals and target IQN. These appear under External SAN connectivity. |
| TierPoint management | TierPoint management in Azure | Used: landing zone, management subscription and region, hub VNet address space, management services, and management bindings. |
| Azure foundation | Azure site-to-site VPN | Used: on-premises public IP, VPN gateway SKU and mode, GatewaySubnet, address spaces, IKE and IPsec policy, dead peer detection, shared key reference, and BGP (both ASNs and peer IPs). |
| Azure foundation | Point-to-site VPN | Used: client address pool, tunnel type and authentication; Entra ID tenant and audience, root certificate, or RADIUS servers and secret reference. |
| Azure foundation | ExpressRoute private connectivity | Used: provider, circuit, peering location, bandwidth, SKU, billing, private peering subnets, VLAN, peer ASN, MD5 key reference, and gateway SKU and subnet. |
| Azure foundation | Outbound connectivity | Direct: nothing more. Proxy: proxy URL and bypass list. Arc gateway: its resource ID. Proxy with Arc gateway: both. Private path: Arc gateway ID and the Azure Firewall explicit proxy IP and port. |
| Azure foundation | Witness choice | Cloud, file share or existing: witness reference. None: no witness details. |
| Host networking | Perimeter firewall | TierPoint Fortinet: FortiGate model, FortiOS, HA, WAN, public IPs, VLAN gateways, DHCP scopes, VDOMs, central management, log targets and credential reference, plus firewall units and the firewall-to-ToR port map. Customer: vendor, model, owner, contact, gateway IPs, outbound endpoint approach and HTTPS inspection confirmation. |
| Host networking | Top-of-rack switches | TierPoint Dell or customer: model, OS, pairing, uplinks and MTU, plus switch units and the node port to ToR port map. Customer also asks for vendor and owner. |
| Host networking | Out-of-band management | Opengear: OOB VLAN, subnet and gateway, Opengear and Lighthouse details, cellular failover, BMC port map and console port map. OOB switch: OOB VLAN, subnet and gateway, switch details and BMC port map. |
| Licensing and operations | Backup solution | Azure Backup, MABS or third-party: vault, retention, RPO, RTO and dedicated network; MABS protection level and authentication; third-party product. |
| Licensing and operations | Monitoring solution | Azure Monitor or TierPoint NOC: workspace, data collection rule and alert recipients; NOC service tier and device telemetry. Customer tool: the tool name. |

Findings check documented platform limits against these answers. Examples: switchless storage supports up to four machines, and three or four switchless machines need the ARM or Terraform / Ansible route; external SAN needs release 2604 and a standard topology; private path needs ExpressRoute or a site-to-site VPN and release 2608; two-node and rack-aware clusters need a witness; a customer firewall must not inspect HTTPS on the Azure Local path. Each finding links to its field, and platform-limit findings cite their Microsoft Learn source.

Credentials are references only. The decisions appear in the design report, the schedules and, in private packages, `infrastructure.yml`.

CSV count, Azure storage-path count and SAN I/O-path count describe different objects. Enter explicit capacity units and keep array provisioning, CSV fixed/thin policy and VHDX allocation separate. Review each source budget and placement finding. Arc SDN starts enabled; opting out requires a reason and does not uninstall an existing controller.

Use correction links to reach the responsible field or collection. Red findings require correction; review findings identify unresolved support, commercial assumptions or external evidence. The 2604 baseline remains explicit even when newer Microsoft pages describe additional features.

The Portal worksheet follows the documented tab order. Its automatic workload volumes are thin: use the infrastructure-only option and explicit post-deployment creation when preserving a fixed or mixed custom layout. SAN and hybrid attachment have separate source and protocol reviews. Credentials are references; resolve their values privately at the authorized operator/controller.

On Review and export, prepare a frozen preview and choose individual files or ZIP. Private packages retain your identifiers and include the master `infrastructure.yml`. Sanitized packages redact private values and evidence while retaining valid internal relationships, and leave `infrastructure.yml` out. PDF/Markdown reports, workbooks/CSVs and draw.io/PNG diagrams all describe the same revision. Inspect manifest.json for each file's size and SHA-256.

The export contains data, not automation. Terraform input values, Ansible inventory, a finished ARM parameter file and Toolkit conversion data are produced only for branches that pass validation; map each file to your existing automation. No Terraform, Ansible, PowerShell or DSC code is included, and selecting a route never starts infrastructure work.

Download the receipt template for external execution evidence. Supply the original project/revision, stage, activity ID, source, UTC timestamp, terminal state and typed observations. Preview and retain the receipt without changing intent. Only an explicit adoption updates a non-conflicting successful observation into a new revision. Hashes establish integrity, not authenticity: imported receipts remain unverified and cannot authorize or automatically resume deployment.
