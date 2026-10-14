# Deploy the latest pushed code (origin/$BRANCH) to the Oracle VM. Usually started from deploy.cmd
# (production) or deploy-qa.cmd (QA stack). Settings: deploy\oracle\config.env (+ qa.env).
param([ValidateSet("prod", "qa")][string]$Target = "prod")
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
$version = (git show "origin/${branch}:VERSION").Trim()
Write-Host "Deploying ${Target}: version $version, $(git log -1 --format='%h %s' "origin/$branch") to $sshTarget"

ssh @sshArgs $sshTarget (Get-RemoteCommand "server-deploy.sh")
if ($LASTEXITCODE -ne 0) { throw "Deploy failed on the server (see the output above)." }

Test-PublicSite $version
Write-Host "Deployed $Target ${version}: https://$domain"
Start-Process "https://$domain"
