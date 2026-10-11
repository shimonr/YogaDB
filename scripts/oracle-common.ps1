# Shared by deploy.ps1 and upload-photos.ps1: settings from deploy\oracle\config.env, SSH options,
# and the remote command that updates the server checkout to origin/$BRANCH before running a script.
$Root = Split-Path -Parent $PSScriptRoot

$config = @{}
foreach ($line in Get-Content -LiteralPath "$Root\deploy\oracle\config.env") {
    if ($line -match '^\s*([A-Z_]+)=(.*)$') { $config[$Matches[1]] = $Matches[2].Trim() }
}
$target = $config["SSH_TARGET"]; $app = $config["APP_DIR"]; $branch = $config["BRANCH"]
$domain = $config["DOMAIN"]; $repo = $config["REPO_URL"]

# SSH key: your default key (~\.ssh\id_ed25519 / id_rsa) or set DEPLOY_SSH_KEY to the key file path.
$sshArgs = @("-o", "StrictHostKeyChecking=accept-new", "-o", "ConnectTimeout=15")
if ($env:DEPLOY_SSH_KEY) { $sshArgs += @("-i", $env:DEPLOY_SSH_KEY, "-o", "IdentitiesOnly=yes") }

function Get-RemoteCommand([string]$ServerScript) {
    # Single-quoted so PowerShell leaves the remote shell's $ variables alone.
    $remote = 'set -e; app=__APP__; if [ ! -d $app/.git ]; then sudo mkdir -p $app; sudo chown $(id -u):$(id -g) $app; git clone -q --branch __BRANCH__ __REPO__ $app; fi; git -C $app fetch -q origin __BRANCH__; git -C $app reset -q --hard origin/__BRANCH__; REPO_URL=__REPO__ APP_DIR=$app BRANCH=__BRANCH__ DOMAIN=__DOMAIN__ bash $app/deploy/oracle/__SCRIPT__'
    return $remote.Replace("__APP__", $app).Replace("__BRANCH__", $branch).Replace("__REPO__", $repo).Replace("__DOMAIN__", $domain).Replace("__SCRIPT__", $ServerScript)
}

function Test-PublicSite([string]$Path = "/api/asanas?limit=1") {
    Write-Host "==> Check from here: https://$domain"
    try {
        Invoke-WebRequest -Uri "https://$domain$Path" -UseBasicParsing -TimeoutSec 15 | Out-Null
    } catch {
        throw "The server is up but https://$domain is not reachable from here. Check that TCP 80 and 443 are open in the Oracle VCN security list."
    }
}
