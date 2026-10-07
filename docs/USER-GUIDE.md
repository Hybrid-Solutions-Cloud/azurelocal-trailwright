# Azure Local Trailwright User Guide

## What it is

Azure Local Trailwright is a guided design tool for Azure Local. You answer questions in order, and each answer decides which questions come next. At the end it produces files you can use directly in your automation: the ARM and Bicep parameters for the Microsoft deployment templates, the Azure Local Toolkit `infrastructure.yml`, a machine provisioning manifest, schedules, a topology diagram and a design document.

Surveyor answers "does it fit" for sizing. Trailwright answers "how is it built." Neither tool deploys anything.

Every question and every rule comes from Microsoft Learn and follows the current Azure Local release. There is no release to choose.

## Before you start

Trailwright runs in your browser. It saves the project in the browser's local storage, and nothing is sent to a server.

You can start a clean design, import a plan from Surveyor, or load the bundled example.

## The steps

The steps appear in the left sidebar in groups. A step is shown only when your earlier answers need it, and a badge on each step shows its open findings. **Back** and **Next** move between the visible steps.

| Step | What you decide |
|---|---|
| Project | Name, customer, owner and notes. Start clean, import a Surveyor plan or a saved project, or load the example. |
| Connectivity mode and architecture | Connected or disconnected operations; hyperconverged, hybrid (Storage Spaces Direct plus a SAN attached on day 2) or disaggregated (Fibre Channel or iSCSI SAN); the cloud and the Azure region. Only regions where Azure Local is supported are listed. |
| Hardware and topology | Standard or rack-aware topology, the nodes (name, serial number, cores, memory, management IP), racks and uplinks for rack-aware, and the witness (cloud witness for connected deployments, file share only for disconnected operations; two-node and rack-aware clusters need one). |
| Storage | For Storage Spaces Direct: the drive layout (capacity and cache media, count and size), the capacity summary, resiliency (limited by node count), volumes and the volume creation mode. For a SAN: the LUNs. The questions follow the architecture you chose, so a SAN design gets no Storage Spaces Direct questions. |
| Network design | Storage connectivity (switched or switchless), ToR switches, storage layout, ports per node, and the physical cards and ports. Name each port as the operating system shows it, give it a speed and RDMA type, then assign a role by dragging or from the list, or ask for a proposal across the cards. The intents are derived from the roles. Disaggregated designs add the standalone cluster and iSCSI ports and the Fibre Channel HBA ports. |
| Intents, VLANs and IP plan | The Network ATC intents, VLANs, storage subnets and storage Auto IP. |
| Management network | The infrastructure IP pool (at least six consecutive addresses), gateway, DNS servers and VLAN. Reserved ranges are checked. |
| Outbound connectivity | Direct, proxy, Arc gateway, proxy and Arc gateway, or private path. Each choice asks for the values it needs. |
| Identity | Active Directory (domain, OU path, deployment user, DNS) or local identity (Key Vault, DNS zone and forwarders). |
| Security | Security level and the individual protections (drift control, Credential Guard, SMB signing and cluster encryption, BitLocker, WDAC, data streaming, EU location, episodic data). |
| Provisioning and deployment method | Operating system install from ISO or simplified machine provisioning (USB drive, ownership voucher, site settings), and the portal wizard or ARM template. The ARM template is required for three- and four-node switchless clusters and custom storage IPs. |
| Azure resources | Subscription, tenant, resource group, naming prefix, Key Vault, diagnostic storage, retention, resource provider object ID, custom location. |
| Operations | The update method (Azure portal or PowerShell), monitoring with Insights (workspace, data collection rule, alerts), backup and disaster recovery. |
| Review and export | All findings grouped by step, and the exports. |

## Reading findings

A finding names the field it concerns, gives a message, and links to the Microsoft Learn page it comes from. Its severity is error, warning, or information. Errors mean the design cannot be deployed as entered. Warnings mean Microsoft recommends otherwise. Information explains a consequence of a choice.

## Importing a Surveyor plan

On the Project step or the Review step, choose a file:

- **Trailwright project JSON:** Trailwright asks before replacing the current design.
- **Surveyor project or plan JSON:** both Surveyor formats are accepted. Trailwright maps the nodes, volumes, plan name, drive layout and notes, and shows a preview of conflicts with the current design. Nothing changes until you choose **Apply import**.

A file that is neither format is refused, and Trailwright gives the reason.

## Exporting

Each export has its own button on the Review step.

| Export | Use |
|---|---|
| Design handoff (Markdown, PDF) | Every answer and the deployment commands, for the people who build the cluster. |
| infrastructure.yml | The Azure Local Toolkit registry shape, including the ARM parameters. |
| ARM parameters, validate | Parameter file for Microsoft's template with `deploymentMode` set to `Validate`. |
| ARM parameters, deploy | The same file with `deploymentMode` set to `Deploy`. |
| Bicep parameters | A `.bicepparam` file; secrets are read from environment variables. |
| Machine provisioning manifest | The values for simplified machine provisioning. |
| Nodes, VLAN and IP plan schedules | CSV files, and one Excel workbook. |
| Topology | A draw.io diagram. |
| Project | The Trailwright project as JSON, to reopen later. |

The ARM parameter files carry every parameter of the Microsoft templates `create-cluster` (Active Directory) and `create-adless-cluster-external-dns-public-preview` (local identity). Secret values are `null` in the JSON file and environment variable reads in the Bicep file; Trailwright never writes a secret.

## Saving and reopening

Trailwright autosaves the project in your browser's local storage. You can also export the project as JSON and open it again in Trailwright.

## What it does not do

Trailwright does not deploy anything. It does not hold secrets. The page footer states: "Design record only: nothing here deploys anything."

## Troubleshooting

- **Findings will not clear:** Check the fields named in the finding and read the linked Microsoft Learn page.
- **A step is missing:** Steps appear only when earlier answers need them. For example, SAN questions appear only for hybrid and disaggregated architectures.
- **An import is refused:** Check that the file is a Trailwright project JSON or a Surveyor project or plan JSON. Trailwright shows the reason for refusing a file.
- **A download does not start:** Select the export button again. If it still does not start, check your browser's download settings.
