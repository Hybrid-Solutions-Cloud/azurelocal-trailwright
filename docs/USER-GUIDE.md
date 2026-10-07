# Azure Local Trailwright User Guide

## What it is

Azure Local Trailwright records an Azure Local deployment design, validates architecture choices against the selected release, and exports data for handoff.

Surveyor answers "does it fit" for sizing. Trailwright answers "how is it built." Neither tool deploys anything.

## Before you start

Trailwright runs in your browser. It saves the project in the browser's local storage, and nothing is sent to a server.

Have the project details you want to record, such as the release, hardware, identity, networking, connectivity, landing zone, storage, and operations choices.

## The nine screens

Complete the screens in order. Each screen shows findings for the fields on that screen.

| Screen | What you enter |
|---|---|
| 1. Project and release | Project name, customer, owner, notes, and release. Releases range from 2605 to 2609; 2609 is the baseline. **Load the example project** replaces the current design with the bundled example after you confirm. |
| 2. Hardware and topology | Standard or rack-aware topology; nodes with a name, serial number, core count, memory in GiB, and drive count; and a witness choice of cloud, file share, or none. |
| 3. Identity | Active Directory with a domain, or Local Identity with a Key Vault name. |
| 4. Networking | Switched or switchless storage; VLANs; Network ATC intents with management, compute, or storage traffic types and adapters; and an IP plan. |
| 5. Connectivity | Direct, proxy, Arc gateway, proxy and Arc gateway, or private path. Enter a proxy address when using a proxy. |
| 6. Azure landing zone | Subscription name, resource group, Key Vault name, witness storage account, and custom location. |
| 7. Storage | Volumes with a name, size in GiB, and resiliency: two-way, three-way, four-way, or parity. |
| 8. Operations | Monitoring, Azure Update Manager, backup, and disaster recovery choices as checkboxes. |
| 9. Review and export | Review all findings, import a project or plan, and export handoff data. |

## Reading findings

A finding identifies the field it concerns, gives a message, and links to the Microsoft Learn page it is based on. Its severity is error, warning, or information.

The Review screen groups findings from all screens and shows their counts.

## Importing a Surveyor plan

On the Review screen, choose a file to import:

- **Trailwright project JSON**: Trailwright asks before replacing the current design.
- **Surveyor plan JSON**: Trailwright accepts a schema version 1.x manifest. It maps nodes and volumes, then shows a preview of conflicts with the current design. Nothing changes until you choose **Apply import**.

A file that is neither supported format is refused, and Trailwright gives the reason.

## Exporting

Each export has its own button on the Review screen.

| Export | Format or contents |
|---|---|
| Design handoff | Markdown |
| Design handoff | PDF |
| infrastructure.yml | Toolkit registry shape |
| ARM parameters | Active Directory |
| ARM parameters | Local Identity |
| Bicep parameters | Parameters |
| Nodes schedule | CSV |
| VLAN schedule | CSV |
| IP plan schedule | CSV |
| Schedules | Excel |
| Topology | draw.io |
| Project | JSON |

Exports contain data only, not executable content. Secrets appear only as Key Vault references, never as values. Exports are handoffs and starting points, not a complete deployment.

## Saving and reopening

Trailwright autosaves the project in your browser's local storage. You can also export the project as a JSON file and open it again in Trailwright.

## What it does not do

Trailwright does not deploy anything. Its exports do not form a complete deployment. The page footer states: "Design record only: nothing here deploys anything."

## Troubleshooting

- **Findings will not clear:** Check the fields named in the findings and read the linked Microsoft Learn page.
- **An import is refused:** Check that the file is a Trailwright project JSON or a Surveyor plan JSON with a schema version 1.x manifest. Trailwright shows the reason for refusing a file.
- **A download does not start:** Select the export button again. If it still does not start, check your browser's download settings.
