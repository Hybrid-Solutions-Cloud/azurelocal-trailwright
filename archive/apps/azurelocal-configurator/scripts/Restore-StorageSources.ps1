param([string]$Destination='D:/tmp/azurelocal-storage-sources')
$ErrorActionPreference='Stop'
$lock=Get-Content -LiteralPath (Join-Path $PSScriptRoot '../src/contracts/microsoft/storage-source-lock.json') -Raw | ConvertFrom-Json
$root=[IO.Path]::GetFullPath($Destination)
New-Item -ItemType Directory -Path $root -Force | Out-Null
foreach($source in $lock.sources){
 if($source.commit -notmatch '^[a-f0-9]{40}$' -or $source.sha256 -notmatch '^[a-f0-9]{64}$'){throw 'Invalid immutable source identity'}
 if($source.rawUrl -notlike 'https://raw.githubusercontent.com/MicrosoftDocs/*'){throw 'Unexpected source origin'}
 $filename=[IO.Path]::GetFileName($source.path)
 $target=Join-Path $root $filename
 Invoke-WebRequest -Uri $source.rawUrl -OutFile $target
 if((Get-FileHash -LiteralPath $target -Algorithm SHA256).Hash.ToLowerInvariant() -ne $source.sha256){throw "Source hash mismatch: $filename"}
 Write-Output "Verified $filename at $($source.commit)"
}
