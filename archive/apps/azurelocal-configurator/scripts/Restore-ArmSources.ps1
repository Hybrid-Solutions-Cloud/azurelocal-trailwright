param([Parameter(Mandatory)][string]$OutputDirectory)
$ErrorActionPreference = 'Stop'
$sourceDirectory = Join-Path $PSScriptRoot '../src/contracts/arm'
$sourceLock = Get-Content -LiteralPath (Join-Path $sourceDirectory 'source-lock.json') -Raw | ConvertFrom-Json
$destination = [IO.Path]::GetFullPath($OutputDirectory)
New-Item -ItemType Directory -Path $destination -Force | Out-Null
foreach ($source in @($sourceLock.templates) + @($sourceLock.apiSources)) {
    $output = Join-Path $destination $source.file
    if ($source.blobSha) {
        $blob = Invoke-RestMethod -Uri "https://api.github.com/repos/Azure/azure-rest-api-specs/git/blobs/$($source.blobSha)" -TimeoutSec 30
        [IO.File]::WriteAllBytes($output, [Convert]::FromBase64String($blob.content))
    } else {
        Invoke-WebRequest -Uri $source.url -OutFile $output -TimeoutSec 30
    }
    $hash = (Get-FileHash -LiteralPath $output -Algorithm SHA256).Hash.ToLowerInvariant()
    if ($hash -ne $source.sha256) { throw "Source hash mismatch: $($source.file)" }
    Write-Output "Verified $($source.file): $hash"
}
foreach ($source in $sourceLock.licenses) {
    $license = Invoke-RestMethod -Uri "https://api.github.com/repos/$($source.repository)/license?ref=$($source.commit)" -TimeoutSec 30
    $output = Join-Path $destination $source.file
    [IO.File]::WriteAllBytes($output, [Convert]::FromBase64String($license.content))
    $hash = (Get-FileHash -LiteralPath $output -Algorithm SHA256).Hash.ToLowerInvariant()
    if ($hash -ne $source.sha256) { throw "License hash mismatch: $($source.file)" }
    Write-Output "Verified $($source.file): $hash"
}
