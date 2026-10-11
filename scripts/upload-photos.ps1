# Upload the asana CSV and image folders from this PC to the Oracle VM and import them.
# Usually started from upload-photos.cmd. Source paths: PHOTOS_CSV / PHOTOS_DIR in
# deploy\oracle\config.env (or environment variables of the same name).
$ErrorActionPreference = "Stop"
. "$PSScriptRoot\oracle-common.ps1"

$csv = if ($env:PHOTOS_CSV) { $env:PHOTOS_CSV } else { $config["PHOTOS_CSV"] }
$dir = if ($env:PHOTOS_DIR) { $env:PHOTOS_DIR } else { $config["PHOTOS_DIR"] }
if (-not (Test-Path -LiteralPath $csv -PathType Leaf)) { throw "Asana CSV not found: $csv (set PHOTOS_CSV in deploy\oracle\config.env)" }
if (-not (Test-Path -LiteralPath $dir -PathType Container)) { throw "Images folder not found: $dir (set PHOTOS_DIR in deploy\oracle\config.env)" }

$staging = Join-Path $env:TEMP "yogadb-photos"
$tarball = Join-Path $env:TEMP "yogadb-asanas.tar"
Remove-Item -Recurse -Force -LiteralPath $staging, $tarball -ErrorAction SilentlyContinue
New-Item -ItemType Directory -Path $staging | Out-Null
Copy-Item -LiteralPath $csv -Destination (Join-Path $staging "yoga_asanas.csv")

Write-Host "==> Packing $dir and $csv"
# Windows' own bsdtar (Git's tar mishandles drive letters).
& "$env:SystemRoot\System32\tar.exe" -cf $tarball -C $dir . -C $staging yoga_asanas.csv
if ($LASTEXITCODE -ne 0) { throw "Packing the photos failed." }
Write-Host ("    {0:N0} MB" -f ((Get-Item -LiteralPath $tarball).Length / 1MB))

try {
    Write-Host "==> Uploading to $target"
    scp @sshArgs $tarball "${target}:/tmp/yogadb-asanas.tar"
    if ($LASTEXITCODE -ne 0) { throw "Upload failed." }

    ssh @sshArgs $target (Get-RemoteCommand "server-import-photos.sh /tmp/yogadb-asanas.tar")
    if ($LASTEXITCODE -ne 0) { throw "Import failed on the server (see the output above)." }
} finally {
    Remove-Item -Recurse -Force -LiteralPath $staging, $tarball -ErrorAction SilentlyContinue
}

Test-PublicSite
Write-Host "Photos are live: https://$domain/asanas"
Start-Process "https://$domain/asanas"
