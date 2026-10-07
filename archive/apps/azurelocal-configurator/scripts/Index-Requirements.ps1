param([string]$ApplicationPath = (Split-Path $PSScriptRoot -Parent))
$ErrorActionPreference = 'Stop'
$design = Join-Path $ApplicationPath 'docs/design'
$entries = [System.Collections.Generic.List[object]]::new()
foreach ($name in @('outline.md','implementation.md','references.md')) {
    $file = Join-Path $design $name
    $lines = Get-Content -LiteralPath $file
    $hash = (Get-FileHash -LiteralPath $file -Algorithm SHA256).Hash.ToLowerInvariant()
    $section = ''
    for ($i = 0; $i -lt $lines.Count; $i++) {
        $line = $lines[$i].Trim()
        if (-not $line) { continue }
        if ($line.StartsWith('#')) { $section = $line.TrimStart('#').Trim() }
        $entries.Add([ordered]@{ id = "$($name.Replace('.md',''))-L$($i+1)"; source = "design/$name"; line = $i+1; sha256 = $hash; section = $section; text = $line; acceptanceStatus = 'unreviewed' })
    }
}
$flowPath = Join-Path $design 'flows.drawio'
[xml]$flow = Get-Content -LiteralPath $flowPath -Raw
$flowHash = (Get-FileHash -LiteralPath $flowPath -Algorithm SHA256).Hash.ToLowerInvariant()
foreach ($page in $flow.mxfile.diagram) {
    foreach ($cell in $page.mxGraphModel.root.mxCell) {
        if ($cell.vertex -eq '1' -or $cell.edge -eq '1') {
            $entries.Add([ordered]@{ id = "flow-$($page.id)-$($cell.id)"; source = 'design/flows.drawio'; sha256 = $flowHash; section = $page.name; text = [string]$cell.value; from = [string]$cell.source; to = [string]$cell.target; acceptanceStatus = 'unreviewed' })
        }
    }
}
$output = Join-Path $ApplicationPath 'docs/requirements-index.json'
[ordered]@{ kind = 'azurelocal-source-requirements-index'; version = 1; note = 'Source inventory only. Implementation/qualification requires separate audited evidence for each entry.'; entries = $entries } | ConvertTo-Json -Depth 8 | Set-Content -LiteralPath $output -Encoding utf8
Write-Output "Indexed $($entries.Count) source entries into $output"
