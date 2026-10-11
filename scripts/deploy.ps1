# Deploy the latest pushed code (origin/$BRANCH) to the Oracle VM. Usually started from deploy.cmd.
# Settings: deploy\oracle\config.env. SSH key: see scripts\oracle-common.ps1.
$ErrorActionPreference = "Stop"
. "$PSScriptRoot\oracle-common.ps1"

Set-Location -LiteralPath $Root
git fetch --quiet origin $branch
if ($LASTEXITCODE -ne 0) { throw "git fetch failed." }
$ahead = git rev-list --count "origin/$branch..HEAD"
if ($ahead -ne "0") {
    throw "Your checkout has $ahead commit(s) not on origin/$branch. The server deploys origin/$branch; push first (git push origin $branch), then run this again."
}
if (git status --porcelain) { Write-Host "Note: uncommitted local changes are not deployed." }
Write-Host "Deploying $(git log -1 --format='%h %s' "origin/$branch") to $target"

ssh @sshArgs $target (Get-RemoteCommand "server-deploy.sh")
if ($LASTEXITCODE -ne 0) { throw "Deploy failed on the server (see the output above)." }

Test-PublicSite
Write-Host "Deployed: https://$domain"
Start-Process "https://$domain"
