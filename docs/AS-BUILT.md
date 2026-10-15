# As-built compare

The lifecycle runs design, deploy, then "does what was built match what was designed?". The **As-built compare** step (last step in the sidebar) answers that. You load a small JSON file, `as-built-snapshot.v1`, and Trailwright shows a row for every comparable fact with a status:

| Status | Meaning | Severity |
|---|---|---|
| match | The design and the build agree | ok |
| drift | Both have it and they differ, or the build has something the design does not | warning (error for release, identity, witness, node set, intent traffic, volume resiliency) |
| missing | The design has it and the build does not | error |
| not captured | The snapshot has no data for this area, so nothing is claimed | info |

The compare can be downloaded as CSV or Markdown. The snapshot is read in the browser and is not stored.

## as-built-snapshot.v1

Every section except `schema` is optional. Leave out what your tool did not capture.

```json
{
  "schema": "as-built-snapshot.v1",
  "capturedAt": "2026-10-15T09:20:00Z",
  "source": { "tool": "ranger", "version": "2.0.0", "note": "" },
  "cluster": { "name": "example-azl-01", "release": "12.2609.1003.7" },
  "identity": { "model": "local-identity-key-vault", "domain": "lab.example.com" },
  "witness": { "type": "cloud" },
  "nodes": [ { "name": "node1", "managementIp": "192.0.2.11", "storageIps": ["198.51.100.11", "203.0.113.11"], "serial": "EXAMPLE-0001" } ],
  "vlans": [ { "id": 100, "name": "Management" } ],
  "intents": [ { "name": "Management_Compute", "traffic": ["management", "compute"], "adapters": ["pNIC01", "pNIC02"] } ],
  "volumes": [ { "name": "workloads", "sizeGiB": 2048, "resiliency": "two-way" } ],
  "dnsServers": ["192.0.2.10"]
}
```

Allowed values: `identity.model` is `active-directory` or `local-identity-key-vault`; `witness.type` is `cloud`, `file-share` or `none`; `intents[].traffic` items are `management`, `compute`, `storage`; `volumes[].resiliency` is `two-way`, `three-way`, `four-way`, `parity` or `nested-two-way`. Nodes, intents and volumes are matched by name (intents fall back to the traffic they carry). VLANs are matched by id. A release is a match when it is on the design's 12.2609 train, or equal to the build entered on the Project step.

## Producing a snapshot from Azure Local Ranger

[`docs/examples/ConvertTo-AsBuiltSnapshot.ps1`](examples/ConvertTo-AsBuiltSnapshot.ps1) reads a Ranger audit manifest (read-only) and writes a snapshot. Field paths in the manifest (as documented in the Ranger docs and collectors):

| Snapshot | Ranger manifest path | Note |
|---|---|---|
| `cluster.name` | `domains.clusterNode.cluster.name`, else `target.clusterName` | |
| `cluster.release` | not in the manifest | Pass `-Release 12.2609.x.y`; the manifest has the OS version only |
| `identity.model` | `topology.identityMode` | `ad` is `active-directory`; `local-key-vault` is `local-identity-key-vault` |
| `identity.domain` | `domains.clusterNode.cluster.domain` | |
| `witness.type` | `domains.clusterNode.quorum.witnessDetail.type`, else `quorum.quorumType` | CloudWitness, FileShareWitness |
| `nodes[].name` | `domains.clusterNode.nodes[].name` | |
| `nodes[].serial` | `domains.hardware.nodes[].serialNumber`, else `serviceTag` | Matched by `node` name |
| `vlans[].id` | `domains.networking.vlan[].AccessVlanId` | Management OS virtual adapters only |
| `intents[]` | `domains.networking.intents[]` | `trafficType` and `adapter` when present; otherwise `IsStorageIntent` and `IsComputeIntent` (no adapters, so adapters show "not captured") |
| `dnsServers` | `domains.networking.dns[].ServerAddresses` | |
| `volumes[]` | `domains.storage.virtualDisks[]` | `friendlyName`, `sizeGiB`, `resiliencySettingName` with `numberOfDataCopies` (4 copies on two machines is nested two-way) |

Node management and storage IPs are not addressable per node in the manifest, so the script leaves them out; add them from your own inventory if you want them compared. Azure Local Sonar or any other tool can write the same file directly.

The sample manifest and the snapshot made from it are in `apps/trailwright/tests/fixtures/as-built/` (example values only). The script is a sample: review it before running it against real manifests.
