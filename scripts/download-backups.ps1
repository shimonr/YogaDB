# Copy the server's daily backups (database dumps and user-uploaded photos) to this PC, so a copy
# exists off the VM. Usually started from download-backups.cmd. Target folder: BACKUPS_LOCAL_DIR in
# deploy\oracle\config.env (default: Documents\YogaDB-backups).
$ErrorActionPreference = "Stop"
. "$PSScriptRoot\oracle-common.ps1"

$dest = if ($config["BACKUPS_LOCAL_DIR"]) { $config["BACKUPS_LOCAL_DIR"] } else { Join-Path ([Environment]::GetFolderPath("MyDocuments")) "YogaDB-backups" }
New-Item -ItemType Directory -Force -Path $dest | Out-Null
Write-Host "==> Copying /opt/backups/yogadb from $sshTarget to $dest"
scp @sshArgs -p "${sshTarget}:/opt/backups/yogadb/*" $dest
if ($LASTEXITCODE -ne 0) { throw "Copying the backups failed." }
Get-ChildItem -LiteralPath $dest | Sort-Object LastWriteTime -Descending | Select-Object -First 6 Name, @{n = "MB"; e = { "{0:N1}" -f ($_.Length / 1MB) } } | Format-Table -AutoSize
Write-Host "Backups are in $dest"
