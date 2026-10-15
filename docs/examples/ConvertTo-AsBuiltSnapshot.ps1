<#
.SYNOPSIS
    Converts an Azure Local Ranger audit manifest into an as-built-snapshot.v1 file for Azure Local Trailwright.
.DESCRIPTION
    Read-only: it reads the manifest JSON and writes a small JSON file. It never connects to a cluster or to Azure.
    Sections the manifest does not carry are left out, and Trailwright shows them as "not captured".
    Field paths are those of the Ranger manifest (target, topology, domains.clusterNode, domains.hardware,
    domains.networking, domains.storage). See docs/AS-BUILT.md.
.PARAMETER ManifestPath
    Path of the Ranger audit manifest (JSON).
.PARAMETER OutPath
    Where to write the snapshot.
.PARAMETER Release
    The deployed release build (for example 12.2609.1003.7). The manifest does not carry the Azure Local release, so supply it when known.
#>
[CmdletBinding()]
param(
    [Parameter(Mandatory)][string]$ManifestPath,
    [Parameter(Mandatory)][string]$OutPath,
    [string]$Release
)

$m = Get-Content -LiteralPath $ManifestPath -Raw | ConvertFrom-Json -Depth 100
$d = $m.domains
$snap = [ordered]@{
    schema     = 'as-built-snapshot.v1'
    capturedAt = $m.run.endTimeUtc ?? $m.run.startTimeUtc
    source     = [ordered]@{ tool = 'ranger'; version = [string]$m.run.toolVersion; note = "manifest schema $($m.run.schemaVersion)" }
}

# Cluster
$clusterName = $d.clusterNode.cluster.name ?? $m.target.clusterName
$cluster = [ordered]@{}
if ($clusterName) { $cluster.name = [string]$clusterName }
if ($Release) { $cluster.release = $Release }
if ($cluster.Count) { $snap.cluster = $cluster }

# Identity: topology.identityMode is 'ad' or 'local-key-vault'
$mode = $m.topology.identityMode ?? $m.topology.operatingModel.identityMode
if ($mode) {
    $snap.identity = [ordered]@{ model = $(if ($mode -eq 'local-key-vault') { 'local-identity-key-vault' } else { 'active-directory' }) }
    if ($d.clusterNode.cluster.domain) { $snap.identity.domain = [string]$d.clusterNode.cluster.domain }
}

# Witness: quorum.witnessDetail.type, else the quorum type
$q = $d.clusterNode.quorum
if ($q) {
    $wt = [string]($q.witnessDetail.type ?? $q.type ?? $q.quorumType)
    $snap.witness = [ordered]@{ type = $(if ($wt -match 'Cloud') { 'cloud' } elseif ($wt -match 'FileShare') { 'file-share' } else { 'none' }) }
}

# Nodes: names from clusterNode.nodes, serial numbers from hardware.nodes, management IPs from networking.ipAddresses is not node-addressable, so only supplied when present
$nodes = @($d.clusterNode.nodes)
if ($nodes.Count) {
    $hw = @($d.hardware.nodes)
    $snap.nodes = @($nodes | ForEach-Object {
        $n = $_
        $h = $hw | Where-Object { $_.node -eq $n.name } | Select-Object -First 1
        $o = [ordered]@{ name = [string]$n.name }
        if ($n.managementIp) { $o.managementIp = [string]$n.managementIp }
        if ($h.serialNumber) { $o.serial = [string]$h.serialNumber } elseif ($h.serviceTag) { $o.serial = [string]$h.serviceTag }
        $o
    })
}

# VLANs: networking.vlan[].AccessVlanId (management OS virtual adapters)
$vlanIds = @($d.networking.vlan | Where-Object { $null -ne $_.AccessVlanId } | ForEach-Object { [int]$_.AccessVlanId } | Sort-Object -Unique)
if ($vlanIds.Count) { $snap.vlans = @($vlanIds | ForEach-Object { [ordered]@{ id = $_ } }) }

# Intents: networking.intents. Documented shape: trafficType[] and adapter[]; Get-NetIntent shape: IsStorageIntent and IsComputeIntent.
$intents = @($d.networking.intents)
if ($intents.Count) {
    $snap.intents = @($intents | ForEach-Object {
        $i = $_
        $traffic = @()
        if ($i.trafficType) { $traffic = @($i.trafficType | ForEach-Object { ([string]$_).ToLower() }) }
        else {
            if ($i.IsStorageIntent) { $traffic += 'storage' }
            if ($i.IsComputeIntent) { $traffic += 'compute' }
            if (-not $traffic -or ($i.Name -match 'manage')) { $traffic = @('management') + $traffic }
        }
        [ordered]@{ name = [string]($i.name ?? $i.Name); traffic = @($traffic | Select-Object -Unique); adapters = @($i.adapter | Where-Object { $_ }) }
    })
}

# DNS servers: networking.dns[].ServerAddresses (flattened per interface)
$dns = @($d.networking.dns | ForEach-Object { $_.ServerAddresses } | Where-Object { $_ } | Select-Object -Unique)
if ($dns.Count) { $snap.dnsServers = @($dns) }

# Volumes: storage.virtualDisks (name, size, resiliency). Mirror with 2 or 3 copies is two-way or three-way; 4 copies is nested two-way on two machines.
$vds = @($d.storage.virtualDisks)
if ($vds.Count) {
    $count = $nodes.Count
    $snap.volumes = @($vds | ForEach-Object {
        $v = $_
        $res = switch -Regex ([string]$v.resiliencySettingName) {
            'Parity' { 'parity' }
            'Mirror' { switch ([int]$v.numberOfDataCopies) { 2 { 'two-way' } 3 { 'three-way' } 4 { if ($count -eq 2) { 'nested-two-way' } else { 'four-way' } } default { $null } } }
            default { $null }
        }
        $o = [ordered]@{ name = [string]$v.friendlyName }
        if ($null -ne $v.sizeGiB) { $o.sizeGiB = [double]$v.sizeGiB }
        if ($res) { $o.resiliency = $res }
        $o
    })
}

$snap | ConvertTo-Json -Depth 20 | Set-Content -LiteralPath $OutPath -Encoding UTF8
Write-Host "Wrote $OutPath"
