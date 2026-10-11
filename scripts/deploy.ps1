# Deploy the latest pushed code (origin/$BRANCH) to the Oracle VM. Usually started from deploy.cmd.
# SSH key: your default key (~\.ssh\id_ed25519 / id_rsa) or set DEPLOY_SSH_KEY to the key file path.
# Settings: deploy\oracle\config.env
$ErrorActionPreference = "Stop"
$Root = Split-Path -Parent $PSScriptRoot

$config = @{}
foreach ($line in Get-Content -LiteralPath "$Root\deploy\oracle\config.env") {
    if ($line -match '^\s*([A-Z_]+)=(.*)$') { $config[$Matches[1]] = $Matches[2].Trim() }
}
$target = $config["SSH_TARGET"]; $app = $config["APP_DIR"]; $branch = $config["BRANCH"]
$domain = $config["DOMAIN"]; $repo = $config["REPO_URL"]

$sshArgs = @("-o", "StrictHostKeyChecking=accept-new", "-o", "ConnectTimeout=15")
if ($env:DEPLOY_SSH_KEY) { $sshArgs += @("-i", $env:DEPLOY_SSH_KEY, "-o", "IdentitiesOnly=yes") }

Set-Location -LiteralPath $Root
git fetch --quiet origin $branch
if ($LASTEXITCODE -ne 0) { throw "git fetch failed." }
$ahead = git rev-list --count "origin/$branch..HEAD"
if ($ahead -ne "0") {
    throw "Your checkout has $ahead commit(s) not on origin/$branch. The server deploys origin/$branch; push first (git push origin $branch), then run this again."
}
if (git status --porcelain) { Write-Host "Note: uncommitted local changes are not deployed." }
Write-Host "Deploying $(git log -1 --format='%h %s' "origin/$branch") to $target"

# Single-quoted so PowerShell leaves the remote shell's $ variables alone.
$remote = 'set -e; app=__APP__; if [ ! -d $app/.git ]; then sudo mkdir -p $app; sudo chown $(id -u):$(id -g) $app; git clone -q --branch __BRANCH__ __REPO__ $app; fi; git -C $app fetch -q origin __BRANCH__; git -C $app reset -q --hard origin/__BRANCH__; REPO_URL=__REPO__ APP_DIR=$app BRANCH=__BRANCH__ DOMAIN=__DOMAIN__ bash $app/deploy/oracle/server-deploy.sh'
$remote = $remote.Replace("__APP__", $app).Replace("__BRANCH__", $branch).Replace("__REPO__", $repo).Replace("__DOMAIN__", $domain)
ssh @sshArgs $target $remote
if ($LASTEXITCODE -ne 0) { throw "Deploy failed on the server (see the output above)." }

Write-Host "==> Check from here: https://$domain"
try {
    Invoke-WebRequest -Uri "https://$domain/api/asanas?limit=1" -UseBasicParsing -TimeoutSec 15 | Out-Null
} catch {
    throw "The server is up but https://$domain is not reachable from here. Check that TCP 80 and 443 are open in the Oracle VCN security list."
}
Write-Host "Deployed: https://$domain"
Start-Process "https://$domain"
