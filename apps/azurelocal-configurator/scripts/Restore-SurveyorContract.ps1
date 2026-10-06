param([string]$Destination = 'D:/tmp/azurelocal-surveyor-contract-2.8.0')
$ErrorActionPreference = 'Stop'
$appRoot = Split-Path -Parent $PSScriptRoot
$lock = Get-Content (Join-Path $appRoot 'src/contracts/surveyor/source-lock.json') -Raw | ConvertFrom-Json
$contract = $lock.contracts | Where-Object version -eq '2.8.0'
$evidence = Get-Content (Join-Path $appRoot 'src/testing/surveyor/evidence.json') -Raw | ConvertFrom-Json
$fixture = $evidence.fixtures | Where-Object version -eq '2.8.0'
$sourcePaths = @('package.json','src/state/store.ts') + @($contract.sources.path) + @($fixture.sources.path)
$root = [IO.Path]::GetFullPath($Destination)
foreach ($relative in ($sourcePaths | Sort-Object -Unique)) {
 $target = [IO.Path]::GetFullPath((Join-Path $root $relative))
 if (-not $target.StartsWith($root.TrimEnd('\','/') + [IO.Path]::DirectorySeparatorChar, [StringComparison]::OrdinalIgnoreCase)) { throw 'Source path escaped destination' }
 if (Test-Path -LiteralPath $target) {
  $expected = @($contract.sources) + @($fixture.sources) | Where-Object path -eq $relative | Select-Object -First 1
  if ($expected -and (Get-FileHash -LiteralPath $target -Algorithm SHA256).Hash.ToLowerInvariant() -eq $expected.sha256) { continue }
  throw "Existing source differs or is unpinned: $target. Choose an empty destination for recovery."
 }
 New-Item -ItemType Directory -Path (Split-Path -Parent $target) -Force | Out-Null
 Invoke-WebRequest -Uri "https://raw.githubusercontent.com/AzureLocal/azurelocal-surveyor/$($contract.commit)/$relative" -OutFile $target
 $expected = @($contract.sources) + @($fixture.sources) | Where-Object path -eq $relative | Select-Object -First 1
 if ($expected -and (Get-FileHash -LiteralPath $target -Algorithm SHA256).Hash.ToLowerInvariant() -ne $expected.sha256) { throw "Source hash mismatch: $relative" }
}
Write-Output "Restored Surveyor 2.8.0 source at $root; immutable commit $($contract.commit). No application build or infrastructure operation performed."
